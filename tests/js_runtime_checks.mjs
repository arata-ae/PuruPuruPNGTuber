// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function findBlockEnd(text, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("Could not find block end");
}

function findStatementEnd(text, startIndex) {
  let paren = 0;
  let square = 0;
  let brace = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") paren += 1;
    else if (char === ")") paren -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}") brace -= 1;
    else if (char === ";" && paren === 0 && square === 0 && brace === 0) return index;
  }
  throw new Error("Could not find statement end");
}

function findFunctionBodyOpen(text, startIndex) {
  const parenStart = text.indexOf("(", startIndex);
  if (parenStart < 0) throw new Error("Could not find function parameters");
  let paren = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = parenStart; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") paren += 1;
    else if (char === ")") {
      paren -= 1;
      if (paren === 0) {
        const open = text.indexOf("{", index + 1);
        if (open >= 0) return open;
        break;
      }
    }
  }
  throw new Error("Could not find function body");
}

function extractFunction(signature) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`Missing function: ${signature}`);
  const open = findFunctionBodyOpen(source, start);
  const end = findBlockEnd(source, open);
  return source.slice(start, end + 1);
}

function extractConst(name) {
  const marker = `const ${name} =`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing const: ${name}`);
  const end = findStatementEnd(source, start);
  return source.slice(start, end + 1);
}

const definitions = [
  extractConst("MAX_JSON_SANITIZE_DEPTH"),
  extractConst("MAX_JSON_KEYS_PER_OBJECT"),
  extractConst("MAX_JSON_ARRAY_LENGTH"),
  extractConst("MAX_JSON_STRING_LENGTH"),
  extractConst("MAX_JSON_DATA_URL_STRING_LENGTH"),
  extractConst("MAX_JSON_NODE_COUNT"),
  extractConst("FORBIDDEN_JSON_KEYS"),
  extractConst("PNG_DATA_URL_PREFIX"),
  extractConst("PNG_BASE64_SIGNATURE"),
  extractConst("MAX_AVATAR_IMAGE_EDGE"),
  extractConst("MAX_AVATAR_IMAGE_PIXELS"),
  extractConst("PERF_STORAGE_KEY"),
  extractConst("ACTIVE_ANIMATION_FPS_MIN"),
  extractConst("ACTIVE_ANIMATION_FPS_DEFAULT"),
  extractConst("ACTIVE_ANIMATION_FPS_MAX"),
  extractConst("RAF_CADENCE_LEAD_MS"),
  extractConst("RECENT_ACTIVITY_MS"),
  extractConst("MAX_PURUPURU_PACKAGE_SIZE"),
  extractConst("MAX_PURUPURU_UNZIPPED_SIZE"),
  extractConst("MAX_PURUPURU_ENTRY_COUNT"),
  extractConst("ZIP_LOCAL_FILE_HEADER_SIG"),
  extractConst("ZIP_CENTRAL_DIRECTORY_SIG"),
  extractConst("ZIP_END_OF_CENTRAL_DIRECTORY_SIG"),
  extractConst("ZIP_UTF8_FLAG"),
  extractConst("ZIP_STORE_METHOD"),
  extractConst("AVATAR_PACKAGE_ASSETS"),
  extractFunction("function sanitizeImportedJsonValue("),
  extractFunction("function parseSettingsJson("),
  extractFunction("function textToU8("),
  extractFunction("function u8ToText("),
  "let crc32Table = null;",
  extractFunction("function getCrc32Table("),
  extractFunction("function crc32("),
  extractFunction("function zipDateParts("),
  extractFunction("function concatU8("),
  extractFunction("function assertSafePackagePath("),
  extractFunction("function buildStoredZip("),
  extractFunction("function findZipEndOfCentralDirectory("),
  extractFunction("async function unzipPuruPuruPackage("),
  extractFunction("function normalizePngDataUrl("),
  extractFunction("function validatePngDataUrl("),
  extractFunction("function u8ToPngDataUrl("),
  extractFunction("function cloneJsonValue("),
  extractFunction("function perfUrlFlagEnabled("),
  extractFunction("function readPerfEnabled("),
  "let scheduledTickMinDelayMs = 0;",
  "let scheduledTickTargetTimestamp = 0;",
  "let animationCadenceTargetTimestamp = 0;",
  "let animationCadenceLastRafTimestamp = 0;",
  "let animationCadenceRafIntervalMs = RAF_CADENCE_LEAD_MS;",
  "const OBS_MODE = false;",
  "function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }",
  "const state = { activeAnimationFps: ACTIVE_ANIMATION_FPS_DEFAULT, angleX: 0, angleY: 0, demoTalk: false, hairVisible: false, highlightEnabled: false, highlightFilmWobble: 0, rangePreviewDirection: null, rollStrength: 0, subHighlightEnabled: false, subHighlightFilmWobble: 0, targetX: 0, targetY: 0, tearLensEnabled: false, tearLensStrength: 0 };",
  "let imagesReady = true;",
  "let loadError = '';",
  "let loadErrorFramePending = false;",
  "let obsPublishEnabled = false;",
  "let micOn = false;",
  "let blinkEvent = null;",
  "let blinkClosed = false;",
  "let voiceLevel = 0;",
  "let mouthMotionLevel = 0;",
  "let jawPuniLevel = 0;",
  "let lastRuntimeActivityAt = -Infinity;",
  "let dragReasonForTest = null;",
  "let faceTrackingActiveForTest = false;",
  "let idleReasonForTest = null;",
  "let idleHoldDelayForTest = null;",
  "let interactionModeActiveForTest = false;",
  "let hairWarpAmountForTest = 0;",
  "let hairBundleStrengthAmountForTest = 0;",
  "function setupModeActive() { return Boolean(state.setupModeActiveForTest); }",
  "function dragMotionReason() { return dragReasonForTest; }",
  "function isFaceTrackingActive() { return faceTrackingActiveForTest; }",
  "function idleMotionActiveReason() { return idleReasonForTest; }",
  "function idleMotionHoldDelay() { return idleHoldDelayForTest; }",
  "function interactionModeActive() { return interactionModeActiveForTest; }",
  "function hairWarpAmount() { return hairWarpAmountForTest; }",
  "function hairBundleStrengthAmount() { return hairBundleStrengthAmountForTest; }",
  "function currentObsRenderFps() { return 30; }",
  "function currentObsPreset() { return { sendFps: 15 }; }",
  extractFunction("function activeAnimationFps("),
  extractFunction("function activeAnimationFrameDelayMs("),
  extractFunction("function resetAnimationCadence("),
  extractFunction("function recordAnimationCadenceRafTimestamp("),
  extractFunction("function shouldWaitForCadenceRaf("),
  extractFunction("function runtimeMotionReason("),
  extractFunction("function runtimeAmbientMotionReason("),
  extractFunction("function animationDelayForMotionReason("),
  extractFunction("function nextAnimationDecision("),
  extractFunction("function pngU8ToBlob("),
  extractFunction("function assertPngU8("),
  extractFunction("function pngU8Dimensions("),
  extractFunction("function validateAvatarImageSize("),
  extractFunction("function avatarImageDimensions("),
  extractFunction("function validateAvatarImageDimensions("),
  `async function loadPngImageFromU8(u8, name = "PNG") {
  assertPngU8(u8, name);
  return { naturalWidth: 900, naturalHeight: 900, width: 900, height: 900 };
}` ,
  extractFunction("async function parsePuruPuruPackageBlob("),
].join("\n\n");

const testProgram = `
${definitions}

(async () => {

function expectThrow(fn, pattern) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, "Expected function to throw");
  if (pattern) assert.match(String(thrown.message), pattern);
}

async function expectReject(fn, pattern) {
  let thrown = null;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, "Expected promise to reject");
  if (pattern) assert.match(String(thrown.message), pattern);
}

