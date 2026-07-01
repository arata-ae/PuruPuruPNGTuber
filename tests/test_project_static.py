# SPDX-License-Identifier: Apache-2.0
from __future__ import annotations

from pathlib import Path
from functools import partial
from http.client import HTTPConnection
import json
import re
import struct
import subprocess
import threading
import unittest

from scripts.run_local_server import BoundedThreadingHTTPServer, NoCacheHandler, OBS_SNAPSHOT_MAX_BYTES

ROOT = Path(__file__).resolve().parents[1]
DEMO_AVATAR_DIR = ROOT / "assets" / "demo-avatar"


class QuietNoCacheHandler(NoCacheHandler):
    def log_message(self, format: str, *args) -> None:
        return


class ProjectStaticTests(unittest.TestCase):
    def read_text(self, relative: str) -> str:
        return (ROOT / relative).read_text(encoding="utf-8")

    def csp_directive_map(self, csp: str) -> dict[str, str]:
        directives: dict[str, str] = {}
        for directive in csp.split(";"):
            normalized = " ".join(directive.split())
            if not normalized:
                continue
            name = normalized.split(" ", 1)[0]
            directives[name] = normalized
        return directives

    def python_string_constant(self, source: str, name: str) -> str:
        match = re.search(rf"{re.escape(name)}\s*=\s*\((.*?)\)", source, re.S)
        self.assertIsNotNone(match, name)
        return "".join(re.findall(r'"([^"]*)"', match.group(1)))

    def js_function_body(self, source: str, signature: str) -> str:
        start = source.index(signature)
        brace = source.index("{", start)
        depth = 0
        quote: str | None = None
        escaped = False
        line_comment = False
        block_comment = False
        for index in range(brace, len(source)):
            char = source[index]
            nxt = source[index + 1] if index + 1 < len(source) else ""

            if line_comment:
                if char == "\n":
                    line_comment = False
                continue
            if block_comment:
                if char == "*" and nxt == "/":
                    block_comment = False
                continue
            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue

            if char == "/" and nxt == "/":
                line_comment = True
                continue
            if char == "/" and nxt == "*":
                block_comment = True
                continue
            if char in {'"', "'", "`"}:
                quote = char
                continue
            if char == "{":
                depth += 1
                continue
            if char == "}":
                depth -= 1
                if depth == 0:
                    return source[brace + 1:index]
        self.fail(f"Could not extract JS function body: {signature}")

    def png_size(self, path: Path) -> tuple[int, int]:
        with path.open("rb") as file:
            self.assertEqual(file.read(8), b"\x89PNG\r\n\x1a\n", path.name)
            length = struct.unpack(">I", file.read(4))[0]
            self.assertEqual(file.read(4), b"IHDR", path.name)
            data = file.read(length)
        return struct.unpack(">II", data[:8])

    def iter_public_paths(self):
        for path in ROOT.rglob("*"):
            if ".git" in path.parts:
                continue
            if "__pycache__" in path.parts:
                continue
            yield path

    def test_public_release_files_exist(self) -> None:
        for relative in [
            "README.md",
            "LICENSE",
            "ASSET_LICENSE.md",
            "THIRD_PARTY_NOTICES.md",
            ".github/CONTRIBUTING.md",
            ".github/CODE_OF_CONDUCT.md",
            ".github/SECURITY.md",
            ".github/SUPPORT.md",
            "CHANGELOG.md",
            ".editorconfig",
            ".gitattributes",
            ".gitignore",
            ".github/workflows/ci.yml",
            ".github/pull_request_template.md",
            ".github/ISSUE_TEMPLATE/bug_report.yml",
            ".github/ISSUE_TEMPLATE/feature_request.yml",
            ".github/ISSUE_TEMPLATE/config.yml",
            "docs/usage.md",
            "assets/demo-avatar/README.md",
            "assets/demo-avatar/ASSET_NOTICE.md",
            "assets/demo-avatar02/README.md",
            "assets/demo-avatar02/ASSET_NOTICE.md",
            "assets/demo-avatar03/README.md",
            "assets/demo-avatar03/ASSET_NOTICE.md",
        ]:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_demo_avatar_assets_are_present_and_1024x1536_png(self) -> None:
        self.assertTrue(DEMO_AVATAR_DIR.is_dir())
        for filename in [
            "back-hair.png",
            "front-hair.png",
            "eyes-open-mouth-closed.png",
            "eyes-open-mouth-half.png",
            "eyes-open-mouth-open.png",
            "eyes-closed-mouth-closed.png",
            "eyes-closed-mouth-half.png",
            "eyes-closed-mouth-open.png",
        ]:
            path = DEMO_AVATAR_DIR / filename
            self.assertTrue(path.is_file(), filename)
            self.assertEqual(self.png_size(path), (1024, 1536), filename)

        item_path = DEMO_AVATAR_DIR / "items" / "body.png"
        self.assertTrue(item_path.is_file())
        self.assertEqual(self.png_size(item_path), (1024, 1536), item_path.name)
        hairpin_path = DEMO_AVATAR_DIR / "items" / "hairpin.png"
        self.assertTrue(hairpin_path.is_file())
        self.assertEqual(self.png_size(hairpin_path), (1024, 1536), hairpin_path.name)

    def test_demo_avatar02_assets_are_present_and_900x900_png(self) -> None:
        demo2_dir = ROOT / "assets" / "demo-avatar02"
        self.assertTrue(demo2_dir.is_dir())
        for filename in [
            "back-hair.png",
            "front-hair.png",
            "eyes-open-mouth-closed.png",
            "eyes-open-mouth-half.png",
            "eyes-open-mouth-open.png",
            "eyes-closed-mouth-closed.png",
            "eyes-closed-mouth-half.png",
            "eyes-closed-mouth-open.png",
            "eye-highlight.png",
        ]:
            path = demo2_dir / filename
            self.assertTrue(path.is_file(), filename)
            self.assertEqual(self.png_size(path), (900, 900), filename)

    def test_demo_avatar03_assets_are_present_and_1024x1024_png(self) -> None:
        demo3_dir = ROOT / "assets" / "demo-avatar03"
        self.assertTrue(demo3_dir.is_dir())
        for filename in [
            "back-hair.png",
            "front-hair.png",
            "eyes-open-mouth-closed.png",
            "eyes-open-mouth-half.png",
            "eyes-open-mouth-open.png",
            "eyes-closed-mouth-closed.png",
            "eyes-closed-mouth-half.png",
            "eyes-closed-mouth-open.png",
        ]:
            path = demo3_dir / filename
            self.assertTrue(path.is_file(), filename)
            self.assertEqual(self.png_size(path), (1024, 1024), filename)

        for filename in ["body.png", "ribbon.png", "hairpin.png"]:
            path = demo3_dir / "items" / filename
            self.assertTrue(path.is_file(), filename)
            self.assertEqual(self.png_size(path), (1024, 1024), filename)

    def test_avatar_image_size_is_not_fixed_to_1024x1536(self) -> None:
        app = self.read_text("app.js")
        self.assertIn("const DEFAULT_AVATAR_IMAGE_SIZE = { w: 1024, h: 1536 }", app)
        self.assertIn("function setAvatarImageSize(width, height)", app)
        self.assertIn("function validateAvatarImageSetDimensions(loadedImages)", app)
        self.assertIn("function scaleSettingsPayloadForAvatarSize(payload, fromSize, toSize)", app)
        self.assertIn("const DEMO_AVATAR02_SOURCE_KIND = \"asset-demo-avatar02\"", app)
        self.assertIn("const DEMO_AVATAR03_SOURCE_KIND = \"asset-demo-avatar03\"", app)
        self.assertIn("async function ensureDemoAvatar02CharacterProfile()", app)
        self.assertIn("async function ensureDemoAvatar03CharacterProfile()", app)

        validate_body = self.js_function_body(app, "function validateAvatarImageDimensions(")
        self.assertNotIn("width !== CROP.w || height !== CROP.h", validate_body)

        load_assets_body = self.js_function_body(app, "async function loadAssets(")
        self.assertIn("expectedAvatarSize = validateAvatarImageDimensions(image, key, expectedAvatarSize)", load_assets_body)
        self.assertIn("applyLoadedAvatarImages(loadedImages)", load_assets_body)

    def test_default_avatar_settings_match_public_demo_avatar(self) -> None:
        settings = json.loads((DEMO_AVATAR_DIR / "default-settings.json").read_text(encoding="utf-8"))
        state = settings["state"]
        expected_state = {
            "rangeLeft": 60,
            "rangeRight": 60,
            "rangeUp": 10,
            "rangeDown": 25,
            "angleXDeform": 60,
            "faceTurnDepth": 200,
            "faceTurnVertical": 150,
            "avatarSize": 78,
            "avatarX": -155,
            "avatarY": 4,
            "hairWarp": 120,
            "frontHairShadowStrength": 60,
            "bgColor": "#FFF8EE",
        }
        for key, value in expected_state.items():
            self.assertEqual(state.get(key), value, key)
        self.assertEqual(settings["outputSettings"]["obsPreset"], "standard")
        self.assertEqual(settings["activeItemLayerId"], 1)
        self.assertEqual(len(settings["itemLayers"]), 2)
        body_item = settings["itemLayers"][0]
        self.assertEqual(body_item["file"], "items/body.png")
        self.assertEqual(body_item["name"], "body.png")
        self.assertEqual(body_item["slot"], "faceBack")
        self.assertTrue(body_item["locked"])
        hairpin_item = settings["itemLayers"][1]
        self.assertEqual(hairpin_item["file"], "items/hairpin.png")
        self.assertEqual(hairpin_item["name"], "hairpin.png")
        self.assertEqual(hairpin_item["slot"], "frontHairFront")
        self.assertEqual(hairpin_item["x"], 0)
        self.assertEqual(hairpin_item["y"], 0)
        self.assertEqual(hairpin_item["scale"], 100)
        self.assertEqual(hairpin_item["followStrength"], 75)
        self.assertTrue(hairpin_item["locked"])

    def test_demo_avatar03_settings_include_three_locked_items(self) -> None:
        settings = json.loads((ROOT / "assets" / "demo-avatar03" / "default-settings.json").read_text(encoding="utf-8"))
        self.assertEqual(settings["avatarImageSize"], {"width": 1024, "height": 1024})
        self.assertEqual(settings["state"]["avatarSize"], 78)
        self.assertEqual(settings["state"]["avatarX"], -155)
        self.assertEqual(settings["activeItemLayerId"], 1)
        self.assertEqual(len(settings["itemLayers"]), 3)
        expected = [
            ("items/body.png", "faceBack", -5, 103),
            ("items/ribbon.png", "faceBack", 0, 100),
            ("items/hairpin.png", "frontHairFront", 0, 100),
        ]
        for layer, (file, slot, y, scale) in zip(settings["itemLayers"], expected):
            self.assertEqual(layer["file"], file)
            self.assertEqual(layer["slot"], slot)
            self.assertEqual(layer["x"], 0)
            self.assertEqual(layer["y"], y)
            self.assertEqual(layer["scale"], scale)
            self.assertTrue(layer["locked"])

    def test_demo_avatar_paths_are_current(self) -> None:
        app = self.read_text("app.js")
        readme = self.read_text("README.md")
        usage = self.read_text("docs/usage.md")
        self.assertIn("assets/demo-avatar/back-hair.png", app)
        self.assertIn("assets/demo-avatar03/back-hair.png", app)
        self.assertIn('const DEFAULT_SETTINGS_URL = "assets/demo-avatar/default-settings.json"', app)
        self.assertIn("assets/demo-avatar/", readme)
        self.assertIn("assets/demo-avatar03/", readme)
        self.assertIn("使い方 / Usage", usage)
        self.assertIn("Codex / Claude Code", usage)
        self.assertIn("同じキャンバスサイズ・同じ位置合わせ", usage)
        old_character_dir = "new" + "-character"
        old_character_path = f"assets/characters/{old_character_dir}/"
        self.assertFalse((ROOT / "assets" / "characters").exists())
        self.assertNotIn(old_character_path, app)
        self.assertNotIn(old_character_path, readme)
        self.assertNotIn("assets/characters/", app)
        self.assertNotIn("assets/characters/", readme)

    def test_initial_background_is_cream_not_chromakey(self) -> None:
        app = self.read_text("app.js")
        html = self.read_text("index.html")
        usage = self.read_text("docs/usage.md")
        self.assertIn('bgColor: "#FFF8EE"', app)
        self.assertIn('id="backgroundReadout">クリーム</strong>', html)
        self.assertIn('data-bg="#FFF8EE" aria-pressed="true"', html)
        self.assertIn('data-bg="#00FF00" aria-pressed="false"', html)
        self.assertIn('id="backgroundColorInput" class="color-input" type="color" value="#FFF8EE"', html)
        self.assertIn('default is `クリーム (#FFF8EE)`', usage)

    def test_public_readme_explains_ai_assisted_pngtuber_workflow(self) -> None:
        readme = self.read_text("README.md")
        self.assertIn("表情差分PNG + 前髪 + 後ろ髪", readme)
        self.assertIn("Codex / Claude Code", readme)
        self.assertIn("使い方 / Usage", readme)
        self.assertIn("すべて透過PNG", readme)
        self.assertIn("同じキャンバスサイズ・同じ位置合わせ", readme)

    def test_license_is_apache_2_and_assets_are_separate(self) -> None:
        license_text = self.read_text("LICENSE")
        readme = self.read_text("README.md")
        asset_license = self.read_text("ASSET_LICENSE.md")
        self.assertIn("Apache License", license_text)
        self.assertIn("Version 2.0", license_text)
        self.assertIn("Copyright 2026 masa", license_text)
        self.assertNotIn("PuruPuru PNGTuber " + "Custom " + "Lic" + "ense", license_text)
        self.assertNotIn("not an " + "OSI-approved open source license", license_text)
        self.assertIn("Software code and documentation text are licensed under the [Apache License 2.0](./LICENSE)", readme)
        self.assertIn("The software code and documentation text are licensed under [Apache License 2.0](./LICENSE)", asset_license)
        self.assertIn("The Apache-2.0 license does not grant rights to the bundled demo avatar", asset_license)

    def test_asset_license_keeps_demo_assets_separate(self) -> None:
        asset_license = self.read_text("ASSET_LICENSE.md")
        avatar_notice = self.read_text("assets/demo-avatar/ASSET_NOTICE.md")
        self.assertIn("The software code and documentation text are licensed under [Apache License 2.0](./LICENSE)", asset_license)
        self.assertIn("does not grant rights to the bundled demo avatar", asset_license)
        self.assertIn("assets/demo-avatar/**", asset_license)
        self.assertIn("assets/demo-avatar03/**", asset_license)
        self.assertIn("not free character assets", avatar_notice)
        self.assertIn("not governed by the Apache-2.0 software license", self.read_text("assets/demo-avatar/README.md"))
        self.assertIn("AI training", asset_license)

    def test_primary_source_files_have_spdx_identifier(self) -> None:
        expected = "SPDX-License-Identifier: Apache-2.0"
        for relative in [
            "app.js",
            "index.html",
            "styles.css",
            "scripts/run_local_server.py",
            "tests/test_project_static.py",
            "run_local_server.bat",
            "run_local_server.sh",
        ]:
            self.assertIn(expected, self.read_text(relative), relative)

    def test_third_party_notices_cover_mediapipe(self) -> None:
        app = self.read_text("app.js")
        notices = self.read_text("THIRD_PARTY_NOTICES.md")
        self.assertIn("@mediapipe/tasks-vision@0.10.35", app)
        self.assertIn("@mediapipe/tasks-vision@0.10.35", notices)
        self.assertIn("storage.googleapis.com/mediapipe-models", notices)
        self.assertIn("Apache License 2.0", notices)

    def test_csp_matches_external_urls_and_server_header(self) -> None:
        app = self.read_text("app.js")
        html = self.read_text("index.html")
        server = self.read_text("scripts/run_local_server.py")
        external_hosts = {re.match(r"https://([^/]+)", url).group(1) for url in re.findall(r"https://[^\"']+", app)}
        for host in external_hosts:
            self.assertIn(f"https://{host}", html)
            self.assertIn(f"https://{host}", server)
        self.assertNotIn(" file:", html)

        meta_match = re.search(r'http-equiv="Content-Security-Policy"\s+content="([^"]+)"', html, re.S)
        self.assertIsNotNone(meta_match)
        server_csp = self.python_string_constant(server, "CONTENT_SECURITY_POLICY")
        html_directives = self.csp_directive_map(meta_match.group(1))
        server_directives = self.csp_directive_map(server_csp)
        self.assertEqual(
            html_directives,
            {key: value for key, value in server_directives.items() if key != "frame-ancestors"},
        )
        self.assertEqual(server_directives["frame-ancestors"], "frame-ancestors 'none'")

    def test_server_security_and_obs_helpers_exist(self) -> None:
        server = self.read_text("scripts/run_local_server.py")
        self.assertIn('TRUSTED_API_HOSTS = {"127.0.0.1", "localhost"}', server)
        self.assertIn("def is_trusted_api_request(self) -> bool:", server)
        self.assertIn("class BoundedThreadingHTTPServer(ThreadingHTTPServer):", server)
        self.assertIn("daemon_threads = True", server)
        self.assertIn("MAX_LOCAL_SERVER_THREADS = 64", server)
        self.assertIn('content_type != "application/json"', server)
        self.assertIn('request_path == "/api/obs/input"', server)
        self.assertIn('request_path == "/api/obs/snapshot"', server)
        self.assertIn('request_path == "/api/obs/config"', server)
        self.assertIn('request_path == "/api/obs/events"', server)
        self.assertIn("OBS_SNAPSHOT_MAX_BYTES = 24 * 1024 * 1024", server)
        self.assertIn("CONTENT_SECURITY_POLICY = (", server)
        self.assertIn("Content-Security-Policy", server)
        self.assertIn("X-Content-Type-Options", server)
        self.assertIn("Permissions-Policy", server)
        self.assertIn("except (json.JSONDecodeError, UnicodeDecodeError, ValueError):", server)
        self.assertNotIn("except Exception:", server)

    def test_local_server_security_headers_and_api_guards_runtime(self) -> None:
        handler = partial(QuietNoCacheHandler, directory=str(ROOT))
        server = BoundedThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        host, port = server.server_address

        def request(method: str, path: str, body: str | None = None, headers: dict[str, str] | None = None):
            connection = HTTPConnection(host, port, timeout=5)
            connection.request(method, path, body=body, headers=headers or {})
            response = connection.getresponse()
            payload = response.read()
            connection.close()
            return response, payload

        def request_with_declared_length(path: str, declared_length: int, body: bytes):
            connection = HTTPConnection(host, port, timeout=5)
            connection.putrequest("POST", path)
            connection.putheader("Content-Type", "application/json")
            connection.putheader("Origin", f"http://127.0.0.1:{port}")
            connection.putheader("Content-Length", str(declared_length))
            connection.endheaders()
            connection.send(body)
            response = connection.getresponse()
            payload = response.read()
            connection.close()
            return response, payload

        try:
            response, _ = request("GET", "/")
            self.assertEqual(response.status, 200)
            csp = response.getheader("Content-Security-Policy")
            self.assertIsNotNone(csp)
            csp_directives = self.csp_directive_map(csp)
            self.assertEqual(csp_directives["object-src"], "object-src 'none'")
            self.assertEqual(csp_directives["base-uri"], "base-uri 'none'")
            for directive_name in ["script-src", "connect-src"]:
                tokens = csp_directives[directive_name].split()[1:]
                self.assertNotIn("'unsafe-inline'", tokens)
                self.assertNotIn("'unsafe-eval'", tokens)
                self.assertNotIn("*", tokens)
                self.assertNotIn("data:", tokens)
            self.assertEqual(response.getheader("X-Content-Type-Options"), "nosniff")
            self.assertEqual(response.getheader("Permissions-Policy"), "camera=(self), microphone=(self)")

            response, _ = request("GET", "/.git/config")
            self.assertEqual(response.status, 404)

            response, _ = request("GET", "/%2e%2e/app.js")
            self.assertEqual(response.status, 404)

            body = '{"preset":"light"}'
            response, _ = request(
                "POST",
                "/api/obs/config",
                body,
                {
                    "Content-Type": "application/json",
                    "Origin": "https://example.com",
                },
            )
            self.assertEqual(response.status, 403)

            response, _ = request(
                "POST",
                "/api/obs/config",
                body,
                {
                    "Content-Type": "application/json",
                    "Referer": "https://example.com/page",
                },
            )
            self.assertEqual(response.status, 403)

            response, _ = request(
                "POST",
                "/api/obs/config",
                body,
                {
                    "Content-Type": "text/plain",
                    "Origin": f"http://127.0.0.1:{port}",
                },
            )
            self.assertEqual(response.status, 403)

            response, _ = request(
                "POST",
                "/api/obs/config",
                "{invalid-json",
                {
                    "Content-Type": "application/json",
                    "Origin": f"http://127.0.0.1:{port}",
                },
            )
            self.assertEqual(response.status, 400)

            response, _ = request(
                "POST",
                "/api/obs/input",
                json.dumps({"text": "x" * (70 * 1024)}),
                {
                    "Content-Type": "application/json",
                    "Origin": f"http://127.0.0.1:{port}",
                },
            )
            self.assertEqual(response.status, 400)

            response, _ = request_with_declared_length(
                "/api/obs/snapshot",
                OBS_SNAPSHOT_MAX_BYTES + 1,
                b"{}",
            )
            self.assertEqual(response.status, 400)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

    def test_app_security_and_package_guards_exist(self) -> None:
        app = self.read_text("app.js")
        for forbidden in ["innerHTML", "eval(", "document.write"]:
            self.assertNotIn(forbidden, app)
        for expected in [
            "function sanitizeImportedJsonValue(",
            "const MAX_JSON_SANITIZE_DEPTH = 32",
            "const FORBIDDEN_JSON_KEYS",
            "function assertSafePackagePath(path)",
            "const MAX_PURUPURU_PACKAGE_SIZE = 80 * 1024 * 1024",
            "const MAX_PURUPURU_UNZIPPED_SIZE = 120 * 1024 * 1024",
            "const ZIP_LOCAL_FILE_HEADER_SIG = 0x04034b50",
            "const ZIP_CENTRAL_DIRECTORY_SIG = 0x02014b50",
            "const ZIP_END_OF_CENTRAL_DIRECTORY_SIG = 0x06054b50",
            "const nextTotal = totalSize + compressedSize",
            "if (nextTotal > MAX_PURUPURU_UNZIPPED_SIZE)",
            "const MAX_OBS_SNAPSHOT_JSON_BYTES = 24 * 1024 * 1024",
            "const MAX_OBS_SNAPSHOT_AVATAR_IMAGE_DATA_URL_SIZE = 12 * 1024 * 1024",
            "validatePngDataUrl(src, name, MAX_OBS_SNAPSHOT_AVATAR_IMAGE_DATA_URL_SIZE)",
            "return await applyObsSnapshot(snapshot)",
            "Promise.allSettled(Object.keys(AVATAR_PACKAGE_ASSETS).map",
            "function closeObsEventSource(",
            "function handlePageHide(",
            "window.addEventListener(\"pageshow\", restoreResourcesAfterPageShow)",
            "function integrateHairSpringBucket(",
            "let faceRigMetricsCacheFrame = -1",
            "faceRigMetricsCacheFrame === motionFrameId",
        ]:
            self.assertIn(expected, app)

    def test_js_runtime_security_and_package_guards(self) -> None:
        result = subprocess.run(
            ["node", str(ROOT / "tests" / "js_runtime_checks.mjs")],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_item_layer_deform_follow_is_opt_in(self) -> None:
        app = self.read_text("app.js")
        html = self.read_text("index.html")
        self.assertIn('faceBack: { label: "顔の後ろ・後ろ髪の前", anchor: "character", deformFollow: "backHair" }', app)
        self.assertIn('faceFront: { label: "顔の前・前髪の下", anchor: "character", rigidFollow: "face" }', app)
        self.assertIn('frontHairFront: { label: "前髪の前", anchor: "character", rigidFollow: "frontHair" }', app)
        self.assertIn("deformFollowEnabled: false", app)
        self.assertIn('id="itemDeformFollowEnabled"', html)
        self.assertIn("deformFollowEnabled: Boolean(layer.deformFollowEnabled)", app)
        self.assertIn("deformFollowEnabled: Boolean(layerData?.deformFollowEnabled)", app)
        self.assertIn("function drawCharacterAnchoredItemLayers(slotKey)", app)
        self.assertIn("function itemLayerRigidFollowOffset(layer)", app)
        self.assertIn("function itemLayerRenderedCenter(layer)", app)
        self.assertIn("function itemLayerDeformFollowSpec(layer)", app)
        self.assertIn("function drawDeformedItemLayer(targetCtx, layer, deformSpec)", app)
        self.assertIn("function faceRigidFollowPoint(x, y)", app)
        self.assertIn("function frontHairRigidFollowPoint(x, y)", app)
        self.assertIn('followed = faceRigidFollowPoint(center.x, center.y)', app)
        self.assertIn('followed = frontHairRigidFollowPoint(center.x, center.y)', app)
        self.assertNotIn('followed = hairWarpPoint(center.x, center.y, "front")', app)
        self.assertIn('return { warpFn: (x, y) => hairWarpPoint(x, y, "front"), cols: 14, rows: 10 }', app)
        self.assertIn('return { warpFn: (x, y) => hairWarpPoint(x, y, "back"), cols: 14, rows: 10 }', app)
        self.assertIn("drawItemLayers(ctx, slotKey)", app)
        self.assertIn("const hadDeformFollow = Boolean(layer.deformFollowEnabled)", app)
        self.assertIn("変形連動をOFFにしました", app)
        self.assertNotIn("function itemSlotFollowSpec(slotKey)", app)
        self.assertNotIn("function drawWarpedItemLayers(", app)
        self.assertNotIn("itemLayerRenderCanvases", app)

    def test_item_rigid_follow_strength_is_per_layer_and_excludes_face_back(self) -> None:
        app = self.read_text("app.js")
        html = self.read_text("index.html")
        self.assertIn("followStrength: 100", app)
        self.assertIn("followStrength: { min: 0, max: 200 }", app)
        self.assertIn('id="itemFollowStrength"', html)
        self.assertIn("顔・髪への追従度", html)
        self.assertIn("followStrength: layer.followStrength", app)
        self.assertIn("function itemLayerSupportsRigidFollow(layer)", app)
        self.assertIn('return slot.anchor === "character" && Boolean(slot.rigidFollow)', app)
        self.assertIn("const canRigidFollow = Boolean(activeLayer && itemLayerSupportsRigidFollow(layer))", app)
        self.assertIn("const deformFollowActive = Boolean(layer.deformFollowEnabled && canDeformFollow)", app)
        self.assertIn("!canRigidFollow || deformFollowActive", app)
        self.assertIn("setRangeControlValue(\"itemFollowStrength\", Math.round(layer.followStrength))", app)
        self.assertIn('ui.itemFollowStrength?.addEventListener("input", () => setItemLayerValue("followStrength", Number(ui.itemFollowStrength.value)))', app)
        self.assertIn("function itemLayerFollowStrengthAmount(layer)", app)
        self.assertIn("const value = Number(layer?.followStrength ?? ITEM_LAYER_DEFAULTS.followStrength)", app)
        self.assertIn("x: (followed.x - center.x) * strength", app)
        self.assertIn("y: (followed.y - center.y) * strength", app)
        self.assertIn("followStrength: normalizeItemNumber(", app)
        rigid_body = self.js_function_body(app, "function itemLayerRigidFollowOffset(layer)")
        self.assertIn("if (slot.anchor === \"stage\" || !slot.rigidFollow) return { x: 0, y: 0 }", rigid_body)
        self.assertNotIn("slot.deformFollow", rigid_body)

    def test_item_import_trims_transparent_padding_and_auto_fits_large_images(self) -> None:
        app = self.read_text("app.js")
        self.assertIn("const ITEM_TRIM_ALPHA_THRESHOLD = 1", app)
        self.assertIn("const ITEM_INITIAL_MAX_WIDTH_RATIO = 0.82", app)
        self.assertIn("const ITEM_INITIAL_MAX_HEIGHT_RATIO = 0.82", app)
        self.assertIn("function trimTransparentItemImage(image, src, name = \"PNGアイテム\")", app)
        self.assertIn('canvas.getContext("2d", { willReadFrequently: true })', app)
        self.assertIn("ctx.getImageData(0, 0, width, height).data", app)
        self.assertIn("if (alpha <= ITEM_TRIM_ALPHA_THRESHOLD) continue", app)
        self.assertIn("trimmedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH)", app)
        self.assertIn("const trimmedImage = await loadItemImageFromSrc(trimmedSrc, name)", app)
        self.assertIn("const optimized = await trimTransparentItemImage(image, src, file.name)", app)
        self.assertIn("function initialItemScaleForImage(image)", app)
        self.assertIn("const maxW = CROP.w * ITEM_INITIAL_MAX_WIDTH_RATIO", app)
        self.assertIn("const maxH = CROP.h * ITEM_INITIAL_MAX_HEIGHT_RATIO", app)
        self.assertIn("return Math.round(clamp(fit * ITEM_LAYER_DEFAULTS.scale, ITEM_LAYER_LIMITS.scale.min, ITEM_LAYER_DEFAULTS.scale))", app)
        self.assertIn("layer.scale = initialItemScaleForImage(layer.image)", app)
        self.assertIn("透明余白と初期サイズを自動調整しました", app)
        revive_body = self.js_function_body(app, "async function reviveItemLayer(")
        self.assertNotIn("trimTransparentItemImage", revive_body)

    def test_hair_visibility_toggle_hides_original_hair_only(self) -> None:
        app = self.read_text("app.js")
        html = self.read_text("index.html")
        self.assertIn('id="hairVisible"', html)
        self.assertIn("髪を表示", html)
        self.assertIn('hair: ["hairVisible", "hairWarp", "hairSpring", "hairBundleStrength"]', app)
        self.assertIn("hairVisible: true", app)
        self.assertIn('hairVisible: document.querySelector("#hairVisible")', app)
        self.assertIn("if (ui.hairVisible) ui.hairVisible.checked = Boolean(state.hairVisible)", app)
        self.assertIn("state.hairVisible = ui.hairVisible.checked", app)
        self.assertIn('updateChangedBadgeForControl("hairVisible")', app)
        self.assertRegex(app, r"function drawBackHairLayer\(\) \{\s+if \(!state\.hairVisible\) return;")
        self.assertRegex(app, r"function drawFrontHairLayer\(\) \{\s+if \(!state\.hairVisible\) return;")
        self.assertRegex(app, r"function drawFrontHairCastShadow\(\) \{[\s\S]*?if \(!state\.hairVisible\) return;")
        spec_body = self.js_function_body(app, "function itemLayerDeformFollowSpec(layer)")
        self.assertNotIn("hairVisible", spec_body)

    def test_range_outputs_are_associated_with_inputs(self) -> None:
        html = self.read_text("index.html")
        matches = re.findall(r'<input id="([^"]+)" type="range"[^>]*>\s*<output for="([^"]+)"', html)
        self.assertGreater(len(matches), 30)
        for input_id, output_for in matches:
            self.assertEqual(output_for, input_id)

    def test_character_profile_switcher_mvp_is_wired(self) -> None:
        html = self.read_text("index.html")
        css = self.read_text("styles.css")
        app = self.read_text("app.js")

        for fragment in [
            'id="characterSwitcher"',
            'id="characterSwitcherButton"',
            'id="characterList"',
            'id="addCharacterFileInput"',
            'id="duplicateCharacterButton"',
            "このキャラを置き換え",
        ]:
            self.assertIn(fragment, html)

        self.assertIn("body.obs-mode .character-switcher", css)

        for fragment in [
            'const ACTIVE_CHARACTER_STORAGE_KEY = "purupuru-pngtuber-active-character-id-v1"',
            'const CHARACTER_DB_NAME = "purupuru-pngtuber-character-library-v1"',
            "async function parsePuruPuruPackageBlob(",
            "async function applyParsedPuruPuruPackage(",
            "async function buildCharacterProfileRecordFromCurrentApp(",
            "async function initializeCharacterLibraryAfterAssetsReady(",
            "async function avatarImageBlobsSignature(",
            "async function buildAvatarCompositeThumbnailDataUrl(",
            "async function refreshDefaultCharacterProfileItems(",
            "function assetMapForCharacterProfile(",
            "async function refreshAssetBackedCharacterProfileAssets(",
            "const AVATAR_ASSET_THUMBNAIL_VERSION = \"composite-v1\"",
            "assetSignature",
            "thumbnailVersion",
            "defaultItemsSignature",
            "async function switchCharacterProfile(",
            "async function flushActiveCharacterAutosave(",
            "async function duplicateActiveCharacterProfile(",
            "async function addCharacterProfileFromFile(",
        ]:
            self.assertIn(fragment, app)

        load_body = self.js_function_body(app, "async function loadPuruPuruPackageFromFile(")
        self.assertIn("parsePuruPuruPackageBlob(file, file.name)", load_body)
        self.assertIn("applyParsedPuruPuruPackage(parsed", load_body)
        self.assertIn("tryRememberAllSettingsPayload(buildAllSettingsPayload({ includeItemImages: false }))", load_body)

        flush_body = self.js_function_body(app, "async function flushActiveCharacterAutosave(")
        self.assertNotIn("buildPuruPuruPackagePayload", flush_body)

    def test_gitignore_and_gitattributes_cover_public_cleanup(self) -> None:
        gitignore = self.read_text(".gitignore")
        for item in [
            "__pycache__/",
            "*.py[cod]",
            "node_modules/",
            ".agents/",
            "*.purupuru",
            "assets/*_backup_*/",
            ".DS_Store",
            "Thumbs.db",
            ".vscode/",
            ".idea/",
        ]:
            self.assertIn(item, gitignore)

        gitattributes = self.read_text(".gitattributes")
        for item in [
            ".editorconfig text eol=lf",
            ".gitattributes text eol=lf",
            ".gitignore text eol=lf",
            "LICENSE text eol=lf",
            "*.bat text eol=crlf",
            "*.sh text eol=lf",
            "*.js text eol=lf",
            "*.py text eol=lf",
            "*.png binary",
            "*.purupuru binary",
        ]:
            self.assertIn(item, gitattributes)

    def test_github_community_files_and_templates_are_clean(self) -> None:
        owner_placeholder = "OWN" + "ER"
        github_owner_placeholder = "github.com/" + owner_placeholder
        for relative in [
            ".github/CONTRIBUTING.md",
            ".github/CODE_OF_CONDUCT.md",
            ".github/SECURITY.md",
            ".github/SUPPORT.md",
            ".github/ISSUE_TEMPLATE/bug_report.yml",
            ".github/ISSUE_TEMPLATE/feature_request.yml",
            ".github/ISSUE_TEMPLATE/config.yml",
            ".github/pull_request_template.md",
        ]:
            text = self.read_text(relative)
            self.assertNotIn(owner_placeholder, text)
            self.assertNotIn(github_owner_placeholder, text)
        for relative in ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md", "SUPPORT.md"]:
            self.assertFalse((ROOT / relative).exists(), relative)

    def test_public_markdown_relative_links_exist(self) -> None:
        public_markdown_paths = [
            path for path in self.iter_public_paths()
            if path.suffix.lower() == ".md"
        ]
        self.assertTrue(public_markdown_paths)
        root = ROOT.resolve()
        for path in public_markdown_paths:
            text = path.read_text(encoding="utf-8")
            for link in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
                target = link.split(" ", 1)[0].strip("<>")
                if not target or target.startswith("#"):
                    continue
                if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
                    continue
                target = target.split("#", 1)[0]
                if not target:
                    continue
                target_path = (path.parent / target).resolve()
                message = f"{path.relative_to(ROOT)} -> {link}"
                self.assertTrue(str(target_path).startswith(str(root)), message)
                self.assertTrue(target_path.exists(), message)

    def test_no_public_generated_backup_or_raw_material_files(self) -> None:
        forbidden_fragments = [
            "#" + "U",
            "new" + "-character",
            "_backup_",
            "demo-avatar_backup",
            "トマリ" + "素材",
            "新キャラ差し替え",
            "mit" + "suya",
        ]
        self.assertFalse((ROOT / "docs" / "archive").exists())
        for path in self.iter_public_paths():
            relative = path.relative_to(ROOT).as_posix()
            for fragment in forbidden_fragments:
                self.assertNotIn(fragment, relative)
            if path.is_file():
                self.assertNotEqual(path.suffix, ".pyc", relative)
                self.assertNotEqual(path.suffix, ".purupuru", relative)

    def test_public_tree_has_ascii_paths(self) -> None:
        for path in self.iter_public_paths():
            relative = path.relative_to(ROOT).as_posix()
            try:
                relative.encode("ascii")
            except UnicodeEncodeError:
                self.fail(f"Use ASCII file and directory names for public repository paths: {relative}")


if __name__ == "__main__":
    unittest.main()