function indexOfBytes(haystack, needle) {
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function replaceAllBytes(buffer, from, to) {
  assert.equal(from.length, to.length, "replacement must keep ZIP header lengths stable");
  let index = 0;
  let count = 0;
  while (index <= buffer.length - from.length) {
    const found = indexOfBytes(buffer.subarray(index), from);
    if (found < 0) break;
    const absolute = index + found;
    buffer.set(to, absolute);
    index = absolute + to.length;
    count += 1;
  }
  assert.ok(count >= 2, "expected local and central filenames to be replaced");
}

function localStorageStub(value) {
  return {
    getItem(key) {
      assert.equal(key, PERF_STORAGE_KEY);
      return value;
    },
    setItem() {},
  };
}

function resetSchedulerState() {
  Object.assign(state, {
    activeAnimationFps: ACTIVE_ANIMATION_FPS_DEFAULT,
    angleX: 0,
    angleY: 0,
    demoTalk: false,
    hairVisible: false,
    highlightEnabled: false,
    highlightFilmWobble: 0,
    rangePreviewDirection: null,
    rollStrength: 0,
    setupModeActiveForTest: false,
    subHighlightEnabled: false,
    subHighlightFilmWobble: 0,
    targetX: 0,
    targetY: 0,
    tearLensEnabled: false,
    tearLensStrength: 0,
  });
  imagesReady = true;
  loadError = "";
  loadErrorFramePending = false;
  obsPublishEnabled = false;
  micOn = false;
  blinkEvent = null;
  blinkClosed = false;
  voiceLevel = 0;
  mouthMotionLevel = 0;
  jawPuniLevel = 0;
  lastRuntimeActivityAt = -Infinity;
  dragReasonForTest = null;
  faceTrackingActiveForTest = false;
  idleReasonForTest = null;
  idleHoldDelayForTest = null;
  interactionModeActiveForTest = false;
  hairWarpAmountForTest = 0;
  hairBundleStrengthAmountForTest = 0;
}

function simulateCadenceFps(refreshHz, targetFps = 60, frames = 300) {
  resetAnimationCadence();
  const refreshIntervalMs = 1000 / refreshHz;
  const targetDelayMs = 1000 / targetFps;
  let now = 0;
  let lastDrawTimestamp = 0;
  const draws = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const targetTimestamp =
      (animationCadenceTargetTimestamp || lastDrawTimestamp || now) + targetDelayMs;
    while (true) {
      const candidate = Math.ceil((now + 0.00001) / refreshIntervalMs) * refreshIntervalMs;
      recordAnimationCadenceRafTimestamp(candidate);
      now = candidate;
      if (shouldWaitForCadenceRaf(candidate, targetTimestamp)) continue;
      animationCadenceTargetTimestamp = targetTimestamp;
      lastDrawTimestamp = candidate;
      draws.push(candidate);
      break;
    }
  }
  const intervals = draws.slice(1).map((timestamp, index) => timestamp - draws[index]);
  const avgMs = intervals.reduce((total, interval) => total + interval, 0) / intervals.length;
  return 1000 / avgMs;
}

function jsonBytes(value) {
  return textToU8(JSON.stringify(value));
}

function tinyPngBytes() {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

function pngHeaderBytes(width, height) {
  const u8 = new Uint8Array(24);
  u8.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  u8.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  u8[16] = (width >>> 24) & 0xff;
  u8[17] = (width >>> 16) & 0xff;
  u8[18] = (width >>> 8) & 0xff;
  u8[19] = width & 0xff;
  u8[20] = (height >>> 24) & 0xff;
  u8[21] = (height >>> 16) & 0xff;
  u8[22] = (height >>> 8) & 0xff;
  u8[23] = height & 0xff;
  return u8;
}

function minimalPackageBlob({ manifestPatch = {}, omitManifest = false, omitSettings = false } = {}) {
  const manifest = {
    format: "purupuru-avatar-package",
    settings: "settings.json",
    thumbnail: "thumbnail.png",
    avatar: { ...AVATAR_PACKAGE_ASSETS },
    ...manifestPatch,
  };
  const files = Object.create(null);
  if (!omitManifest) files["manifest.json"] = jsonBytes(manifest);
  if (!omitSettings) files["settings.json"] = jsonBytes({ state: {}, itemLayers: [] });
  for (const path of Object.values(AVATAR_PACKAGE_ASSETS)) files[path] = tinyPngBytes();
  files["thumbnail.png"] = tinyPngBytes();
  return new Blob([buildStoredZip(files)], { type: "application/vnd.purupuru.avatar+zip" });
}

assert.equal(assertSafePackagePath("settings.json"), "settings.json");
assert.equal(assertSafePackagePath("avatar/body.png"), "avatar/body.png");
for (const unsafe of ["../settings.json", "/absolute.png", "C:/temp/a.png", "avatar\\\\body.png", "avatar//body.png", "avatar/./body.png", ""]) {
  expectThrow(() => assertSafePackagePath(unsafe), /不正/);
}

const polluted = sanitizeImportedJsonValue(JSON.parse('{"safe":1,"__proto__":{"polluted":true},"nested":{"constructor":1},"arr":[{"prototype":2,"ok":3}]}'));
assert.equal(polluted.safe, 1);
assert.equal(Object.prototype.polluted, undefined);
assert.equal(Object.prototype.hasOwnProperty.call(polluted, "__proto__"), false);
assert.equal(Object.prototype.hasOwnProperty.call(polluted.nested, "constructor"), false);
assert.equal(Object.prototype.hasOwnProperty.call(polluted.arr[0], "prototype"), false);
assert.equal(polluted.arr[0].ok, 3);
let deep = {};
let cursor = deep;
for (let i = 0; i < 40; i += 1) {
  cursor.next = {};
  cursor = cursor.next;
}
expectThrow(() => sanitizeImportedJsonValue(deep), /階層/);
expectThrow(
  () => sanitizeImportedJsonValue(Array.from({ length: MAX_JSON_ARRAY_LENGTH + 1 }, () => 0)),
  /配列/,
);
expectThrow(
  () =>
    sanitizeImportedJsonValue(
      Object.fromEntries(Array.from({ length: MAX_JSON_KEYS_PER_OBJECT + 1 }, (_, index) => [\`k\${index}\`, 1])),
    ),
  /項目数/,
);
expectThrow(() => sanitizeImportedJsonValue("x".repeat(MAX_JSON_STRING_LENGTH + 1)), /文字列/);
const obsSnapshotPngDataUrl =
  PNG_DATA_URL_PREFIX + PNG_BASE64_SIGNATURE + "A".repeat(MAX_JSON_DATA_URL_STRING_LENGTH);
expectThrow(
  () => sanitizeImportedJsonValue(obsSnapshotPngDataUrl),
  /文字列/,
);
assert.equal(
  sanitizeImportedJsonValue(obsSnapshotPngDataUrl, 0, null, {
    maxDataUrlStringLength: obsSnapshotPngDataUrl.length,
  }),
  obsSnapshotPngDataUrl,
);

const pngUrl = PNG_DATA_URL_PREFIX + PNG_BASE64_SIGNATURE + "AAAA";
assert.equal(validatePngDataUrl(pngUrl, "PNG"), pngUrl);
expectThrow(() => validatePngDataUrl("data:text/plain;base64,AAAA", "PNG"), /PNG/);
expectThrow(() => validatePngDataUrl(PNG_DATA_URL_PREFIX + "AAAA", "PNG"), /PNG/);
expectThrow(() => validatePngDataUrl(pngUrl, "PNG", 12), /大きすぎ/);

assert.deepEqual(pngU8Dimensions(pngHeaderBytes(4096, 4096), "avatar"), { w: 4096, h: 4096 });
assert.deepEqual(validateAvatarImageSize({ w: MAX_AVATAR_IMAGE_EDGE, h: MAX_AVATAR_IMAGE_EDGE }, "avatar"), {
  w: MAX_AVATAR_IMAGE_EDGE,
  h: MAX_AVATAR_IMAGE_EDGE,
});
expectThrow(() => validateAvatarImageSize({ w: MAX_AVATAR_IMAGE_EDGE + 1, h: 1 }, "avatar"), /画像サイズ/);
expectThrow(() => validateAvatarImageSize(pngU8Dimensions(pngHeaderBytes(8192, 8192), "avatar"), "avatar"), /画像サイズ/);

globalThis.window = { location: { search: "?pptPerf=1", hash: "" } };
globalThis.localStorage = localStorageStub("0");
assert.equal(readPerfEnabled(), true, "URL perf flag should override stored disabled state");
globalThis.window = { location: { search: "", hash: "#purupuruPerf=true" } };
assert.equal(readPerfEnabled(), true, "hash perf flag should enable profiler");
globalThis.window = { location: { search: "", hash: "" } };
globalThis.localStorage = localStorageStub("1");
assert.equal(readPerfEnabled(), true);
globalThis.localStorage = localStorageStub("0");
assert.equal(readPerfEnabled(), false);

for (const refreshHz of [60, 75, 90, 100, 120, 144, 165, 240]) {
  const fps = simulateCadenceFps(refreshHz);
  assert.ok(fps > 58 && fps < 62, \`expected ~60fps cadence at \${refreshHz}Hz, got \${fps}\`);
}

resetSchedulerState();
assert.equal(activeAnimationFps(), 24);
assert.equal(activeAnimationFrameDelayMs(), 1000 / 24);
assert.deepEqual(nextAnimationDecision(10_000), { delayMs: null, reason: "idle" });

state.tearLensEnabled = true;
state.tearLensStrength = 100;
assert.deepEqual(nextAnimationDecision(10_000), {
  delayMs: 1000 / 24,
  rafCadence: true,
  reason: "ambient.tearLens.activeFps",
});

resetSchedulerState();
obsPublishEnabled = true;
micOn = true;
assert.equal(runtimeMotionReason(10_000), "voice.mic", "voice should outrank OBS publish");
micOn = false;
assert.deepEqual(nextAnimationDecision(10_000), {
  delayMs: 1000 / 15,
  rafCadence: true,
  reason: "active.obsPublish",
});

assert.equal(crc32(textToU8("123456789")), 0xcbf43926);

const goodZip = buildStoredZip({ "settings.json": textToU8("{}") });
const unzipped = await unzipPuruPuruPackage(goodZip);
assert.equal(u8ToText(unzipped["settings.json"]), "{}");

const crcZip = new Uint8Array(buildStoredZip({ "settings.json": textToU8('{"ok":true}') }));
const dataPos = indexOfBytes(crcZip, textToU8('{"ok":true}'));
assert.ok(dataPos >= 0);
crcZip[dataPos] ^= 1;
await expectReject(() => unzipPuruPuruPackage(crcZip), /CRC/);

const methodZip = new Uint8Array(buildStoredZip({ "settings.json": textToU8("{}") }));
const methodEocdOffset = findZipEndOfCentralDirectory(methodZip);
const methodCentralOffset = new DataView(methodZip.buffer, methodZip.byteOffset + methodEocdOffset, 22).getUint32(16, true);
new DataView(methodZip.buffer, methodZip.byteOffset + methodCentralOffset, 46).setUint16(10, 8, true);
await expectReject(() => unzipPuruPuruPackage(methodZip), /圧縮ZIP/);

const traversalZip = new Uint8Array(buildStoredZip({ "aa/settings.json": textToU8("{}") }));
replaceAllBytes(traversalZip, textToU8("aa/settings.json"), textToU8("../settings.json"));
await expectReject(() => unzipPuruPuruPackage(traversalZip), /不正/);

const manyFiles = Object.create(null);
for (let i = 0; i <= MAX_PURUPURU_ENTRY_COUNT; i += 1) {
  manyFiles["files/" + i + ".txt"] = textToU8(String(i));
}
await expectReject(() => unzipPuruPuruPackage(buildStoredZip(manyFiles)), /ファイル数/);

const parsed = await parsePuruPuruPackageBlob(minimalPackageBlob());
assert.equal(parsed.settingsPayload.avatarImageSize.width, 900);
assert.equal(parsed.settingsPayload.avatarImageSize.height, 900);
assert.equal(Object.keys(parsed.avatarImageBlobs).length, Object.keys(AVATAR_PACKAGE_ASSETS).length);

await expectReject(() => parsePuruPuruPackageBlob(minimalPackageBlob({ omitManifest: true })), /manifest/);
await expectReject(() => parsePuruPuruPackageBlob(minimalPackageBlob({ omitSettings: true })), /settings/);
await expectReject(() => parsePuruPuruPackageBlob(minimalPackageBlob({ manifestPatch: { settings: "../settings.json" } })), /不正/);
})();
`;

await vm.runInNewContext(testProgram, {
  assert,
  Blob,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  DataView,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
});
