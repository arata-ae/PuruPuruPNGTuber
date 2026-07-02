// SPDX-License-Identifier: Apache-2.0
(() => {
  "use strict";

  const DEFAULT_AVATAR_IMAGE_SIZE = { w: 1024, h: 1536 };
  const CROP = { x: 0, y: 0, w: DEFAULT_AVATAR_IMAGE_SIZE.w, h: DEFAULT_AVATAR_IMAGE_SIZE.h };
  const DEFAULT_FACE_CENTER = { x: 512, y: 726 };
  const TAU = Math.PI * 2;
  const HAIR_WARP_EFFECT_MULTIPLIER = 2; // 髪の揺れ・遅れ: 50% で従来の 100% 相当にする。
  const IDLE_MOTION_RANGE_BOOST = 1.22; // 待機モーションは手動マウス操作に近く見えるよう、可動範囲を少し強めに使う。
  const FACE_TRACKING_CONFIG = {
    visionModuleUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs",
    wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    calibrationFrames: 30,
    smoothing: 0.35,
    yawGain: 1.45,
    pitchGain: 6,
  };
  const FACE_LANDMARKS = {
    noseTip: 1,
    leftEyeOuter: 33,
    rightEyeOuter: 263,
    chin: 152,
  };
  const URL_PARAMS = new URLSearchParams(window.location.search);
  const APP_MODE = String(URL_PARAMS.get("mode") || "control").toLowerCase();
  const OBS_MODE = APP_MODE === "obs";
  const OBS_PRESETS = {
    light: { label: "軽量", fps: 30, quality: "low", width: 960, height: 540, sendFps: 20 },
    standard: { label: "標準", fps: 30, quality: "standard", width: 1280, height: 720, sendFps: 30 },
    high: { label: "高品質", fps: 30, quality: "high", width: 1280, height: 720, sendFps: 30 },
  };
  const DEFAULT_OBS_PRESET = "light";
  const OBS_TRANSPARENT = OBS_MODE && URL_PARAMS.get("transparent") !== "0";
  const OBS_TARGET_FPS = 0;
  const OBS_QUALITY = "";
  const RENDERER_MODE_STORAGE_KEY = "purupuru-pngtuber-renderer-mode-v1";
  const RENDERER_MODES = new Set(["auto", "webgpu", "canvas"]);
  const ACTIVE_ANIMATION_FPS_MIN = 12;
  const ACTIVE_ANIMATION_FPS_MAX = 60;
  const ACTIVE_ANIMATION_FPS_DEFAULT = 24;

  const ASSETS = {
    backHair: "assets/demo-avatar/back-hair.png",
    frontHair: "assets/demo-avatar/front-hair.png",
    eyesOpenMouthClosed: "assets/demo-avatar/eyes-open-mouth-closed.png",
    eyesOpenMouthHalf: "assets/demo-avatar/eyes-open-mouth-half.png",
    eyesOpenMouthOpen: "assets/demo-avatar/eyes-open-mouth-open.png",
    eyesClosedMouthClosed: "assets/demo-avatar/eyes-closed-mouth-closed.png",
    eyesClosedMouthHalf: "assets/demo-avatar/eyes-closed-mouth-half.png",
    eyesClosedMouthOpen: "assets/demo-avatar/eyes-closed-mouth-open.png",
  };
  const DEMO_AVATAR02_ASSETS = {
    backHair: "assets/demo-avatar02/back-hair.png",
    frontHair: "assets/demo-avatar02/front-hair.png",
    eyesOpenMouthClosed: "assets/demo-avatar02/eyes-open-mouth-closed.png",
    eyesOpenMouthHalf: "assets/demo-avatar02/eyes-open-mouth-half.png",
    eyesOpenMouthOpen: "assets/demo-avatar02/eyes-open-mouth-open.png",
    eyesClosedMouthClosed: "assets/demo-avatar02/eyes-closed-mouth-closed.png",
    eyesClosedMouthHalf: "assets/demo-avatar02/eyes-closed-mouth-half.png",
    eyesClosedMouthOpen: "assets/demo-avatar02/eyes-closed-mouth-open.png",
  };
  const DEMO_AVATAR02_SOURCE_KIND = "asset-demo-avatar02";
  const DEMO_AVATAR03_ASSETS = {
    backHair: "assets/demo-avatar03/back-hair.png",
    frontHair: "assets/demo-avatar03/front-hair.png",
    eyesOpenMouthClosed: "assets/demo-avatar03/eyes-open-mouth-closed.png",
    eyesOpenMouthHalf: "assets/demo-avatar03/eyes-open-mouth-half.png",
    eyesOpenMouthOpen: "assets/demo-avatar03/eyes-open-mouth-open.png",
    eyesClosedMouthClosed: "assets/demo-avatar03/eyes-closed-mouth-closed.png",
    eyesClosedMouthHalf: "assets/demo-avatar03/eyes-closed-mouth-half.png",
    eyesClosedMouthOpen: "assets/demo-avatar03/eyes-closed-mouth-open.png",
  };
  const DEMO_AVATAR03_SOURCE_KIND = "asset-demo-avatar03";
  const DEFAULT_SETTINGS_URL = "assets/demo-avatar/default-settings.json";
  const DEMO_AVATAR02_SETTINGS_URL = "assets/demo-avatar02/default-settings.json";
  const DEMO_AVATAR03_SETTINGS_URL = "assets/demo-avatar03/default-settings.json";
  const AVATAR_PACKAGE_ASSETS = {
    backHair: "avatar/back-hair.png",
    frontHair: "avatar/front-hair.png",
    eyesOpenMouthClosed: "avatar/eyes-open-mouth-closed.png",
    eyesOpenMouthHalf: "avatar/eyes-open-mouth-half.png",
    eyesOpenMouthOpen: "avatar/eyes-open-mouth-open.png",
    eyesClosedMouthClosed: "avatar/eyes-closed-mouth-closed.png",
    eyesClosedMouthHalf: "avatar/eyes-closed-mouth-half.png",
    eyesClosedMouthOpen: "avatar/eyes-closed-mouth-open.png",
  };
  const DEFORMER_COLS = 4;
  const DEFORMER_ROWS = 4;
  const DEFORMER_KEYS = ["center", "left", "right", "up", "down"];
  const EDIT_KEY_TARGETS = {
    center: { x: 0, y: 0 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };
  const STORAGE_KEY = "purupuru-pngtuber-deformers-v2";
  const EYE_SETUP_STORAGE_KEY = "purupuru-pngtuber-eye-setup-v2";
  const FACE_CENTER_SETUP_STORAGE_KEY = "purupuru-pngtuber-face-center-setup-v2";
  const HIGHLIGHT_SETUP_STORAGE_KEY = "purupuru-pngtuber-highlight-setup-v2";
  const FACE_DEPTH_SETUP_STORAGE_KEY = "purupuru-pngtuber-face-depth-setup-v2";
  const NECK_PIVOT_SETUP_STORAGE_KEY = "purupuru-pngtuber-neck-pivot-setup-v2";
  const HAIR_BUNDLE_SETUP_STORAGE_KEY = "purupuru-pngtuber-hair-bundle-setup-v2";
  const ALL_SETTINGS_STORAGE_KEY = "purupuru-pngtuber-all-settings-v1";
  // control-group廃止で未使用（Phase 2）。旧アコーディオン開閉状態の保存に使われていた。
  // const UI_STATE_STORAGE_KEY = "move-avatar-ui-state-v6";
  const WORKSPACE_STORAGE_KEY = "purupuru-workspace-v1";
  const ADJUST_CATEGORY_STORAGE_KEY = "purupuru-adjust-category-v1";

  // Phase 4: baseline 基準値・変更済み表示
  let baselineSettings = null;

  // UI02 L1249-1312 相当: 各 adjust-page を構成する設定キー一覧。
  // resetSectionToBaseline で戻す対象をこの表で決定する。
  const ADJUST_SECTION_KEYS = {
    layout: ["avatarSize", "avatarX", "avatarY", "breathStrength", "rollStrength", "idleMotionEnabled"],
    face: ["rangeLeft", "rangeRight", "rangeUp", "rangeDown", "angleStrength", "followSpeed", "faceWarp", "angleXDeform", "angleYDeform", "faceTurnDepth", "faceTurnVertical", "diagonalFaceWarpEnabled"],
    mouth: ["micGain", "mouthHalf", "mouthFull", "mouthRelease", "pyokoStrength"],
    eyes: ["highlightEnabled", "highlightStrength", "highlightSize", "highlightAspect", "highlightFilmWobble", "subHighlightEnabled", "subHighlightSize", "subHighlightAspect", "subHighlightFilmWobble", "tearLensEnabled", "tearLensStrength", "tearLensRadiusX", "tearLensRadiusY", "tearLensRotationLeft", "tearLensRotationRight"],
    hair: ["hairVisible", "hairWarp", "hairSpring", "hairBundleStrength"],
    look: ["frontHairShadowEnabled", "frontHairShadowStrength", "frontHairShadowDistance", "bgColor", "hairColor", "hairTintLightness", "hairTintEnabled"],
  };
  const OBS_PRESET_STORAGE_KEY = "purupuru-pngtuber-obs-preset-v1";
  const ACTIVE_CHARACTER_STORAGE_KEY = "purupuru-pngtuber-active-character-id-v1";
  const CHARACTER_DB_NAME = "purupuru-pngtuber-character-library-v1";
  const CHARACTER_DB_VERSION = 1;
  const CHARACTER_STORE_NAME = "characters";
  const PURUPURU_PACKAGE_VERSION = 1;
  const MAX_PURUPURU_PACKAGE_SIZE = 80 * 1024 * 1024;
  const MAX_PURUPURU_UNZIPPED_SIZE = 120 * 1024 * 1024;
  const MAX_PURUPURU_ENTRY_COUNT = 256;
  const ZIP_LOCAL_FILE_HEADER_SIG = 0x04034b50;
  const ZIP_CENTRAL_DIRECTORY_SIG = 0x02014b50;
  const ZIP_END_OF_CENTRAL_DIRECTORY_SIG = 0x06054b50;
  const ZIP_UTF8_FLAG = 0x0800;
  const ZIP_STORE_METHOD = 0;
  const AVATAR_ASSET_THUMBNAIL_VERSION = "composite-v1";
  const MAX_ITEM_IMAGE_FILE_SIZE = 3 * 1024 * 1024;
  const MAX_OBS_SNAPSHOT_JSON_BYTES = 24 * 1024 * 1024;
  const MAX_OBS_SNAPSHOT_AVATAR_IMAGE_DATA_URL_SIZE = 12 * 1024 * 1024;
  const MAX_ITEM_IMAGE_EDGE = 4096;
  const MAX_ITEM_IMAGE_PIXELS = 16 * 1024 * 1024;
  const MAX_ITEM_LAYER_COUNT = 20;
  const ITEM_TRIM_ALPHA_THRESHOLD = 1;
  const ITEM_INITIAL_MAX_WIDTH_RATIO = 0.82;
  const ITEM_INITIAL_MAX_HEIGHT_RATIO = 0.82;
  const ITEM_RESIZE_HANDLE_RADIUS = 18;
  const MAX_JSON_SANITIZE_DEPTH = 32;
  const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const HAIR_TINT_CACHE_LIMIT = 8;
  const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
  const PNG_BASE64_SIGNATURE = "iVBORw0KGgo";
  const ITEM_LAYER_SLOTS = {
    stageBack: { label: "背景固定", anchor: "stage" },
    characterBack: { label: "キャラ背面", anchor: "character" },
    faceBack: { label: "顔の後ろ・後ろ髪の前", anchor: "character", deformFollow: "backHair" },
    faceFront: { label: "顔の前・前髪の下", anchor: "character", rigidFollow: "face" },
    frontHairFront: { label: "前髪の前", anchor: "character", rigidFollow: "frontHair" },
    stageFront: { label: "画面最前面", anchor: "stage" },
  };
  const ITEM_LAYER_DEFAULTS = {
    slot: "frontHairFront",
    x: 0,
    y: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    followStrength: 100,
    deformFollowEnabled: false,
    visible: true,
    locked: false,
  };
  const ITEM_LAYER_LIMITS = {
    scale: { min: 10, max: 500 },
    rotation: { min: -180, max: 180 },
    x: { min: -3000, max: 3000 },
    y: { min: -3000, max: 3000 },
    opacity: { min: 10, max: 100 },
    followStrength: { min: 0, max: 200 },
  };
  const ITEM_HIT_ORDER = ["stageFront", "frontHairFront", "faceFront", "faceBack", "characterBack", "stageBack"];
  const ALL_SETTINGS_NUMERIC_KEYS = [
    "angleStrength",
    "faceWarp",
    "angleXDeform",
    "faceTurnDepth",
    "faceTurnVertical",
    "angleYDeform",
    "hairWarp",
    "hairSpring",
    "hairBundleStrength",
    "frontHairShadowStrength",
    "frontHairShadowDistance",
    "followSpeed",
    "rangeLeft",
    "rangeRight",
    "rangeUp",
    "rangeDown",
    "avatarSize",
    "avatarX",
    "avatarY",
    "breathStrength",
    "rollStrength",
    "pyokoStrength",
    "highlightStrength",
    "highlightFilmWobble",
    "highlightSize",
    "highlightAspect",
    "subHighlightSize",
    "subHighlightAspect",
    "subHighlightFilmWobble",
    "hairTintLightness",
    "tearLensStrength",
    "tearLensRadiusX",
    "tearLensRadiusY",
    "tearLensRotationLeft",
    "tearLensRotationRight",
    "micGain",
    "mouthHalf",
    "mouthFull",
    "mouthRelease",
    "activeAnimationFps",
  ];
  const ALL_SETTINGS_BOOLEAN_KEYS = [
    "highlightEnabled",
    "subHighlightEnabled",
    "highlightAlphaOnBlink",
    "tearLensEnabled",
    "hairVisible",
    "frontHairShadowEnabled",
    "hairTintEnabled",
    "showMesh",
    "autoBlink",
    "mouseFollowEnabled",
    "idleMotionEnabled",
    "diagonalFaceWarpEnabled",
  ];
  const TRANSIENT_STATE_KEYS = new Set([
    "angleX",
    "angleY",
    "targetX",
    "targetY",
    "eyeSetupMode",
    "highlightSetupMode",
    "faceDepthSetupMode",
    "neckPivotSetupMode",
    "hairBundleSetupMode",
    "editMode",
    "rangePreviewDirection",
    "demoTalk",
  ]);
  const SPECIAL_STATE_SETTING_KEYS = new Set(["bgColor", "hairColor", "editLayer", "editKey"]);
  const STATE_NUMERIC_LIMITS = {
    wobbleSeed: { min: 0, max: 1, integer: false },
    activeAnimationFps: { min: ACTIVE_ANIMATION_FPS_MIN, max: ACTIVE_ANIMATION_FPS_MAX, integer: true },
  };
  const RANGE_CONTROL_SUFFIXES = {
    activeAnimationFps: "fps",
    highlightSize: "px",
    subHighlightSize: "px",
    frontHairShadowDistance: "px",
    tearLensRadiusX: "px",
    tearLensRadiusY: "px",
    tearLensRotationLeft: "°",
    tearLensRotationRight: "°",
  };
  const EYE_LENS_LIMITS = {
    radiusX: { min: 20, max: 140 },
    radiusY: { min: 15, max: 110 },
    rotation: { min: -45, max: 45 },
  };

  const state = {
    angleX: 0,
    angleY: 0,
    targetX: 0,
    targetY: 0,
    angleStrength: 100,
    faceWarp: 120,
    angleXDeform: 30,
    faceTurnDepth: 15,
    faceTurnVertical: 0,
    angleYDeform: 200,
    hairVisible: true,
    hairWarp: 150,
    hairSpring: 20,
    hairBundleStrength: 100,
    frontHairShadowStrength: 28,
    frontHairShadowDistance: 10,
    followSpeed: 60,
    rangeLeft: 60,
    rangeRight: 60,
    rangeUp: 30,
    rangeDown: 30,
    avatarSize: 120,
    avatarX: 0,
    avatarY: 0,
    breathStrength: 40,
    rollStrength: 1,
    pyokoStrength: 15,
    highlightEnabled: true,
    highlightStrength: 100,
    highlightFilmWobble: 50,
    highlightSize: 14,
    highlightAspect: 90,
    subHighlightEnabled: false,
    subHighlightSize: 7,
    subHighlightAspect: 100,
    subHighlightFilmWobble: 25,
    highlightAlphaOnBlink: true,
    tearLensEnabled: true,
    tearLensStrength: 100,
    tearLensRadiusX: 64,
    tearLensRadiusY: 46,
    tearLensRotationLeft: 0,
    tearLensRotationRight: 0,
    frontHairShadowEnabled: true,
    eyeSetupMode: false,
    highlightSetupMode: false,
    faceDepthSetupMode: false,
    neckPivotSetupMode: false,
    hairBundleSetupMode: false,
    bgColor: "#FFF8EE",
    hairColor: "#2C292C",
    hairTintLightness: 0,
    hairTintEnabled: false,
    showMesh: false,
    editMode: false,
    editLayer: "face",
    editKey: "center",
    rangePreviewDirection: null,
    autoBlink: true,
    mouseFollowEnabled: true,
    idleMotionEnabled: false,
    diagonalFaceWarpEnabled: true,
    demoTalk: false,
    wobbleSeed: 0.18,
    micGain: 220,
    mouthHalf: 8,
    mouthFull: 22,
    mouthRelease: 18,
    activeAnimationFps: ACTIVE_ANIMATION_FPS_DEFAULT,
  };

  function showStartupError(message) {
    const status = document.querySelector("#statusPill");
    if (status) status.textContent = "error";
    const panel = document.querySelector(".control-card") || document.body;
    const existing = document.querySelector("#startupError");
    const error = existing || document.createElement("p");
    error.id = "startupError";
    error.className = "error";
    error.setAttribute("role", "alert");
    error.textContent = message;
    if (!existing) panel.append(error);
  }

  function normalizeRendererMode(value) {
    const mode = String(value || "auto").toLowerCase();
    return RENDERER_MODES.has(mode) ? mode : "auto";
  }

  function readRendererMode() {
    try {
      return normalizeRendererMode(localStorage.getItem(RENDERER_MODE_STORAGE_KEY));
    } catch {
      return "auto";
    }
  }

  function rememberRendererMode(value) {
    try {
      localStorage.setItem(RENDERER_MODE_STORAGE_KEY, normalizeRendererMode(value));
    } catch {}
  }

  function rendererModeAllowsWebGpu() {
    return rendererMode === "auto" || rendererMode === "webgpu";
  }

  function rendererKindLabel(kind = activeRendererKind) {
    return kind === "webgpu" ? "WebGPU" : "Canvas/WebGL";
  }

  function syncRendererModeUi() {
    if (ui.rendererModeSelect) ui.rendererModeSelect.value = rendererMode;
    const help = ui.rendererModeSelect?.closest(".select-row")?.querySelector("small");
    if (help) {
      help.textContent = rendererMode === "auto" ? "自動: " + rendererKindLabel() : rendererKindLabel() + "で描画中";
    }
  }

  function setRendererMode(value) {
    rendererMode = normalizeRendererMode(value);
    rememberRendererMode(rendererMode);
    syncRendererModeUi();
    resetMeshRendererAfterAvatarImageChange();
  }

  function activeAnimationFps() {
    return Math.round(clamp(Number(state.activeAnimationFps) || ACTIVE_ANIMATION_FPS_DEFAULT, ACTIVE_ANIMATION_FPS_MIN, ACTIVE_ANIMATION_FPS_MAX));
  }

  function activeAnimationFrameDelayMs() {
    return 1000 / activeAnimationFps();
  }

  const canvas = document.querySelector("#stage");
  const ctx = canvas?.getContext?.("2d") || null;
  if (!canvas || !ctx) {
    showStartupError("このブラウザはCanvas 2Dに対応していません。Chrome または Chromium 系の新しいブラウザでお試しください。");
    return;
  }
  const stageArtCanvas = document.createElement("canvas");
  stageArtCanvas.className = "ppt-stage-art";
  stageArtCanvas.setAttribute("aria-hidden", "true");
  stageArtCanvas.hidden = true;
  canvas.before(stageArtCanvas);

  function setStageArtVisible(visible) {
    stageArtCanvas.hidden = !visible;
  }

  const charCanvas = document.createElement("canvas");
  charCanvas.width = CROP.w;
  charCanvas.height = CROP.h;
  const charCtx = charCanvas.getContext("2d");
  const frontHairShadowCanvas = document.createElement("canvas");
  frontHairShadowCanvas.width = CROP.w;
  frontHairShadowCanvas.height = CROP.h;
  const frontHairShadowCtx = frontHairShadowCanvas.getContext("2d");
  const frontHairShadowReceiverCanvas = document.createElement("canvas");
  frontHairShadowReceiverCanvas.width = CROP.w;
  frontHairShadowReceiverCanvas.height = CROP.h;
  const frontHairShadowReceiverCtx = frontHairShadowReceiverCanvas.getContext("2d");
  const frontHairShadowCompositeCanvas = document.createElement("canvas");
  frontHairShadowCompositeCanvas.width = CROP.w;
  frontHairShadowCompositeCanvas.height = CROP.h;
  const frontHairShadowCompositeCtx = frontHairShadowCompositeCanvas.getContext("2d");
  const itemDeformFollowCanvas = document.createElement("canvas");
  itemDeformFollowCanvas.width = CROP.w;
  itemDeformFollowCanvas.height = CROP.h;
  const itemDeformFollowCtx = itemDeformFollowCanvas.getContext("2d");
  if (
    !charCtx ||
    !frontHairShadowCtx ||
    !frontHairShadowReceiverCtx ||
    !frontHairShadowCompositeCtx ||
    !itemDeformFollowCtx
  ) {
    showStartupError("描画用Canvasを初期化できませんでした。ブラウザの再起動、または別のブラウザでお試しください。");
    return;
  }
  let meshRenderer = null;
  let meshRendererGeneration = 0;
  let rendererMode = readRendererMode();
  let activeRendererKind = "canvas";
  let rendererFallbackRequested = false;
  let frontHairShadowCompositeFrame = -1;
  let faceGpuWarpSpecCacheFrame = -1;
  let faceGpuWarpSpecCache = null;
  let hairGpuWarpSpecCacheFrame = -1;
  let hairGpuWarpSpecCache = null;
  let highlightGpuWarpSpecCacheFrame = -1;
  let highlightGpuWarpSpecCache = null;

  const ui = {
    statusPill: document.querySelector("#statusPill"),
    characterSwitcher: document.querySelector("#characterSwitcher"),
    characterSwitcherButton: document.querySelector("#characterSwitcherButton"),
    activeCharacterThumb: document.querySelector("#activeCharacterThumb"),
    activeCharacterName: document.querySelector("#activeCharacterName"),
    activeCharacterSaveStatus: document.querySelector("#activeCharacterSaveStatus"),
    characterSwitcherMenu: document.querySelector("#characterSwitcherMenu"),
    characterList: document.querySelector("#characterList"),
    addCharacterButton: document.querySelector("#addCharacterButton"),
    duplicateCharacterButton: document.querySelector("#duplicateCharacterButton"),
    addCharacterFileInput: document.querySelector("#addCharacterFileInput"),
    dockHideButton: document.querySelector("#dockHideButton"),
    dockPeekButton: document.querySelector("#dockPeekButton"),
    characterWizardPanel: document.querySelector("#characterWizardPanel"),
    characterWizardStartButton: document.querySelector("#characterWizardStartButton"),
    characterWizardStepText: document.querySelector("#characterWizardStepText"),
    characterWizardTitle: document.querySelector("#characterWizardTitle"),
    characterWizardDescription: document.querySelector("#characterWizardDescription"),
    characterWizardStatus: document.querySelector("#characterWizardStatus"),
    characterWizardBackButton: document.querySelector("#characterWizardBackButton"),
    characterWizardRetryButton: document.querySelector("#characterWizardRetryButton"),
    characterWizardSkipButton: document.querySelector("#characterWizardSkipButton"),
    characterWizardAutoButton: document.querySelector("#characterWizardAutoButton"),
    characterWizardOkButton: document.querySelector("#characterWizardOkButton"),
    characterWizardCancelButton: document.querySelector("#characterWizardCancelButton"),
    characterWizardSizeReadout: document.querySelector("#characterWizardSizeReadout"),
    characterWizardSizeDownButton: document.querySelector("#characterWizardSizeDownButton"),
    characterWizardSizeUpButton: document.querySelector("#characterWizardSizeUpButton"),
    characterWizardCenterButton: document.querySelector("#characterWizardCenterButton"),
    characterWizardMoveLeftButton: document.querySelector("#characterWizardMoveLeftButton"),
    characterWizardMoveRightButton: document.querySelector("#characterWizardMoveRightButton"),
    characterWizardMoveUpButton: document.querySelector("#characterWizardMoveUpButton"),
    characterWizardMoveDownButton: document.querySelector("#characterWizardMoveDownButton"),
    itemDropZone: document.querySelector("#itemDropZone"),
    itemFileInput: document.querySelector("#itemFileInput"),
    itemFileReadout: document.querySelector("#itemFileReadout"),
    itemLayerReadout: document.querySelector("#itemLayerReadout"),
    itemLayerList: document.querySelector("#itemLayerList"),
    itemSelectedReadout: document.querySelector("#itemSelectedReadout"),
    itemSlotSelect: document.querySelector("#itemSlotSelect"),
    itemDeformFollowEnabled: document.querySelector("#itemDeformFollowEnabled"),
    itemFollowStrength: document.querySelector("#itemFollowStrength"),
    itemScale: document.querySelector("#itemScale"),
    itemRotation: document.querySelector("#itemRotation"),
    itemX: document.querySelector("#itemX"),
    itemY: document.querySelector("#itemY"),
    itemOpacity: document.querySelector("#itemOpacity"),
    itemCenterButton: document.querySelector("#itemCenterButton"),
    itemDuplicateButton: document.querySelector("#itemDuplicateButton"),
    itemDeleteButton: document.querySelector("#itemDeleteButton"),
    itemDeleteAllButton: document.querySelector("#itemDeleteAllButton"),
    itemStatus: document.querySelector("#itemStatus"),
    centerButton: document.querySelector("#centerButton"),
    mouseFollowButton: document.querySelector("#mouseFollowButton"),
    demoTalkButton: document.querySelector("#demoTalkButton"),
    idleMotionButton: document.querySelector("#idleMotionButton"),
    diagonalFaceWarpButton: document.querySelector("#diagonalFaceWarpButton"),
    micButton: document.querySelector("#micButton"),
    blinkButton: document.querySelector("#blinkButton"),
    faceTrackButton: document.querySelector("#faceTrackButton"),
    faceCalibrateButton: document.querySelector("#faceCalibrateButton"),
    audioError: document.querySelector("#audioError"),
    faceTrackStatus: document.querySelector("#faceTrackStatus"),
    meterFill: document.querySelector("#meterFill"),
    mouthReadout: document.querySelector("#mouthReadout"),
    angleReadout: document.querySelector("#angleReadout"),
    showMesh: document.querySelector("#showMesh"),
    rendererModeSelect: document.querySelector("#rendererModeSelect"),
    activeAnimationFps: document.querySelector("#activeAnimationFps"),
    avatarSizeInput: document.querySelector("#avatarSize"),
    resetPositionButton: document.querySelector("#resetPositionButton"),
    hairColorInput: document.querySelector("#hairColorInput"),
    hairColorReadout: document.querySelector("#hairColorReadout"),
    hairColorReset: document.querySelector("#hairColorReset"),
    editModeButton: document.querySelector("#editModeButton"),
    editLayerSelect: document.querySelector("#editLayerSelect"),
    editKeySelect: document.querySelector("#editKeySelect"),
    copyObsUrlButton: document.querySelector("#copyObsUrlButton"),
    pushObsSnapshotButton: document.querySelector("#pushObsSnapshotButton"),
    obsPublishButton: document.querySelector("#obsPublishButton"),
    obsPresetButtons: document.querySelectorAll("[data-obs-preset]"),
    obsPresetHint: document.querySelector("#obsPresetHint"),
    obsStatus: document.querySelector("#obsStatus"),
    obsUrlPreview: document.querySelector("#obsUrlPreview"),
    savePuruPuruButton: document.querySelector("#savePuruPuruButton"),
    loadPuruPuruButton: document.querySelector("#loadPuruPuruButton"),
    allSettingsFileInput: document.querySelector("#allSettingsFileInput"),
    resetEditKeyButton: document.querySelector("#resetEditKeyButton"),
    saveDeformerButton: document.querySelector("#saveDeformerButton"),
    loadDeformerButton: document.querySelector("#loadDeformerButton"),
    resetAllDeformersButton: document.querySelector("#resetAllDeformersButton"),
    editStatus: document.querySelector("#editStatus"),
    testUpButton: document.querySelector("#testUpButton"),
    testLeftButton: document.querySelector("#testLeftButton"),
    testCenterButton: document.querySelector("#testCenterButton"),
    testRightButton: document.querySelector("#testRightButton"),
    testDownButton: document.querySelector("#testDownButton"),
    bgButtons: document.querySelectorAll("[data-bg]"),
    backgroundReadout: document.querySelector("#backgroundReadout"),
    backgroundColorInput: document.querySelector("#backgroundColorInput"),
    highlightEnabled: document.querySelector("#highlightEnabled"),
    hairVisible: document.querySelector("#hairVisible"),
    frontHairShadowEnabled: document.querySelector("#frontHairShadowEnabled"),
    subHighlightEnabled: document.querySelector("#subHighlightEnabled"),
    subHighlightControls: document.querySelector("#subHighlightControls"),
    highlightSetupButton: document.querySelector("#highlightSetupButton"),
    highlightAutoPlaceButton: document.querySelector("#highlightAutoPlaceButton"),
    highlightSetupSaveButton: document.querySelector("#highlightSetupSaveButton"),
    highlightSetupStatus: document.querySelector("#highlightSetupStatus"),
    faceDepthSetupButton: document.querySelector("#faceDepthSetupButton"),
    faceDepthAutoButton: document.querySelector("#faceDepthAutoButton"),
    faceDepthSetupSaveButton: document.querySelector("#faceDepthSetupSaveButton"),
    faceDepthSetupStatus: document.querySelector("#faceDepthSetupStatus"),
    neckPivotSetupButton: document.querySelector("#neckPivotSetupButton"),
    neckPivotAutoButton: document.querySelector("#neckPivotAutoButton"),
    neckPivotSetupSaveButton: document.querySelector("#neckPivotSetupSaveButton"),
    neckPivotSetupStatus: document.querySelector("#neckPivotSetupStatus"),
    hairBundleFocusSelect: document.querySelector("#hairBundleFocusSelect"),
    hairBundleSetupButton: document.querySelector("#hairBundleSetupButton"),
    hairBundleTemplateButton: document.querySelector("#hairBundleTemplateButton"),
    hairBundleSetupSaveButton: document.querySelector("#hairBundleSetupSaveButton"),
    hairBundleSetupStatus: document.querySelector("#hairBundleSetupStatus"),
    tearLensEnabled: document.querySelector("#tearLensEnabled"),
    eyeSetupButton: document.querySelector("#eyeSetupButton"),
    eyeAutoDetectButton: document.querySelector("#eyeAutoDetectButton"),
    eyeSetupSaveButton: document.querySelector("#eyeSetupSaveButton"),
    eyeSetupStatus: document.querySelector("#eyeSetupStatus"),
  };

  const CHARACTER_WIZARD_STEPS = [
    "faceCenter",
    "leftEye",
    "rightEye",
    "nose",
    "mouth",
    "chin",
    "neckPivot",
    "hairBundles",
    "finish",
  ];
  const CHARACTER_WIZARD_STEP_DEFS = {
    faceCenter: {
      label: "顔の中心",
      title: "顔の中心をクリック",
      description: "顔全体が回転・ぷるぷるする中心です。鼻筋の少し上、頭の向きの中心に置いてください。",
      pointPath: ["faceCenter"],
      color: "#ffd34d",
    },
    leftEye: {
      label: "左目",
      title: "左目の中心をクリック",
      description: "黒目または虹彩の中心に置くと、うるみ・ハイライト・ぷるぷる表現が綺麗になります。",
      pointPath: ["faceAnchors", "leftEye"],
      color: "#3d8cff",
    },
    rightEye: {
      label: "右目",
      title: "右目の中心をクリック",
      description: "黒目または虹彩の中心に置いてください。左右が逆でも完了時にX座標で整えます。",
      pointPath: ["faceAnchors", "rightEye"],
      color: "#ff7a3d",
    },
    nose: {
      label: "鼻",
      title: "鼻の中心をクリック",
      description: "鼻先または鼻筋の中心に置くと、横向き時の立体感が自然になります。",
      pointPath: ["faceAnchors", "nose"],
      color: "#ffd34d",
    },
    mouth: {
      label: "口",
      title: "口の中心をクリック",
      description: "口を閉じた時の中心に置いてください。口パク時の顎ぷに表現の基準になります。",
      pointPath: ["faceAnchors", "mouth"],
      color: "#ff5c92",
    },
    chin: {
      label: "顎",
      title: "顎の中心をクリック",
      description: "輪郭の一番下あたりに置くと、顔向き・口パク時の下側補正が安定します。",
      pointPath: ["faceAnchors", "chin"],
      color: "#7bd88f",
    },
    neckPivot: {
      label: "首の付け根",
      title: "首の付け根をクリック",
      description: "頭が揺れる支点です。首が体へ入る中心あたりに置いてください。",
      pointPath: ["neckPivot"],
      color: "#8b5cf6",
    },
    hairBundles: {
      label: "髪の線",
      title: "髪束ラインを確認",
      description: "白丸を髪の生え際、色丸を毛先に合わせてください。ズレた線だけドラッグで直せます。",
      color: "#7db1a2",
    },
    finish: {
      label: "完了",
      title: "この設定で完了",
      description: "7点と髪束ラインを既存設定へ反映し、ハイライト自動配置と基準値保存を行います。",
      color: "#d96c4f",
    },
  };

  const images = {};
  let imagesReady = false;
  let avatarPackageImageVersion = 0;
  let loadError = "";
  let stage = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };
  let panelRectCache = null;
  let panelRectCacheAt = 0;
  let resizePending = false;
  let lastTimestamp = 0;
  let obsLastFrameAt = 0;
  let activeAnimationLastFrameAt = 0;
  let tickRafId = 0;
  let tickTimerId = 0;
  let obsPublishEnabled = false;
  let obsPresetKey = DEFAULT_OBS_PRESET;
  let obsInputPostPending = false;
  let lastObsInputPostAt = 0;
  let obsSnapshotPostPending = false;
  let lastObsSnapshotPostAt = 0;
  let lastVoiceRaw = 0;
  const obsExternalInput = {
    targetX: 0,
    targetY: 0,
    angleX: 0,
    angleY: 0,
    voiceRaw: 0,
    updatedAt: 0,
    connected: false,
  };
  let obsEventSource = null;
  let obsEventReconnectTimer = null;
  let animationSeconds = 0;
  let motionFrameId = 0;
  let headOffsetCacheFrame = -1;
  const headOffsetCache = { x: 0, y: 0 };
  let faceCenterCacheFrame = -1;
  let faceCenterCacheSource = null;
  let faceCenterCache = null;
  let faceDepthAnchorsCacheFrame = -1;
  let faceDepthAnchorsCacheSource = null;
  let faceDepthAnchorsCacheCenterSource = null;
  let faceDepthAnchorsCacheEyesSource = null;
  let faceDepthAnchorsCache = null;
  let faceRigMetricsCacheFrame = -1;
  let faceRigMetricsCacheCenterSource = null;
  let faceRigMetricsCacheDepthSource = null;
  let faceRigMetricsCacheEyesSource = null;
  let faceRigMetricsCache = null;
  let neckPivotCacheFrame = -1;
  let neckPivotCacheSource = null;
  let neckPivotCacheDepthSource = null;
  let neckPivotCacheCenterSource = null;
  let neckPivotCacheEyesSource = null;
  let neckPivotCache = null;
  let mouthState = 0;
  let blinkClosed = false;
  let blinkTimer = null;
  let blinkEvent = null;
  let previousMouthState = 0;
  let lastTalkBlinkAt = -10000;
  let lastPoseBlinkAt = -10000;
  let lastHeadMotionAt = -10000;
  let lastBlinkPoseX = 0;
  let lastBlinkPoseY = 0;
  let idleMotionPlan = null;
  let voiceLevel = 0;
  let voicePeak = 0;
  let mouthMotionLevel = 0;
  let jawPuniLevel = 0;

  // 髪の毛のバネ物理状態（前髪/後ろ髪 各 HAIR_SPRING_BUCKETS 段、根元→毛先）。
  // ★1 anglePos/Vel: 顔向き(angleX) のバネ遅延。★2 wavePos/Vel: pyokopyokoHairShift 出力の慣性化。
  // ★3 stretchX/Y: バネ速度方向の毛先引き伸ばし量（描画時に sampleHairSpring が参照）。
  const HAIR_SPRING_BUCKETS = 5;

  function newHairSpringState() {
    const buckets = [];
    for (let i = 0; i < HAIR_SPRING_BUCKETS; i += 1) {
      buckets.push({
        anglePos: 0, angleVel: 0,
        anglePosY: 0, angleVelY: 0,
        wavePosX: 0, wavePosY: 0, waveVelX: 0, waveVelY: 0,
        headPosX: 0, headPosY: 0, headVelX: 0, headVelY: 0,
        stretchX: 0, stretchY: 0,
      });
    }
    return { buckets };
  }

  let hairSpringBack = newHairSpringState();
  let hairSpringFront = newHairSpringState();
  let hairBundleSpringStates = null;
  let micOn = false;
  let micPending = false;
  let deformers = null;
  let editDrag = null;
  let eyeSetupDrag = null;
  let highlightSetupDrag = null;
  let faceDepthSetupDrag = null;
  let neckPivotSetupDrag = null;
  let hairBundleSetupDrag = null;
  let characterWizard = null;
  let characterDrag = null;
  let itemDrag = null;
  let itemHandleVisible = false;
  let activeItemLayerId = null;
  let nextItemLayerId = 1;
  let lastCharacterTransform = null;
  let faceTracker = null;
  let lastFaceTrackUiUpdate = 0;
  const hairTintCache = new Map();
  const itemLayers = [];
  let itemMutationChain = Promise.resolve();
  let itemMutationActive = false;
  let characterProfileDbPromise = null;
  let activeCharacterId = null;
  let activeCharacterSourceKind = "";
  let characterLibraryReady = false;
  let characterSwitching = false;
  let suspendCharacterDirtyTracking = 0;
  let characterSaveStatusText = "準備中";
  let characterProfilesCache = [];
  let characterAutosaveTimer = null;
  let characterAutosavePromise = Promise.resolve();
  let characterDirty = {
    settings: false,
    avatarImages: false,
    itemImages: false,
    thumbnail: false,
  };

  const audioEngine = createAudioEngine();

  function clamp(v, min, max) {
    const value = Number(v);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function setupModeActive() {
    return Boolean(
      state.eyeSetupMode ||
      state.highlightSetupMode ||
      state.faceDepthSetupMode ||
      state.neckPivotSetupMode ||
      state.hairBundleSetupMode ||
      characterWizard?.active
    );
  }

  function interactionModeActive({ includeEdit = true, includeRangePreview = true } = {}) {
    return Boolean(
      (includeEdit && state.editMode) ||
      setupModeActive() ||
      (includeRangePreview && state.rangePreviewDirection)
    );
  }

  function shouldFreezeCharacterMotion() {
    return interactionModeActive({ includeEdit: true, includeRangePreview: true });
  }

  function gridPointCount() {
    return (DEFORMER_COLS + 1) * (DEFORMER_ROWS + 1);
  }

  function gridIndex(col, row) {
    return row * (DEFORMER_COLS + 1) + col;
  }

  function baseGridPoint(col, row) {
    return {
      x: (col / DEFORMER_COLS) * CROP.w,
      y: (row / DEFORMER_ROWS) * CROP.h,
    };
  }

  function makeZeroOffsets() {
    return Array.from({ length: gridPointCount() }, () => ({ x: 0, y: 0 }));
  }

  function faceYawPlaneOffset(x, y, ax, boost = 4.2) {
    if (ax === 0) return { x: 0, y: 0 };
    const { nx, ny, absX, dome } = warpInfo(x, y);
    const metrics = currentFaceRigMetrics();
    const horizontalMask = clamp(absX, 0, 1);

    // サンプル画像のように、顔面全体が1枚のゆるい曲面として横を向くベース形状。
    // パーツ単位の奥行き補正は後段の faceTurnWarpPoint に任せる。
    const turnCoord = nx * ax;
    const farMask = smoothstep(0.04, 1.04, turnCoord) * horizontalMask;
    const nearMask = smoothstep(0.04, 1.04, -turnCoord) * horizontalMask;
    const centerMask = 1 - smoothstep(0.1, 0.92, horizontalMask);
    const planeMask = 0.35 + dome * 0.65;
    const lowerPlane = clamp((y - (metrics.center.y - metrics.radiusY * 0.35)) / Math.max(1, metrics.radiusY * 1.25), 0, 1);
    const centerShift = ax * (16 + dome * 6);
    const farCompress = -ax * farMask * (62 + dome * 20 + lowerPlane * 8);
    const nearExpand = -ax * nearMask * (38 + dome * 12 + lowerPlane * 5);
    const centerDrift = ax * centerMask * (7 + dome * 6);
    const planeShearX = -ax * ny * (30 * planeMask + horizontalMask * 9);
    const contourRound = -ax * nx * horizontalMask * dome * 7;
    const sideTiltY = -ax * nx * (26 + dome * 14) * (0.52 + horizontalMask * 0.48);
    const verticalPerspective = ny * (nearMask * 10 - farMask * 8) * planeMask;
    const lowerChinSweep = ax * nx * lowerPlane * dome * 8;

    return {
      x: (centerShift + farCompress + nearExpand + centerDrift + planeShearX + contourRound) * boost,
      y: (sideTiltY + verticalPerspective + lowerChinSweep) * boost,
    };
  }

  function seedFaceOffset(key, col, row) {
    if (key === "center") return { x: 0, y: 0 };
    const p = baseGridPoint(col, row);
    const { nx, ny, absY, dome, lowerMask } = warpInfo(p.x, p.y);
    const ax = key === "right" ? 1 : key === "left" ? -1 : 0;
    const ay = key === "down" ? 1 : key === "up" ? -1 : 0;
    const verticalMask = clamp(absY, 0, 1);
    const upLook = ay < 0 ? -ay : 0;
    const downLook = ay > 0 ? ay : 0;

    const turn = faceYawPlaneOffset(p.x, p.y, ax);

    // AngleYは見上げ/見下ろしとして、上下の圧縮伸長を許容する。
    // 上向きで左右を中央へ寄せると顔幅が極端に細く見えるため、上向き時は横幅を維持する。
    const lookX = nx * (downLook * (12 * dome + 5 * verticalMask) + upLook * (2.5 * dome + verticalMask));
    const lookY = ay * (28 - ny * (28 * dome + 8) - 7 * lowerMask);

    return {
      x: turn.x + lookX,
      y: turn.y + lookY,
    };
  }

  function seedHairOffset(key, col, row, layer) {
    if (key === "center") return { x: 0, y: 0 };
    const p = baseGridPoint(col, row);
    const { nx, ny, dome, sideMask } = warpInfo(p.x, p.y);
    const mask = clamp((p.y - 56) / 390, 0, 1);
    const ax = key === "right" ? 1 : key === "left" ? -1 : 0;
    const ay = key === "down" ? 1 : key === "up" ? -1 : 0;
    const upLook = ay < 0 ? -ay : 0;
    const downLook = ay > 0 ? ay : 0;
    const parallax = layer === "frontHair" ? 18 : -25;
    const bend = layer === "frontHair" ? 32 : 42;
    const yFollow = layer === "frontHair" ? 16 : -10;
    const rootLock = clamp((p.y - 92) / 260, 0, 1);
    const rootInfluence = 1 - rootLock;
    const hairFaceFollow = layer === "frontHair" ? 0.34 : layer === "backHair" ? 0.1 : 0;
    const faceTurn = hairFaceFollow > 0 ? faceYawPlaneOffset(p.x, p.y, ax) : { x: 0, y: 0 };
    return {
      x:
        faceTurn.x * hairFaceFollow +
        rootLock * (
          ax * (parallax * (0.35 + mask * 0.65) - nx * bend * dome * mask + ny * 7 * mask) +
          nx * dome * mask * (downLook * 12 + upLook * 2.5)
        ),
      y:
        faceTurn.y * hairFaceFollow +
        rootLock * (
          ax * (nx * (12 + sideMask * 7) * mask + nx * ny * 9 * dome * mask) +
          ay * (yFollow * (0.35 + mask * 0.65) - ny * 18 * dome * mask)
        ) +
        rootInfluence * ay * (layer === "frontHair" ? 1.5 : -1.2),
    };
  }

  function createLayerDeformer(layer) {
    const keys = {};
    for (const key of DEFORMER_KEYS) {
      const offsets = makeZeroOffsets();
      for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
        for (let col = 0; col <= DEFORMER_COLS; col += 1) {
          const idx = gridIndex(col, row);
          offsets[idx] = layer === "face"
            ? seedFaceOffset(key, col, row)
            : seedHairOffset(key, col, row, layer);
        }
      }
      keys[key] = offsets;
    }
    return { cols: DEFORMER_COLS, rows: DEFORMER_ROWS, keys };
  }

  function createDefaultDeformers() {
    return {
      face: createLayerDeformer("face"),
      frontHair: createLayerDeformer("frontHair"),
      backHair: createLayerDeformer("backHair"),
    };
  }

  function cloneOffsets(offsets) {
    return offsets.map((p) => {
      const x = Number(p?.x);
      const y = Number(p?.y);
      return {
        x: Number.isFinite(x) ? clamp(x, -500, 500) : 0,
        y: Number.isFinite(y) ? clamp(y, -500, 500) : 0,
      };
    });
  }

  function mergeSavedDeformers(saved) {
    if (!saved || typeof saved !== "object" || !deformers) return false;
    for (const layer of Object.keys(deformers)) {
      const savedLayer = saved[layer];
      if (!savedLayer?.keys) continue;
      for (const key of DEFORMER_KEYS) {
        const arr = savedLayer.keys[key];
        if (Array.isArray(arr) && arr.length === gridPointCount()) {
          deformers[layer].keys[key] = cloneOffsets(arr);
        }
      }
    }
    return true;
  }

  function sanitizeImportedJsonValue(value, depth = 0) {
    if (depth > MAX_JSON_SANITIZE_DEPTH) {
      throw new Error("設定ファイルの階層が深すぎます。");
    }
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeImportedJsonValue(item, depth + 1));
    }
    if (value && typeof value === "object") {
      const sanitized = Object.create(null);
      for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_JSON_KEYS.has(key)) continue;
        sanitized[key] = sanitizeImportedJsonValue(child, depth + 1);
      }
      return sanitized;
    }
    return value;
  }

  function parseSettingsJson(raw) {
    const parsed = sanitizeImportedJsonValue(JSON.parse(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("設定ファイルの形式が正しくありません。");
    }
    return parsed;
  }

  function safeSetJson(key, value, onError) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`ブラウザ内保存に失敗しました: ${key}`, error);
      onError?.(error);
      return false;
    }
  }

  function safeGetStorageItem(key, onError) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`ブラウザ内保存の読込に失敗しました: ${key}`, error);
      onError?.(error);
      return null;
    }
  }

  function safeGetSettingsJson(key, onError) {
    const raw = safeGetStorageItem(key, onError);
    if (!raw) return null;
    try {
      return parseSettingsJson(raw);
    } catch (error) {
      console.warn(`ブラウザ内保存JSONの解析に失敗しました: ${key}`, error);
      onError?.(error);
      return null;
    }
  }

  function saveDeformers() {
    if (!safeSetJson(STORAGE_KEY, deformers, () => {
      setEditStatus("ワープ編集の保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    setEditStatus("ワープ編集だけをブラウザ内に保存しました。全体のバックアップは .purupuru 保存を使います。");
    return true;
  }

  function loadSavedDeformers() {
    const saved = safeGetSettingsJson(STORAGE_KEY, () => {
      setEditStatus("保存済みワープ編集の読込に失敗しました。");
    });
    if (!saved) return false;
    const ok = mergeSavedDeformers(saved);
    if (ok) {
      setEditStatus("ブラウザ内のワープ編集だけを読み込みました。");
    }
    return ok;
  }

  function buildEyeSetupPayload() {
    const centers = normalizeEyeCenters(highlightEyesRaw) || normalizeEyeCenters(ensureEyeCenters());
    return {
      version: 2,
      centers,
      radius: eyeLensRadius(),
      rotationLeft: clamp(Number(state.tearLensRotationLeft) || 0, -45, 45),
      rotationRight: clamp(Number(state.tearLensRotationRight) || 0, -45, 45),
    };
  }

  function buildPersistentStatePayload() {
    const savedState = {};
    for (const key of Object.keys(state)) {
      if (TRANSIENT_STATE_KEYS.has(key)) continue;
      const value = state[key];
      if (typeof value === "number") {
        savedState[key] = Number(value);
      } else if (typeof value === "boolean") {
        savedState[key] = Boolean(value);
      } else if (typeof value === "string") {
        savedState[key] = String(value);
      } else if (value === null) {
        savedState[key] = null;
      }
    }
    savedState.bgColor = normalizeBackgroundColor(state.bgColor);
    savedState.hairColor = normalizeHexColor(state.hairColor);
    savedState.editLayer = ["face", "frontHair", "backHair"].includes(state.editLayer) ? state.editLayer : "face";
    savedState.editKey = DEFORMER_KEYS.includes(state.editKey) ? state.editKey : "center";
    return savedState;
  }

  function buildOutputSettingsPayload() {
    return {
      obsPreset: normalizeObsPresetKey(obsPresetKey),
    };
  }

  function buildAllSettingsPayload({ includeItemImages = true, includeBaseline = true } = {}) {
    const savedState = buildPersistentStatePayload();
    const payload = {
      app: "PuruPuru PNGTuber",
      type: "purupuru-pngtuber-settings",
      version: 2,
      savedAt: new Date().toISOString(),
      avatarImageSize: { width: CROP.w, height: CROP.h },
      state: savedState,
      outputSettings: buildOutputSettingsPayload(),
      faceCenterSetup: buildFaceCenterSetupPayload(),
      eyeSetup: buildEyeSetupPayload(),
      faceDepthSetup: buildFaceDepthSetupPayload(),
      neckPivotSetup: buildNeckPivotSetupPayload(),
      hairBundleSetup: buildHairBundleSetupPayload(),
      highlightSetup: buildHighlightSetupPayload(),
      deformers,
      activeItemLayerId,
      itemLayers: serializeItemLayers({ includeImages: includeItemImages }),
    };
    // Phase 4: baseline は既存キー構造を維持した末尾追加のみ。includeBaseline:false で再帰を遮断する。
    if (includeBaseline && baselineSettings) payload.baselineSettings = baselineSettings;
    return payload;
  }

  function applyNumericSetting(savedState, key) {
    if (!Object.prototype.hasOwnProperty.call(savedState, key)) return;
    const value = Number(savedState[key]);
    if (!Number.isFinite(value)) return;
    const input = document.querySelector(`#${key}`);
    const explicitLimits = STATE_NUMERIC_LIMITS[key];
    let min = Number(explicitLimits?.min ?? input?.min);
    let max = Number(explicitLimits?.max ?? input?.max);
    if (!Number.isFinite(min)) min = key === "avatarX" || key === "avatarY" ? -3000 : -100000;
    if (!Number.isFinite(max)) max = key === "avatarX" || key === "avatarY" ? 3000 : 100000;
    const clamped = clamp(value, min, max);
    state[key] = explicitLimits?.integer === false ? clamped : Math.round(clamped);
  }

  function applyAdditionalPersistentState(savedState) {
    const known = new Set([...ALL_SETTINGS_NUMERIC_KEYS, ...ALL_SETTINGS_BOOLEAN_KEYS, ...SPECIAL_STATE_SETTING_KEYS]);
    for (const key of Object.keys(state)) {
      if (known.has(key) || TRANSIENT_STATE_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(savedState, key)) continue;
      const current = state[key];
      if (typeof current === "number") {
        applyNumericSetting(savedState, key);
      } else if (typeof current === "boolean") {
        state[key] = Boolean(savedState[key]);
      } else if (typeof current === "string") {
        state[key] = String(savedState[key]);
      } else if (current === null) {
        state[key] = savedState[key] == null ? null : savedState[key];
      }
    }
  }

  function applyOutputSettingsPayload(outputSettings) {
    if (!outputSettings || typeof outputSettings !== "object") return;
    const preset = outputSettings.obsPreset ?? outputSettings.preset;
    if (preset) setObsPreset(preset, { announce: false, push: false });
  }

  function applyAllSettingsState(savedState) {
    if (!savedState || typeof savedState !== "object") return;
    ALL_SETTINGS_NUMERIC_KEYS.forEach((key) => applyNumericSetting(savedState, key));
    ALL_SETTINGS_BOOLEAN_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(savedState, key)) state[key] = Boolean(savedState[key]);
    });
    if (Object.prototype.hasOwnProperty.call(savedState, "bgColor")) {
      state.bgColor = normalizeBackgroundColor(savedState.bgColor);
    }
    if (Object.prototype.hasOwnProperty.call(savedState, "hairColor")) {
      state.hairColor = normalizeHexColor(savedState.hairColor);
    }
    if (["face", "frontHair", "backHair"].includes(savedState.editLayer)) {
      state.editLayer = savedState.editLayer;
    }
    if (DEFORMER_KEYS.includes(savedState.editKey)) {
      state.editKey = savedState.editKey;
    }
    applyAdditionalPersistentState(savedState);
  }

  function rememberAllSettingsPayload(payload) {
    const entries = [[ALL_SETTINGS_STORAGE_KEY, JSON.stringify(payload)]];
    if (payload?.deformers) entries.push([STORAGE_KEY, JSON.stringify(payload.deformers)]);
    if (payload?.faceCenterSetup?.center) entries.push([FACE_CENTER_SETUP_STORAGE_KEY, JSON.stringify(payload.faceCenterSetup)]);
    if (payload?.eyeSetup?.centers) entries.push([EYE_SETUP_STORAGE_KEY, JSON.stringify(payload.eyeSetup)]);
    if (payload?.faceDepthSetup?.anchors) entries.push([FACE_DEPTH_SETUP_STORAGE_KEY, JSON.stringify(payload.faceDepthSetup)]);
    if (payload?.neckPivotSetup?.pivot) entries.push([NECK_PIVOT_SETUP_STORAGE_KEY, JSON.stringify(payload.neckPivotSetup)]);
    if (payload?.hairBundleSetup?.bundles) entries.push([HAIR_BUNDLE_SETUP_STORAGE_KEY, JSON.stringify(payload.hairBundleSetup)]);
    if (payload?.highlightSetup?.points) entries.push([HIGHLIGHT_SETUP_STORAGE_KEY, JSON.stringify(payload.highlightSetup)]);

    const previous = entries.map(([key]) => [key, localStorage.getItem(key)]);
    try {
      for (const [key, value] of entries) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      for (const [key, value] of previous) {
        try {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        } catch (rollbackError) {
          console.warn(`ブラウザ内保存のロールバックに失敗しました: ${key}`, rollbackError);
        }
      }
      throw error;
    }
    if (payload?.outputSettings?.obsPreset) {
      rememberObsPresetKey(payload.outputSettings.obsPreset);
    }
  }

  function tryRememberAllSettingsPayload(payload) {
    try {
      rememberAllSettingsPayload(payload);
      return true;
    } catch (error) {
      console.warn("全設定のブラウザ内控え保存をスキップしました。", error);
      return false;
    }
  }

  function textToU8(text) {
    return new TextEncoder().encode(String(text));
  }

  function u8ToText(u8) {
    return new TextDecoder("utf-8", { fatal: false }).decode(u8);
  }

  let crc32Table = null;
  // .purupuru はこのアプリだけで読み書きする小規模なZIP(Store)パッケージ。
  // 依存追加を避けるため自前実装だが、Zip Bomb対策として件数・合計サイズ・CRC32を必ず検証する。
  // 現時点ではZIP64と圧縮メソッド(method != 0)はサポートしない。
  function getCrc32Table() {
    if (crc32Table) return crc32Table;
    crc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc32Table[i] = c >>> 0;
    }
    return crc32Table;
  }

  function crc32(u8) {
    const table = getCrc32Table();
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i += 1) {
      c = table[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function zipDateParts(date = new Date()) {
    const year = Math.min(2107, Math.max(1980, date.getFullYear()));
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { dosTime, dosDate };
  }

  function concatU8(parts, totalLength = null) {
    const size = totalLength ?? parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  function assertSafePackagePath(path) {
    const raw = String(path || "");
    if (
      !raw ||
      raw.startsWith("/") ||
      raw.includes("\\") ||
      raw.includes(":") ||
      raw.includes("..") ||
      raw.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error(`不正なパッケージ内パスです: ${raw}`);
    }
    return raw;
  }

  function safePackagePathName(name) {
    let safe = String(name || "item.png")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/\.\./g, ".")
      .replace(/^\.+/, "")
      .slice(0, 80)
      .trim();
    if (!safe) safe = "item.png";
    if (!safe.toLowerCase().endsWith(".png")) safe = `${safe}.png`;
    return safe;
  }

  function buildStoredZip(files) {
    const entries = Object.entries(files).map(([path, data]) => {
      const safePath = assertSafePackagePath(path);
      if (!(data instanceof Uint8Array)) {
        throw new Error(`ZIPへ入れるデータがUint8Arrayではありません: ${safePath}`);
      }
      if (data.length > 0xffffffff) {
        throw new Error(`ZIP内ファイルが大きすぎます: ${safePath}`);
      }
      return {
        path: safePath,
        nameBytes: textToU8(safePath),
        data,
        crc: crc32(data),
      };
    });

    const { dosTime, dosDate } = zipDateParts();
    const chunks = [];
    const centralRecords = [];
    let offset = 0;

    for (const entry of entries) {
      const localOffset = offset;
      const local = new Uint8Array(30 + entry.nameBytes.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, ZIP_LOCAL_FILE_HEADER_SIG, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, ZIP_UTF8_FLAG, true); // UTF-8 filename
      localView.setUint16(8, ZIP_STORE_METHOD, true); // store
      localView.setUint16(10, dosTime, true);
      localView.setUint16(12, dosDate, true);
      localView.setUint32(14, entry.crc, true);
      localView.setUint32(18, entry.data.length, true);
      localView.setUint32(22, entry.data.length, true);
      localView.setUint16(26, entry.nameBytes.length, true);
      localView.setUint16(28, 0, true);
      local.set(entry.nameBytes, 30);
      chunks.push(local, entry.data);
      offset += local.length + entry.data.length;

      const central = new Uint8Array(46 + entry.nameBytes.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, ZIP_CENTRAL_DIRECTORY_SIG, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, ZIP_UTF8_FLAG, true);
      centralView.setUint16(10, ZIP_STORE_METHOD, true);
      centralView.setUint16(12, dosTime, true);
      centralView.setUint16(14, dosDate, true);
      centralView.setUint32(16, entry.crc, true);
      centralView.setUint32(20, entry.data.length, true);
      centralView.setUint32(24, entry.data.length, true);
      centralView.setUint16(28, entry.nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, localOffset, true);
      central.set(entry.nameBytes, 46);
      centralRecords.push(central);
    }

    const centralOffset = offset;
    const centralSize = centralRecords.reduce((sum, record) => sum + record.length, 0);
    chunks.push(...centralRecords);
    offset += centralSize;

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, ZIP_END_OF_CENTRAL_DIRECTORY_SIG, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, entries.length, true);
    eocdView.setUint16(10, entries.length, true);
    eocdView.setUint32(12, centralSize, true);
    eocdView.setUint32(16, centralOffset, true);
    eocdView.setUint16(20, 0, true);
    chunks.push(eocd);
    offset += eocd.length;

    return concatU8(chunks, offset);
  }

  function findZipEndOfCentralDirectory(zipU8) {
    const min = Math.max(0, zipU8.length - 22 - 0xffff);
    for (let i = zipU8.length - 22; i >= min; i -= 1) {
      if (new DataView(zipU8.buffer, zipU8.byteOffset + i, 4).getUint32(0, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIG) {
        return i;
      }
    }
    return -1;
  }

  async function unzipPuruPuruPackage(zipU8) {
    const eocdOffset = findZipEndOfCentralDirectory(zipU8);
    if (eocdOffset < 0) throw new Error(".purupuru のZIP終端情報が見つかりません。");
    const eocd = new DataView(zipU8.buffer, zipU8.byteOffset + eocdOffset, 22);
    const entryCount = eocd.getUint16(10, true);
    const centralSize = eocd.getUint32(12, true);
    const centralOffset = eocd.getUint32(16, true);
    if (centralOffset + centralSize > zipU8.length) {
      throw new Error(".purupuru のZIP目次が壊れています。");
    }
    if (entryCount > MAX_PURUPURU_ENTRY_COUNT) {
      throw new Error(".purupuru のファイル数が多すぎます。");
    }

    const files = Object.create(null);
    let totalSize = 0;
    let pos = centralOffset;
    for (let i = 0; i < entryCount; i += 1) {
      if (pos + 46 > zipU8.length) throw new Error(".purupuru のZIP目次が途中で切れています。");
      const view = new DataView(zipU8.buffer, zipU8.byteOffset + pos, 46);
      if (view.getUint32(0, true) !== ZIP_CENTRAL_DIRECTORY_SIG) {
        throw new Error(".purupuru のZIP目次が壊れています。");
      }
      const method = view.getUint16(10, true);
      const expectedCrc = view.getUint32(16, true);
      const compressedSize = view.getUint32(20, true);
      const uncompressedSize = view.getUint32(24, true);
      const nameLength = view.getUint16(28, true);
      const extraLength = view.getUint16(30, true);
      const commentLength = view.getUint16(32, true);
      const localOffset = view.getUint32(42, true);
      const nameStart = pos + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > zipU8.length) throw new Error(".purupuru のZIPファイル名が壊れています。");
      const path = assertSafePackagePath(u8ToText(zipU8.subarray(nameStart, nameEnd)));
      if (files[path]) throw new Error(`重複したパッケージ内パスです: ${path}`);

      if (localOffset + 30 > zipU8.length) throw new Error(".purupuru のZIPデータ位置が壊れています。");
      const localView = new DataView(zipU8.buffer, zipU8.byteOffset + localOffset, 30);
      if (localView.getUint32(0, true) !== ZIP_LOCAL_FILE_HEADER_SIG) {
        throw new Error(".purupuru のZIPローカルヘッダーが壊れています。");
      }
      const localNameLength = localView.getUint16(26, true);
      const localExtraLength = localView.getUint16(28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > zipU8.length) throw new Error(".purupuru のZIPデータが途中で切れています。");

      const compressed = zipU8.subarray(dataStart, dataEnd);
      let data;
      const nextTotal = totalSize + compressedSize;
      if (nextTotal > MAX_PURUPURU_UNZIPPED_SIZE) {
        throw new Error(".purupuru の展開後サイズが大きすぎます。");
      }
      if (method === ZIP_STORE_METHOD) {
        if (compressedSize !== uncompressedSize) throw new Error(".purupuru のZIPサイズ情報が壊れています。");
        data = new Uint8Array(compressed);
      } else {
        throw new Error("圧縮ZIPはサポートしていません。このアプリで保存した .purupuru を選んでください。");
      }
      if (data.length !== uncompressedSize) throw new Error(".purupuru の展開サイズが一致しません。");
      totalSize += data.length;
      if (totalSize > MAX_PURUPURU_UNZIPPED_SIZE) {
        throw new Error(".purupuru の展開後サイズが大きすぎます。");
      }
      if (crc32(data) !== expectedCrc) throw new Error(`ZIP内ファイルのCRCが一致しません: ${path}`);
      files[path] = data;
      pos = nameEnd + extraLength + commentLength;
    }
    return files;
  }

  function imageToPngBlob(image) {
    return new Promise((resolve, reject) => {
      const width = image?.naturalWidth || image?.width || 0;
      const height = image?.naturalHeight || image?.height || 0;
      if (width <= 0 || height <= 0) {
        reject(new Error("PNG変換する画像サイズが不正です。"));
        return;
      }
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const cx = c.getContext("2d");
      if (!cx) {
        reject(new Error("Canvasを作成できませんでした。"));
        return;
      }
      cx.clearRect(0, 0, width, height);
      cx.drawImage(image, 0, 0);
      c.toBlob((blob) => {
        if (!blob) {
          reject(new Error("PNG変換に失敗しました。"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }

  async function blobToU8(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function imageToPngU8(image) {
    return blobToU8(await imageToPngBlob(image));
  }

  function dataUrlToU8(dataUrl) {
    const normalized = validatePngDataUrl(dataUrl, "PNGアイテム");
    const base64 = normalized.slice(PNG_DATA_URL_PREFIX.length);
    const binary = atob(base64);
    const u8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      u8[i] = binary.charCodeAt(i);
    }
    return u8;
  }

  function u8ToPngDataUrl(u8) {
    let binary = "";
    const chunkSize = 0x4000;
    for (let i = 0; i < u8.length; i += chunkSize) {
      const chunk = u8.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return `${PNG_DATA_URL_PREFIX}${btoa(binary)}`;
  }

  function cloneJsonValue(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function dataUrlToBlob(dataUrl, mime = "image/png") {
    return new Blob([dataUrlToU8(dataUrl)], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("BlobをData URLへ変換できませんでした。"));
      reader.readAsDataURL(blob);
    });
  }

  function pngU8ToBlob(u8) {
    return new Blob([new Uint8Array(u8)], { type: "image/png" });
  }

  function assertPngU8(u8, name = "PNG") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!u8 || u8.length < sig.length) {
      throw new Error(`${name} はPNGではありません。`);
    }
    for (let i = 0; i < sig.length; i += 1) {
      if (u8[i] !== sig[i]) throw new Error(`${name} はPNGではありません。`);
    }
  }

  function resolveSettingsAssetUrl(path, settingsUrl = DEFAULT_SETTINGS_URL) {
    return new URL(String(path || ""), new URL(settingsUrl, window.location.href)).href;
  }

  function resolveDefaultSettingsAssetUrl(path) {
    return resolveSettingsAssetUrl(path, DEFAULT_SETTINGS_URL);
  }

  async function fetchPngDataUrl(path, name = "PNGアイテム", settingsUrl = DEFAULT_SETTINGS_URL) {
    const response = await fetch(resolveSettingsAssetUrl(path, settingsUrl), { cache: "no-store" });
    if (!response.ok) throw new Error(`${name} を読み込めませんでした: ${response.status}`);
    const u8 = new Uint8Array(await response.arrayBuffer());
    assertPngU8(u8, name);
    return u8ToPngDataUrl(u8);
  }

  async function hydrateItemLayerSources(payload, settingsUrl = DEFAULT_SETTINGS_URL) {
    if (!Array.isArray(payload?.itemLayers)) return payload;
    for (const layer of payload.itemLayers) {
      if (!layer || typeof layer !== "object" || layer.src || !layer.file) continue;
      layer.src = await fetchPngDataUrl(layer.file, layer.name || "PNGアイテム", settingsUrl);
    }
    return payload;
  }

  async function hydrateDefaultItemLayerSources(payload) {
    return hydrateItemLayerSources(payload, DEFAULT_SETTINGS_URL);
  }

  async function loadSettingsPayloadFromUrl(settingsUrl = DEFAULT_SETTINGS_URL) {
    const response = await fetch(settingsUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`デフォルト設定を読み込めませんでした: ${response.status}`);
    const payload = parseSettingsJson(await response.text());
    return hydrateItemLayerSources(payload, settingsUrl);
  }

  async function loadDefaultSettingsPayload() {
    return loadSettingsPayloadFromUrl(DEFAULT_SETTINGS_URL);
  }

  function loadPngImageFromU8(u8, name = "PNG") {
    return new Promise((resolve, reject) => {
      try {
        assertPngU8(u8, name);
      } catch (error) {
        reject(error);
        return;
      }
      const blob = new Blob([u8], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`${name} を画像として読み込めませんでした。`));
      };
      image.src = url;
    });
  }

  function avatarImageDimensions(image) {
    const width = image?.naturalWidth || image?.width || 0;
    const height = image?.naturalHeight || image?.height || 0;
    return { w: Math.round(width), h: Math.round(height) };
  }

  function validateAvatarImageDimensions(image, key = "キャラ素材", expectedSize = null) {
    const size = avatarImageDimensions(image);
    if (size.w <= 0 || size.h <= 0) {
      throw new Error(`${key} の画像サイズが不正です: ${size.w}x${size.h}`);
    }
    if (expectedSize && (size.w !== expectedSize.w || size.h !== expectedSize.h)) {
      throw new Error(`${key} のサイズが他のキャラ素材と一致しません。期待: ${expectedSize.w}x${expectedSize.h} / 実際: ${size.w}x${size.h}`);
    }
    return size;
  }

  function validateAvatarImageSetDimensions(loadedImages) {
    let expected = null;
    for (const key of Object.keys(AVATAR_PACKAGE_ASSETS)) {
      const image = loadedImages?.[key];
      if (!image) throw new Error(`キャラ素材が不足しています: ${key}`);
      const size = validateAvatarImageDimensions(image, key, expected);
      if (!expected) expected = size;
    }
    return expected;
  }

  function resizeCanvasToAvatarSize(canvasElement) {
    if (!canvasElement) return;
    if (canvasElement.width !== CROP.w) canvasElement.width = CROP.w;
    if (canvasElement.height !== CROP.h) canvasElement.height = CROP.h;
  }

  function resetGeneratedHighlightCanvases() {
    generatedHighlightSignature = "";
    generatedSubHighlightSignature = "";
    if (generatedHighlightCanvas) {
      generatedHighlightCanvas.width = CROP.w;
      generatedHighlightCanvas.height = CROP.h;
      markCanvasTextureDirty(generatedHighlightCanvas);
    }
    if (generatedSubHighlightCanvas) {
      generatedSubHighlightCanvas.width = CROP.w;
      generatedSubHighlightCanvas.height = CROP.h;
      markCanvasTextureDirty(generatedSubHighlightCanvas);
    }
  }

  function setAvatarImageSize(width, height) {
    const w = Math.round(Number(width) || 0);
    const h = Math.round(Number(height) || 0);
    if (w <= 0 || h <= 0) throw new Error(`キャラ素材サイズが不正です: ${w}x${h}`);
    const changed = CROP.w !== w || CROP.h !== h || CROP.x !== 0 || CROP.y !== 0;
    CROP.x = 0;
    CROP.y = 0;
    CROP.w = w;
    CROP.h = h;
    if (!changed) return false;
    resizeCanvasToAvatarSize(charCanvas);
    resizeCanvasToAvatarSize(frontHairShadowCanvas);
    resizeCanvasToAvatarSize(frontHairShadowReceiverCanvas);
    resizeCanvasToAvatarSize(frontHairShadowCompositeCanvas);
    resizeCanvasToAvatarSize(itemDeformFollowCanvas);
    resetGeneratedHighlightCanvases();
    hairTintCache.clear();
    faceCenterCacheFrame = -1;
    faceDepthAnchorsCacheFrame = -1;
    faceRigMetricsCacheFrame = -1;
    neckPivotCacheFrame = -1;
    return true;
  }

  async function resetMeshRendererAfterAvatarImageChange() {
    const generation = meshRendererGeneration + 1;
    meshRendererGeneration = generation;
    try {
      meshRenderer?.dispose?.();
    } catch (error) {
      console.warn("meshRenderer dispose failed", error);
    }
    meshRenderer = null;
    activeRendererKind = "canvas";
    setStageArtVisible(false);
    syncRendererModeUi();

    if (rendererModeAllowsWebGpu()) {
      try {
        const renderer = await createWebGpuMeshRenderer(CROP.w, CROP.h);
        if (generation !== meshRendererGeneration) {
          renderer?.dispose?.();
          return;
        }
        if (renderer) {
          meshRenderer = renderer;
          activeRendererKind = "webgpu";
          setStageArtVisible(true);
          syncRendererModeUi();
          return;
        }
      } catch (error) {
        if (rendererMode === "webgpu") {
          console.warn("WebGPUメッシュ初期化に失敗したためCanvas描画で続行します。", error);
        }
      }
    }

    if (generation !== meshRendererGeneration) return;
    try {
      meshRenderer = createMeshRenderer(CROP.w, CROP.h);
      activeRendererKind = "canvas";
      setStageArtVisible(false);
    } catch (error) {
      console.warn("WebGLメッシュ初期化に失敗したためCanvas描画で続行します。", error);
      meshRenderer = null;
      activeRendererKind = "canvas";
      setStageArtVisible(false);
    }
    syncRendererModeUi();
  }

  function applyLoadedAvatarImages(loadedImages) {
    const mergedImages = { ...images, ...(loadedImages || {}) };
    const size = validateAvatarImageSetDimensions(mergedImages);
    setAvatarImageSize(size.w, size.h);
    for (const [key, image] of Object.entries(loadedImages || {})) {
      images[key] = image;
    }
    avatarPackageImageVersion += 1;
    imagesReady = true;
    loadError = "";
    hairTintCache.clear();
    resetMeshRendererAfterAvatarImageChange();
    setStatus("ready");
  }

  async function buildPuruPuruPackagePayload() {
    if (!imagesReady) {
      throw new Error("キャラ素材の読み込みが完了していません。");
    }

    const files = Object.create(null);
    const manifest = {
      format: "purupuru-avatar-package",
      formatVersion: PURUPURU_PACKAGE_VERSION,
      app: "PuruPuru PNGTuber",
      createdAt: new Date().toISOString(),
      settings: "settings.json",
      thumbnail: "thumbnail.png",
      avatar: { ...AVATAR_PACKAGE_ASSETS },
    };

    for (const [key, path] of Object.entries(AVATAR_PACKAGE_ASSETS)) {
      const image = images[key];
      if (!image) throw new Error(`キャラ素材が不足しています: ${key}`);
      validateAvatarImageDimensions(image, key, { w: CROP.w, h: CROP.h });
      files[path] = await imageToPngU8(image);
    }

    const settings = buildAllSettingsPayload({ includeItemImages: false });
    settings.packageVersion = PURUPURU_PACKAGE_VERSION;
    settings.avatarImageSize = { width: CROP.w, height: CROP.h };
    settings.itemLayers = itemLayers.map((layer, index) => {
      const serialized = serializeItemLayer(layer, { includeImages: false });
      if (!layer.src) return { ...serialized, file: null };
      const itemFile = `items/item-${layer.id}-${safePackagePathName(layer.name || `item-${index + 1}.png`)}`;
      files[itemFile] = dataUrlToU8(layer.src);
      return { ...serialized, file: itemFile };
    });

    files["manifest.json"] = textToU8(JSON.stringify(manifest, null, 2));
    files["settings.json"] = textToU8(JSON.stringify(settings, null, 2));

    if (canvas?.toBlob) {
      const thumbnailBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (thumbnailBlob) files["thumbnail.png"] = await blobToU8(thumbnailBlob);
    }

    const zipU8 = buildStoredZip(files);
    if (zipU8.length > MAX_PURUPURU_PACKAGE_SIZE) {
      throw new Error(".purupuru ファイルが大きすぎます。PNGアイテムを減らしてください。");
    }
    return zipU8;
  }

  async function savePuruPuruPackage() {
    try {
      const zipU8 = await buildPuruPuruPackagePayload();
      const blob = new Blob([zipU8], { type: "application/vnd.purupuru.avatar+zip" });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `purupuru-avatar-${stamp}.purupuru`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      tryRememberAllSettingsPayload(buildAllSettingsPayload({ includeItemImages: false }));
      setEditStatus(".purupuru ファイルを書き出しました。キャラPNGとPNGアイテムも含まれます。");
      return true;
    } catch (error) {
      console.warn(".purupuru 保存に失敗しました。", error);
      setEditStatus(error instanceof Error ? error.message : ".purupuru 保存に失敗しました。");
      return false;
    }
  }

  async function parsePuruPuruPackageBlob(blob, displayName = ".purupuru") {
    if (!blob) throw new Error("読み込む .purupuru ファイルがありません。");
    if (blob.size > MAX_PURUPURU_PACKAGE_SIZE) {
      throw new Error(".purupuru ファイルが大きすぎます。80MB以下のファイルを選んでください。");
    }

    const zipU8 = new Uint8Array(await blob.arrayBuffer());
    const unzipped = await unzipPuruPuruPackage(zipU8);
    const manifestRaw = unzipped["manifest.json"];
    if (!manifestRaw) throw new Error("manifest.json がありません。");

    const manifest = parseSettingsJson(u8ToText(manifestRaw));
    if (manifest.format !== "purupuru-avatar-package") {
      throw new Error(".purupuru 形式ではありません。");
    }

    const settingsPath = assertSafePackagePath(manifest.settings || "settings.json");
    const settingsRaw = unzipped[settingsPath];
    if (!settingsRaw) throw new Error("settings.json がありません。");
    const settingsPayload = parseSettingsJson(u8ToText(settingsRaw));
    const hydratedSettingsPayload = cloneJsonValue(settingsPayload);

    const loadedAvatarImages = {};
    const avatarImageBlobs = {};
    let expectedAvatarSize = null;
    for (const [key, fallbackPath] of Object.entries(AVATAR_PACKAGE_ASSETS)) {
      const assetPath = assertSafePackagePath(manifest.avatar?.[key] || fallbackPath);
      const assetU8 = unzipped[assetPath];
      if (!assetU8) throw new Error(`キャラ素材がありません: ${assetPath}`);
      const image = await loadPngImageFromU8(assetU8, assetPath);
      expectedAvatarSize = validateAvatarImageDimensions(image, key, expectedAvatarSize);
      loadedAvatarImages[key] = image;
      avatarImageBlobs[key] = pngU8ToBlob(assetU8);
    }
    settingsPayload.avatarImageSize = {
      width: expectedAvatarSize.w,
      height: expectedAvatarSize.h,
    };
    hydratedSettingsPayload.avatarImageSize = {
      width: expectedAvatarSize.w,
      height: expectedAvatarSize.h,
    };

    const itemImageBlobs = {};
    if (Array.isArray(settingsPayload.itemLayers)) {
      hydratedSettingsPayload.itemLayers = settingsPayload.itemLayers.map((layer, index) => {
        if (!layer || typeof layer !== "object" || !layer.file) return layer;
        const itemPath = assertSafePackagePath(layer.file);
        const itemU8 = unzipped[itemPath];
        if (!itemU8) return layer;
        assertPngU8(itemU8, itemPath);
        const id = String(layer.id ?? index + 1);
        itemImageBlobs[id] = {
          blob: pngU8ToBlob(itemU8),
          name: String(layer.name || itemPath.split("/").pop() || `item-${index + 1}.png`),
          mime: "image/png",
        };
        return {
          ...layer,
          src: u8ToPngDataUrl(itemU8),
        };
      });
    }

    let thumbnailDataUrl = "";
    try {
      const thumbnailPath = assertSafePackagePath(manifest.thumbnail || "thumbnail.png");
      const thumbnailU8 = unzipped[thumbnailPath];
      if (thumbnailU8) {
        assertPngU8(thumbnailU8, thumbnailPath);
        thumbnailDataUrl = u8ToPngDataUrl(thumbnailU8);
      }
    } catch (error) {
      console.warn(`${displayName} のサムネイル読み込みをスキップしました。`, error);
    }

    return {
      manifest,
      settingsPayload,
      hydratedSettingsPayload,
      loadedImages: loadedAvatarImages,
      loadedAvatarImages,
      avatarImageBlobs,
      itemImageBlobs,
      thumbnailDataUrl,
    };
  }

  async function applyParsedPuruPuruPackage(parsed, statusText, { preserveGlobalRuntime = false } = {}) {
    const runtime = preserveGlobalRuntime ? captureGlobalRuntimeSettings() : null;
    try {
      const loaded = parsed?.loadedAvatarImages || parsed?.loadedImages;
      applyLoadedAvatarImages(loaded);
      const ok = await applyAllSettingsPayload(parsed?.hydratedSettingsPayload || parsed?.settingsPayload, statusText);
      if (runtime) restoreGlobalRuntimeSettings(runtime);
      return ok;
    } catch (error) {
      if (runtime) restoreGlobalRuntimeSettings(runtime);
      throw error;
    }
  }

  async function loadPuruPuruPackageFromFile(file) {
    if (!file) return false;
    try {
      const parsed = await parsePuruPuruPackageBlob(file, file.name);
      const ok = await applyParsedPuruPuruPackage(parsed, `.purupuru を読み込みました: ${file.name}`);
      if (ok) {
        tryRememberAllSettingsPayload(buildAllSettingsPayload({ includeItemImages: false }));
        markActiveCharacterDirty("avatarImages", "purupuru-replace");
      }
      return ok;
    } catch (error) {
      console.warn(".purupuru 読み込みに失敗しました。", error);
      setEditStatus(error instanceof Error ? error.message : ".purupuru 読み込みに失敗しました。");
      return false;
    }
  }

  function normalizeBaselineSettings(value) {
    // Phase 4: 古いファイルや形式不正の baseline は null へ正規化する。
    // 旧形式（payload 全体を保持）で value.payload.state に state が入っていた場合も移行する。
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const state = value.state || value.payload?.state;
    if (!state || typeof state !== "object" || Array.isArray(state)) return null;
    return {
      label: String(value.label || "基準値"),
      createdAt: String(value.createdAt || new Date().toISOString()),
      state: { ...state },
    };
  }

  function loadedSettingsStatusText(statusText) {
    const itemCount = itemLayers.length;
    return `${statusText} 可動範囲: 左${state.rangeLeft}%/右${state.rangeRight}%/上${state.rangeUp}%/下${state.rangeDown}%、顔の立体感: ${state.faceTurnDepth}%、斜め向き: ${state.faceTurnVertical}%、PNGアイテム: ${itemCount}個`;
  }

  async function applyAllSettingsPayload(saved, statusText = "全設定を読み込みました。") {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      throw new Error("設定ファイルの形式が正しくありません。");
    }
    const savedState = saved.state ?? saved;
    applyAllSettingsState(savedState);
    // PNGアイテムの復元は画像デコード待ちになるため、先にスライダー/ボタンへ設定値を反映する。
    // これにより「顔向き」「可動範囲」「顔の立体感」などは、アイテム復元の完了を待たずに変わる。
    syncAllSettingControls();
    applyOutputSettingsPayload(saved.outputSettings);
    if (saved.deformers) mergeSavedDeformers(saved.deformers);
    if (saved.faceCenterSetup) {
      applyFaceCenterSetupPayload(saved.faceCenterSetup);
    } else {
      faceCenterRaw = null;
    }
    if (saved.eyeSetup) applyEyeSetupPayload(saved.eyeSetup, "全設定から瞳位置・範囲サイズ・回転を読み込みました。");
    if (saved.faceDepthSetup) {
      applyFaceDepthSetupPayload(saved.faceDepthSetup, "全設定から顔奥行き点を読み込みました。");
    } else {
      faceDepthAnchorsRaw = null;
    }
    if (saved.neckPivotSetup) {
      applyNeckPivotSetupPayload(saved.neckPivotSetup, "全設定から首支点を読み込みました。");
    } else {
      neckPivotRaw = null;
    }
    if (saved.hairBundleSetup) {
      applyHairBundleSetupPayload(saved.hairBundleSetup, "全設定から髪束ラインを読み込みました。");
    } else {
      setHairBundleRigRaw(null);
    }
    if (saved.highlightSetup) {
      applyHighlightSetupPayload(saved.highlightSetup, "全設定からハイライト位置を読み込みました。");
    } else {
      highlightPointsRaw = null;
      subHighlightPointsRaw = null;
    }
    await restoreItemLayers(saved.itemLayers, saved.activeItemLayerId);
    // item復元などの非同期処理後にも、保存stateをもう一度適用してUIへ強制同期する。
    // 読み込み後に可動範囲・顔向き系スライダーが初期値へ見える事故を防ぐ。
    applyAllSettingsState(savedState);
    state.editMode = false;
    state.eyeSetupMode = false;
    state.highlightSetupMode = false;
    state.faceDepthSetupMode = false;
    state.neckPivotSetupMode = false;
    state.hairBundleSetupMode = false;
    state.rangePreviewDirection = null;
    state.demoTalk = false;
    characterWizard = null;
    if (ui.characterWizardPanel) ui.characterWizardPanel.hidden = true;
    updateCharacterWizardSetupControls();
    editDrag = null;
    eyeSetupDrag = null;
    highlightSetupDrag = null;
    faceDepthSetupDrag = null;
    neckPivotSetupDrag = null;
    hairBundleSetupDrag = null;
    characterDrag = null;
    itemDrag = null;
    itemHandleVisible = false;
    setPreviewTarget(0, 0);
    state.angleX = 0;
    state.angleY = 0;
    // Phase 4: baseline は syncAllSettingControls()(とその末尾の updateAllChangedBadges) より前に復元する。
    // 古いファイルは baselineSettings を持たないため null になる（前キャラの baseline を引き継がない）。
    baselineSettings = normalizeBaselineSettings(saved.baselineSettings);
    syncAllSettingControls();
    hairTintCache.clear();
    clearTimeout(blinkTimer);
    blinkClosed = false;
    if (state.autoBlink) scheduleBlink();
    setEditStatus(loadedSettingsStatusText(statusText));
    return true;
  }

  async function loadAllSettings() {
    if (ui.allSettingsFileInput) {
      // 同じ .purupuru を続けて選び直しても change イベントが必ず発火するようにする。
      ui.allSettingsFileInput.value = "";
      ui.allSettingsFileInput.click();
      return true;
    }
    const saved = safeGetSettingsJson(ALL_SETTINGS_STORAGE_KEY, () => {
      setEditStatus("ブラウザ内の控えの読み込みに失敗しました。");
    });
    if (!saved) {
      setEditStatus("読み込む設定ファイルを選択できませんでした。");
      return false;
    }
    try {
      return await applyAllSettingsPayload(saved, "ブラウザ内の控えから全設定を読み込みました。");
    } catch (error) {
      console.warn("全設定の読み込みに失敗しました。", error);
      setEditStatus("全設定の読み込みに失敗しました。");
      return false;
    }
  }

  async function loadAllSettingsFromFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    if (name.endsWith(".purupuru")) {
      return loadPuruPuruPackageFromFile(file);
    }
    setEditStatus("読み込みは .purupuru ファイルだけ対応しています。");
    return false;
  }

  function setItemStatus(text) {
    if (ui.itemStatus) ui.itemStatus.textContent = text;
  }

  function itemSlotInfo(slotKey) {
    return ITEM_LAYER_SLOTS[slotKey] || ITEM_LAYER_SLOTS[ITEM_LAYER_DEFAULTS.slot];
  }

  function imageSize(image) {
    return {
      w: image?.naturalWidth || image?.width || 1,
      h: image?.naturalHeight || image?.height || 1,
    };
  }

  function itemLayerControls() {
    return [
      ui.itemSlotSelect,
      ui.itemDeformFollowEnabled,
      ui.itemFollowStrength,
      ui.itemScale,
      ui.itemRotation,
      ui.itemX,
      ui.itemY,
      ui.itemOpacity,
      ui.itemCenterButton,
      ui.itemDuplicateButton,
      ui.itemDeleteButton,
    ].filter(Boolean);
  }

  function activeItemLayer() {
    return itemLayers.find((layer) => layer.id === activeItemLayerId) || null;
  }

  function serializeItemLayer(layer, { includeImages = true } = {}) {
    return {
      id: layer.id,
      label: layer.label,
      name: layer.name,
      src: includeImages ? layer.src : null,
      slot: layer.slot,
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: layer.rotation,
      opacity: layer.opacity,
      followStrength: layer.followStrength,
      deformFollowEnabled: Boolean(layer.deformFollowEnabled),
      visible: Boolean(layer.visible),
      locked: Boolean(layer.locked),
    };
  }

  function serializeItemLayers({ includeImages = true } = {}) {
    return itemLayers.map((layer) => serializeItemLayer(layer, { includeImages }));
  }

  function withItemMutation(task) {
    const run = async () => {
      itemMutationActive = true;
      updateItemLayerUi({ rebuildList: false });
      try {
        return await task();
      } finally {
        itemMutationActive = false;
        updateItemLayerUi({ rebuildList: false });
      }
    };
    const next = itemMutationChain.then(run, run);
    itemMutationChain = next.catch(() => {});
    return next;
  }

  function blockItemMutationWhileActive() {
    if (!itemMutationActive) return false;
    setItemStatus("PNGアイテムを処理中です。完了してから操作してください。");
    return true;
  }

  function normalizeItemNumber(value, fallback, min, max) {
    const number = Number(value);
    return Math.round(clamp(Number.isFinite(number) ? number : fallback, min, max));
  }

  function isPngFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    return file.type === "image/png" || name.endsWith(".png");
  }

  function normalizePngDataUrl(src) {
    const raw = String(src || "").trim();
    if (raw.startsWith(PNG_DATA_URL_PREFIX)) {
      return `${PNG_DATA_URL_PREFIX}${raw.slice(PNG_DATA_URL_PREFIX.length).replace(/\s/g, "")}`;
    }
    const match = raw.match(/^data:image\/png(?:;[^,]*)?;base64,(.*)$/i);
    return match ? `${PNG_DATA_URL_PREFIX}${match[1].replace(/\s/g, "")}` : "";
  }

  function validatePngDataUrl(src, name = "PNGアイテム", maxLength = Infinity) {
    const raw = String(src || "");
    if (raw.length > maxLength) {
      throw new Error(`${name} の画像データが大きすぎます。`);
    }
    const normalized = normalizePngDataUrl(raw);
    if (normalized.length > maxLength) {
      throw new Error(`${name} の画像データが大きすぎます。`);
    }
    const base64 = normalized.slice(PNG_DATA_URL_PREFIX.length);
    if (!normalized.startsWith(PNG_DATA_URL_PREFIX) || !base64.startsWith(PNG_BASE64_SIGNATURE)) {
      throw new Error(`${name} はPNG画像データではありません。`);
    }
    return `${PNG_DATA_URL_PREFIX}${base64}`;
  }

  function validateItemImageDimensions(image, name = "PNGアイテム") {
    const width = image?.naturalWidth || image?.width || 0;
    const height = image?.naturalHeight || image?.height || 0;
    if (
      width <= 0 ||
      height <= 0 ||
      width > MAX_ITEM_IMAGE_EDGE ||
      height > MAX_ITEM_IMAGE_EDGE ||
      width * height > MAX_ITEM_IMAGE_PIXELS
    ) {
      const maxPixelsText = `${Math.floor(MAX_ITEM_IMAGE_PIXELS / 10000)}万`;
      throw new Error(`${name} は画像サイズが大きすぎます。長辺${MAX_ITEM_IMAGE_EDGE}px以内・合計${maxPixelsText}画素以内のPNGを選んでください。`);
    }
  }

  function canvasToPngDataUrl(canvas, name = "PNGアイテム") {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`${name} の透明余白トリミングに失敗しました。`));
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`${name} の透明余白トリミング結果を読み込めませんでした。`));
        reader.onload = () => {
          try {
            resolve(validatePngDataUrl(reader.result, name));
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  }

  async function trimTransparentItemImage(image, src, name = "PNGアイテム") {
    const width = image?.naturalWidth || image?.width || 0;
    const height = image?.naturalHeight || image?.height || 0;
    if (width <= 0 || height <= 0) return { image, src, trimmed: false };

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { image, src, trimmed: false };
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      const row = y * width * 4;
      for (let x = 0; x < width; x += 1) {
        const alpha = pixels[row + x * 4 + 3];
        if (alpha <= ITEM_TRIM_ALPHA_THRESHOLD) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) return { image, src, trimmed: false };
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    if (cropW === width && cropH === height) return { image, src, trimmed: false };

    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;
    const trimmedCtx = trimmedCanvas.getContext("2d");
    if (!trimmedCtx) return { image, src, trimmed: false };
    trimmedCtx.clearRect(0, 0, cropW, cropH);
    trimmedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    const trimmedSrc = await canvasToPngDataUrl(trimmedCanvas, name);
    const trimmedImage = await loadItemImageFromSrc(trimmedSrc, name);
    return {
      image: trimmedImage,
      src: trimmedSrc,
      trimmed: true,
      originalWidth: width,
      originalHeight: height,
      trimmedWidth: cropW,
      trimmedHeight: cropH,
    };
  }

  function loadItemImageFromSrc(src, name = "PNGアイテム") {
    return new Promise((resolve, reject) => {
      let normalized = "";
      try {
        normalized = validatePngDataUrl(src, name);
      } catch (error) {
        reject(error);
        return;
      }
      const image = new Image();
      image.onload = () => {
        try {
          validateItemImageDimensions(image, name);
          resolve(image);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error(`${name} を画像として読み込めませんでした。`));
      image.src = normalized;
    });
  }

  function loadItemImageFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!isPngFile(file)) {
        reject(new Error(`${file?.name || "選択ファイル"} はPNGではありません。`));
        return;
      }
      if (file.size > MAX_ITEM_IMAGE_FILE_SIZE) {
        reject(new Error(`${file.name} は3MBを超えています。`));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`${file.name} を読み込めませんでした。`));
      reader.onload = () => {
        let src = "";
        try {
          src = validatePngDataUrl(reader.result, file.name);
        } catch (error) {
          reject(error);
          return;
        }
        const image = new Image();
        image.onload = async () => {
          try {
            validateItemImageDimensions(image, file.name);
            const optimized = await trimTransparentItemImage(image, src, file.name);
            resolve(optimized);
          } catch (error) {
            reject(error);
          }
        };
        image.onerror = () => reject(new Error(`${file.name} を画像として読み込めませんでした。`));
        image.src = src;
      };
      reader.readAsDataURL(file);
    });
  }

  function initialItemScaleForImage(image) {
    const { w, h } = imageSize(image);
    const maxW = CROP.w * ITEM_INITIAL_MAX_WIDTH_RATIO;
    const maxH = CROP.h * ITEM_INITIAL_MAX_HEIGHT_RATIO;
    const fit = Math.min(1, maxW / Math.max(1, w), maxH / Math.max(1, h));
    return Math.round(clamp(fit * ITEM_LAYER_DEFAULTS.scale, ITEM_LAYER_LIMITS.scale.min, ITEM_LAYER_DEFAULTS.scale));
  }

  function initializeNewItemLayerPlacement(layer) {
    // 追加直後は中央に置く。巨大な透明キャンバス素材は見た目と当たり判定が重くなるため、
    // 新規追加時だけ透明余白トリミング済み画像をキャラ枠に収まる初期サイズへ縮小する。
    layer.scale = initialItemScaleForImage(layer.image);
    layer.x = ITEM_LAYER_DEFAULTS.x;
    layer.y = ITEM_LAYER_DEFAULTS.y;
  }

  function loadItemFiles(fileList) {
    const rawFiles = [...(fileList || [])];
    return withItemMutation(() => loadItemFilesNow(rawFiles));
  }

  async function loadItemFilesNow(rawFiles) {
    const pngFiles = rawFiles.filter((file) => isPngFile(file));
    if (!pngFiles.length) {
      if (rawFiles.length) setItemStatus("PNGファイルだけ追加できます。");
      return;
    }

    const created = [];
    let optimizedCount = 0;
    for (const file of pngFiles) {
      if (itemLayers.length >= MAX_ITEM_LAYER_COUNT) {
        setItemStatus(`PNGアイテムは最大${MAX_ITEM_LAYER_COUNT}個までです。`);
        break;
      }
      try {
        const { image, src, trimmed } = await loadItemImageFromFile(file);
        const id = nextItemLayerId;
        const layer = {
          ...ITEM_LAYER_DEFAULTS,
          id,
          label: `#${id} ${file.name}`,
          name: file.name,
          src,
          image,
        };
        initializeNewItemLayerPlacement(layer);
        if (trimmed || layer.scale !== ITEM_LAYER_DEFAULTS.scale) optimizedCount += 1;
        itemLayers.push(layer);
        nextItemLayerId += 1;
        created.push(layer);
      } catch (error) {
        console.warn("PNGアイテムの追加に失敗しました。", error);
        setItemStatus(error instanceof Error ? error.message : "PNGアイテムの追加に失敗しました。");
      }
    }

    if (created.length) {
      activeItemLayerId = created[created.length - 1].id;
      itemHandleVisible = true;
      const optimizeText = optimizedCount ? " 透明余白と初期サイズを自動調整しました。" : "";
      setItemStatus(`${created.length}個のPNGアイテムを追加しました。${optimizeText}.purupuru に画像込みで保存できます。`);
      updateItemLayerUi();
      markActiveCharacterDirty("itemImages", "item-add");
    }
  }

  function renderItemLayerList(activeLayer) {
    if (!ui.itemLayerList) return;
    ui.itemLayerList.textContent = "";
    if (!itemLayers.length) {
      const empty = document.createElement("p");
      empty.className = "small-note";
      empty.textContent = "まだ追加アイテムがありません。";
      ui.itemLayerList.append(empty);
      return;
    }

    for (let index = itemLayers.length - 1; index >= 0; index -= 1) {
      const layer = itemLayers[index];
      const row = document.createElement("div");
      row.className = "item-row";
      row.dataset.id = String(layer.id);
      row.setAttribute("aria-selected", String(activeLayer?.id === layer.id));
      row.classList.toggle("is-locked", Boolean(layer.locked));

      const thumb = document.createElement("img");
      thumb.className = "item-thumb";
      thumb.src = layer.src;
      thumb.alt = "";
      row.append(thumb);

      const meta = document.createElement("div");
      meta.className = "item-meta";

      const nameButton = document.createElement("button");
      nameButton.className = "item-name";
      nameButton.type = "button";
      nameButton.dataset.act = "select";
      nameButton.title = layer.name;
      nameButton.textContent = layer.label;
      meta.append(nameButton);

      const sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = [
        itemSlotInfo(layer.slot).label,
        `${Math.round(layer.scale)}%`,
        layer.deformFollowEnabled && itemLayerSupportsDeformFollow(layer) ? "変形連動" : null,
        layer.visible ? null : "非表示",
        layer.locked ? "ロック中" : null,
      ].filter(Boolean).join(" / ");
      meta.append(sub);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      const actionDefs = [
        ["vis", layer.visible ? "👁" : "−", "表示/非表示"],
        ["lock", layer.locked ? "🔒" : "🔓", "ロック"],
        ["dup", "⧉", "複製"],
        ["up", "↑", "上へ"],
        ["down", "↓", "下へ"],
        ["delete", "×", "削除"],
      ];
      actionDefs.forEach(([action, text, title]) => {
        const button = document.createElement("button");
        button.className = "ghost-button icon-button";
        button.type = "button";
        button.dataset.act = action;
        button.title = title;
        button.setAttribute("aria-label", `${layer.name} の${title}`);
        button.textContent = text;
        actions.append(button);
      });
      meta.append(actions);
      row.append(meta);
      ui.itemLayerList.append(row);
    }
  }

  function updateItemLayerUi({ rebuildList = true } = {}) {
    if (!ui.itemLayerList) return;
    const activeLayer = activeItemLayer();
    if (!activeLayer) {
      activeItemLayerId = null;
      itemHandleVisible = false;
    }
    if (activeLayer?.locked) itemHandleVisible = false;
    if (rebuildList) renderItemLayerList(activeLayer);

    const countText = itemLayers.length ? `${itemLayers.length}個` : "0個";
    if (ui.itemFileReadout) ui.itemFileReadout.textContent = itemLayers.length ? `${itemLayers.length}個追加` : "未追加";
    if (ui.itemLayerReadout) ui.itemLayerReadout.textContent = countText;
    if (ui.itemSelectedReadout) {
      ui.itemSelectedReadout.textContent = activeLayer ? `${activeLayer.label}${activeLayer.locked ? "（ロック中）" : ""}` : "未選択";
    }
    itemLayerControls().forEach((control) => {
      control.disabled = itemMutationActive || !activeLayer || Boolean(activeLayer.locked);
    });
    if (ui.itemDeleteAllButton) ui.itemDeleteAllButton.disabled = itemMutationActive || !itemLayers.length;

    const layer = { ...ITEM_LAYER_DEFAULTS, ...(activeLayer || {}) };
    const canDeformFollow = Boolean(activeLayer && itemLayerSupportsDeformFollow(layer));
    const canRigidFollow = Boolean(activeLayer && itemLayerSupportsRigidFollow(layer));
    const deformFollowActive = Boolean(layer.deformFollowEnabled && canDeformFollow);
    if (ui.itemSlotSelect) ui.itemSlotSelect.value = layer.slot;
    if (ui.itemDeformFollowEnabled) {
      ui.itemDeformFollowEnabled.checked = deformFollowActive;
      ui.itemDeformFollowEnabled.disabled = itemMutationActive || !activeLayer || Boolean(activeLayer.locked) || !canDeformFollow;
    }
    if (ui.itemFollowStrength) {
      ui.itemFollowStrength.disabled =
        itemMutationActive || !activeLayer || Boolean(activeLayer.locked) || !canRigidFollow || deformFollowActive;
    }
    setRangeControlValue("itemFollowStrength", Math.round(layer.followStrength));
    setRangeControlValue("itemScale", Math.round(layer.scale));
    setRangeControlValue("itemRotation", Math.round(layer.rotation), "°");
    setRangeControlValue("itemX", Math.round(layer.x), "px");
    setRangeControlValue("itemY", Math.round(layer.y), "px");
    setRangeControlValue("itemOpacity", Math.round(layer.opacity));
  }

  function setItemLayerValue(key, value) {
    if (blockItemMutationWhileActive()) return;
    const layer = activeItemLayer();
    if (!layer || layer.locked) return;
    const limit = ITEM_LAYER_LIMITS[key];
    if (limit) layer[key] = Math.round(clamp(value, limit.min, limit.max));
    updateItemLayerUi({ rebuildList: false });
    markActiveCharacterDirty("settings", `item-${key}`);
  }

  function moveItemLayer(kind, id = activeItemLayerId) {
    if (blockItemMutationWhileActive()) return;
    const index = itemLayers.findIndex((layer) => layer.id === id);
    if (index < 0 || itemLayers[index].locked) return;
    const [layer] = itemLayers.splice(index, 1);
    const nextIndex = clamp(index + (kind === "up" ? 1 : -1), 0, itemLayers.length);
    itemLayers.splice(nextIndex, 0, layer);
    activeItemLayerId = layer.id;
    itemHandleVisible = true;
    updateItemLayerUi();
    markActiveCharacterDirty("settings", "item-move");
  }

  function deleteItemLayer(id = activeItemLayerId) {
    if (blockItemMutationWhileActive()) return;
    const index = itemLayers.findIndex((layer) => layer.id === id);
    if (index < 0 || itemLayers[index].locked) return;
    const [removed] = itemLayers.splice(index, 1);
    if (removed.id === activeItemLayerId) {
      activeItemLayerId = itemLayers[Math.min(index, itemLayers.length - 1)]?.id || null;
      itemDrag = null;
      itemHandleVisible = Boolean(activeItemLayerId);
    }
    setItemStatus("選択アイテムを削除しました。");
    updateItemLayerUi();
    markActiveCharacterDirty("itemImages", "item-delete");
  }

  function deleteAllItemLayers() {
    if (blockItemMutationWhileActive()) return;
    if (!itemLayers.length) return;
    if (!window.confirm("追加アイテムを全削除しますか？ロック中のアイテムも削除されます。")) return;
    itemLayers.length = 0;
    activeItemLayerId = null;
    itemDrag = null;
    itemHandleVisible = false;
    setItemStatus("追加アイテムを全削除しました。");
    updateItemLayerUi();
    markActiveCharacterDirty("itemImages", "item-delete-all");
  }

  function duplicateItemLayer(id = activeItemLayerId) {
    if (blockItemMutationWhileActive()) return;
    const sourceIndex = itemLayers.findIndex((layer) => layer.id === id);
    if (sourceIndex < 0 || itemLayers[sourceIndex].locked) return;
    if (itemLayers.length >= MAX_ITEM_LAYER_COUNT) {
      setItemStatus(`PNGアイテムは最大${MAX_ITEM_LAYER_COUNT}個までです。`);
      return;
    }
    const source = itemLayers[sourceIndex];
    const newId = nextItemLayerId;
    const layer = {
      ...source,
      id: newId,
      label: `#${newId} ${source.name || "copy.png"}`,
      x: Math.round(clamp(source.x + 28, -3000, 3000)),
      y: Math.round(clamp(source.y + 28, -3000, 3000)),
      locked: false,
    };
    itemLayers.splice(sourceIndex + 1, 0, layer);
    nextItemLayerId += 1;
    activeItemLayerId = layer.id;
    itemHandleVisible = true;
    setItemStatus("PNGアイテムを複製しました。");
    updateItemLayerUi();
    markActiveCharacterDirty("itemImages", "item-duplicate");
  }

  async function reviveItemLayer(layerData, fallbackIndex = 0) {
    const src = String(layerData?.src || "").trim();
    const name = String(layerData?.name || `item-${fallbackIndex + 1}.png`);
    const image = await loadItemImageFromSrc(src, name);
    const id = normalizeItemNumber(layerData?.id, fallbackIndex + 1, 1, 999999);
    return {
      ...ITEM_LAYER_DEFAULTS,
      id,
      label: String(layerData?.label || `#${id} ${name}`),
      name,
      src,
      image,
      slot: ITEM_LAYER_SLOTS[layerData?.slot] ? layerData.slot : ITEM_LAYER_DEFAULTS.slot,
      x: normalizeItemNumber(layerData?.x, ITEM_LAYER_DEFAULTS.x, ITEM_LAYER_LIMITS.x.min, ITEM_LAYER_LIMITS.x.max),
      y: normalizeItemNumber(layerData?.y, ITEM_LAYER_DEFAULTS.y, ITEM_LAYER_LIMITS.y.min, ITEM_LAYER_LIMITS.y.max),
      scale: normalizeItemNumber(
        layerData?.scale,
        ITEM_LAYER_DEFAULTS.scale,
        ITEM_LAYER_LIMITS.scale.min,
        ITEM_LAYER_LIMITS.scale.max
      ),
      rotation: normalizeItemNumber(
        layerData?.rotation,
        ITEM_LAYER_DEFAULTS.rotation,
        ITEM_LAYER_LIMITS.rotation.min,
        ITEM_LAYER_LIMITS.rotation.max
      ),
      opacity: normalizeItemNumber(
        layerData?.opacity,
        ITEM_LAYER_DEFAULTS.opacity,
        ITEM_LAYER_LIMITS.opacity.min,
        ITEM_LAYER_LIMITS.opacity.max
      ),
      followStrength: normalizeItemNumber(
        layerData?.followStrength,
        ITEM_LAYER_DEFAULTS.followStrength,
        ITEM_LAYER_LIMITS.followStrength.min,
        ITEM_LAYER_LIMITS.followStrength.max
      ),
      deformFollowEnabled: Boolean(layerData?.deformFollowEnabled),
      visible: layerData?.visible !== false,
      locked: Boolean(layerData?.locked),
    };
  }

  function restoreItemLayers(layerDataList, requestedActiveId = null) {
    const inputLayers = Array.isArray(layerDataList) ? layerDataList.slice(0, MAX_ITEM_LAYER_COUNT) : [];
    return withItemMutation(() => restoreItemLayersNow(inputLayers, requestedActiveId));
  }

  async function restoreItemLayersNow(inputLayers, requestedActiveId = null) {
    itemLayers.length = 0;
    activeItemLayerId = null;
    itemDrag = null;
    itemHandleVisible = false;
    const settled = await Promise.allSettled(inputLayers.map((layerData, index) => reviveItemLayer(layerData, index)));
    const restored = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
    const usedIds = new Set();
    let maxId = 0;
    restored.forEach((layer, index) => {
      if (usedIds.has(layer.id)) layer.id = maxId + index + 1;
      usedIds.add(layer.id);
      maxId = Math.max(maxId, layer.id);
      itemLayers.push(layer);
    });
    const requested = Number(requestedActiveId);
    activeItemLayerId = itemLayers.some((layer) => layer.id === requested)
      ? requested
      : (itemLayers[itemLayers.length - 1]?.id || null);
    itemHandleVisible = Boolean(activeItemLayerId);
    nextItemLayerId = Math.max(nextItemLayerId, maxId + 1);
    updateItemLayerUi();
    const failedCount = settled.length - restored.length;
    if (failedCount > 0) {
      setItemStatus(`${failedCount}個のPNGアイテムを読み込めなかったためスキップしました。`);
    }
  }

  function setEditStatus(text) {
    if (ui.editStatus) ui.editStatus.textContent = text;
  }

  function setObsStatus(text) {
    if (ui.obsStatus) ui.obsStatus.textContent = text;
  }

  function normalizeObsPresetKey(key) {
    return OBS_PRESETS[String(key || "")] ? String(key) : DEFAULT_OBS_PRESET;
  }

  function loadObsPresetKey() {
    try {
      return normalizeObsPresetKey(localStorage.getItem(OBS_PRESET_STORAGE_KEY));
    } catch {
      return DEFAULT_OBS_PRESET;
    }
  }

  function rememberObsPresetKey(key) {
    try {
      localStorage.setItem(OBS_PRESET_STORAGE_KEY, normalizeObsPresetKey(key));
    } catch {
      // localStorageが使えない環境では、現在のページ内状態だけで続行する。
    }
  }

  function currentObsPreset() {
    return OBS_PRESETS[normalizeObsPresetKey(obsPresetKey)] || OBS_PRESETS[DEFAULT_OBS_PRESET];
  }

  function currentObsRenderFps() {
    return OBS_TARGET_FPS || currentObsPreset().fps;
  }

  function currentObsQuality() {
    return OBS_QUALITY || currentObsPreset().quality;
  }

  function currentObsUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("mode", "obs");
    url.searchParams.set("transparent", "1");
    return url.toString();
  }

  function updateObsUrlPreview() {
    if (ui.obsUrlPreview) ui.obsUrlPreview.textContent = currentObsUrl();
  }

  function syncObsPresetUi() {
    const key = normalizeObsPresetKey(obsPresetKey);
    const preset = currentObsPreset();
    ui.obsPresetButtons?.forEach((button) => {
      const active = button.dataset.obsPreset === key;
      button.setAttribute("aria-pressed", String(active));
    });
    if (ui.obsPresetHint) {
      ui.obsPresetHint.textContent = `選択中: ${preset.label} / OBS ${preset.width}x${preset.height} / 表示${preset.fps}fps / 送信${preset.sendFps}fps`;
    }
  }

  function applyObsPresetConfig(config, { announce = false } = {}) {
    const key = normalizeObsPresetKey(config?.preset);
    obsPresetKey = key;
    rememberObsPresetKey(obsPresetKey);
    syncObsPresetUi();
    updateObsUrlPreview();
    if (announce) {
      const preset = currentObsPreset();
      setObsStatus(`${preset.label}プリセットをOBSへ反映しました。`);
    }
  }

  async function pushObsConfig() {
    if (OBS_MODE) return false;
    try {
      const response = await fetch("/api/obs/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: normalizeObsPresetKey(obsPresetKey) }),
      });
      return response.ok;
    } catch (error) {
      console.warn("OBSプリセット共有に失敗しました。", error);
      return false;
    }
  }

  async function loadObsConfigIfAvailable() {
    if (!OBS_MODE) return false;
    try {
      const response = await fetch("/api/obs/config", { cache: "no-store" });
      if (!response.ok) return false;
      const config = sanitizeImportedJsonValue(await response.json());
      applyObsPresetConfig(config);
      return true;
    } catch (error) {
      console.warn("OBS preset config load failed", error);
      return false;
    }
  }

  function setObsPreset(key, { announce = true, push = true } = {}) {
    obsPresetKey = normalizeObsPresetKey(key);
    rememberObsPresetKey(obsPresetKey);
    syncObsPresetUi();
    updateObsUrlPreview();
    if (push) {
      pushObsConfig().then((ok) => {
        if (!ok) setObsStatus("OBSプリセット共有に失敗しました。ローカルサーバー経由で開いているか確認してください。");
      });
    }
    if (announce) {
      const preset = currentObsPreset();
      setObsStatus(`${preset.label}プリセットを選択しました。OBS URLの貼り直しは不要です。推奨 ${preset.width}x${preset.height} / ${preset.fps}fps`);
    }
  }

  async function copyObsUrl() {
    const url = currentObsUrl();
    setObsPublishEnabled(true);
    const preset = currentObsPreset();
    try {
      await navigator.clipboard.writeText(url);
      setObsStatus(`OBS用URLをコピーしました（${preset.label}）。OBS連携もONにしました。`);
      setEditStatus("OBS用URLをコピーしました。");
    } catch (error) {
      setObsStatus(`クリップボードへコピーできませんでした。URL: ${url}`);
      setEditStatus(`OBS用URL: ${url}`);
    }
    return url;
  }

  function applyObsModeDefaults() {
    document.documentElement.classList.toggle("obs-mode", OBS_MODE);
    document.body.classList.toggle("obs-mode", OBS_MODE);
    if (!OBS_MODE) return;
    document.body.classList.add("dock-hidden");
    state.mouseFollowEnabled = false;
    state.showMesh = false;
    state.editMode = false;
    state.eyeSetupMode = false;
    state.highlightSetupMode = false;
    state.faceDepthSetupMode = false;
    state.neckPivotSetupMode = false;
    state.hairBundleSetupMode = false;
    state.rangePreviewDirection = null;
  }

  function syncObsPublishButton() {
    if (!ui.obsPublishButton) return;
    ui.obsPublishButton.textContent = `OBS連携 ${obsPublishEnabled ? "ON" : "OFF"}`;
    ui.obsPublishButton.setAttribute("aria-pressed", String(obsPublishEnabled));
  }

  function setObsPublishEnabled(enabled) {
    obsPublishEnabled = Boolean(enabled);
    syncObsPublishButton();
    const preset = currentObsPreset();
    setObsStatus(obsPublishEnabled ? `OBS連携ON: ${preset.label}プリセットで${preset.sendFps}fps上限送信します。` : "OBS連携OFF");
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB操作に失敗しました。"));
    });
  }

  function openCharacterProfileDb() {
    if (characterProfileDbPromise) return characterProfileDbPromise;
    if (!window.indexedDB) {
      characterProfileDbPromise = Promise.reject(new Error("このブラウザではIndexedDBを使えません。"));
      return characterProfileDbPromise;
    }
    characterProfileDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(CHARACTER_DB_NAME, CHARACTER_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.objectStoreNames.contains(CHARACTER_STORE_NAME)
          ? request.transaction.objectStore(CHARACTER_STORE_NAME)
          : db.createObjectStore(CHARACTER_STORE_NAME, { keyPath: "id" });
        if (!store.indexNames.contains("updatedAt")) store.createIndex("updatedAt", "updatedAt");
        if (!store.indexNames.contains("lastUsedAt")) store.createIndex("lastUsedAt", "lastUsedAt");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("キャラライブラリDBを開けませんでした。"));
    });
    return characterProfileDbPromise;
  }

  async function characterStore(mode = "readonly") {
    const db = await openCharacterProfileDb();
    return db.transaction(CHARACTER_STORE_NAME, mode).objectStore(CHARACTER_STORE_NAME);
  }

  function sortCharacterProfiles(profiles) {
    return profiles.slice().sort((a, b) => {
      const last = String(b.lastUsedAt || "").localeCompare(String(a.lastUsedAt || ""));
      if (last) return last;
      const updated = String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      if (updated) return updated;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
  }

  async function listCharacterProfiles() {
    const store = await characterStore("readonly");
    const profiles = await requestToPromise(store.getAll());
    characterProfilesCache = sortCharacterProfiles(Array.isArray(profiles) ? profiles : []);
    return characterProfilesCache;
  }

  async function getCharacterProfile(id) {
    if (!id) return null;
    const store = await characterStore("readonly");
    return requestToPromise(store.get(String(id)));
  }

  async function putCharacterProfile(record) {
    const store = await characterStore("readwrite");
    await requestToPromise(store.put(record));
    await listCharacterProfiles();
    return record;
  }

  async function patchCharacterProfile(id, patch) {
    const current = await getCharacterProfile(id);
    if (!current) throw new Error("キャラプロファイルが見つかりません。");
    return putCharacterProfile({ ...current, ...patch, id: current.id });
  }

  async function touchCharacterProfile(id) {
    if (!id) return false;
    await patchCharacterProfile(id, { lastUsedAt: new Date().toISOString() });
    return true;
  }

  function createCharacterId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `char-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function rememberActiveCharacterId(id) {
    try {
      if (id) localStorage.setItem(ACTIVE_CHARACTER_STORAGE_KEY, String(id));
      else localStorage.removeItem(ACTIVE_CHARACTER_STORAGE_KEY);
    } catch {
      // localStorageが使えない場合はページ内状態だけで続行する。
    }
  }

  function readActiveCharacterId() {
    try {
      return localStorage.getItem(ACTIVE_CHARACTER_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  function currentWorkspacePage() {
    return document.querySelector("[data-workspace-target][aria-pressed='true']")?.dataset.workspaceTarget || "adjust";
  }

  function currentAdjustCategory() {
    return document.querySelector("[data-adjust-target][aria-pressed='true']")?.dataset.adjustTarget || "layout";
  }

  function captureGlobalRuntimeSettings() {
    return {
      obsPresetKey,
      obsPublishEnabled,
      workspacePage: currentWorkspacePage(),
      adjustCategory: currentAdjustCategory(),
      dockHidden: document.body.classList.contains("dock-hidden"),
      stateOverrides: {
        mouseFollowEnabled: state.mouseFollowEnabled,
        idleMotionEnabled: state.idleMotionEnabled,
        showMesh: state.showMesh,
      },
    };
  }

  function restoreGlobalRuntimeSettings(runtime) {
    if (!runtime) return;
    obsPresetKey = normalizeObsPresetKey(runtime.obsPresetKey);
    rememberObsPresetKey(obsPresetKey);
    syncObsPresetUi();
    updateObsUrlPreview();
    obsPublishEnabled = Boolean(runtime.obsPublishEnabled);
    syncObsPublishButton();
    if (runtime.workspacePage) setWorkspacePage(runtime.workspacePage);
    if (runtime.adjustCategory) setAdjustCategory(runtime.adjustCategory);
    setDockHidden(Boolean(runtime.dockHidden));
    for (const [key, value] of Object.entries(runtime.stateOverrides || {})) {
      if (Object.prototype.hasOwnProperty.call(state, key)) state[key] = value;
    }
    syncAllSettingControls();
  }

  function updateCharacterSaveStatus(text = characterSaveStatusText) {
    characterSaveStatusText = String(text || "保存済み");
    if (ui.activeCharacterSaveStatus) ui.activeCharacterSaveStatus.textContent = characterSaveStatusText;
  }

  function updateCharacterSwitcherDisabled(disabled) {
    ui.characterSwitcher?.classList.toggle("is-busy", Boolean(disabled));
    if (ui.characterSwitcherButton) ui.characterSwitcherButton.disabled = Boolean(disabled);
    if (ui.addCharacterButton) ui.addCharacterButton.disabled = Boolean(disabled);
    if (ui.duplicateCharacterButton) ui.duplicateCharacterButton.disabled = Boolean(disabled) || !activeCharacterId;
  }

  function closeCharacterSwitcherMenu() {
    if (!ui.characterSwitcherMenu) return;
    ui.characterSwitcherMenu.hidden = true;
    ui.characterSwitcherButton?.setAttribute("aria-expanded", "false");
  }

  function toggleCharacterSwitcherMenu() {
    if (!ui.characterSwitcherMenu || !characterLibraryReady) return;
    const nextOpen = ui.characterSwitcherMenu.hidden;
    ui.characterSwitcherMenu.hidden = !nextOpen;
    ui.characterSwitcherButton?.setAttribute("aria-expanded", String(nextOpen));
  }

  function formatCharacterUpdatedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function characterSourceLabel(source) {
    switch (source?.kind) {
      case "purupuru": return "ファイル追加";
      case "duplicate": return "複製";
      case "default": return "初期キャラ";
      case DEMO_AVATAR02_SOURCE_KIND:
      case DEMO_AVATAR03_SOURCE_KIND:
        return "同梱キャラ";
      default: return "保存済み";
    }
  }

  function renderCharacterCard(profile) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card";
    button.dataset.characterId = profile.id;
    button.setAttribute("role", "menuitem");
    button.setAttribute("aria-current", String(profile.id === activeCharacterId));
    if (profile.thumbnailDataUrl) {
      const img = document.createElement("img");
      img.className = "character-card-thumb";
      img.alt = "";
      img.src = profile.thumbnailDataUrl;
      button.append(img);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "character-card-thumb character-card-thumb-placeholder";
      placeholder.textContent = "☆";
      button.append(placeholder);
    }
    const main = document.createElement("span");
    main.className = "character-card-main";
    const name = document.createElement("span");
    name.className = "character-card-name";
    name.textContent = profile.name || "未設定キャラ";
    const meta = document.createElement("span");
    meta.className = "character-card-meta";
    meta.textContent = [characterSourceLabel(profile.source), formatCharacterUpdatedAt(profile.updatedAt)].filter(Boolean).join(" / ");
    main.append(name, meta);
    const badge = document.createElement("span");
    badge.className = "character-card-badge";
    badge.textContent = profile.id === activeCharacterId ? "現在" : "切替";
    button.append(main, badge);
    return button;
  }

  function renderEmptyCharacterCard(index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card character-card-empty";
    button.dataset.emptySlot = String(index);
    button.setAttribute("role", "menuitem");
    const placeholder = document.createElement("span");
    placeholder.className = "character-card-thumb character-card-thumb-placeholder";
    placeholder.textContent = "+";
    const main = document.createElement("span");
    main.className = "character-card-main";
    const name = document.createElement("span");
    name.className = "character-card-name";
    name.textContent = "追加する";
    const meta = document.createElement("span");
    meta.className = "character-card-meta";
    meta.textContent = ".purupuruから新規キャラを追加";
    main.append(name, meta);
    const badge = document.createElement("span");
    badge.className = "character-card-badge";
    badge.textContent = "空き";
    button.append(placeholder, main, badge);
    return button;
  }

  async function updateCharacterSwitcherUi() {
    if (!ui.characterSwitcher) return;
    const profiles = characterLibraryReady ? await listCharacterProfiles().catch(() => characterProfilesCache) : characterProfilesCache;
    const active = profiles.find((profile) => profile.id === activeCharacterId) || profiles[0] || null;
    if (ui.activeCharacterName) ui.activeCharacterName.textContent = active?.name || "キャラ未設定";
    if (ui.activeCharacterThumb) {
      if (active?.thumbnailDataUrl) ui.activeCharacterThumb.src = active.thumbnailDataUrl;
      else ui.activeCharacterThumb.removeAttribute("src");
    }
    updateCharacterSaveStatus(characterSaveStatusText);
    if (ui.duplicateCharacterButton) ui.duplicateCharacterButton.disabled = !activeCharacterId || characterSwitching;
    if (!ui.characterList) return;
    ui.characterList.textContent = "";
    profiles.forEach((profile) => ui.characterList.append(renderCharacterCard(profile)));
    for (let i = profiles.length; i < 3; i += 1) ui.characterList.append(renderEmptyCharacterCard(i + 1));
  }

  function showCharacterLibraryUnavailableMessage(error) {
    updateCharacterSaveStatus("保存不可");
    if (ui.activeCharacterName) ui.activeCharacterName.textContent = "キャラ管理OFF";
    updateCharacterSwitcherDisabled(true);
    setEditStatus(error instanceof Error ? error.message : "キャラ管理を初期化できませんでした。");
  }

  async function captureCharacterThumbnailDataUrl() {
    if (!canvas?.toBlob) return "";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return "";
    return blobToDataUrl(blob);
  }

  async function buildAvatarCompositeThumbnailDataUrl(loadedImages, name = "キャラサムネイル") {
    const face =
      loadedImages?.eyesOpenMouthClosed ||
      loadedImages?.eyesOpenMouthHalf ||
      loadedImages?.eyesOpenMouthOpen ||
      Object.values(loadedImages || {})[0];
    if (!face) return "";
    const size = validateAvatarImageSetDimensions(loadedImages);
    const canvasElement = document.createElement("canvas");
    canvasElement.width = size.w;
    canvasElement.height = size.h;
    const thumbnailCtx = canvasElement.getContext("2d");
    if (!thumbnailCtx) return blobToDataUrl(await imageToPngBlob(face));
    thumbnailCtx.clearRect(0, 0, size.w, size.h);
    for (const image of [loadedImages.backHair, face, loadedImages.frontHair]) {
      if (image) thumbnailCtx.drawImage(image, 0, 0, size.w, size.h);
    }
    return canvasToPngDataUrl(canvasElement, name);
  }

  function collectItemImageBlobsFromRuntime() {
    const itemImageBlobs = {};
    for (const layer of itemLayers) {
      if (!layer?.src) continue;
      itemImageBlobs[String(layer.id)] = {
        blob: dataUrlToBlob(layer.src, "image/png"),
        name: layer.name || `item-${layer.id}.png`,
        mime: "image/png",
      };
    }
    return itemImageBlobs;
  }

  function collectItemImageBlobsFromSettingsPayload(settingsPayload) {
    const itemImageBlobs = {};
    for (const layer of settingsPayload?.itemLayers || []) {
      if (!layer?.src) continue;
      itemImageBlobs[String(layer.id)] = {
        blob: dataUrlToBlob(layer.src, "image/png"),
        name: layer.name || layer.file || `item-${layer.id}.png`,
        mime: "image/png",
      };
    }
    return itemImageBlobs;
  }

  function stripItemLayerSourcesFromSettingsPayload(settingsPayload) {
    const stripped = cloneJsonValue(settingsPayload || {});
    if (Array.isArray(stripped.itemLayers)) {
      stripped.itemLayers = stripped.itemLayers.map((layer) =>
        layer && typeof layer === "object" ? { ...layer, src: null } : layer
      );
    }
    return stripped;
  }

  async function collectAvatarImageBlobsFromRuntime() {
    const avatarImageBlobs = {};
    for (const key of Object.keys(AVATAR_PACKAGE_ASSETS)) {
      const image = images[key];
      if (!image) throw new Error(`キャラ素材が不足しています: ${key}`);
      validateAvatarImageDimensions(image, key, { w: CROP.w, h: CROP.h });
      avatarImageBlobs[key] = await imageToPngBlob(image);
    }
    return avatarImageBlobs;
  }

  async function avatarImageBlobsSignature(avatarImageBlobs) {
    const parts = [];
    for (const key of Object.keys(AVATAR_PACKAGE_ASSETS)) {
      const blob = avatarImageBlobs?.[key];
      if (!blob) throw new Error(`キャラ素材が不足しています: ${key}`);
      const u8 = new Uint8Array(await blob.arrayBuffer());
      parts.push(`${key}:${u8.length}:${crc32(u8).toString(16)}`);
    }
    return parts.join("|");
  }

  function scalePointObjectDeep(value, sx, sy) {
    if (Array.isArray(value)) return value.map((item) => scalePointObjectDeep(item, sx, sy));
    if (!value || typeof value !== "object") return value;
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "x" && typeof item === "number") out[key] = Math.round(item * sx * 100) / 100;
      else if (key === "y" && typeof item === "number") out[key] = Math.round(item * sy * 100) / 100;
      else out[key] = scalePointObjectDeep(item, sx, sy);
    }
    return out;
  }

  function scaleNumberField(object, key, scale) {
    if (object && typeof object[key] === "number") {
      object[key] = Math.round(object[key] * scale * 100) / 100;
    }
  }

  function scaleSettingsPayloadForAvatarSize(payload, fromSize, toSize) {
    const settings = cloneJsonValue(payload || {});
    const fromW = Math.max(1, Number(fromSize?.w || fromSize?.width || DEFAULT_AVATAR_IMAGE_SIZE.w));
    const fromH = Math.max(1, Number(fromSize?.h || fromSize?.height || DEFAULT_AVATAR_IMAGE_SIZE.h));
    const toW = Math.max(1, Number(toSize?.w || toSize?.width || fromW));
    const toH = Math.max(1, Number(toSize?.h || toSize?.height || fromH));
    const sx = toW / fromW;
    const sy = toH / fromH;
    const s = Math.sqrt(sx * sy);

    for (const key of ["faceCenterSetup", "faceDepthSetup", "neckPivotSetup", "hairBundleSetup", "highlightSetup", "deformers"]) {
      if (settings[key]) settings[key] = scalePointObjectDeep(settings[key], sx, sy);
    }
    if (settings.eyeSetup) {
      settings.eyeSetup = scalePointObjectDeep(settings.eyeSetup, sx, sy);
      scaleNumberField(settings.eyeSetup, "radius", s);
    }
    if (settings.highlightSetup) {
      scaleNumberField(settings.highlightSetup, "size", s);
      scaleNumberField(settings.highlightSetup, "subSize", s);
    }
    if (settings.state) {
      scaleNumberField(settings.state, "highlightSize", s);
      scaleNumberField(settings.state, "subHighlightSize", s);
      scaleNumberField(settings.state, "tearLensRadiusX", sx);
      scaleNumberField(settings.state, "tearLensRadiusY", sy);
      scaleNumberField(settings.state, "frontHairShadowDistance", s);
    }
    if (Array.isArray(settings.itemLayers)) {
      settings.itemLayers = settings.itemLayers.map((layer) => {
        if (!layer || typeof layer !== "object") return layer;
        return {
          ...layer,
          x: typeof layer.x === "number" ? Math.round(layer.x * sx * 100) / 100 : layer.x,
          y: typeof layer.y === "number" ? Math.round(layer.y * sy * 100) / 100 : layer.y,
        };
      });
    }
    settings.avatarImageSize = { width: toW, height: toH };
    return settings;
  }

  async function loadAvatarImagesFromAssetMap(assetMap) {
    const loaded = {};
    let expectedAvatarSize = null;
    const entries = Object.entries(assetMap || {});
    const results = await Promise.allSettled(entries.map(async ([key, src]) => [key, await loadImage(src)]));
    const missing = [];
    for (let i = 0; i < results.length; i += 1) {
      const result = results[i];
      if (result.status !== "fulfilled") {
        missing.push(entries[i][1]);
        continue;
      }
      const [key, image] = result.value;
      expectedAvatarSize = validateAvatarImageDimensions(image, key, expectedAvatarSize);
      loaded[key] = image;
    }
    if (missing.length) throw new Error(`追加キャラ素材を読み込めません: ${missing.join(", ")}`);
    return { loadedImages: loaded, size: expectedAvatarSize };
  }

  async function buildCharacterProfileRecordFromAssetMap({
    assetMap,
    name,
    sourceKind,
    settingsUrl = null,
    replaceId = null,
    createdAt = null,
  }) {
    const fromSize = { w: CROP.w, h: CROP.h };
    const { loadedImages, size } = await loadAvatarImagesFromAssetMap(assetMap);
    const now = new Date().toISOString();
    const templatePayload = settingsUrl
      ? await loadSettingsPayloadFromUrl(settingsUrl)
      : buildAllSettingsPayload({ includeItemImages: false, includeBaseline: true });
    const defaultSettingsSignature = settingsUrl ? settingsPayloadSignature(templatePayload) : null;
    const templateSize = settingsUrl
      ? (templatePayload.avatarImageSize || { width: size.w, height: size.h })
      : fromSize;
    let settingsPayload = scaleSettingsPayloadForAvatarSize(templatePayload, templateSize, size);
    let itemImageBlobs = collectItemImageBlobsFromSettingsPayload(settingsPayload);
    settingsPayload = stripItemLayerSourcesFromSettingsPayload(settingsPayload);
    if (!settingsUrl) {
      // 別キャラ素材に前キャラのPNGアイテムを混ぜない。
      settingsPayload.itemLayers = [];
      settingsPayload.activeItemLayerId = null;
      itemImageBlobs = {};
    }

    const avatarImageBlobs = await avatarImageBlobsFromLoadedImages(loadedImages);
    const assetSignature = await avatarImageBlobsSignature(avatarImageBlobs);
    const thumbnailDataUrl = await buildAvatarCompositeThumbnailDataUrl(loadedImages);
    return {
      schemaVersion: 1,
      id: replaceId || createCharacterId(),
      name: name || "キャラ2",
      createdAt: createdAt || now,
      updatedAt: now,
      lastUsedAt: now,
      thumbnailDataUrl,
      avatarImageSize: { width: size.w, height: size.h },
      settingsPayload,
      avatarImageBlobs,
      itemImageBlobs,
      cachedPackageBlob: null,
      cachedPackageUpdatedAt: null,
      source: {
        kind: sourceKind || "asset",
        fileName: null,
        assetMap: { ...(assetMap || {}) },
        settingsUrl,
        assetSignature,
        ...(defaultSettingsSignature ? { defaultSettingsSignature } : {}),
        thumbnailVersion: AVATAR_ASSET_THUMBNAIL_VERSION,
      },
      lastError: null,
    };
  }

  async function buildCharacterProfileRecordFromCurrentApp({
    id = createCharacterId(),
    name = "新しいキャラ",
    source = { kind: "current", fileName: null },
    includeCachedPackage = false,
  } = {}) {
    if (!imagesReady) throw new Error("キャラ素材の読み込みが完了していません。");
    const now = new Date().toISOString();
    const record = {
      schemaVersion: 1,
      id,
      name,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      thumbnailDataUrl: await captureCharacterThumbnailDataUrl(),
      avatarImageSize: { width: CROP.w, height: CROP.h },
      settingsPayload: buildAllSettingsPayload({ includeItemImages: false, includeBaseline: true }),
      avatarImageBlobs: await collectAvatarImageBlobsFromRuntime(),
      itemImageBlobs: collectItemImageBlobsFromRuntime(),
      cachedPackageBlob: null,
      cachedPackageUpdatedAt: null,
      source,
      lastError: null,
    };
    if (includeCachedPackage) {
      const zipU8 = await buildPuruPuruPackagePayload();
      record.cachedPackageBlob = new Blob([zipU8], { type: "application/vnd.purupuru.avatar+zip" });
      record.cachedPackageUpdatedAt = now;
    }
    return record;
  }

  async function buildCharacterProfileRecordFromPuruPuruFile(file) {
    const parsed = await parsePuruPuruPackageBlob(file, file.name);
    const now = new Date().toISOString();
    const name = String(file.name || "読み込みキャラ").replace(/\.purupuru$/i, "") || "読み込みキャラ";
    return {
      schemaVersion: 1,
      id: createCharacterId(),
      name,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      thumbnailDataUrl: parsed.thumbnailDataUrl || "",
      avatarImageSize: parsed.settingsPayload.avatarImageSize || null,
      settingsPayload: parsed.settingsPayload,
      avatarImageBlobs: parsed.avatarImageBlobs,
      itemImageBlobs: parsed.itemImageBlobs,
      cachedPackageBlob: file,
      cachedPackageUpdatedAt: now,
      source: { kind: "purupuru", fileName: file.name || null },
      lastError: null,
    };
  }

  function assetMapForCharacterProfile(record) {
    if (record?.source?.assetMap && typeof record.source.assetMap === "object") return record.source.assetMap;
    switch (record?.source?.kind) {
      case "default": return ASSETS;
      case DEMO_AVATAR02_SOURCE_KIND: return DEMO_AVATAR02_ASSETS;
      case DEMO_AVATAR03_SOURCE_KIND: return DEMO_AVATAR03_ASSETS;
      default: return null;
    }
  }

  function settingsUrlForCharacterProfile(record) {
    if (record?.source?.settingsUrl) return String(record.source.settingsUrl);
    switch (record?.source?.kind) {
      case "default": return DEFAULT_SETTINGS_URL;
      case DEMO_AVATAR02_SOURCE_KIND: return DEMO_AVATAR02_SETTINGS_URL;
      case DEMO_AVATAR03_SOURCE_KIND: return DEMO_AVATAR03_SETTINGS_URL;
      default: return null;
    }
  }

  function settingsPayloadSignature(payload) {
    const text = JSON.stringify(payload || {});
    return `${text.length}:${crc32(textToU8(text)).toString(16)}`;
  }

  async function avatarImageBlobsFromLoadedImages(loadedImages) {
    const avatarImageBlobs = {};
    for (const [key, image] of Object.entries(loadedImages || {})) {
      avatarImageBlobs[key] = await imageToPngBlob(image);
    }
    return avatarImageBlobs;
  }

  function nextAvailableItemLayerId(usedIds, preferred = 1) {
    let id = Math.max(1, Math.round(Number(preferred) || 1));
    while (usedIds.has(id)) id += 1;
    usedIds.add(id);
    return id;
  }

  function defaultManagedItemLayerSignature(layers) {
    return (layers || [])
      .map((layer) => {
        const src = String(layer.src || "");
        const imageSignature = src ? `${src.length}:${crc32(dataUrlToU8(src)).toString(16)}` : "";
        return [
          layer.id,
          layer.name,
          layer.file,
          layer.slot,
          layer.x,
          layer.y,
          layer.scale,
          layer.rotation,
          layer.opacity,
          layer.followStrength,
          Boolean(layer.deformFollowEnabled),
          layer.visible !== false,
          Boolean(layer.locked),
          imageSignature,
        ].join(":");
      })
      .join("|");
  }

  async function refreshDefaultCharacterProfileItems(record) {
    const settingsUrl = settingsUrlForCharacterProfile(record);
    if (!settingsUrl) return null;
    const defaultPayload = await loadSettingsPayloadFromUrl(settingsUrl);
    const defaultLayers = Array.isArray(defaultPayload.itemLayers) ? defaultPayload.itemLayers : [];
    if (!defaultLayers.length) return null;

    const settingsPayload = cloneJsonValue(record.settingsPayload || {});
    const currentLayers = Array.isArray(settingsPayload.itemLayers) ? settingsPayload.itemLayers : [];
    const currentItemImageBlobs = { ...(record.itemImageBlobs || {}) };
    const managedNames = new Set(defaultLayers.map((layer) => String(layer.name || "")));
    const managedFiles = new Set(defaultLayers.map((layer) => String(layer.file || "")));
    const managedSignature = defaultManagedItemLayerSignature(defaultLayers);
    const usedIds = new Set();
    const nextLayers = [];
    const nextItemImageBlobs = {};

    for (const defaultLayer of defaultLayers) {
      const id = nextAvailableItemLayerId(usedIds, defaultLayer.id);
      const storedLayer = { ...defaultLayer, id, src: null };
      nextLayers.push(storedLayer);
      if (defaultLayer.src) {
        nextItemImageBlobs[String(id)] = {
          blob: dataUrlToBlob(defaultLayer.src, "image/png"),
          name: String(defaultLayer.name || defaultLayer.file || `item-${id}.png`),
          mime: "image/png",
        };
      }
    }

    let maxId = Math.max(0, ...Array.from(usedIds));
    for (const layer of currentLayers) {
      if (!layer || typeof layer !== "object") continue;
      const name = String(layer.name || "");
      const file = String(layer.file || "");
      if (managedNames.has(name) || (file && managedFiles.has(file))) continue;
      const oldId = Math.max(1, Math.round(Number(layer.id) || maxId + 1));
      const id = usedIds.has(oldId) ? nextAvailableItemLayerId(usedIds, maxId + 1) : nextAvailableItemLayerId(usedIds, oldId);
      maxId = Math.max(maxId, id);
      nextLayers.push({ ...layer, id, src: null });
      const existingBlob = currentItemImageBlobs[String(oldId)];
      if (existingBlob) nextItemImageBlobs[String(id)] = existingBlob;
    }

    settingsPayload.itemLayers = nextLayers;
    const requestedActiveId = Number(settingsPayload.activeItemLayerId);
    settingsPayload.activeItemLayerId = nextLayers.some((layer) => layer.id === requestedActiveId)
      ? requestedActiveId
      : (nextLayers.some((layer) => layer.id === Number(defaultPayload.activeItemLayerId))
        ? Number(defaultPayload.activeItemLayerId)
        : (nextLayers[0]?.id || null));

    const previousSignature = record.source?.defaultItemsSignature || "";
    const changed =
      previousSignature !== managedSignature ||
      JSON.stringify(record.settingsPayload?.itemLayers || []) !== JSON.stringify(settingsPayload.itemLayers);
    return {
      changed,
      managedSignature,
      settingsPayload,
      itemImageBlobs: nextItemImageBlobs,
    };
  }

  async function refreshDefaultCharacterProfileSettings(record, avatarSize) {
    const settingsUrl = settingsUrlForCharacterProfile(record);
    if (!settingsUrl) return null;
    const defaultPayload = await loadSettingsPayloadFromUrl(settingsUrl);
    const defaultSettingsSignature = settingsPayloadSignature(defaultPayload);
    if (record.source?.defaultSettingsSignature === defaultSettingsSignature) {
      return { changed: false, defaultSettingsSignature };
    }

    const templateSize = defaultPayload.avatarImageSize || { width: avatarSize.w, height: avatarSize.h };
    let settingsPayload = scaleSettingsPayloadForAvatarSize(defaultPayload, templateSize, avatarSize);
    const itemImageBlobs = collectItemImageBlobsFromSettingsPayload(settingsPayload);
    settingsPayload = stripItemLayerSourcesFromSettingsPayload(settingsPayload);
    return {
      changed: true,
      defaultSettingsSignature,
      settingsPayload,
      itemImageBlobs,
    };
  }

  async function refreshAssetBackedCharacterProfileAssets(record, { persist = true } = {}) {
    const assetMap = assetMapForCharacterProfile(record);
    if (!record || !assetMap) return record;
    const { loadedImages, size } = await loadAvatarImagesFromAssetMap(assetMap);
    const avatarImageBlobs = await avatarImageBlobsFromLoadedImages(loadedImages);
    const assetSignature = await avatarImageBlobsSignature(avatarImageBlobs);
    const savedSize = record.avatarImageSize || record.settingsPayload?.avatarImageSize || DEFAULT_AVATAR_IMAGE_SIZE;
    const sizeMatches =
      Number(savedSize?.width || savedSize?.w) === size.w &&
      Number(savedSize?.height || savedSize?.h) === size.h;
    const thumbnailMatches = record.source?.thumbnailVersion === AVATAR_ASSET_THUMBNAIL_VERSION;
    const settingsUrl = settingsUrlForCharacterProfile(record);
    const defaultSettingsRefresh = await refreshDefaultCharacterProfileSettings(record, size);
    if (
      record.source?.assetSignature === assetSignature &&
      sizeMatches &&
      thumbnailMatches &&
      !defaultSettingsRefresh?.changed
    ) {
      return record;
    }

    const now = new Date().toISOString();
    const thumbnailDataUrl = await buildAvatarCompositeThumbnailDataUrl(loadedImages);
    const refreshed = {
      ...record,
      updatedAt: now,
      avatarImageSize: { width: size.w, height: size.h },
      settingsPayload: defaultSettingsRefresh?.settingsPayload || scaleSettingsPayloadForAvatarSize(record.settingsPayload || {}, savedSize, size),
      avatarImageBlobs,
      itemImageBlobs: defaultSettingsRefresh?.itemImageBlobs || record.itemImageBlobs || {},
      thumbnailDataUrl,
      cachedPackageBlob: null,
      cachedPackageUpdatedAt: null,
      source: {
        ...(record.source || {}),
        kind: record.source?.kind || "asset",
        fileName: null,
        assetMap: { ...assetMap },
        ...(settingsUrl ? { settingsUrl } : {}),
        assetSignature,
        thumbnailVersion: AVATAR_ASSET_THUMBNAIL_VERSION,
        ...(defaultSettingsRefresh?.defaultSettingsSignature
          ? { defaultSettingsSignature: defaultSettingsRefresh.defaultSettingsSignature }
          : {}),
      },
      lastError: null,
    };
    if (persist) await putCharacterProfile(refreshed);
    return refreshed;
  }

  async function hydrateProfileSettingsPayload(record) {
    const settings = cloneJsonValue(record?.settingsPayload || {});
    if (Array.isArray(settings.itemLayers)) {
      settings.itemLayers = await Promise.all(settings.itemLayers.map(async (layer) => {
        if (!layer || typeof layer !== "object") return layer;
        const item = record.itemImageBlobs?.[String(layer.id)];
        if (!item?.blob) return layer;
        return { ...layer, src: await blobToDataUrl(item.blob) };
      }));
    }
    return settings;
  }

  async function loadAvatarImagesFromProfileRecord(record) {
    const loaded = {};
    let expectedAvatarSize = null;
    for (const key of Object.keys(AVATAR_PACKAGE_ASSETS)) {
      const blob = record?.avatarImageBlobs?.[key];
      if (!blob) throw new Error(`キャラ素材が不足しています: ${key}`);
      const image = await loadPngImageFromU8(new Uint8Array(await blob.arrayBuffer()), key);
      expectedAvatarSize = validateAvatarImageDimensions(image, key, expectedAvatarSize);
      loaded[key] = image;
    }
    return loaded;
  }

  async function applyCharacterProfileRecord(record, { preserveGlobalRuntime = true, skipActiveUpdate = false, isRollback = false } = {}) {
    if (!record) throw new Error("キャラプロファイルが見つかりません。");
    const runtime = preserveGlobalRuntime ? captureGlobalRuntimeSettings() : null;
    const loadedAvatarImages = await loadAvatarImagesFromProfileRecord(record);
    const hydratedSettings = await hydrateProfileSettingsPayload(record);
    suspendCharacterDirtyTracking += 1;
    try {
      applyLoadedAvatarImages(loadedAvatarImages);
      if (!hydratedSettings.deformers) deformers = createDefaultDeformers();
      const ok = await applyAllSettingsPayload(
        hydratedSettings,
        isRollback ? "切り替え失敗のため元のキャラへ戻しました。" : `${record.name} に切り替えました。`
      );
      if (!ok) throw new Error("キャラ設定の適用に失敗しました。");
      if (runtime) restoreGlobalRuntimeSettings(runtime);
      if (!skipActiveUpdate) {
        activeCharacterId = record.id;
        rememberActiveCharacterId(record.id);
        await touchCharacterProfile(record.id);
      }
      activeCharacterSourceKind = String(record.source?.kind || "");
      return true;
    } finally {
      suspendCharacterDirtyTracking = Math.max(0, suspendCharacterDirtyTracking - 1);
    }
  }

  function markActiveCharacterDirty(kind = "settings", reason = "") {
    if (!characterLibraryReady || !activeCharacterId) return;
    if (suspendCharacterDirtyTracking > 0 || characterSwitching) return;
    if (kind === "avatarImages") {
      characterDirty.avatarImages = true;
      characterDirty.itemImages = true;
      characterDirty.thumbnail = true;
      characterDirty.settings = true;
    } else if (kind === "itemImages") {
      characterDirty.itemImages = true;
      characterDirty.thumbnail = true;
      characterDirty.settings = true;
    } else if (kind === "thumbnail") {
      characterDirty.thumbnail = true;
    } else {
      characterDirty.settings = true;
      characterDirty.thumbnail = true;
    }
    updateCharacterSaveStatus("未保存");
    scheduleActiveCharacterAutosave(reason);
  }

  function scheduleActiveCharacterAutosave(reason = "") {
    clearTimeout(characterAutosaveTimer);
    characterAutosaveTimer = setTimeout(() => {
      void flushActiveCharacterAutosave({ reason });
    }, 1200);
  }

  async function flushActiveCharacterAutosave({
    reason = "",
    forceSettings = false,
    forceAssets = false,
    allowDuringSwitch = false,
  } = {}) {
    if (!activeCharacterId || !characterLibraryReady) return false;
    if (characterSwitching && !allowDuringSwitch) return false;
    clearTimeout(characterAutosaveTimer);
    const needsSave = forceSettings || forceAssets || characterDirty.settings || characterDirty.avatarImages || characterDirty.itemImages || characterDirty.thumbnail;
    if (!needsSave) {
      updateCharacterSaveStatus("保存済み");
      return true;
    }
    characterAutosavePromise = characterAutosavePromise.then(async () => {
      updateCharacterSaveStatus("保存中…");
      const patch = {
        updatedAt: new Date().toISOString(),
        avatarImageSize: { width: CROP.w, height: CROP.h },
        lastError: null,
      };
      if (forceSettings || characterDirty.settings) {
        patch.settingsPayload = buildAllSettingsPayload({ includeItemImages: false, includeBaseline: true });
      }
      if (forceAssets || characterDirty.avatarImages) {
        patch.avatarImageBlobs = await collectAvatarImageBlobsFromRuntime();
      }
      if (forceAssets || characterDirty.itemImages) {
        patch.itemImageBlobs = collectItemImageBlobsFromRuntime();
      }
      if (forceAssets || characterDirty.thumbnail || characterDirty.settings) {
        patch.thumbnailDataUrl = await captureCharacterThumbnailDataUrl();
      }
      await patchCharacterProfile(activeCharacterId, patch);
      characterDirty = { settings: false, avatarImages: false, itemImages: false, thumbnail: false };
      updateCharacterSaveStatus("保存済み");
      await updateCharacterSwitcherUi();
      return true;
    }).catch(async (error) => {
      console.warn("キャラ自動保存に失敗しました。", error, reason);
      updateCharacterSaveStatus("保存失敗");
      try {
        await patchCharacterProfile(activeCharacterId, { lastError: error instanceof Error ? error.message : "保存に失敗しました。" });
      } catch {
        // 保存失敗情報の保存にも失敗した場合はUI表示だけで続行する。
      }
      return false;
    });
    return characterAutosavePromise;
  }

  function canSwitchCharacterNow() {
    if (OBS_MODE || !characterLibraryReady || characterSwitching || itemMutationActive) return false;
    if (characterDrag || itemDrag || editDrag || eyeSetupDrag || highlightSetupDrag || faceDepthSetupDrag || neckPivotSetupDrag || hairBundleSetupDrag) return false;
    if (interactionModeActive()) return false;
    return true;
  }

  async function switchCharacterProfile(nextId) {
    if (!nextId || nextId === activeCharacterId) return true;
    if (!canSwitchCharacterNow()) {
      setEditStatus("編集中・設定中はキャラを切り替えられません。編集を完了または中止してください。");
      return false;
    }
    characterSwitching = true;
    updateCharacterSwitcherDisabled(true);
    updateCharacterSaveStatus("切り替え中…");
    const previousId = activeCharacterId;
    let previousRecord = null;
    try {
      await flushActiveCharacterAutosave({ reason: "switch-before", forceSettings: true, allowDuringSwitch: true });
      previousRecord = previousId ? await getCharacterProfile(previousId) : null;
      const nextRecord = await getCharacterProfile(nextId);
      if (!nextRecord) throw new Error("切り替え先キャラが見つかりません。");
      await loadAvatarImagesFromProfileRecord(nextRecord);
      await hydrateProfileSettingsPayload(nextRecord);
      await applyCharacterProfileRecord(nextRecord, { preserveGlobalRuntime: true });
      activeCharacterId = nextId;
      rememberActiveCharacterId(nextId);
      characterDirty = { settings: false, avatarImages: false, itemImages: false, thumbnail: false };
      updateCharacterSaveStatus("保存済み");
      closeCharacterSwitcherMenu();
      await updateCharacterSwitcherUi();
      setEditStatus(`${nextRecord.name} に切り替えました。`);
      return true;
    } catch (error) {
      console.warn("キャラ切り替えに失敗しました。", error);
      if (previousRecord) {
        try {
          await applyCharacterProfileRecord(previousRecord, { preserveGlobalRuntime: true, skipActiveUpdate: true, isRollback: true });
          activeCharacterId = previousId;
          rememberActiveCharacterId(previousId);
        } catch (rollbackError) {
          console.error("元キャラへの復元にも失敗しました。", rollbackError);
          setEditStatus("キャラ切り替えに失敗し、元キャラへの復元にも失敗しました。");
          return false;
        }
      }
      setEditStatus(error instanceof Error ? error.message : "キャラ切り替えに失敗しました。");
      updateCharacterSaveStatus("保存失敗");
      return false;
    } finally {
      characterSwitching = false;
      updateCharacterSwitcherDisabled(false);
      await updateCharacterSwitcherUi();
    }
  }

  async function addCharacterProfileFromFile(file) {
    if (!file) return false;
    if (!canSwitchCharacterNow()) {
      setEditStatus("編集中・設定中はキャラを追加できません。編集を完了または中止してください。");
      return false;
    }
    try {
      updateCharacterSwitcherDisabled(true);
      updateCharacterSaveStatus("保存中…");
      const record = await buildCharacterProfileRecordFromPuruPuruFile(file);
      await putCharacterProfile(record);
      await switchCharacterProfile(record.id);
      setEditStatus(`${record.name} を追加しました。`);
      return true;
    } catch (error) {
      console.warn("キャラ追加に失敗しました。", error);
      setEditStatus(error instanceof Error ? error.message : "キャラ追加に失敗しました。");
      updateCharacterSaveStatus("保存失敗");
      return false;
    } finally {
      updateCharacterSwitcherDisabled(false);
      await updateCharacterSwitcherUi();
    }
  }

  async function duplicateActiveCharacterProfile() {
    if (!activeCharacterId) return false;
    if (!canSwitchCharacterNow()) {
      setEditStatus("編集中・設定中はキャラを複製できません。編集を完了または中止してください。");
      return false;
    }
    try {
      updateCharacterSwitcherDisabled(true);
      await flushActiveCharacterAutosave({ reason: "duplicate-before", forceSettings: true, forceAssets: true });
      const current = await getCharacterProfile(activeCharacterId);
      if (!current) throw new Error("複製元キャラが見つかりません。");
      const now = new Date().toISOString();
      const copy = {
        ...current,
        id: createCharacterId(),
        name: `${current.name || "キャラ"} のコピー`,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
        source: { kind: "duplicate", fileName: null },
        lastError: null,
      };
      await putCharacterProfile(copy);
      await switchCharacterProfile(copy.id);
      setEditStatus(`${copy.name} を作成しました。`);
      return true;
    } catch (error) {
      console.warn("キャラ複製に失敗しました。", error);
      setEditStatus(error instanceof Error ? error.message : "キャラ複製に失敗しました。");
      updateCharacterSaveStatus("保存失敗");
      return false;
    } finally {
      updateCharacterSwitcherDisabled(false);
      await updateCharacterSwitcherUi();
    }
  }

  async function ensureDemoAvatar02CharacterProfile() {
    const profiles = await listCharacterProfiles();
    if (profiles.some((profile) => profile.source?.kind === DEMO_AVATAR02_SOURCE_KIND)) return false;

    const isPrimaryCharacterProfile = (profile) =>
      profile?.source?.kind === "default" || String(profile?.name || "") === "キャラ1";
    const duplicateTarget = profiles.find((profile) =>
      !isPrimaryCharacterProfile(profile) &&
      (profile.source?.kind === "duplicate" || /コピー/.test(String(profile.name || "")))
    );
    const fallbackTarget = profiles.find((profile) => !isPrimaryCharacterProfile(profile));
    const target = duplicateTarget || fallbackTarget || null;
    const record = await buildCharacterProfileRecordFromAssetMap({
      assetMap: DEMO_AVATAR02_ASSETS,
      name: "キャラ2",
      sourceKind: DEMO_AVATAR02_SOURCE_KIND,
      settingsUrl: DEMO_AVATAR02_SETTINGS_URL,
      replaceId: target?.id || null,
      createdAt: target?.createdAt || null,
    });
    if (target?.lastUsedAt) record.lastUsedAt = target.lastUsedAt;
    await putCharacterProfile(record);

    if (target?.id && target.id === activeCharacterId) {
      suspendCharacterDirtyTracking += 1;
      try {
        await applyCharacterProfileRecord(record, {
          preserveGlobalRuntime: true,
          skipActiveUpdate: true,
        });
        activeCharacterId = record.id;
        rememberActiveCharacterId(record.id);
        updateCharacterSaveStatus("保存済み");
      } finally {
        suspendCharacterDirtyTracking = Math.max(0, suspendCharacterDirtyTracking - 1);
      }
    }
    return true;
  }

  async function ensureDemoAvatar03CharacterProfile() {
    const profiles = await listCharacterProfiles();
    if (profiles.some((profile) => profile.source?.kind === DEMO_AVATAR03_SOURCE_KIND)) return false;

    const record = await buildCharacterProfileRecordFromAssetMap({
      assetMap: DEMO_AVATAR03_ASSETS,
      name: "キャラ3",
      sourceKind: DEMO_AVATAR03_SOURCE_KIND,
      settingsUrl: DEMO_AVATAR03_SETTINGS_URL,
    });
    await putCharacterProfile(record);
    return true;
  }

  async function initializeCharacterLibraryAfterAssetsReady() {
    if (OBS_MODE) return false;
    try {
      updateCharacterSaveStatus("準備中");
      await openCharacterProfileDb();
      const profiles = await listCharacterProfiles();
      if (!profiles.length) {
        let record = await buildCharacterProfileRecordFromCurrentApp({
          name: "キャラ1",
          source: { kind: "default", fileName: null },
        });
        record = await refreshAssetBackedCharacterProfileAssets(record, { persist: false });
        await putCharacterProfile(record);
        activeCharacterId = record.id;
        activeCharacterSourceKind = String(record.source?.kind || "");
        rememberActiveCharacterId(record.id);
      } else {
        const rememberedId = readActiveCharacterId();
        const selected = profiles.find((profile) => profile.id === rememberedId) || profiles[0];
        const refreshedRecords = new Map();
        for (const profile of profiles) {
          const fullRecord = await getCharacterProfile(profile.id);
          if (!fullRecord) continue;
          refreshedRecords.set(profile.id, await refreshAssetBackedCharacterProfileAssets(fullRecord));
        }
        const record = refreshedRecords.get(selected.id) || await getCharacterProfile(selected.id);
        await applyCharacterProfileRecord(record, { preserveGlobalRuntime: true, skipActiveUpdate: true });
        activeCharacterId = record.id;
        rememberActiveCharacterId(record.id);
        await touchCharacterProfile(record.id);
      }
      await ensureDemoAvatar02CharacterProfile().catch((error) => {
        console.warn("demo-avatar02 キャラの自動登録をスキップしました。", error);
      });
      await ensureDemoAvatar03CharacterProfile().catch((error) => {
        console.warn("demo-avatar03 キャラの自動登録をスキップしました。", error);
      });
      characterLibraryReady = true;
      characterDirty = { settings: false, avatarImages: false, itemImages: false, thumbnail: false };
      updateCharacterSaveStatus("保存済み");
      await updateCharacterSwitcherUi();
      return true;
    } catch (error) {
      console.warn("キャラクターライブラリ初期化に失敗しました。", error);
      characterLibraryReady = false;
      showCharacterLibraryUnavailableMessage(error);
      return false;
    }
  }

  function buildObsInputPayload(nowMs) {
    return {
      targetX: clamp(Number(state.targetX) || 0, -3, 3),
      targetY: clamp(Number(state.targetY) || 0, -3, 3),
      angleX: clamp(Number(state.angleX) || 0, -3, 3),
      angleY: clamp(Number(state.angleY) || 0, -3, 3),
      voiceRaw: clamp(Number(lastVoiceRaw) || 0, 0, 2),
      talking: mouthState !== 0 || voiceLevel > 0.03,
      timestamp: nowMs,
    };
  }

  function publishObsInput(nowMs) {
    if (!obsPublishEnabled || OBS_MODE) return;
    const interval = 1000 / currentObsPreset().sendFps;
    if (nowMs - lastObsInputPostAt < interval) return;
    if (obsInputPostPending) return;

    lastObsInputPostAt = nowMs;
    obsInputPostPending = true;
    fetch("/api/obs/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildObsInputPayload(nowMs)),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`OBS input ${response.status}`);
    })
      .catch(() => {
        if (obsPublishEnabled) setObsStatus("OBS連携: ローカルサーバーへ入力値を送信できません。");
      })
      .finally(() => {
        obsInputPostPending = false;
      });
  }

  function closeObsEventSource({ cancelReconnect = true } = {}) {
    if (cancelReconnect && obsEventReconnectTimer) {
      clearTimeout(obsEventReconnectTimer);
      obsEventReconnectTimer = null;
    }
    if (obsEventSource) {
      try {
        obsEventSource.close();
      } catch (error) {
        console.warn("OBS EventSource close failed", error);
      }
      obsEventSource = null;
    }
    obsExternalInput.connected = false;
  }

  function scheduleObsEventReconnect() {
    if (!OBS_MODE || obsEventReconnectTimer) return;
    obsEventReconnectTimer = setTimeout(() => {
      obsEventReconnectTimer = null;
      connectObsEventSource();
    }, 1500);
  }

  function connectObsEventSource() {
    if (!OBS_MODE || obsEventSource) return;
    try {
      const es = new EventSource("/api/obs/events");
      obsEventSource = es;
      es.addEventListener("open", () => {
        obsExternalInput.connected = true;
      });
      es.addEventListener("input", (event) => {
        try {
          const data = sanitizeImportedJsonValue(JSON.parse(event.data));
          obsExternalInput.targetX = clamp(Number(data.targetX) || 0, -3, 3);
          obsExternalInput.targetY = clamp(Number(data.targetY) || 0, -3, 3);
          obsExternalInput.angleX = clamp(Number(data.angleX ?? data.targetX) || 0, -3, 3);
          obsExternalInput.angleY = clamp(Number(data.angleY ?? data.targetY) || 0, -3, 3);
          obsExternalInput.voiceRaw = clamp(Number(data.voiceRaw) || 0, 0, 2);
          obsExternalInput.updatedAt = performance.now();
          obsExternalInput.connected = true;
        } catch (error) {
          console.warn("OBS input parse failed", error);
        }
      });
      es.addEventListener("snapshot", () => {
        loadObsSnapshotIfAvailable();
      });
      es.addEventListener("config", (event) => {
        try {
          applyObsPresetConfig(sanitizeImportedJsonValue(JSON.parse(event.data)), { announce: true });
        } catch (error) {
          console.warn("OBS config parse failed", error);
        }
      });
      es.onerror = () => {
        obsExternalInput.connected = false;
        if (obsEventSource === es) {
          try {
            es.close();
          } catch (error) {
            console.warn("OBS EventSource close failed", error);
          }
          obsEventSource = null;
          scheduleObsEventReconnect();
        }
      };
    } catch (error) {
      console.warn("OBS EventSource接続に失敗しました。", error);
      scheduleObsEventReconnect();
    }
  }

  function externalVoiceLevel(nowMs) {
    const age = Math.max(0, nowMs - obsExternalInput.updatedAt);
    const decay = Math.exp(-age / 160);
    return obsExternalInput.voiceRaw * decay;
  }

  function applyObsExternalTarget(nowMs) {
    if (!OBS_MODE) return;
    const age = Math.max(0, nowMs - obsExternalInput.updatedAt);
    if (!obsExternalInput.updatedAt || age > 1200) {
      if (!state.idleMotionEnabled) {
        state.idleMotionEnabled = true;
        resetIdleMotionPlan(nowMs, true);
      }
      updateIdleMotionTarget(nowMs);
      return;
    }
    state.targetX = obsExternalInput.angleX;
    state.targetY = obsExternalInput.angleY;
    state.angleX = obsExternalInput.angleX;
    state.angleY = obsExternalInput.angleY;
  }

  async function imageToPngDataUrl(image) {
    const blob = await imageToPngBlob(image);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("画像Data URL化に失敗しました。"));
      reader.readAsDataURL(blob);
    });
  }

  async function buildObsSnapshotPayload() {
    if (!imagesReady) throw new Error("キャラ素材の読み込みが完了していません。");
    const avatarImages = {};
    for (const key of Object.keys(AVATAR_PACKAGE_ASSETS)) {
      avatarImages[key] = await imageToPngDataUrl(images[key]);
    }
    return {
      type: "purupuru-obs-snapshot",
      version: 1,
      createdAt: new Date().toISOString(),
      settings: buildAllSettingsPayload({ includeItemImages: true }),
      avatarImages,
    };
  }

  async function pushObsSnapshot() {
    const now = performance.now();
    if (obsSnapshotPostPending) {
      setObsStatus("OBS反映中です。完了してから再実行してください。");
      return false;
    }
    if (now - lastObsSnapshotPostAt < 5000) {
      setObsStatus("OBS反映は連続実行できません。数秒待ってから再実行してください。");
      return false;
    }
    obsSnapshotPostPending = true;
    lastObsSnapshotPostAt = now;
    try {
      const snapshot = await buildObsSnapshotPayload();
      const body = JSON.stringify(snapshot);
      if (new Blob([body]).size > MAX_OBS_SNAPSHOT_JSON_BYTES) {
        throw new Error("OBSスナップショットが大きすぎます。PNGアイテムを減らしてから再実行してください。");
      }
      const response = await fetch("/api/obs/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) throw new Error(`OBS snapshot ${response.status}`);
      setObsPublishEnabled(true);
      setObsStatus("現在のキャラをOBSへ反映し、OBS連携もONにしました。通常画面でマイク/顔トラッキングを開始してください。");
      setEditStatus("現在のキャラをOBSへ反映しました。");
      return true;
    } catch (error) {
      console.warn("OBS反映に失敗しました。", error);
      setObsStatus("OBS反映に失敗しました。ローカルサーバー経由で開いているか確認してください。");
      setEditStatus(error instanceof Error ? error.message : "OBS反映に失敗しました。");
      return false;
    } finally {
      obsSnapshotPostPending = false;
    }
  }

  function loadImageFromDataUrl(src, name = "PNG") {
    return new Promise((resolve, reject) => {
      let normalized = "";
      try {
        normalized = validatePngDataUrl(src, name, MAX_OBS_SNAPSHOT_AVATAR_IMAGE_DATA_URL_SIZE);
      } catch (error) {
        reject(error);
        return;
      }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`${name} を読み込めませんでした。`));
      image.src = normalized;
    });
  }

  async function applyObsSnapshot(snapshot) {
    if (!snapshot || snapshot.type !== "purupuru-obs-snapshot") return false;
    if (snapshot.avatarImages && typeof snapshot.avatarImages === "object") {
      const loaded = {};
      let expectedAvatarSize = null;
      const settled = await Promise.allSettled(Object.keys(AVATAR_PACKAGE_ASSETS).map(async (key) => {
        const src = String(snapshot.avatarImages[key] || "");
        if (!src) return null;
        const image = await loadImageFromDataUrl(src, key);
        return [key, image];
      }));
      let loadedCount = 0;
      let failedCount = 0;
      for (const result of settled) {
        if (result.status === "rejected") {
          failedCount += 1;
          console.warn("OBS snapshot avatar image skipped", result.reason);
          continue;
        }
        const entry = result.value;
        if (!entry) continue;
        const [key, image] = entry;
        expectedAvatarSize = validateAvatarImageDimensions(image, key, expectedAvatarSize);
        loaded[key] = image;
        loadedCount += 1;
      }
      if (loadedCount === 0 && failedCount > 0) {
        throw new Error("OBSスナップショットのアバター画像を読み込めませんでした。");
      }
      if (failedCount > 0) {
        setObsStatus(`${failedCount}枚のOBSスナップショット画像を読み込めなかったため、既存画像で補完しました。`);
      }
      if (loadedCount > 0) {
        applyLoadedAvatarImages(loaded);
      }
    }
    if (snapshot.settings) {
      await applyAllSettingsPayload(snapshot.settings, "OBS用スナップショットを読み込みました。");
    }
    applyObsModeDefaults();
    return true;
  }

  async function loadObsSnapshotIfAvailable() {
    if (!OBS_MODE) return false;
    try {
      const response = await fetch("/api/obs/snapshot", { cache: "no-store" });
      if (!response.ok) return false;
      const snapshot = sanitizeImportedJsonValue(await response.json());
      return await applyObsSnapshot(snapshot);
    } catch (error) {
      console.warn("OBS snapshot load failed", error);
      setObsStatus("OBSスナップショットを読み込めなかったため、現在のキャラ設定で続行します。");
      return false;
    }
  }

  function normalizeHexColorValue(color, fallback = "#2C292C") {
    const raw = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
    }
    return fallback.toUpperCase();
  }

  function normalizeHexColor(color) {
    return normalizeHexColorValue(color, "#2C292C");
  }

  function normalizeBackgroundColor(color) {
    return normalizeHexColorValue(color, "#FFF8EE");
  }

  function hexToRgb(color) {
    const normalized = normalizeHexColor(color);
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16),
    };
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function pyokoScale() {
    return clamp(Number(state.pyokoStrength) || 0, 0, 100) / 50;
  }

  const BACKGROUND_LABELS = new Map([
    ["#FFF8EE", "クリーム"],
    ["#FDEFEF", "さくら"],
    ["#00FF00", "クロマキー"],
    ["#2B2926", "ナイト"],
  ]);
  function setDockHidden(hidden) {
    document.body.classList.toggle("dock-hidden", Boolean(hidden));
    ui.dockPeekButton?.setAttribute("aria-expanded", String(!hidden));
  }

  function setWorkspacePage(page) {
    const pages = new Set(["adjust", "items", "output", "advanced"]);
    const next = pages.has(page) ? page : "adjust";
    document.querySelectorAll("[data-workspace-page]").forEach((el) => {
      el.hidden = el.dataset.workspacePage !== next;
    });
    document.querySelectorAll("[data-workspace-target]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.workspaceTarget === next));
    });
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, next);
    } catch (error) {
      console.warn("ワークスペース状態の保存に失敗しました", error);
    }
  }

  function bindWorkspaceTabs() {
    document.querySelectorAll("[data-workspace-target]").forEach((button) => {
      button.addEventListener("click", () => setWorkspacePage(button.dataset.workspaceTarget));
    });
    let initial = "adjust";
    try {
      initial = localStorage.getItem(WORKSPACE_STORAGE_KEY) || "adjust";
    } catch (error) {
      console.warn("ワークスペース状態の読込に失敗しました", error);
    }
    setWorkspacePage(initial);
  }

  function setAdjustCategory(category) {
    const categories = new Set(["layout", "face", "mouth", "eyes", "hair", "look"]);
    const next = categories.has(category) ? category : "layout";
    document.querySelectorAll("[data-adjust-page]").forEach((el) => {
      el.hidden = el.dataset.adjustPage !== next;
    });
    document.querySelectorAll("[data-adjust-target]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.adjustTarget === next));
    });
    try {
      localStorage.setItem(ADJUST_CATEGORY_STORAGE_KEY, next);
    } catch (error) {
      console.warn("調整カテゴリ状態の保存に失敗しました", error);
    }
  }

  function bindAdjustTabs() {
    document.querySelectorAll("[data-adjust-target]").forEach((button) => {
      button.addEventListener("click", () => setAdjustCategory(button.dataset.adjustTarget));
    });
    let initial = "layout";
    try {
      initial = localStorage.getItem(ADJUST_CATEGORY_STORAGE_KEY) || "layout";
    } catch (error) {
      console.warn("調整カテゴリ状態の読込に失敗しました", error);
    }
    setAdjustCategory(initial);
  }

  function setBackgroundColor(value) {
    const color = normalizeBackgroundColor(value);
    state.bgColor = color;
    document.documentElement.style.setProperty("--bg", color);
    document.body.classList.toggle("stage-bg-dark", color === "#2B2926");
    if (ui.backgroundColorInput) ui.backgroundColorInput.value = color;
    if (ui.backgroundReadout) ui.backgroundReadout.textContent = BACKGROUND_LABELS.get(color) || color;
    ui.bgButtons?.forEach((button) => {
      const pressed = normalizeBackgroundColor(button.dataset.bg) === color;
      button.setAttribute("aria-pressed", String(pressed));
    });
  }

  function updateHairColorUi() {
    const color = normalizeHexColor(state.hairColor);
    if (ui.hairColorInput) ui.hairColorInput.value = color;
    if (ui.hairColorReadout) ui.hairColorReadout.textContent = state.hairTintEnabled ? color : "元色";
    ui.hairColorReset?.setAttribute("aria-pressed", String(!state.hairTintEnabled));
  }

  function setHairColor(value) {
    state.hairColor = normalizeHexColor(value);
    state.hairTintEnabled = true;
    updateHairColorUi();
    hairTintCache.clear();
  }

  function applyHairTintLightness(targetCtx, image, color, lightness) {
    if (lightness <= 0) return;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) return;
    sourceCtx.drawImage(image, 0, 0);

    const sourceData = sourceCtx.getImageData(0, 0, width, height).data;
    const imageData = targetCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const rgb = hexToRgb(color);
    const pastel = {
      r: lerp(rgb.r, 255, 0.74),
      g: lerp(rgb.g, 255, 0.74),
      b: lerp(rgb.b, 255, 0.74),
    };
    const amount = clamp(lightness, 0, 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = sourceData[i + 3] / 255;
      if (alpha <= 0) continue;
      const luma =
        (sourceData[i] * 0.2126 + sourceData[i + 1] * 0.7152 + sourceData[i + 2] * 0.0722) / 255;
      // ほぼ黒い線画は守り、髪面とハイライト側を中心に白寄りへ混ぜてパステル感を出す。
      const surfaceMask = smoothstep(0.025, 0.16, luma);
      const highlightMask = lerp(0.72, 1, smoothstep(0.12, 0.72, luma));
      const mix = amount * surfaceMask * highlightMask * alpha * 0.86;
      data[i] = Math.round(lerp(data[i], pastel.r, mix));
      data[i + 1] = Math.round(lerp(data[i + 1], pastel.g, mix));
      data[i + 2] = Math.round(lerp(data[i + 2], pastel.b, mix));
    }

    targetCtx.putImageData(imageData, 0, 0);
  }

  function rememberTintedHairImage(cacheKey, image) {
    if (hairTintCache.size >= HAIR_TINT_CACHE_LIMIT) {
      hairTintCache.delete(hairTintCache.keys().next().value);
    }
    hairTintCache.set(cacheKey, image);
  }

  function getTintedHairImage(image) {
    if (!image || !state.hairTintEnabled) return image;

    const color = normalizeHexColor(state.hairColor);
    const lightness = Math.round(clamp(Number(state.hairTintLightness) || 0, 0, 100));
    if (color === "#2C292C" && lightness <= 0) return image;
    const imageKey = image.currentSrc || image.src;
    if (!imageKey) return image;
    const cacheKey = `${imageKey}::${image.naturalWidth || image.width}x${image.naturalHeight || image.height}::${color}::${lightness}`;
    const cached = hairTintCache.get(cacheKey);
    if (cached) {
      hairTintCache.delete(cacheKey);
      hairTintCache.set(cacheKey, cached);
      return cached;
    }

    try {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const colorCanvas = document.createElement("canvas");
      colorCanvas.width = width;
      colorCanvas.height = height;
      const colorCtx = colorCanvas.getContext("2d");
      if (!colorCtx) return image;

      colorCtx.drawImage(image, 0, 0);
      colorCtx.globalCompositeOperation = "color";
      if (colorCtx.globalCompositeOperation !== "color") {
        colorCtx.globalCompositeOperation = "source-atop";
      }
      colorCtx.fillStyle = color;
      colorCtx.fillRect(0, 0, width, height);
      colorCtx.globalCompositeOperation = "destination-in";
      colorCtx.drawImage(image, 0, 0);
      colorCtx.globalCompositeOperation = "source-over";
      applyHairTintLightness(colorCtx, image, color, lightness);

      rememberTintedHairImage(cacheKey, colorCanvas);
      return colorCanvas;
    } catch (error) {
      console.warn("髪色の変更に失敗したため元画像で描画します。", error);
      return image;
    }
  }

  let faceCenterRaw = null;
  let highlightEyesRaw = null; // 瞳中心。涙レンズ歪みと目全体のぷるぷる基準。
  let highlightPulseLeftX = 1;
  let highlightPulseLeftY = 1;
  let highlightPulseRightX = 1;
  let highlightPulseRightY = 1;
  let highlightPulseLeftTargetX = 1;
  let highlightPulseLeftTargetY = 1;
  let highlightPulseRightTargetX = 1;
  let highlightPulseRightTargetY = 1;
  let highlightGyroX = 0;
  let highlightGyroY = 0;
  let highlightGyroLagX = 0;
  let highlightGyroLagY = 0;
  let blinkBounceTriggerTime = -10;
  let highlightEyesWarped = null;
  let highlightPointsRaw = null; // 自動生成ハイライトの配置点。瞳中心とは別管理。
  let subHighlightPointsRaw = null; // サブハイライトの配置点。初期OFFだがON時に自動配置できる。
  let generatedHighlightCanvas = null;
  let generatedHighlightSignature = "";
  let generatedSubHighlightCanvas = null;
  let generatedSubHighlightSignature = "";
  const DEFAULT_EYE_CENTERS = [
    { x: 390, y: 790 },
    { x: 634, y: 790 },
  ];
  const DEFAULT_EYE_LENS_RADIUS = { x: 64, y: 46 };
  const FACE_DEPTH_ANCHOR_DEFS = [
    { key: "leftEye", label: "左目", short: "左目", color: "#3d8cff" },
    { key: "rightEye", label: "右目", short: "右目", color: "#ff7a3d" },
    { key: "nose", label: "鼻", short: "鼻", color: "#ffd34d" },
    { key: "mouth", label: "口", short: "口", color: "#ff5c92" },
    { key: "chin", label: "顎", short: "顎", color: "#7bd88f" },
  ];
  let faceDepthAnchorsRaw = null;
  const DEFAULT_NECK_PIVOT = { x: DEFAULT_FACE_CENTER.x, y: DEFAULT_FACE_CENTER.y + 430 };
  let neckPivotRaw = null;
  const HAIR_BUNDLE_DEFS = [
    {
      key: "frontLeft",
      layer: "front",
      group: "front",
      groupLabel: "前髪",
      positionLabel: "左",
      label: "左前髪",
      short: "前髪 左",
      color: "#3d8cff",
      width: 145,
      swing: 0.92,
      stiffness: 1.15,
      damping: 1.04,
      phase: 0.07,
      root: { x: 410, y: 338 },
      tip: { x: 370, y: 748 },
    },
    {
      key: "frontCenter",
      layer: "front",
      group: "front",
      groupLabel: "前髪",
      positionLabel: "中央",
      label: "中央前髪",
      short: "前髪 中央",
      color: "#ffd34d",
      width: 155,
      swing: 0.82,
      stiffness: 1.24,
      damping: 1.08,
      phase: 0.19,
      root: { x: 512, y: 324 },
      tip: { x: 508, y: 760 },
    },
    {
      key: "frontRight",
      layer: "front",
      group: "front",
      groupLabel: "前髪",
      positionLabel: "右",
      label: "右前髪",
      short: "前髪 右",
      color: "#ff7a3d",
      width: 145,
      swing: 0.92,
      stiffness: 1.15,
      damping: 1.04,
      phase: 0.31,
      root: { x: 610, y: 338 },
      tip: { x: 560, y: 745 },
    },
    {
      key: "sideLeft",
      layer: "front",
      group: "side",
      groupLabel: "横髪",
      positionLabel: "左",
      label: "左横髪",
      short: "横髪 左",
      color: "#7ee7ff",
      width: 165,
      swing: 1.12,
      stiffness: 0.92,
      damping: 0.95,
      phase: 0.43,
      root: { x: 270, y: 430 },
      tip: { x: 240, y: 1180 },
    },
    {
      key: "sideRight",
      layer: "front",
      group: "side",
      groupLabel: "横髪",
      positionLabel: "右",
      label: "右横髪",
      short: "横髪 右",
      color: "#c4f4ff",
      width: 165,
      swing: 1.12,
      stiffness: 0.92,
      damping: 0.95,
      phase: 0.55,
      root: { x: 710, y: 430 },
      tip: { x: 760, y: 1180 },
    },
    {
      key: "backLeft",
      layer: "back",
      group: "back",
      groupLabel: "後ろ髪",
      positionLabel: "左",
      label: "左後ろ髪",
      short: "後ろ髪 左",
      color: "#8b5cf6",
      width: 205,
      swing: 1.22,
      stiffness: 0.74,
      damping: 0.9,
      phase: 0.67,
      root: { x: 360, y: 520 },
      tip: { x: 260, y: 1230 },
    },
    {
      key: "backCenter",
      layer: "back",
      group: "back",
      groupLabel: "後ろ髪",
      positionLabel: "中央",
      label: "中央後ろ髪",
      short: "後ろ髪 中央",
      color: "#7bd88f",
      width: 220,
      swing: 1.08,
      stiffness: 0.82,
      damping: 0.92,
      phase: 0.79,
      root: { x: 512, y: 500 },
      tip: { x: 512, y: 1260 },
    },
    {
      key: "backRight",
      layer: "back",
      group: "back",
      groupLabel: "後ろ髪",
      positionLabel: "右",
      label: "右後ろ髪",
      short: "後ろ髪 右",
      color: "#ff5c92",
      width: 205,
      swing: 1.22,
      stiffness: 0.74,
      damping: 0.9,
      phase: 0.91,
      root: { x: 660, y: 520 },
      tip: { x: 760, y: 1230 },
    },
  ];
  let hairBundleRigRaw = null;
  let hairBundleRigCacheSource = undefined;
  let hairBundleRigCache = null;
  let hairBundleFocus = "all";

  function setHairBundleRigRaw(rig, { normalized = false } = {}) {
    hairBundleRigRaw = rig;
    if (normalized && rig) {
      hairBundleRigCacheSource = rig;
      hairBundleRigCache = rig;
    } else {
      hairBundleRigCacheSource = undefined;
      hairBundleRigCache = null;
    }
  }

  function normalizeHairBundleFocus(value) {
    return ["all", "front", "side", "back"].includes(value) ? value : "all";
  }

  function visibleHairBundleDefs() {
    const focus = normalizeHairBundleFocus(hairBundleFocus);
    return focus === "all"
      ? HAIR_BUNDLE_DEFS
      : HAIR_BUNDLE_DEFS.filter((def) => def.group === focus);
  }

  function hairBundleFocusLabel() {
    return {
      all: "全て表示",
      front: "前髪だけ",
      side: "横髪だけ",
      back: "後ろ髪だけ",
    }[normalizeHairBundleFocus(hairBundleFocus)];
  }

  function highlightDiameter() {
    return clamp(Number(state.highlightSize) || 14, 2, 60);
  }

  function highlightAspectScale() {
    return clamp(Number(state.highlightAspect) || 90, 40, 160) / 100;
  }

  function subHighlightDiameter() {
    return clamp(Number(state.subHighlightSize) || 7, 2, 36);
  }

  function subHighlightAspectScale() {
    return clamp(Number(state.subHighlightAspect) || 100, 40, 160) / 100;
  }

  function eyeLensRadius() {
    return {
      x: clamp(
        Number(state.tearLensRadiusX) || DEFAULT_EYE_LENS_RADIUS.x,
        EYE_LENS_LIMITS.radiusX.min,
        EYE_LENS_LIMITS.radiusX.max
      ),
      y: clamp(
        Number(state.tearLensRadiusY) || DEFAULT_EYE_LENS_RADIUS.y,
        EYE_LENS_LIMITS.radiusY.min,
        EYE_LENS_LIMITS.radiusY.max
      ),
    };
  }

  function eyeLensRotationForIndex(index) {
    const degrees = index === 0 ? state.tearLensRotationLeft : state.tearLensRotationRight;
    return (Math.PI / 180) * clamp(
      Number(degrees) || 0,
      EYE_LENS_LIMITS.rotation.min,
      EYE_LENS_LIMITS.rotation.max
    );
  }

  function normalizeFaceCenter(value) {
    const x = Number(value?.x);
    const y = Number(value?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      x: clamp(x, 0, CROP.w),
      y: clamp(y, 0, CROP.h),
    };
  }

  function currentFaceCenter() {
    if (
      faceCenterCacheFrame === motionFrameId &&
      faceCenterCacheSource === faceCenterRaw &&
      faceCenterCache
    ) {
      return faceCenterCache;
    }
    const center = normalizeFaceCenter(faceCenterRaw) || { ...DEFAULT_FACE_CENTER };
    faceCenterCache = center;
    faceCenterCacheSource = faceCenterRaw;
    faceCenterCacheFrame = motionFrameId;
    return faceCenterCache;
  }

  function buildFaceCenterSetupPayload() {
    return {
      version: 1,
      center: currentFaceCenter(),
    };
  }

  function setFaceCenterSetupStatus(text) {
    if (ui.characterWizardStatus && characterWizard?.active) ui.characterWizardStatus.textContent = text;
  }

  function saveFaceCenterSetup() {
    const payload = buildFaceCenterSetupPayload();
    if (!safeSetJson(FACE_CENTER_SETUP_STORAGE_KEY, payload, () => {
      setFaceCenterSetupStatus("顔中心の保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    return true;
  }

  function applyFaceCenterSetupPayload(saved) {
    const center = normalizeFaceCenter(saved?.center || saved?.faceCenter || saved);
    if (!center) return false;
    faceCenterRaw = center;
    return true;
  }

  function loadFaceCenterSetup() {
    const saved = safeGetSettingsJson(FACE_CENTER_SETUP_STORAGE_KEY);
    return saved ? applyFaceCenterSetupPayload(saved) : false;
  }

  function cloneEyeCenters(centers) {
    return centers.map((p) => ({ x: p.x, y: p.y }));
  }

  function normalizeEyeCenters(value) {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const centers = value.map((p) => ({
      x: clamp(Number(p?.x), 0, CROP.w),
      y: clamp(Number(p?.y), 0, CROP.h),
    }));
    if (centers.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
    centers.sort((a, b) => a.x - b.x);
    return centers;
  }

  function normalizeHighlightPoints(value) {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const points = value.map((p) => ({
      x: clamp(Number(p?.x), 0, CROP.w),
      y: clamp(Number(p?.y), 0, CROP.h),
    }));
    if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
    points.sort((a, b) => a.x - b.x);
    return points;
  }

  function normalizeFaceDepthAnchors(value) {
    if (!value || typeof value !== "object") return null;
    const anchors = {};
    for (const def of FACE_DEPTH_ANCHOR_DEFS) {
      const p = value[def.key];
      const x = Number(p?.x);
      const y = Number(p?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      anchors[def.key] = {
        x: clamp(x, 0, CROP.w),
        y: clamp(y, 0, CROP.h),
      };
    }
    if (anchors.leftEye.x > anchors.rightEye.x) {
      const left = anchors.leftEye;
      anchors.leftEye = anchors.rightEye;
      anchors.rightEye = left;
    }
    return anchors;
  }

  function estimateFaceDepthAnchors(faceCenter, eyes) {
    const center = normalizeFaceCenter(faceCenter) || { ...DEFAULT_FACE_CENTER };
    const normalizedEyes = normalizeEyeCenters(eyes) || cloneEyeCenters(DEFAULT_EYE_CENTERS);
    const eyeDistance = clamp(
      Math.hypot(normalizedEyes[1].x - normalizedEyes[0].x, normalizedEyes[1].y - normalizedEyes[0].y),
      80,
      520
    );
    const eyeMidX = (normalizedEyes[0].x + normalizedEyes[1].x) / 2;
    const featureX = clamp((center.x * 2 + eyeMidX) / 3, 0, CROP.w);
    return normalizeFaceDepthAnchors({
      leftEye: normalizedEyes[0],
      rightEye: normalizedEyes[1],
      nose: { x: featureX, y: center.y + eyeDistance * 0.56 },
      mouth: { x: featureX, y: center.y + eyeDistance * 0.94 },
      chin: { x: featureX, y: center.y + eyeDistance * 1.3 },
    });
  }

  function defaultFaceDepthAnchors() {
    const eyes = normalizeEyeCenters(highlightEyesRaw) || cloneEyeCenters(DEFAULT_EYE_CENTERS);
    const faceCenter = currentFaceCenter();
    return estimateFaceDepthAnchors(faceCenter, eyes);
  }

  function currentFaceDepthAnchors() {
    if (
      faceDepthAnchorsCacheFrame === motionFrameId &&
      faceDepthAnchorsCacheSource === faceDepthAnchorsRaw &&
      faceDepthAnchorsCacheCenterSource === faceCenterRaw &&
      faceDepthAnchorsCacheEyesSource === highlightEyesRaw &&
      faceDepthAnchorsCache
    ) {
      return faceDepthAnchorsCache;
    }
    const anchors = normalizeFaceDepthAnchors(faceDepthAnchorsRaw) || defaultFaceDepthAnchors();
    if (!anchors) return null;
    faceDepthAnchorsCache = anchors;
    faceDepthAnchorsCacheSource = faceDepthAnchorsRaw;
    faceDepthAnchorsCacheCenterSource = faceCenterRaw;
    faceDepthAnchorsCacheEyesSource = highlightEyesRaw;
    faceDepthAnchorsCacheFrame = motionFrameId;
    return faceDepthAnchorsCache;
  }

  function ensureFaceDepthAnchors() {
    const anchors = currentFaceDepthAnchors();
    faceDepthAnchorsRaw = anchors;
    return anchors;
  }

  function normalizeNeckPivot(value) {
    const x = Number(value?.x);
    const y = Number(value?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      x: clamp(x, 0, CROP.w),
      y: clamp(y, 0, CROP.h),
    };
  }

  function defaultNeckPivot() {
    const anchors = currentFaceDepthAnchors();
    return normalizeNeckPivot({
      x: anchors.chin.x,
      y: Math.min(CROP.h - 40, anchors.chin.y + 86),
    }) || { ...DEFAULT_NECK_PIVOT };
  }

  function currentNeckPivot() {
    if (
      neckPivotCacheFrame === motionFrameId &&
      neckPivotCacheSource === neckPivotRaw &&
      neckPivotCacheDepthSource === faceDepthAnchorsRaw &&
      neckPivotCacheCenterSource === faceCenterRaw &&
      neckPivotCacheEyesSource === highlightEyesRaw &&
      neckPivotCache
    ) {
      return neckPivotCache;
    }
    const pivot = normalizeNeckPivot(neckPivotRaw) || defaultNeckPivot();
    if (!pivot) return { ...DEFAULT_NECK_PIVOT };
    neckPivotCache = pivot;
    neckPivotCacheSource = neckPivotRaw;
    neckPivotCacheDepthSource = faceDepthAnchorsRaw;
    neckPivotCacheCenterSource = faceCenterRaw;
    neckPivotCacheEyesSource = highlightEyesRaw;
    neckPivotCacheFrame = motionFrameId;
    return neckPivotCache;
  }

  function ensureNeckPivot() {
    const pivot = currentNeckPivot();
    neckPivotRaw = pivot;
    return pivot;
  }

  function setEyeSetupStatus(text) {
    if (ui.eyeSetupStatus) ui.eyeSetupStatus.textContent = text;
  }

  function setHighlightSetupStatus(text) {
    if (ui.highlightSetupStatus) ui.highlightSetupStatus.textContent = text;
  }

  function setFaceDepthSetupStatus(text) {
    if (ui.faceDepthSetupStatus) ui.faceDepthSetupStatus.textContent = text;
  }

  function setNeckPivotSetupStatus(text) {
    if (ui.neckPivotSetupStatus) ui.neckPivotSetupStatus.textContent = text;
  }

  function setHairBundleSetupStatus(text) {
    if (ui.hairBundleSetupStatus) ui.hairBundleSetupStatus.textContent = text;
  }

  function closeHairBundleSetupMode() {
    state.hairBundleSetupMode = false;
    hairBundleSetupDrag = null;
    syncButtonPressed(ui.hairBundleSetupButton, "髪束編集 ON", "髪束編集 OFF", false);
  }

  function ensureEyeCenters() {
    if (highlightEyesRaw) return highlightEyesRaw;
    if (!imagesReady) return null;
    highlightEyesRaw = cloneEyeCenters(DEFAULT_EYE_CENTERS);
    setEyeSetupStatus("瞳位置: 推定値を使用中です。黒目や虹彩の中心に合わせてください。");
    return highlightEyesRaw;
  }

  function autoDetectEyeCenters() {
    highlightEyesRaw = cloneEyeCenters(DEFAULT_EYE_CENTERS);
    setEyeSetupStatus("瞳位置を推定配置しました。合わない場合は編集ONで黒目や虹彩の中心へドラッグしてください。");
  }

  function saveEyeSetup() {
    const payload = buildEyeSetupPayload();
    if (!safeSetJson(EYE_SETUP_STORAGE_KEY, payload, () => {
      setEyeSetupStatus("瞳位置の保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    setEyeSetupStatus("瞳位置・範囲サイズ・回転を保存しました。新キャラ時は推定配置または再編集してください。");
    return true;
  }

  function applyEyeSetupPayload(saved, statusText = "保存済みの瞳位置・範囲サイズ・回転を読み込みました。") {
    const centers = normalizeEyeCenters(saved?.centers);
    if (!centers) return false;
    highlightEyesRaw = centers;
    if (saved?.radius && typeof saved.radius === "object") {
      const rx = Number(saved.radius.x);
      const ry = Number(saved.radius.y);
      if (Number.isFinite(rx)) {
        state.tearLensRadiusX = Math.round(clamp(rx, EYE_LENS_LIMITS.radiusX.min, EYE_LENS_LIMITS.radiusX.max));
      }
      if (Number.isFinite(ry)) {
        state.tearLensRadiusY = Math.round(clamp(ry, EYE_LENS_LIMITS.radiusY.min, EYE_LENS_LIMITS.radiusY.max));
      }
    }
    const rotLeft = Number(saved?.rotationLeft);
    const rotRight = Number(saved?.rotationRight);
    if (Number.isFinite(rotLeft) || Number.isFinite(rotRight)) {
      if (Number.isFinite(rotLeft)) {
        state.tearLensRotationLeft = Math.round(clamp(rotLeft, EYE_LENS_LIMITS.rotation.min, EYE_LENS_LIMITS.rotation.max));
      }
      if (Number.isFinite(rotRight)) {
        state.tearLensRotationRight = Math.round(clamp(rotRight, EYE_LENS_LIMITS.rotation.min, EYE_LENS_LIMITS.rotation.max));
      }
    } else {
      const symmetricRot = Number(saved?.rotation);
      if (Number.isFinite(symmetricRot)) {
        state.tearLensRotationLeft = Math.round(
          clamp(-symmetricRot, EYE_LENS_LIMITS.rotation.min, EYE_LENS_LIMITS.rotation.max)
        );
        state.tearLensRotationRight = Math.round(
          clamp(symmetricRot, EYE_LENS_LIMITS.rotation.min, EYE_LENS_LIMITS.rotation.max)
        );
      }
    }
    setEyeSetupStatus(statusText);
    return true;
  }

  function loadEyeSetup() {
    const saved = safeGetSettingsJson(EYE_SETUP_STORAGE_KEY);
    return saved ? applyEyeSetupPayload(saved) : false;
  }

  function autoDetectFaceDepthAnchors() {
    faceDepthAnchorsRaw = defaultFaceDepthAnchors();
    setFaceDepthSetupStatus("顔奥行き点を推定配置しました。ズレる点だけドラッグで調整してください。");
    return true;
  }

  function buildFaceDepthSetupPayload() {
    const anchors = currentFaceDepthAnchors();
    return {
      version: 1,
      anchors,
    };
  }

  function saveFaceDepthSetup() {
    const payload = buildFaceDepthSetupPayload();
    if (!payload.anchors) {
      setFaceDepthSetupStatus("保存する顔奥行き点がありません。推定配置または奥行き点編集ONで確認してください。");
      return false;
    }
    if (!safeSetJson(FACE_DEPTH_SETUP_STORAGE_KEY, payload, () => {
      setFaceDepthSetupStatus("顔奥行き点の保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    setFaceDepthSetupStatus("顔奥行き点を保存しました。全設定保存にも含まれます。");
    return true;
  }

  function applyFaceDepthSetupPayload(saved, statusText = "保存済みの顔奥行き点を読み込みました。") {
    const anchors = normalizeFaceDepthAnchors(saved?.anchors);
    if (!anchors) return false;
    faceDepthAnchorsRaw = anchors;
    setFaceDepthSetupStatus(statusText);
    return true;
  }

  function loadFaceDepthSetup() {
    const saved = safeGetSettingsJson(FACE_DEPTH_SETUP_STORAGE_KEY);
    return saved ? applyFaceDepthSetupPayload(saved) : false;
  }

  function autoDetectNeckPivot() {
    neckPivotRaw = defaultNeckPivot();
    setNeckPivotSetupStatus("首支点を推定配置しました。首の付け根にズレる場合はドラッグで調整してください。");
    return true;
  }

  function buildNeckPivotSetupPayload() {
    return {
      version: 1,
      pivot: currentNeckPivot(),
    };
  }

  function saveNeckPivotSetup() {
    const payload = buildNeckPivotSetupPayload();
    if (!payload.pivot) {
      setNeckPivotSetupStatus("保存する首支点がありません。推定配置または首支点編集ONで確認してください。");
      return false;
    }
    if (!safeSetJson(NECK_PIVOT_SETUP_STORAGE_KEY, payload, () => {
      setNeckPivotSetupStatus("首支点の保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    setNeckPivotSetupStatus("首支点を保存しました。全設定保存にも含まれます。");
    return true;
  }

  function applyNeckPivotSetupPayload(saved, statusText = "保存済みの首支点を読み込みました。") {
    const pivot = normalizeNeckPivot(saved?.pivot);
    if (!pivot) return false;
    neckPivotRaw = pivot;
    setNeckPivotSetupStatus(statusText);
    return true;
  }

  function loadNeckPivotSetup() {
    const saved = safeGetSettingsJson(NECK_PIVOT_SETUP_STORAGE_KEY);
    return saved ? applyNeckPivotSetupPayload(saved) : false;
  }

  function cloneHairBundlePoint(point) {
    return {
      x: clamp(Number(point?.x), 0, CROP.w),
      y: clamp(Number(point?.y), 0, CROP.h),
    };
  }

  function defaultHairBundleLine(def) {
    const metrics = currentFaceRigMetrics();
    const cx = metrics.center.x;
    const eye = metrics.eyeDistance;
    const rx = metrics.radiusX;
    const top = metrics.topY;
    const bottom = metrics.bottomY;
    const point = (x, y) => cloneHairBundlePoint({ x, y });
    const rootYFront = top - eye * 0.5;
    const tipYFront = metrics.eyeMid.y - eye * 0.12;
    const rootYSide = top - eye * 0.08;
    const tipYSide = bottom + eye * 0.36;
    const rootYBack = top + metrics.radiusY * 0.17;
    const tipYBack = bottom + eye * 0.7;
    switch (def.key) {
      case "frontLeft":
        return { root: point(cx - eye * 0.42, rootYFront), tip: point(cx - eye * 0.58, tipYFront) };
      case "frontCenter":
        return { root: point(cx, rootYFront - eye * 0.06), tip: point(cx, tipYFront + eye * 0.06) };
      case "frontRight":
        return { root: point(cx + eye * 0.4, rootYFront), tip: point(cx + eye * 0.2, tipYFront) };
      case "sideLeft":
        return { root: point(cx - rx * 0.86, rootYSide), tip: point(cx - rx * 0.96, tipYSide) };
      case "sideRight":
        return { root: point(cx + rx * 0.72, rootYSide), tip: point(cx + rx * 0.96, tipYSide) };
      case "backLeft":
        return { root: point(cx - eye * 0.62, rootYBack), tip: point(cx - rx * 0.92, tipYBack) };
      case "backCenter":
        return { root: point(cx, rootYBack - eye * 0.08), tip: point(cx, tipYBack + eye * 0.12) };
      case "backRight":
        return { root: point(cx + eye * 0.62, rootYBack), tip: point(cx + rx * 0.92, tipYBack) };
      default:
        return {
          root: cloneHairBundlePoint(def.root),
          tip: cloneHairBundlePoint(def.tip),
        };
    }
  }

  function defaultHairBundleRig() {
    const bundles = {};
    for (const def of HAIR_BUNDLE_DEFS) {
      bundles[def.key] = defaultHairBundleLine(def);
    }
    return bundles;
  }

  function normalizeHairBundleRig(value) {
    if (!value || typeof value !== "object") return null;
    const bundles = {};
    const source = value.bundles && typeof value.bundles === "object" ? value.bundles : value;
    for (const def of HAIR_BUNDLE_DEFS) {
      const line = source[def.key];
      const root = cloneHairBundlePoint(line?.root);
      const tip = cloneHairBundlePoint(line?.tip);
      if (!Number.isFinite(root.x) || !Number.isFinite(root.y) || !Number.isFinite(tip.x) || !Number.isFinite(tip.y)) {
        return null;
      }
      if (Math.hypot(tip.x - root.x, tip.y - root.y) < 24) {
        bundles[def.key] = defaultHairBundleLine(def);
      } else {
        bundles[def.key] = { root, tip };
      }
    }
    return bundles;
  }

  function currentHairBundleRig() {
    if (hairBundleRigCache && hairBundleRigCacheSource === hairBundleRigRaw) return hairBundleRigCache;
    const rig = normalizeHairBundleRig(hairBundleRigRaw) || defaultHairBundleRig();
    hairBundleRigCacheSource = hairBundleRigRaw;
    hairBundleRigCache = rig;
    return rig;
  }

  function ensureHairBundleRig() {
    const rig = currentHairBundleRig();
    setHairBundleRigRaw(rig, { normalized: true });
    return rig;
  }

  function resetHairBundleTemplate() {
    setHairBundleRigRaw(defaultHairBundleRig(), { normalized: true });
    setHairBundleSetupStatus(`標準テンプレを配置しました。表示中: ${hairBundleFocusLabel()}。白丸は頭側、色丸は毛先に合わせてください。`);
    return true;
  }

  function buildHairBundleSetupPayload() {
    return {
      version: 1,
      bundles: currentHairBundleRig(),
    };
  }

  function saveHairBundleSetup() {
    const payload = buildHairBundleSetupPayload();
    if (!payload.bundles) {
      setHairBundleSetupStatus("保存する髪束ラインがありません。標準テンプレまたは髪束編集ONで確認してください。");
      return false;
    }
    if (!safeSetJson(HAIR_BUNDLE_SETUP_STORAGE_KEY, payload, () => {
      setHairBundleSetupStatus("髪束ラインの保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    setHairBundleSetupStatus("髪束ラインを保存しました。全設定保存にも含まれます。");
    return true;
  }

  function applyHairBundleSetupPayload(saved, statusText = "保存済みの髪束ラインを読み込みました。") {
    const bundles = normalizeHairBundleRig(saved?.bundles || saved);
    if (!bundles) return false;
    setHairBundleRigRaw(bundles, { normalized: true });
    setHairBundleSetupStatus(statusText);
    return true;
  }

  function loadHairBundleSetup() {
    const saved = safeGetSettingsJson(HAIR_BUNDLE_SETUP_STORAGE_KEY);
    return saved ? applyHairBundleSetupPayload(saved) : false;
  }

  function cloneRigPoint(point) {
    return {
      x: clamp(Number(point?.x), 0, CROP.w),
      y: clamp(Number(point?.y), 0, CROP.h),
    };
  }

  function cloneFaceDepthAnchors(anchors) {
    return normalizeFaceDepthAnchors(anchors) || defaultFaceDepthAnchors();
  }

  function cloneHairBundleRig(rig) {
    return normalizeHairBundleRig(rig) || defaultHairBundleRig();
  }

  function createCharacterWizardDraft() {
    const anchors = cloneFaceDepthAnchors(currentFaceDepthAnchors());
    return {
      version: 1,
      faceCenter: cloneRigPoint(currentFaceCenter()),
      faceAnchors: {
        leftEye: cloneRigPoint(anchors.leftEye),
        rightEye: cloneRigPoint(anchors.rightEye),
        nose: cloneRigPoint(anchors.nose),
        mouth: cloneRigPoint(anchors.mouth),
        chin: cloneRigPoint(anchors.chin),
      },
      neckPivot: cloneRigPoint(currentNeckPivot()),
      hairBundles: cloneHairBundleRig(currentHairBundleRig()),
    };
  }

  function captureCharacterWizardOriginal() {
    return {
      faceCenter: faceCenterRaw ? cloneRigPoint(faceCenterRaw) : null,
      eyes: highlightEyesRaw ? cloneEyeCenters(highlightEyesRaw) : null,
      faceDepth: faceDepthAnchorsRaw ? cloneFaceDepthAnchors(faceDepthAnchorsRaw) : null,
      neckPivot: neckPivotRaw ? cloneRigPoint(neckPivotRaw) : null,
      hairBundles: hairBundleRigRaw ? cloneHairBundleRig(hairBundleRigRaw) : null,
      hairFocus: hairBundleFocus,
    };
  }

  function restoreCharacterWizardOriginal(original) {
    if (!original) return;
    faceCenterRaw = original.faceCenter ? cloneRigPoint(original.faceCenter) : null;
    highlightEyesRaw = original.eyes ? cloneEyeCenters(original.eyes) : null;
    faceDepthAnchorsRaw = original.faceDepth ? cloneFaceDepthAnchors(original.faceDepth) : null;
    neckPivotRaw = original.neckPivot ? cloneRigPoint(original.neckPivot) : null;
    setHairBundleRigRaw(original.hairBundles ? cloneHairBundleRig(original.hairBundles) : null);
    hairBundleFocus = normalizeHairBundleFocus(original.hairFocus);
    if (ui.hairBundleFocusSelect) ui.hairBundleFocusSelect.value = hairBundleFocus;
  }

  function characterWizardStepKey() {
    return CHARACTER_WIZARD_STEPS[characterWizard?.stepIndex || 0] || "faceCenter";
  }

  function characterWizardStepDef() {
    return CHARACTER_WIZARD_STEP_DEFS[characterWizardStepKey()] || CHARACTER_WIZARD_STEP_DEFS.faceCenter;
  }

  function characterWizardStepNumberText() {
    const current = Math.min((characterWizard?.stepIndex || 0) + 1, CHARACTER_WIZARD_STEPS.length);
    return `${current} / ${CHARACTER_WIZARD_STEPS.length}`;
  }

  function characterWizardPointForStep(stepKey = characterWizardStepKey()) {
    const def = CHARACTER_WIZARD_STEP_DEFS[stepKey];
    if (!def?.pointPath || !characterWizard?.draft) return null;
    let value = characterWizard.draft;
    for (const key of def.pointPath) value = value?.[key];
    return normalizeFaceCenter(value);
  }

  function setCharacterWizardPointForStep(point, stepKey = characterWizardStepKey()) {
    const def = CHARACTER_WIZARD_STEP_DEFS[stepKey];
    if (!def?.pointPath || !characterWizard?.draft) return false;
    const normalized = normalizeFaceCenter(point);
    if (!normalized) return false;
    let target = characterWizard.draft;
    for (let i = 0; i < def.pointPath.length - 1; i += 1) target = target[def.pointPath[i]];
    target[def.pointPath[def.pointPath.length - 1]] = normalized;
    return true;
  }

  function normalizeCharacterWizardEyeOrder() {
    const anchors = characterWizard?.draft?.faceAnchors;
    if (!anchors?.leftEye || !anchors?.rightEye) return;
    if (anchors.leftEye.x <= anchors.rightEye.x) return;
    const left = anchors.leftEye;
    anchors.leftEye = anchors.rightEye;
    anchors.rightEye = left;
  }

  function setCharacterWizardStatus(text) {
    if (ui.characterWizardStatus) ui.characterWizardStatus.textContent = text;
  }

  function syncCharacterWizardHairStep() {
    if (!characterWizard?.active) return;
    const stepKey = characterWizardStepKey();
    if (stepKey === "hairBundles") {
      state.hairBundleSetupMode = true;
      state.eyeSetupMode = false;
      state.highlightSetupMode = false;
      state.faceDepthSetupMode = false;
      state.neckPivotSetupMode = false;
      state.editMode = false;
      setHairBundleRigRaw(characterWizard.draft.hairBundles, { normalized: true });
      setPreviewTarget(0, 0);
      setHairBundleSetupStatus("白丸を髪の生え際、色丸を毛先に合わせてください。ズレた線だけ直せます。");
    } else {
      if (state.hairBundleSetupMode) state.hairBundleSetupMode = false;
      hairBundleSetupDrag = null;
    }
    syncButtonPressed(ui.hairBundleSetupButton, "髪束編集 ON", "髪束編集 OFF", state.hairBundleSetupMode);
  }

  function updateCharacterWizardSetupControls() {
    const disabled = Boolean(characterWizard?.active);
    for (const def of Object.values(SETUP_TOOLS)) {
      const btn = ui[def.button];
      if (btn) btn.disabled = disabled;
    }
  }

  function updateCharacterWizardViewControls() {
    if (ui.characterWizardSizeReadout) ui.characterWizardSizeReadout.textContent = `${state.avatarSize}%`;
  }

  function moveCharacterWizardView(dx = 0, dy = 0) {
    state.avatarX = Math.round(clamp(state.avatarX + dx, -3000, 3000));
    state.avatarY = Math.round(clamp(state.avatarY + dy, -3000, 3000));
  }

  function updateCharacterWizardUi(statusText = "") {
    const active = Boolean(characterWizard?.active);
    if (ui.characterWizardPanel) ui.characterWizardPanel.hidden = !active;
    updateCharacterWizardSetupControls();
    updateCharacterWizardViewControls();
    if (!active) return;
    const stepKey = characterWizardStepKey();
    const def = characterWizardStepDef();
    if (ui.characterWizardStepText) ui.characterWizardStepText.textContent = characterWizardStepNumberText();
    if (ui.characterWizardTitle) ui.characterWizardTitle.textContent = def.title;
    if (ui.characterWizardDescription) ui.characterWizardDescription.textContent = def.description;
    if (ui.characterWizardBackButton) ui.characterWizardBackButton.disabled = characterWizard.stepIndex <= 0;
    if (ui.characterWizardRetryButton) ui.characterWizardRetryButton.disabled = stepKey === "finish";
    if (ui.characterWizardSkipButton) ui.characterWizardSkipButton.disabled = stepKey === "finish";
    if (ui.characterWizardAutoButton) ui.characterWizardAutoButton.hidden = stepKey === "finish";
    if (ui.characterWizardSkipButton) ui.characterWizardSkipButton.hidden = stepKey === "finish";
    if (ui.characterWizardRetryButton) ui.characterWizardRetryButton.hidden = stepKey === "finish";
    if (ui.characterWizardOkButton) {
      ui.characterWizardOkButton.textContent = stepKey === "finish" ? "完了して反映" : "この点でOK";
    }
    const point = characterWizardPointForStep(stepKey);
    const defaultStatus = stepKey === "hairBundles"
      ? "髪束ラインを確認し、ズレた線だけドラッグで直してください。"
      : stepKey === "finish"
        ? "完了すると、瞳位置・奥行き点・首支点・髪束・ハイライト・基準値をまとめて保存します。"
        : point
          ? `${def.label}: x=${Math.round(point.x)}, y=${Math.round(point.y)}。良ければ「この点でOK」。`
          : `${def.label}をキャンバス上でクリックしてください。`;
    setCharacterWizardStatus(statusText || defaultStatus);
    syncCharacterWizardHairStep();
  }

  function startCharacterWizard() {
    if (OBS_MODE) return;
    setActiveSetupTool(null);
    characterWizard = {
      active: true,
      stepIndex: 0,
      draft: createCharacterWizardDraft(),
      original: captureCharacterWizardOriginal(),
    };
    setPreviewTarget(0, 0);
    updateCharacterWizardUi("顔の中心をキャンバス上でクリックしてください。");
  }

  function closeCharacterWizard({ restore = false } = {}) {
    if (restore) restoreCharacterWizardOriginal(characterWizard?.original);
    characterWizard = null;
    state.hairBundleSetupMode = false;
    hairBundleSetupDrag = null;
    if (ui.characterWizardPanel) ui.characterWizardPanel.hidden = true;
    syncButtonPressed(ui.hairBundleSetupButton, "髪束編集 ON", "髪束編集 OFF", false);
    updateCharacterWizardSetupControls();
  }

  function autoFillCharacterWizardStep() {
    if (!characterWizard?.active) return false;
    const stepKey = characterWizardStepKey();
    const anchors = currentFaceDepthAnchors();
    const draftCenter = normalizeFaceCenter(characterWizard.draft?.faceCenter) || currentFaceCenter();
    const draftAnchors = characterWizard.draft?.faceAnchors || {};
    const draftEyes = normalizeEyeCenters([draftAnchors.leftEye, draftAnchors.rightEye]) || [anchors.leftEye, anchors.rightEye];
    const estimatedAnchors = estimateFaceDepthAnchors(draftCenter, draftEyes) || anchors;
    const defaults = {
      faceCenter: draftCenter,
      leftEye: draftEyes[0],
      rightEye: draftEyes[1],
      nose: estimatedAnchors.nose,
      mouth: estimatedAnchors.mouth,
      chin: estimatedAnchors.chin,
      neckPivot: currentNeckPivot(),
    };
    if (stepKey === "hairBundles") {
      characterWizard.draft.hairBundles = defaultHairBundleRig();
      setHairBundleRigRaw(characterWizard.draft.hairBundles, { normalized: true });
      updateCharacterWizardUi("標準テンプレを配置しました。白丸は生え際、色丸は毛先に合わせてください。");
      return true;
    }
    if (!defaults[stepKey]) return false;
    setCharacterWizardPointForStep(defaults[stepKey], stepKey);
    updateCharacterWizardUi(`${CHARACTER_WIZARD_STEP_DEFS[stepKey].label}を自動配置しました。必要ならクリックし直せます。`);
    return true;
  }

  function retryCharacterWizardStep() {
    if (!characterWizard?.active) return;
    const stepKey = characterWizardStepKey();
    if (stepKey === "hairBundles") {
      characterWizard.draft.hairBundles = defaultHairBundleRig();
      setHairBundleRigRaw(characterWizard.draft.hairBundles, { normalized: true });
      updateCharacterWizardUi("髪束ラインを標準テンプレに戻しました。");
      return;
    }
    const def = CHARACTER_WIZARD_STEP_DEFS[stepKey];
    if (def?.pointPath) {
      let target = characterWizard.draft;
      for (let i = 0; i < def.pointPath.length - 1; i += 1) target = target[def.pointPath[i]];
      target[def.pointPath[def.pointPath.length - 1]] = null;
    }
    updateCharacterWizardUi(`${def?.label || "現在の点"}を置き直してください。`);
  }

  function moveCharacterWizardStep(delta) {
    if (!characterWizard?.active) return;
    if (characterWizardStepKey() === "hairBundles") {
      characterWizard.draft.hairBundles = cloneHairBundleRig(currentHairBundleRig());
    }
    characterWizard.stepIndex = clamp(characterWizard.stepIndex + delta, 0, CHARACTER_WIZARD_STEPS.length - 1);
    updateCharacterWizardUi();
  }

  function completeCharacterWizardStep() {
    if (!characterWizard?.active) return;
    const stepKey = characterWizardStepKey();
    if (stepKey === "finish") {
      if (applyCharacterWizardDraft(characterWizard.draft)) {
        closeCharacterWizard();
        setEditStatus("新キャラセットアップを反映しました。.purupuru 保存でバックアップできます。");
      }
      return;
    }
    if (stepKey === "hairBundles") {
      characterWizard.draft.hairBundles = cloneHairBundleRig(currentHairBundleRig());
      moveCharacterWizardStep(1);
      return;
    }
    if (!characterWizardPointForStep(stepKey)) {
      autoFillCharacterWizardStep();
      return;
    }
    moveCharacterWizardStep(1);
  }

  function applyCharacterWizardDraft(draft) {
    const anchors = normalizeFaceDepthAnchors(draft?.faceAnchors);
    const center = normalizeFaceCenter(draft?.faceCenter);
    const pivot = normalizeNeckPivot(draft?.neckPivot);
    const hairRig = normalizeHairBundleRig(draft?.hairBundles) || defaultHairBundleRig();
    if (!center || !anchors || !pivot) {
      setEditStatus("新キャラセットアップの点が不足しています。もう一度ウィザードを確認してください。");
      return false;
    }
    faceCenterRaw = center;
    highlightEyesRaw = normalizeEyeCenters([anchors.leftEye, anchors.rightEye]) || [anchors.leftEye, anchors.rightEye];
    faceDepthAnchorsRaw = anchors;
    neckPivotRaw = pivot;
    setHairBundleRigRaw(hairRig, { normalized: true });
    // 新キャラ用の顔中心・目・鼻・口・顎を反映した後に、顔/髪の既定デフォーマも作り直す。
    // 旧キャラの固定形状を引き継がず、ウィザードで選んだ点を基準にする。
    deformers = createDefaultDeformers();
    safeSetJson(STORAGE_KEY, deformers);
    autoPlaceHighlightPoints();
    saveFaceCenterSetup();
    saveEyeSetup();
    saveFaceDepthSetup();
    saveNeckPivotSetup();
    saveHairBundleSetup();
    saveHighlightSetup();
    captureBaselineSettings("新キャラセットアップ完了");
    tryRememberAllSettingsPayload(buildAllSettingsPayload({ includeItemImages: false }));
    updateAllChangedBadges();
    markActiveCharacterDirty("settings", "character-wizard-finish");
    return true;
  }

  function derivedHighlightPointsFromEyes() {
    const centers = ensureEyeCenters();
    if (!centers) return null;
    const radius = eyeLensRadius();
    return normalizeHighlightPoints(centers.map((center, index) => {
      const lensRot = eyeLensRotationForIndex(index);
      const cos = Math.cos(lensRot);
      const sin = Math.sin(lensRot);
      const localX = -radius.x * 0.26;
      const localY = -radius.y * 0.30;
      return {
        x: center.x + localX * cos - localY * sin,
        y: center.y + localX * sin + localY * cos,
      };
    }));
  }

  function derivedSubHighlightPointsFromMain() {
    const centers = ensureEyeCenters();
    const mainPoints = ensureHighlightPoints();
    if (!centers || !mainPoints) return null;
    const radius = eyeLensRadius();
    return normalizeHighlightPoints(centers.map((center, index) => {
      const main = mainPoints[index];
      const lensRot = eyeLensRotationForIndex(index);
      const cos = Math.cos(lensRot);
      const sin = Math.sin(lensRot);
      const localX = radius.x * 0.08;
      const localY = radius.y * 0.03;
      const oppositeX = center.x + (center.x - main.x) * 0.46;
      const oppositeY = center.y + (center.y - main.y) * 0.46;
      return {
        x: oppositeX + localX * cos - localY * sin,
        y: oppositeY + localX * sin + localY * cos,
      };
    }));
  }

  function ensureHighlightPoints() {
    if (highlightPointsRaw) return highlightPointsRaw;
    if (!imagesReady) return null;
    highlightPointsRaw = derivedHighlightPointsFromEyes();
    if (highlightPointsRaw) {
      setHighlightSetupStatus("ハイライト位置: 瞳中心から仮配置しました。ズレる時だけ編集してください。");
    }
    return highlightPointsRaw;
  }

  function autoPlaceHighlightPoints() {
    highlightPointsRaw = derivedHighlightPointsFromEyes();
    if (highlightPointsRaw) {
      subHighlightPointsRaw = derivedSubHighlightPointsFromMain();
      setHighlightSetupStatus("ハイライト位置を瞳中心から自動配置しました。必要ならドラッグで調整してください。");
      return true;
    }
    setHighlightSetupStatus("ハイライト位置を自動配置できませんでした。先に瞳位置を確認してください。");
    return false;
  }

  function ensureSubHighlightPoints() {
    if (subHighlightPointsRaw) return subHighlightPointsRaw;
    if (!imagesReady) return null;
    subHighlightPointsRaw = derivedSubHighlightPointsFromMain();
    return subHighlightPointsRaw;
  }

  function buildHighlightSetupPayload() {
    const points = normalizeHighlightPoints(highlightPointsRaw) || normalizeHighlightPoints(ensureHighlightPoints());
    const subPoints = normalizeHighlightPoints(subHighlightPointsRaw)
      || (state.subHighlightEnabled ? normalizeHighlightPoints(ensureSubHighlightPoints()) : null);
    return {
      version: 2,
      points,
      subPoints,
      size: highlightDiameter(),
      aspect: Math.round(clamp(Number(state.highlightAspect) || 90, 40, 160)),
      subEnabled: Boolean(state.subHighlightEnabled),
      subSize: subHighlightDiameter(),
      subAspect: Math.round(clamp(Number(state.subHighlightAspect) || 100, 40, 160)),
      subFilmWobble: Math.round(clamp(Number(state.subHighlightFilmWobble) || 0, 0, 100)),
    };
  }

  function saveHighlightSetup() {
    const payload = buildHighlightSetupPayload();
    if (!payload.points) {
      setHighlightSetupStatus("保存するハイライト位置がありません。自動配置またはハイライト配置ONで確認してください。");
      return false;
    }
    if (!safeSetJson(HIGHLIGHT_SETUP_STORAGE_KEY, payload, () => {
      setHighlightSetupStatus("ハイライト位置の保存に失敗しました（ブラウザの保存領域が使えないか、いっぱいの可能性があります）。");
    })) {
      return false;
    }
    setHighlightSetupStatus("ハイライト位置・サブ設定・大きさ・横幅を保存しました。");
    return true;
  }

  function applyHighlightSetupPayload(saved, statusText = "保存済みのハイライト位置を読み込みました。") {
    const points = normalizeHighlightPoints(saved?.points);
    if (!points) return false;
    highlightPointsRaw = points;
    const subPoints = normalizeHighlightPoints(saved?.subPoints);
    if (subPoints) subHighlightPointsRaw = subPoints;
    if (Object.prototype.hasOwnProperty.call(saved, "subEnabled")) {
      state.subHighlightEnabled = Boolean(saved.subEnabled);
    }
    const size = Number(saved?.size);
    if (Number.isFinite(size)) {
      state.highlightSize = Math.round(clamp(size, 2, 60));
    }
    const aspect = Number(saved?.aspect);
    if (Number.isFinite(aspect)) {
      state.highlightAspect = Math.round(clamp(aspect, 40, 160));
    }
    const subSize = Number(saved?.subSize);
    if (Number.isFinite(subSize)) {
      state.subHighlightSize = Math.round(clamp(subSize, 2, 36));
    }
    const subAspect = Number(saved?.subAspect);
    if (Number.isFinite(subAspect)) {
      state.subHighlightAspect = Math.round(clamp(subAspect, 40, 160));
    }
    const subFilmWobble = Number(saved?.subFilmWobble);
    if (Number.isFinite(subFilmWobble)) {
      state.subHighlightFilmWobble = Math.round(clamp(subFilmWobble, 0, 100));
    }
    setHighlightSetupStatus(statusText);
    return true;
  }

  function loadHighlightSetup() {
    const saved = safeGetSettingsJson(HIGHLIGHT_SETUP_STORAGE_KEY);
    return saved ? applyHighlightSetupPayload(saved) : false;
  }

  function markCanvasTextureDirty(canvas) {
    if (!canvas) return;
    canvas.__purupuruTextureVersion = (Number(canvas.__purupuruTextureVersion) || 0) + 1;
  }

  function drawGeneratedHighlightDot(targetCtx, center, index, diameter, aspect, alpha = 1) {
    const radiusY = diameter * 0.5;
    const radiusX = radiusY * aspect;
    const rotation = eyeLensRotationForIndex(index);
    targetCtx.save();
    targetCtx.globalAlpha *= alpha;
    targetCtx.translate(center.x, center.y);
    targetCtx.rotate(rotation);
    targetCtx.scale(radiusX, radiusY);

    const glow = targetCtx.createRadialGradient(-0.16, -0.2, 0.02, 0, 0, 1.38);
    glow.addColorStop(0, "rgba(255, 255, 255, 1)");
    glow.addColorStop(0.58, "rgba(255, 255, 255, 0.96)");
    glow.addColorStop(0.78, "rgba(255, 255, 255, 0.62)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    targetCtx.fillStyle = glow;
    targetCtx.beginPath();
    targetCtx.arc(0, 0, 1.38, 0, TAU);
    targetCtx.fill();

    const core = targetCtx.createRadialGradient(-0.2, -0.24, 0.02, 0, 0, 0.92);
    core.addColorStop(0, "rgba(255, 255, 255, 1)");
    core.addColorStop(0.72, "rgba(255, 255, 255, 0.98)");
    core.addColorStop(1, "rgba(255, 255, 255, 0.78)");
    targetCtx.fillStyle = core;
    targetCtx.beginPath();
    targetCtx.arc(0, 0, 0.92, 0, TAU);
    targetCtx.fill();
    targetCtx.restore();
  }

  function getGeneratedEyeHighlightImage() {
    const points = ensureHighlightPoints();
    if (!points) return null;
    const diameter = highlightDiameter();
    const aspect = highlightAspectScale();
    const signature = [
      points.map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(";"),
      diameter,
      state.highlightAspect,
      state.tearLensRotationLeft,
      state.tearLensRotationRight,
    ].join("|");
    if (generatedHighlightCanvas && generatedHighlightSignature === signature) {
      return generatedHighlightCanvas;
    }

    if (!generatedHighlightCanvas) {
      generatedHighlightCanvas = document.createElement("canvas");
    }
    if (generatedHighlightCanvas.width !== CROP.w || generatedHighlightCanvas.height !== CROP.h) {
      generatedHighlightCanvas.width = CROP.w;
      generatedHighlightCanvas.height = CROP.h;
    }
    const generatedCtx = generatedHighlightCanvas.getContext("2d");
    if (!generatedCtx) return null;
    generatedCtx.clearRect(0, 0, CROP.w, CROP.h);
    points.forEach((point, index) => {
      drawGeneratedHighlightDot(generatedCtx, point, index, diameter, aspect);
    });
    generatedHighlightSignature = signature;
    markCanvasTextureDirty(generatedHighlightCanvas);
    return generatedHighlightCanvas;
  }

  function getGeneratedSubEyeHighlightImage() {
    if (!state.subHighlightEnabled) return null;
    const points = ensureSubHighlightPoints();
    if (!points) return null;
    const diameter = subHighlightDiameter();
    const aspect = subHighlightAspectScale();
    const signature = [
      points.map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(";"),
      diameter,
      state.subHighlightAspect,
      state.tearLensRotationLeft,
      state.tearLensRotationRight,
    ].join("|");
    if (generatedSubHighlightCanvas && generatedSubHighlightSignature === signature) {
      return generatedSubHighlightCanvas;
    }

    if (!generatedSubHighlightCanvas) {
      generatedSubHighlightCanvas = document.createElement("canvas");
    }
    if (generatedSubHighlightCanvas.width !== CROP.w || generatedSubHighlightCanvas.height !== CROP.h) {
      generatedSubHighlightCanvas.width = CROP.w;
      generatedSubHighlightCanvas.height = CROP.h;
    }
    const generatedCtx = generatedSubHighlightCanvas.getContext("2d");
    if (!generatedCtx) return null;
    generatedCtx.clearRect(0, 0, CROP.w, CROP.h);
    points.forEach((point, index) => {
      drawGeneratedHighlightDot(generatedCtx, point, index, diameter, aspect, 0.86);
    });
    generatedSubHighlightSignature = signature;
    markCanvasTextureDirty(generatedSubHighlightCanvas);
    return generatedSubHighlightCanvas;
  }

  function computeBounceXY(delay = 0) {
    const dt = animationSeconds - blinkBounceTriggerTime - delay;
    if (dt < 0 || dt > 0.95) return { x: 0, y: 0 };
    const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const ANTICIP = 0.04; // きゅっと縮む予備動作(40ms)
    const SWELL = 0.082; // 早めにぷるんと膨らむ(82ms)
    if (dt < ANTICIP) {
      // きゅっと縮む(予備動作): 小さくなる部分を強め、ぷるん前のメリハリを出す
      const t = dt / ANTICIP;
      const v = -smoother(t) * 0.16;
      return { x: v, y: v };
    }
    if (dt < ANTICIP + SWELL) {
      // 縮んだ位置から膨らむ: 縦を少し強めにして、目のツヤがぷるんと戻る感じ
      const t = (dt - ANTICIP) / SWELL;
      const e = smoother(t);
      return {
        x: lerp(-0.16, 0.22, e),
        y: lerp(-0.16, 0.42, e),
      };
    }
    // 膨らんだ後、横と縦で少し違う周期の減衰振動 = 機械的ではない有機的なぷるん
    const bt = dt - (ANTICIP + SWELL);
    const decay = Math.exp(-bt * 4.2);
    const oscX = Math.cos(TAU * bt * 4.0) * 0.78 + Math.sin(TAU * bt * 6.9 + 0.25) * 0.22;
    const oscY = Math.cos(TAU * bt * 5.0 + 0.08) * 0.8 + Math.sin(TAU * bt * 8.3 + 0.65) * 0.2;
    return {
      x: decay * oscX * 0.21,
      y: decay * oscY * 0.39,
    };
  }

  function triggerBlinkBounce() {
    blinkBounceTriggerTime = animationSeconds;
  }

  function highlightFilmWobbleAmount(value = state.highlightFilmWobble) {
    // 100%でも強すぎないよう、表示値の半分を内部強度として使う。
    return clamp(Number(value) || 0, 0, 100) / 200;
  }

  function updateHighlightGyro(delta = 1 / 60) {
    const dt = Math.max(0.001, delta);
    const angleScale = state.angleStrength / 100;
    const targetX = clamp(state.angleX * angleScale, -1.6, 1.6);
    const targetY = clamp(state.angleY * angleScale, -1.6, 1.6);
    const follow = 1 - Math.exp(-dt * 12);
    highlightGyroX = lerp(highlightGyroX, targetX, follow);
    highlightGyroY = lerp(highlightGyroY, targetY, follow);
    highlightGyroLagX = clamp(targetX - highlightGyroX, -0.45, 0.45);
    highlightGyroLagY = clamp(targetY - highlightGyroY, -0.45, 0.45);
  }

  function computeHighlightBlinkSlide() {
    const dt = animationSeconds - blinkBounceTriggerTime;
    const BLINK_SLIDE_SPEED = 2;
    const ANTICIP = 0.02;
    const BLINK_SLIDE_DURATION = ANTICIP + 1.8 / BLINK_SLIDE_SPEED;
    if (dt < 0 || dt > BLINK_SLIDE_DURATION) return { x: 0, y: 0 };
    const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    if (dt < ANTICIP) {
      // 目が開いた直後に下へ入って、縦方向のぷるんにメリハリを出す。横はごく微量。
      const v = smoother(dt / ANTICIP);
      return { x: -0.35 * v, y: 9.6 * v };
    }
    const bt = (dt - ANTICIP) * BLINK_SLIDE_SPEED;
    // 下方向を主役にした3回バウンド。
    // 各サイクルは「下へ落ちる → 定位置へ戻る」を必ず完了させる。
    // BLINK_SLIDE_SPEEDで時間だけ圧縮し、動きの形と強さは保つ。
    const liquidBounce = (start, duration, height, fallPortion = 0.32) => {
      const p = (bt - start) / duration;
      if (p < 0 || p > 1) return 0;
      const down = smoother(clamp(p / fallPortion, 0, 1));
      const up = 1 - smoother(clamp((p - fallPortion) / (1 - fallPortion), 0, 1));
      const softBody = 1 + Math.sin(Math.PI * p) * 0.045;
      return height * down * up * softBody;
    };
    const downBounce =
      liquidBounce(0.00, 0.42, 18.0, 0.30) +
      liquidBounce(0.44, 0.43, 11.0, 0.34) +
      liquidBounce(0.90, 0.52, 6.0, 0.38);
    const subtleHorizontal =
      liquidBounce(0.02, 0.40, 0.10, 0.35) -
      liquidBounce(0.46, 0.40, 0.07, 0.38) +
      liquidBounce(0.93, 0.47, 0.04, 0.42);
    return {
      x: subtleHorizontal,
      y: downBounce,
    };
  }

  function computeHighlightBlinkReaction() {
    const neutral = {
      slideX: 0,
      slideY: 0,
      scaleX: 0,
      scaleY: 0,
      shearY: 0,
    };
    if (!blinkEvent) return neutral;

    const step = blinkEvent.steps[blinkEvent.stepIndex];
    if (!step) return neutral;

    const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const nowMs = lastTimestamp || performance.now();
    const elapsed = Math.max(0, nowMs - blinkEvent.phaseStartedAt);

    if (blinkEvent.phase === "closing") {
      // 閉じ始めだけ見える光を軽く潰し、まぶたへ吸い込まれる感じを出す。
      const t = smoother(clamp(elapsed / Math.max(1, step.closeMs * 0.52), 0, 1));
      return {
        slideX: -0.16 * t,
        slideY: 2.6 * t,
        scaleX: 0.055 * t,
        scaleY: -0.18 * t,
        shearY: -0.018 * t,
      };
    }

    if (blinkEvent.phase === "opening") {
      // 開き始めは光が少し遅れて戻り、最後に小さく弾む。
      const visibleStart = step.openMs * 0.42;
      if (elapsed < visibleStart) return neutral;
      const t = clamp((elapsed - visibleStart) / Math.max(1, step.openMs - visibleStart), 0, 1);
      const returnLag = 1 - smoother(t);
      const pop = Math.sin(Math.PI * clamp(t / 0.58, 0, 1)) * Math.exp(-t * 2.35);
      return {
        slideX: -0.10 * returnLag,
        slideY: 3.2 * returnLag - 1.35 * pop,
        scaleX: 0.045 * returnLag - 0.018 * pop,
        scaleY: -0.12 * returnLag + 0.055 * pop,
        shearY: 0.014 * returnLag,
      };
    }

    return neutral;
  }

  // 縦揺れ: 目ハイライト画像だけに足す、まばたき後の下方向バウンド + 顔向き同期の反射スライド。
  // 時間ベースのランダム揺れではなく、左右の目で同じ動きを使う。
  // 涙レンズ歪みとは別処理にして、黒目/虹彩本体は動かさない。
  function computeHighlightFilmWobble(value = state.highlightFilmWobble) {
    const amount = highlightFilmWobbleAmount(value);
    if (amount <= 0) {
      return {
        amount: 0,
        pivotX: 0,
        pivotY: 0,
        slideX: 0,
        slideY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        shearX: 0,
        shearY: 0,
      };
    }
    const gx = highlightGyroX;
    const gy = highlightGyroY;
    const lagX = highlightGyroLagX;
    const lagY = highlightGyroLagY;
    const FACE_REFLECTION_SLIDE_SCALE = 0.25; // 顔向き連動の反射スライドだけを控えめにする。
    const faceSlideX = clamp(-(gx * 13 + lagX * 28), -24, 24) * FACE_REFLECTION_SLIDE_SCALE;
    const faceSlideY = clamp(-(gy * 7 + lagY * 16), -14, 14) * FACE_REFLECTION_SLIDE_SCALE;
    const tilt = clamp(-(gx * 3.2 + lagX * 6), -8, 8);
    const stretch = clamp(Math.abs(gx) * 0.030 + Math.abs(lagX) * 0.060, 0, 0.075);
    const verticalStretch = clamp(Math.abs(gy) * 0.018 + Math.abs(lagY) * 0.045, 0, 0.052);
    const blinkSlide = computeHighlightBlinkSlide();
    const blinkReaction = computeHighlightBlinkReaction();
    return {
      amount,
      pivotX: amount * clamp(-gx * 5 - lagX * 8, -10, 10),
      pivotY: amount * clamp(-5 - gy * 4 - lagY * 6, -13, 5),
      slideX: amount * (faceSlideX + blinkSlide.x + blinkReaction.slideX),
      slideY: amount * (faceSlideY + blinkSlide.y + blinkReaction.slideY),
      rotation: amount * (Math.PI / 180) * tilt,
      scaleX: 1 + amount * (stretch - verticalStretch * 0.25 + blinkReaction.scaleX),
      scaleY: 1 + amount * (verticalStretch - stretch * 0.18 + blinkReaction.scaleY),
      shearX: amount * clamp(-(gx * 0.055 + lagX * 0.13), -0.14, 0.14),
      shearY: amount * (clamp(gy * 0.030 + lagY * 0.075, -0.09, 0.09) + blinkReaction.shearY),
    };
  }

  function updateHighlightPulse(delta = 1 / 60) {
    updateHighlightGyro(delta);

    const eyeCenters = ensureEyeCenters();
    if (eyeCenters) {
      // 涙レンズ歪みもこのキャッシュを使うため、ハイライト表示OFFでも更新する。
      highlightEyesWarped = eyeCenters.map((e) => faceWarpPoint(e.x, e.y));
    } else {
      highlightEyesWarped = null;
    }

    // まばたき後のバウンス(縦横独立)。右目をほんの少し遅らせて有機感を出す。
    // このパルスは涙レンズ歪みも使うため、目ハイライト表示OFFでも更新する。
    const left = computeBounceXY(0);
    const right = computeBounceXY(0.026);
    highlightPulseLeftTargetX = 1 + left.x;
    highlightPulseLeftTargetY = 1 + left.y;
    highlightPulseRightTargetX = 1 + right.x * 0.96;
    highlightPulseRightTargetY = 1 + right.y * 0.96;
    const follow = 1 - Math.exp(-Math.max(0.001, delta) * 38);
    highlightPulseLeftX = lerp(highlightPulseLeftX, highlightPulseLeftTargetX, follow);
    highlightPulseLeftY = lerp(highlightPulseLeftY, highlightPulseLeftTargetY, follow);
    highlightPulseRightX = lerp(highlightPulseRightX, highlightPulseRightTargetX, follow);
    highlightPulseRightY = lerp(highlightPulseRightY, highlightPulseRightTargetY, follow);
  }

  // 顔ワープの上に、視差(顔と前髪の間の立体感)とぷるぷるスケールを重ねる
  function highlightWarpPoint(x, y, filmWobbleValue = state.highlightFilmWobble) {
    const p0 = faceWarpPoint(x, y);
    // 立体感: 顔(0)と前髪(+11)の間の視差。顔より少し手前に動く。
    const ax = state.angleX * (state.angleStrength / 100);
    const ay = state.angleY * (state.angleStrength / 100);
    const shiftX = ax * 3;
    const shiftY = ay * 3;
    const p = { x: p0.x + shiftX, y: p0.y + shiftY };
    if (!highlightEyesWarped) return p;
    // 基準点(瞳中心)にも同じ視差シフトを足して、ぷるぷるのスケール基準を一致させる
    const le = { x: highlightEyesWarped[0].x + shiftX, y: highlightEyesWarped[0].y + shiftY };
    const re = { x: highlightEyesWarped[1].x + shiftX, y: highlightEyesWarped[1].y + shiftY };
    const useLeft =
      (p.x - le.x) * (p.x - le.x) + (p.y - le.y) * (p.y - le.y) <=
      (p.x - re.x) * (p.x - re.x) + (p.y - re.y) * (p.y - re.y);
    const eye = useLeft ? le : re;
    // 縦横独立のスケール(スクイズ&ストレッチでぷるぷる)
    const scaleX = useLeft ? highlightPulseLeftX : highlightPulseRightX;
    const scaleY = useLeft ? highlightPulseLeftY : highlightPulseRightY;
    const scaled = {
      x: eye.x + (p.x - eye.x) * scaleX,
      y: eye.y + (p.y - eye.y) * scaleY,
    };
    const film = computeHighlightFilmWobble(filmWobbleValue);
    if (film.amount <= 0) return scaled;
    // 中心軸を少しずらして回すことで、反射膜が瞳表面を薄く滑る感じを作る。
    const pivot = {
      x: eye.x + film.pivotX,
      y: eye.y + film.pivotY,
    };
    const dx = scaled.x - pivot.x;
    const dy = scaled.y - pivot.y;
    const warpedX = dx * film.scaleX + dy * film.shearX;
    const warpedY = dy * film.scaleY + dx * film.shearY;
    const cos = Math.cos(film.rotation);
    const sin = Math.sin(film.rotation);
    return {
      x: pivot.x + warpedX * cos - warpedY * sin + film.slideX,
      y: pivot.y + warpedX * sin + warpedY * cos + film.slideY,
    };
  }

  function tearLensWarpPoint(x, y) {
    const p = faceWarpPoint(x, y);
    if (state.eyeSetupMode || state.faceDepthSetupMode || !state.tearLensEnabled || state.tearLensStrength <= 0 || blinkClosed) return p;
    const centers = ensureEyeCenters();
    if (!centers) return p;
    const radius = eyeLensRadius();

    let bestIndex = -1;
    let bestR2 = Infinity;
    for (let i = 0; i < centers.length; i += 1) {
      const c = centers[i];
      const lensRot = eyeLensRotationForIndex(i);
      const cos = Math.cos(-lensRot);
      const sin = Math.sin(-lensRot);
      const rawX = x - c.x;
      const rawY = y - c.y;
      const localX = rawX * cos - rawY * sin;
      const localY = rawX * sin + rawY * cos;
      const r2 = (localX / radius.x) * (localX / radius.x) + (localY / radius.y) * (localY / radius.y);
      if (r2 < bestR2) {
        bestR2 = r2;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || bestR2 > 1) return p;

    const center = centers[bestIndex];
    const warpedCenter = highlightEyesWarped?.[bestIndex] || faceWarpPoint(center.x, center.y);
    const useLeft = bestIndex === 0;
    const lensRot = eyeLensRotationForIndex(bestIndex);
    const pulseX = (useLeft ? highlightPulseLeftX : highlightPulseRightX) - 1;
    const pulseY = (useLeft ? highlightPulseLeftY : highlightPulseRightY) - 1;
    // 50%で旧100%相当。100%まで上げた時の上限を広げる。
    const strength = state.tearLensStrength / 25;
    const mask = Math.pow(1 - bestR2, 2.2);
    const shimmer =
      Math.sin(TAU * (animationSeconds * 1.45 + bestIndex * 0.17)) * 0.006 +
      Math.sin(TAU * (animationSeconds * 2.35 + bestIndex * 0.31)) * 0.003;
    const sx = 1 + strength * mask * (pulseX * 0.32 + shimmer);
    const sy = 1 + strength * mask * (pulseY * 0.28 - shimmer * 0.45);
    const inCos = Math.cos(-lensRot);
    const inSin = Math.sin(-lensRot);
    const outCos = Math.cos(lensRot);
    const outSin = Math.sin(lensRot);
    const ox = p.x - warpedCenter.x;
    const oy = p.y - warpedCenter.y;
    const localX = ox * inCos - oy * inSin;
    const localY = ox * inSin + oy * inCos;
    const scaledX = localX * sx;
    const scaledY = localY * sy;
    return {
      x: warpedCenter.x + scaledX * outCos - scaledY * outSin,
      y: warpedCenter.y + scaledX * outSin + scaledY * outCos,
    };
  }

  function setAvatarSize(value) {
    state.avatarSize = Math.round(clamp(value, 30, 300));
    if (ui.avatarSizeInput) {
      ui.avatarSizeInput.value = String(state.avatarSize);
      const output = ui.avatarSizeInput.closest(".control-row")?.querySelector("output");
      if (output) output.textContent = `${state.avatarSize}%`;
    }
    updateCharacterWizardViewControls();
  }

  function setStatus(text) {
    if (ui.statusPill) ui.statusPill.textContent = text;
  }

  function setAudioError(message) {
    if (!ui.audioError) return;
    ui.audioError.hidden = !message;
    ui.audioError.textContent = message || "";
  }

  function setFaceTrackStatus(message, isError = false) {
    if (!ui.faceTrackStatus) return;
    ui.faceTrackStatus.textContent = message || "";
    ui.faceTrackStatus.className = isError ? "error" : "note";
  }

  function isFaceTrackingActive() {
    return Boolean(faceTracker?.isRunning());
  }

  function rangePreviewTarget(direction) {
    switch (direction) {
      case "left":
        return { x: -(state.rangeLeft / 100), y: 0 };
      case "right":
        return { x: state.rangeRight / 100, y: 0 };
      case "up":
        return { x: 0, y: -(state.rangeUp / 100) };
      case "down":
        return { x: 0, y: state.rangeDown / 100 };
      default:
        return { x: 0, y: 0 };
    }
  }

  function updateRangePreviewButtons() {
    const active = state.rangePreviewDirection;
    [
      [ui.testLeftButton, "left"],
      [ui.testRightButton, "right"],
      [ui.testUpButton, "up"],
      [ui.testDownButton, "down"],
    ].forEach(([button, direction]) => {
      button?.setAttribute("aria-pressed", String(active === direction));
    });
    ui.testCenterButton?.setAttribute("aria-pressed", "false");
  }

  function applyRangePreviewTarget(direction = state.rangePreviewDirection) {
    const target = rangePreviewTarget(direction);
    setPreviewTarget(target.x, target.y);
    state.angleX = state.targetX;
    state.angleY = state.targetY;
  }

  function setRangePreviewDirection(direction) {
    state.rangePreviewDirection = direction || null;
    if (state.rangePreviewDirection) {
      // 方向プレビュー開始時は全 setup ツールを解除する。再帰を避けるため resetPreview:false。
      setActiveSetupTool(null, { resetPreview: false });
    }
    applyRangePreviewTarget(state.rangePreviewDirection);
    updateRangePreviewButtons();
  }

  function refreshRangePreview(direction = state.rangePreviewDirection) {
    if (!direction || state.rangePreviewDirection !== direction) return;
    applyRangePreviewTarget(direction);
  }

  function updateMouseFollowButton() {
    if (!ui.mouseFollowButton) return;
    const idleLocksMouse = state.idleMotionEnabled;
    ui.mouseFollowButton.textContent = idleLocksMouse ? "マウス追従 停止中" : `マウス追従 ${state.mouseFollowEnabled ? "ON" : "OFF"}`;
    ui.mouseFollowButton.setAttribute("aria-pressed", String(!idleLocksMouse && state.mouseFollowEnabled));
    ui.mouseFollowButton.disabled = idleLocksMouse;
  }

  function applyFaceTrackingPose(pose) {
    if (!pose || interactionModeActive()) return;
    const x = clamp(pose.yaw || 0, -1, 1);
    const y = clamp(pose.pitch || 0, -1, 1);
    state.targetX = x * ((x < 0 ? state.rangeLeft : state.rangeRight) / 100);
    state.targetY = y * ((y < 0 ? state.rangeUp : state.rangeDown) / 100);

    const now = performance.now();
    if (now - lastFaceTrackUiUpdate > 250) {
      lastFaceTrackUiUpdate = now;
      setFaceTrackStatus(`顔トラッキング: ON  顔向き ${Math.round(x * 100)}, ${Math.round(y * 100)}`);
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`画像を読み込めません: ${src}`));
      image.src = encodeURI(src);
    });
  }

  async function loadAssets() {
    setStatus("loading");
    const packageImageVersionAtStart = avatarPackageImageVersion;
    try {
      const entries = Object.entries(ASSETS);
      const results = await Promise.allSettled(
        entries.map(async ([key, src]) => [key, await loadImage(src)])
      );
      const missing = [];
      const loadedImages = {};
      let expectedAvatarSize = null;
      for (let i = 0; i < results.length; i += 1) {
        const r = results[i];
        if (r.status === "fulfilled") {
          const [key, image] = r.value;
          expectedAvatarSize = validateAvatarImageDimensions(image, key, expectedAvatarSize);
          loadedImages[key] = image;
        } else {
          missing.push(entries[i][0]);
        }
      }
      if (avatarPackageImageVersion !== packageImageVersionAtStart) {
        // 起動直後に .purupuru を読み込んだ場合、遅れて完了した初期素材ロードで
        // パッケージ内画像を上書きしない。
        imagesReady = true;
        setStatus("ready");
        return;
      }
      if (missing.length > 0) {
        loadError = `必須素材を読み込めません: ${missing.join(", ")}`;
        setStatus("error");
        return;
      }
      applyLoadedAvatarImages(loadedImages);
      try {
        await applyAllSettingsPayload(await loadDefaultSettingsPayload(), "デフォルト設定を読み込みました。");
      } catch (error) {
        console.warn("デフォルト設定の読み込みをスキップしました。", error);
        setEditStatus("デフォルト設定を読み込めなかったため、基本設定で起動しました。");
      }
      setStatus("ready");
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error);
      setStatus("error");
    }
  }

  function expressionKey() {
    const eye = blinkClosed ? "eyesClosed" : "eyesOpen";
    const mouth = mouthState === 2 ? "MouthOpen" : mouthState === 1 ? "MouthHalf" : "MouthClosed";
    return `${eye}${mouth}`;
  }

  function resizeCanvas() {
    const dpr = OBS_MODE ? 1 : Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    stage.w = w;
    stage.h = h;
    stage.dpr = dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updatePointerTarget(clientX, clientY) {
    if (state.idleMotionEnabled || interactionModeActive()) return;
    const cx = stage.w * 0.5;
    const cy = stage.h * 0.48;
    const now = performance.now();
    if (!panelRectCache || now - panelRectCacheAt > 250) {
      panelRectCache = document.querySelector(".control-card")?.getBoundingClientRect() || null;
      panelRectCacheAt = now;
    }
    const panelRect = panelRectCache;
    const rightLimit = panelRect && panelRect.left > cx ? panelRect.left - 16 : stage.w;
    const leftRange = Math.max(180, cx * 0.92);
    const rightRange = Math.max(180, (rightLimit - cx) * 0.92);
    const verticalRange = Math.max(180, Math.min(stage.w, stage.h) * 0.25);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const rawX = clamp(dx / (dx >= 0 ? rightRange : leftRange), -1, 1);
    const rawY = clamp((dy / verticalRange) * 1.18, -1, 1);
    state.targetX = rawX * ((rawX < 0 ? state.rangeLeft : state.rangeRight) / 100);
    state.targetY = rawY * ((rawY < 0 ? state.rangeUp : state.rangeDown) / 100);
  }

  function setPreviewTarget(x, y) {
    state.targetX = clamp(x, -1.6, 1.6);
    state.targetY = clamp(y, -1.6, 1.6);
  }

  function idleMotionEase(t) {
    const x = clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function idleMotionTargetFromRaw(rawX, rawY) {
    return {
      x: clamp(rawX * ((rawX < 0 ? state.rangeLeft : state.rangeRight) / 100) * IDLE_MOTION_RANGE_BOOST, -1.1, 1.1),
      y: clamp(rawY * ((rawY < 0 ? state.rangeUp : state.rangeDown) / 100) * IDLE_MOTION_RANGE_BOOST, -0.9, 0.9),
    };
  }

  function randomIdleMotionTarget() {
    const roll = Math.random();
    // 「ほぼ静止」「正面戻り」「左右へ視線を流す」を混ぜる。
    // 以前の値は小さすぎて、デフォルト可動範囲では動いていないように見えたため、
    // マウスで顔をゆっくり動かしていると分かる程度まで振れ幅を広げる。
    if (roll < 0.12) return idleMotionTargetFromRaw(randomBetween(-0.18, 0.18), randomBetween(-0.12, 0.12));
    if (roll < 0.18) return idleMotionTargetFromRaw(0, 0);
    const sideBias = Math.random() < 0.5 ? -1 : 1;
    const rawX = sideBias * randomBetween(0.55, 1.0);
    const rawY = randomBetween(-0.45, 0.55);
    return idleMotionTargetFromRaw(rawX, rawY);
  }

  function resetIdleMotionPlan(nowMs = performance.now(), immediateMove = false) {
    if (immediateMove) {
      const target = randomIdleMotionTarget();
      idleMotionPlan = {
        phase: "move",
        startedAt: nowMs,
        duration: randomBetween(650, 1200),
        fromX: state.targetX,
        fromY: state.targetY,
        toX: target.x,
        toY: target.y,
      };
      return;
    }
    idleMotionPlan = {
      phase: "hold",
      startedAt: nowMs,
      duration: randomBetween(350, 900),
      fromX: state.targetX,
      fromY: state.targetY,
      toX: state.targetX,
      toY: state.targetY,
    };
  }

  function beginNextIdleMotionPhase(nowMs) {
    const fromX = state.targetX;
    const fromY = state.targetY;
    const shouldHold = Math.random() < 0.18;
    if (shouldHold) {
      idleMotionPlan = {
        phase: "hold",
        startedAt: nowMs,
        duration: randomBetween(400, 1300),
        fromX,
        fromY,
        toX: fromX,
        toY: fromY,
      };
      return;
    }
    const target = randomIdleMotionTarget();
    idleMotionPlan = {
      phase: "move",
      startedAt: nowMs,
      duration: randomBetween(900, 2400),
      fromX,
      fromY,
      toX: target.x,
      toY: target.y,
    };
  }

  function updateIdleMotionTarget(nowMs) {
    if (!state.idleMotionEnabled) {
      idleMotionPlan = null;
      return;
    }
    if (isFaceTrackingActive()) return;
    if (interactionModeActive()) return;
    if (!idleMotionPlan) resetIdleMotionPlan(nowMs);

    const elapsed = nowMs - idleMotionPlan.startedAt;
    if (elapsed >= idleMotionPlan.duration) {
      beginNextIdleMotionPhase(nowMs);
    }
    if (idleMotionPlan.phase === "hold") {
      state.targetX = idleMotionPlan.toX;
      state.targetY = idleMotionPlan.toY;
      return;
    }
    const t = idleMotionEase((nowMs - idleMotionPlan.startedAt) / Math.max(1, idleMotionPlan.duration));
    state.targetX = lerp(idleMotionPlan.fromX, idleMotionPlan.toX, t);
    state.targetY = lerp(idleMotionPlan.fromY, idleMotionPlan.toY, t);
  }

  function affineFromTriangles(src, dst) {
    const [s0, s1, s2] = src;
    const [d0, d1, d2] = dst;
    const den =
      s0.x * (s1.y - s2.y) +
      s1.x * (s2.y - s0.y) +
      s2.x * (s0.y - s1.y);
    if (Math.abs(den) < 0.00001) return null;
    const a =
      (d0.x * (s1.y - s2.y) +
        d1.x * (s2.y - s0.y) +
        d2.x * (s0.y - s1.y)) /
      den;
    const b =
      (d0.y * (s1.y - s2.y) +
        d1.y * (s2.y - s0.y) +
        d2.y * (s0.y - s1.y)) /
      den;
    const c =
      (d0.x * (s2.x - s1.x) +
        d1.x * (s0.x - s2.x) +
        d2.x * (s1.x - s0.x)) /
      den;
    const d =
      (d0.y * (s2.x - s1.x) +
        d1.y * (s0.x - s2.x) +
        d2.y * (s1.x - s0.x)) /
      den;
    const e =
      (d0.x * (s1.x * s2.y - s2.x * s1.y) +
        d1.x * (s2.x * s0.y - s0.x * s2.y) +
        d2.x * (s0.x * s1.y - s1.x * s0.y)) /
      den;
    const f =
      (d0.y * (s1.x * s2.y - s2.x * s1.y) +
        d1.y * (s2.x * s0.y - s0.x * s2.y) +
        d2.y * (s0.x * s1.y - s1.x * s0.y)) /
      den;
    return { a, b, c, d, e, f };
  }

  function drawTexturedTriangle(targetCtx, image, srcTri, dstTri) {
    const m = affineFromTriangles(srcTri, dstTri);
    if (!m) return;
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.moveTo(dstTri[0].x, dstTri[0].y);
    targetCtx.lineTo(dstTri[1].x, dstTri[1].y);
    targetCtx.lineTo(dstTri[2].x, dstTri[2].y);
    targetCtx.closePath();
    targetCtx.clip();
    targetCtx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    targetCtx.drawImage(image, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
    targetCtx.restore();
  }

  const MESH_GPU_BUFFER_USAGE_COPY_DST = 0x0008;
  const MESH_GPU_BUFFER_USAGE_VERTEX = 0x0020;
  const MESH_GPU_BUFFER_USAGE_UNIFORM = 0x0040;
  const MESH_GPU_BUFFER_USAGE_STORAGE = 0x0080;
  const MESH_GPU_TEXTURE_USAGE_COPY_DST = 0x0002;
  const MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING = 0x0004;
  const MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT = 0x0010;
  const MESH_TEXTURE_CACHE_LIMIT = 48;
  const MESH_FACE_UNIFORM_VEC4_COUNT = 24;
  const MESH_FACE_CONTROL_POINT_COUNT = 25;
  const MESH_HAIR_UNIFORM_VEC4_COUNT = 8;
  const MESH_HAIR_SPRING_VEC4_COUNT = HAIR_SPRING_BUCKETS * 3;
  const MESH_HAIR_BUNDLE_DEF_VEC4_COUNT = HAIR_BUNDLE_DEFS.length * 2;
  const MESH_HAIR_BUNDLE_SAMPLE_VEC4_COUNT = HAIR_BUNDLE_DEFS.length * HAIR_SPRING_BUCKETS * 3;
  const MESH_WEBGPU_SHADER = /* wgsl */ `
    struct MeshUniforms {
      resolution: vec2f,
      stageResolution: vec2f,
      stageTransform0: vec4f,
      stageTransform1: vec4f,
    };

    struct VertexOut {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @group(0) @binding(0) var<uniform> uniforms: MeshUniforms;
    @group(0) @binding(1) var imageSampler: sampler;
    @group(0) @binding(2) var imageTexture: texture_2d<f32>;

    struct FaceUniforms {
      p: array<vec4f, 24>,
    };

    @group(0) @binding(3) var<uniform> face: FaceUniforms;
    @group(0) @binding(4) var<storage, read> faceControlPoints: array<vec2f>;

    struct HairUniforms {
      p: array<vec4f, 8>,
    };

    @group(0) @binding(5) var<storage, read> faceRootControlPoints: array<vec2f>;
    @group(0) @binding(6) var<uniform> hair: HairUniforms;
    @group(0) @binding(7) var<storage, read> hairSpringSamples: array<vec4f>;
    @group(0) @binding(8) var<storage, read> hairBundleDefs: array<vec4f>;
    @group(0) @binding(9) var<storage, read> hairBundleSamples: array<vec4f>;

    struct HairSpringSample {
      anglePos: f32,
      anglePosY: f32,
      waveX: f32,
      waveY: f32,
      headPosX: f32,
      headPosY: f32,
      headVelX: f32,
      headVelY: f32,
      angleVel: f32,
      angleVelY: f32,
      stretchX: f32,
      stretchY: f32,
    };

    struct HairBundleMotion {
      spring: HairSpringSample,
      mask: f32,
      motionScale: f32,
      edgeScale: f32,
    };

    fn clamp01(value: f32) -> f32 {
      return clamp(value, 0.0, 1.0);
    }

    fn lerp2(a: vec2f, b: vec2f, t: f32) -> vec2f {
      return a + (b - a) * t;
    }

    fn faceFeatureMask(point: vec2f, center: vec2f, radius: vec2f) -> f32 {
      let delta = (point - center) / max(radius, vec2f(1.0, 1.0));
      return 1.0 - smoothstep(0.72, 1.06, length(delta));
    }

    fn faceHeadMask(point: vec2f) -> f32 {
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let topY = face.p[2].z;
      let bottomY = face.p[2].w;
      let u = (point.x - metricsCenter.x) / max(1.0, radius.x);
      let v = (point.y - metricsCenter.y) / max(1.0, radius.y);
      let dist = sqrt(u * u * 0.94 + v * v * 1.04);
      let ellipse = 1.0 - smoothstep(0.74, 1.14, dist);
      let topFadeEnd = topY + radius.y * 0.22;
      let bottomFadeStart = bottomY - radius.y * 0.18;
      let vertical = smoothstep(topY, topFadeEnd, point.y) *
        (1.0 - smoothstep(bottomFadeStart, bottomY, point.y));
      return clamp01(ellipse * vertical);
    }

    fn faceDepthMap(point: vec2f, mask: f32) -> f32 {
      if (mask <= 0.001) {
        return 0.0;
      }
      let faceCenter = face.p[1].xy;
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let eyeDistance = face.p[3].x;
      let leftEye = face.p[4].xy;
      let rightEye = face.p[4].zw;
      let nose = face.p[5].xy;
      let mouth = face.p[5].zw;
      let chin = face.p[6].xy;
      let u = clamp((point.x - metricsCenter.x) / max(1.0, radius.x), -1.35, 1.35);
      let v = clamp((point.y - metricsCenter.y) / max(1.0, radius.y), -1.3, 1.3);
      let absU = abs(u);
      let faceVertical = 1.0 - smoothstep(1.02, 1.3, abs(v));
      let roundness = clamp01(1.0 - absU * 0.86 - abs(v) * 0.24);
      let centerRidge = (1.0 - smoothstep(0.08, 0.48, absU)) * faceVertical;
      let eyeDepth = max(
        faceFeatureMask(point, leftEye, vec2f(max(54.0, eyeDistance * 0.43), max(38.0, eyeDistance * 0.26))),
        faceFeatureMask(point, rightEye, vec2f(max(54.0, eyeDistance * 0.43), max(38.0, eyeDistance * 0.26))),
      ) * 0.48;
      let cheekOffsetX = max(90.0, eyeDistance * 0.54);
      let cheekY = mix(nose.y, mouth.y, 0.72);
      let cheekDepth = max(
        faceFeatureMask(point, vec2f(faceCenter.x - cheekOffsetX, cheekY), vec2f(max(76.0, eyeDistance * 0.52), max(72.0, eyeDistance * 0.45))),
        faceFeatureMask(point, vec2f(faceCenter.x + cheekOffsetX, cheekY), vec2f(max(76.0, eyeDistance * 0.52), max(72.0, eyeDistance * 0.45))),
      ) * 0.38;
      let noseDepth = faceFeatureMask(
        point,
        nose,
        vec2f(max(48.0, eyeDistance * 0.34), max(70.0, eyeDistance * 0.58)),
      );
      let mouthDepth = faceFeatureMask(
        point,
        mouth,
        vec2f(max(72.0, eyeDistance * 0.49), max(48.0, eyeDistance * 0.3)),
      ) * 0.78;
      let chinDepth = faceFeatureMask(
        point,
        chin,
        vec2f(max(96.0, eyeDistance * 0.62), max(58.0, eyeDistance * 0.38)),
      ) * 0.66;
      let shallowContour = (0.08 + 0.2 * roundness) * mask;
      return clamp01(max(max(max(shallowContour, centerRidge * 0.42), max(eyeDepth, cheekDepth)), max(max(noseDepth, mouthDepth), chinDepth)) * mask);
    }

    fn deformerWarp(point: vec2f) -> vec2f {
      let crop = face.p[0].xy;
      let gx = clamp((point.x / max(1.0, crop.x)) * 4.0, 0.0, 4.0);
      let gy = clamp((point.y / max(1.0, crop.y)) * 4.0, 0.0, 4.0);
      let col = min(3u, u32(max(0.0, floor(gx))));
      let row = min(3u, u32(max(0.0, floor(gy))));
      let tx = gx - f32(col);
      let ty = gy - f32(row);
      let i00 = row * 5u + col;
      let p00 = faceControlPoints[i00];
      let p10 = faceControlPoints[i00 + 1u];
      let p01 = faceControlPoints[i00 + 5u];
      let p11 = faceControlPoints[i00 + 6u];
      return lerp2(lerp2(p00, p10, tx), lerp2(p01, p11, tx), ty);
    }

    fn faceRootDeformerWarp(point: vec2f) -> vec2f {
      let crop = face.p[0].xy;
      let gx = clamp((point.x / max(1.0, crop.x)) * 4.0, 0.0, 4.0);
      let gy = clamp((point.y / max(1.0, crop.y)) * 4.0, 0.0, 4.0);
      let col = min(3u, u32(max(0.0, floor(gx))));
      let row = min(3u, u32(max(0.0, floor(gy))));
      let tx = gx - f32(col);
      let ty = gy - f32(row);
      let i00 = row * 5u + col;
      let p00 = faceRootControlPoints[i00];
      let p10 = faceRootControlPoints[i00 + 1u];
      let p01 = faceRootControlPoints[i00 + 5u];
      let p11 = faceRootControlPoints[i00 + 6u];
      return lerp2(lerp2(p00, p10, tx), lerp2(p01, p11, tx), ty);
    }

    fn applyFaceFeatureTurnWarp(source: vec2f, point: vec2f, amount: f32, sign: f32, mask: f32, depth: f32) -> vec2f {
      let eyeDistance = face.p[3].x;
      let metricScale = face.p[3].y;
      let leftEye = face.p[4].xy;
      let rightEye = face.p[4].zw;
      let nose = face.p[5].xy;
      let mouth = face.p[5].zw;
      let chin = face.p[6].xy;
      let eyeMid = face.p[6].zw;
      let mouthMotion = face.p[3].w;
      let noseMask = faceFeatureMask(source, nose, vec2f(max(30.0, eyeDistance * 0.18), max(36.0, eyeDistance * 0.23))) * mask;
      let noseBridgeMask = faceFeatureMask(source, vec2f(nose.x, mix(eyeMid.y, nose.y, 0.46)), vec2f(max(36.0, eyeDistance * 0.21), max(56.0, eyeDistance * 0.34))) * mask;
      let eyeMask = max(
        faceFeatureMask(source, leftEye, vec2f(max(56.0, eyeDistance * 0.4), max(34.0, eyeDistance * 0.24))),
        faceFeatureMask(source, rightEye, vec2f(max(56.0, eyeDistance * 0.4), max(34.0, eyeDistance * 0.24))),
      ) * mask;
      let mouthMask = faceFeatureMask(source, mouth, vec2f(max(54.0, eyeDistance * 0.38), max(34.0, eyeDistance * 0.22))) * mask;
      let chinMask = faceFeatureMask(source, chin, vec2f(max(66.0, eyeDistance * 0.46), max(42.0, eyeDistance * 0.28))) * mask;
      let mouthTurnDampen = 1.0 - clamp01(mouthMotion) * 0.32;
      var outPoint = point;
      outPoint.x += sign * amount * metricScale *
        (noseMask * 60.0 + noseBridgeMask * 10.0 + eyeMask * 2.4 + mouthMask * 7.0 * mouthTurnDampen + chinMask * 6.0);
      outPoint.y += amount * metricScale * (noseMask * 9.0 + noseBridgeMask * 1.2) +
        amount * depth * metricScale * (mouthMask * 0.45 + chinMask * 0.65);
      return outPoint;
    }

    fn faceTurnWarp(source: vec2f, point: vec2f) -> vec2f {
      let depthStrength = face.p[7].z;
      let verticalDepth = face.p[7].w;
      let yaw = face.p[7].x;
      let yawAmount = min(1.25, abs(yaw));
      let amount = yawAmount * depthStrength;
      let verticalAmount = yawAmount * verticalDepth * (0.55 + depthStrength * 0.45);
      if (amount <= 0.001 && verticalAmount <= 0.001) {
        return point;
      }
      let sign = select(1.0, -1.0, yaw < 0.0);
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let eyeDistance = face.p[3].x;
      let eyeMid = face.p[6].zw;
      let mouth = face.p[5].zw;
      let chin = face.p[6].xy;
      let u = clamp((source.x - metricsCenter.x) / max(1.0, radius.x), -1.35, 1.35);
      let mask = faceHeadMask(source);
      if (mask <= 0.001) {
        return point;
      }
      let depth = faceDepthMap(source, mask);
      let lower = smoothstep(mouth.y - eyeDistance * 0.5, chin.y, source.y) * mask;
      let upper = (1.0 - smoothstep(eyeMid.y - eyeDistance * 1.05, eyeMid.y - eyeDistance * 0.2, source.y)) * mask;
      let featureDepthBlend = smoothstep(0.01, 0.15, depthStrength);
      let localAmount = min(0.46, yawAmount * featureDepthBlend * (0.2 + depthStrength * 0.8));
      var outPoint = point;
      outPoint.y += sign * verticalAmount * u * mask * (8.0 + depth * 12.0 + lower * 5.0 - upper * 4.0);
      return applyFaceFeatureTurnWarp(source, outPoint, localAmount, sign, mask, depth);
    }

    fn diagonalFaceWarp(source: vec2f, point: vec2f) -> vec2f {
      if (face.p[8].x <= 0.0) {
        return point;
      }
      let yaw = face.p[7].x;
      let pitch = face.p[7].y;
      let depthStrength = face.p[7].z;
      let yawBlend = smoothstep(0.12, 0.82, abs(yaw));
      let pitchBlend = smoothstep(0.05, 0.38, abs(pitch));
      let depthBlend = 0.68 + min(1.0, depthStrength) * 0.28;
      let amount = yawBlend * pitchBlend * depthBlend;
      if (amount <= 0.001) {
        return point;
      }
      let mask = faceHeadMask(source);
      if (mask <= 0.001) {
        return point;
      }
      let sign = select(1.0, -1.0, yaw < 0.0);
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let eyeDistance = face.p[3].x;
      let metricScale = face.p[3].y;
      let leftEye = face.p[4].xy;
      let rightEye = face.p[4].zw;
      let mouth = face.p[5].zw;
      let chin = face.p[6].xy;
      let eyeMid = face.p[6].zw;
      let u = clamp((source.x - metricsCenter.x) / max(1.0, radius.x), -1.35, 1.35);
      let depth = faceDepthMap(source, mask);
      let sideFromMouth = clamp((source.x - mouth.x) / max(140.0, eyeDistance * 0.94), -1.0, 1.0);
      let eyeMask = max(
        faceFeatureMask(source, leftEye, vec2f(max(60.0, eyeDistance * 0.44), max(40.0, eyeDistance * 0.27))),
        faceFeatureMask(source, rightEye, vec2f(max(60.0, eyeDistance * 0.44), max(40.0, eyeDistance * 0.27))),
      ) * mask;
      let mouthMask = faceFeatureMask(source, vec2f(mouth.x, mouth.y + 4.0 * metricScale), vec2f(max(78.0, eyeDistance * 0.54), max(50.0, eyeDistance * 0.33))) * mask;
      let chinMask = faceFeatureMask(source, vec2f(chin.x, chin.y - 2.0 * metricScale), vec2f(max(100.0, eyeDistance * 0.68), max(66.0, eyeDistance * 0.44))) * mask;
      let cheekOffsetX = max(88.0, eyeDistance * 0.52);
      let cheekOffsetY = max(30.0, eyeDistance * 0.18);
      let cheekMask = max(
        faceFeatureMask(source, vec2f(mouth.x - cheekOffsetX, mouth.y + cheekOffsetY), vec2f(max(82.0, eyeDistance * 0.54), max(72.0, eyeDistance * 0.48))),
        faceFeatureMask(source, vec2f(mouth.x + cheekOffsetX, mouth.y + cheekOffsetY), vec2f(max(82.0, eyeDistance * 0.54), max(72.0, eyeDistance * 0.48))),
      ) * mask;
      let lowerBand = smoothstep(mouth.y - eyeDistance * 0.1, chin.y + eyeDistance * 0.28, source.y) *
        (1.0 - smoothstep(chin.y + eyeDistance * 0.3, chin.y + eyeDistance * 0.86, source.y)) *
        (1.0 - smoothstep(0.86, 1.26, abs((source.x - mouth.x) / max(170.0, eyeDistance * 1.12)))) * mask;
      let upperBand = (1.0 - smoothstep(eyeMid.y - eyeDistance * 0.68, eyeMid.y + eyeDistance * 0.24, source.y)) * mask;
      var outPoint = point;
      if (pitch > 0.0) {
        let mouthGuard = 1.0 - mouthMask * 0.82;
        outPoint.y += amount * metricScale * (chinMask * 6.2 + cheekMask * 2.1 + lowerBand * 2.4 * mouthGuard);
        outPoint.x -= sideFromMouth * amount * metricScale * (chinMask * 1.9 + lowerBand * 0.7 * mouthGuard);
        outPoint.x += sideFromMouth * amount * metricScale * cheekMask * 0.85;
        outPoint.y -= amount * metricScale * eyeMask * 1.25;
        outPoint.y += sign * amount * metricScale * u * lowerBand * 0.85 * mouthGuard;
      } else {
        let up = amount * 0.58;
        outPoint.y -= up * metricScale * (upperBand * (1.8 + depth * 0.8) + eyeMask * 0.4);
        outPoint.y += up * metricScale * chinMask * 0.7;
      }
      return outPoint;
    }

    fn mouthPuniWarp(source: vec2f, point: vec2f) -> vec2f {
      let amount = face.p[9].x;
      if (amount <= 0.001) {
        return point;
      }
      let eyeDistance = face.p[3].x;
      let metricScale = face.p[3].y;
      let mouthMotion = face.p[3].w;
      let mouth = face.p[5].zw;
      let chin = face.p[6].xy;
      let cheekOffsetX = max(88.0, eyeDistance * 0.52);
      let cheekOffsetY = max(30.0, eyeDistance * 0.19);
      let mouthMask = faceFeatureMask(source, vec2f(mouth.x, mouth.y + 8.0 * metricScale), vec2f(max(82.0, eyeDistance * 0.55), max(52.0, eyeDistance * 0.34)));
      let chinMask = faceFeatureMask(source, vec2f(chin.x, chin.y - 4.0 * metricScale), vec2f(max(104.0, eyeDistance * 0.7), max(64.0, eyeDistance * 0.43)));
      let leftCheekMask = faceFeatureMask(source, vec2f(mouth.x - cheekOffsetX, mouth.y + cheekOffsetY), vec2f(max(82.0, eyeDistance * 0.54), max(70.0, eyeDistance * 0.46)));
      let rightCheekMask = faceFeatureMask(source, vec2f(mouth.x + cheekOffsetX, mouth.y + cheekOffsetY), vec2f(max(82.0, eyeDistance * 0.54), max(70.0, eyeDistance * 0.46)));
      let cheekMask = max(leftCheekMask, rightCheekMask);
      let lowerBand = smoothstep(mouth.y - eyeDistance * 0.12, chin.y + eyeDistance * 0.24, source.y) *
        (1.0 - smoothstep(chin.y + eyeDistance * 0.38, chin.y + eyeDistance * 0.9, source.y)) *
        (1.0 - smoothstep(0.82, 1.22, abs((source.x - mouth.x) / max(160.0, eyeDistance * 1.06))));
      let side = clamp((source.x - mouth.x) / max(130.0, eyeDistance * 0.86), -1.0, 1.0);
      let openStretch = clamp01(mouthMotion);
      var outPoint = point;
      outPoint.y += amount * metricScale * (mouthMask * 1.8 + chinMask * 6.2 + cheekMask * 2.0 + lowerBand * 3.8);
      outPoint.x += side * amount * metricScale * (cheekMask * 2.6 + lowerBand * 1.1);
      outPoint.y += lowerBand * openStretch * metricScale * 1.6;
      return outPoint;
    }

    fn faceWarp(source: vec2f) -> vec2f {
      let crop = face.p[0].xy;
      let faceCenter = face.p[1].xy;
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let voice = face.p[3].z;
      let nx = (source.x - faceCenter.x) / max(1.0, crop.x * 0.5);
      let ny = (source.y - faceCenter.y) / max(1.0, crop.y * 0.5);
      let dome = clamp01(1.0 - abs(nx) * 0.42 - abs(ny) * 0.28);
      let lowerMask = clamp01((source.y - (metricsCenter.y - radius.y * 0.38)) / max(1.0, radius.y * 0.82));
      var point = deformerWarp(source);
      point = faceTurnWarp(source, point);
      point = diagonalFaceWarp(source, point);
      point.x += nx * voice * 3.5 * dome;
      point.y += -abs(nx) * voice * 1.5 * dome + lowerMask * voice * 2.5;
      return mouthPuniWarp(source, point);
    }

    fn tearLensWarp(source: vec2f, point: vec2f) -> vec2f {
      if (face.p[10].x <= 0.0) {
        return point;
      }
      let radius = face.p[10].zw;
      let leftCenter = face.p[11].xy;
      let rightCenter = face.p[11].zw;
      let leftRot = face.p[13];
      let rightRot = face.p[14];
      let leftRaw = source - leftCenter;
      let rightRaw = source - rightCenter;
      let leftLocal = vec2f(leftRaw.x * leftRot.x - leftRaw.y * leftRot.y, leftRaw.x * leftRot.y + leftRaw.y * leftRot.x);
      let rightLocal = vec2f(rightRaw.x * rightRot.x - rightRaw.y * rightRot.y, rightRaw.x * rightRot.y + rightRaw.y * rightRot.x);
      let leftR2 = (leftLocal.x / max(1.0, radius.x)) * (leftLocal.x / max(1.0, radius.x)) +
        (leftLocal.y / max(1.0, radius.y)) * (leftLocal.y / max(1.0, radius.y));
      let rightR2 = (rightLocal.x / max(1.0, radius.x)) * (rightLocal.x / max(1.0, radius.x)) +
        (rightLocal.y / max(1.0, radius.y)) * (rightLocal.y / max(1.0, radius.y));
      let useLeft = leftR2 <= rightR2;
      let bestR2 = select(rightR2, leftR2, useLeft);
      if (bestR2 > 1.0) {
        return point;
      }
      let warpedCenter = select(face.p[12].zw, face.p[12].xy, useLeft);
      let rot = select(rightRot, leftRot, useLeft);
      let pulse = select(face.p[15].zw, face.p[15].xy, useLeft);
      let shimmer = select(face.p[16].y, face.p[16].x, useLeft);
      let strength = face.p[10].y;
      let mask = pow(max(0.0, 1.0 - bestR2), 2.2);
      let sx = 1.0 + strength * mask * (pulse.x * 0.32 + shimmer);
      let sy = 1.0 + strength * mask * (pulse.y * 0.28 - shimmer * 0.45);
      let offset = point - warpedCenter;
      let local = vec2f(offset.x * rot.x - offset.y * rot.y, offset.x * rot.y + offset.y * rot.x);
      let scaled = vec2f(local.x * sx, local.y * sy);
      return warpedCenter + vec2f(scaled.x * rot.z - scaled.y * rot.w, scaled.x * rot.w + scaled.y * rot.z);
    }

    fn faceRigidWarp(source: vec2f) -> vec2f {
      var point = faceRootDeformerWarp(source);
      point = faceTurnWarp(source, point);
      return diagonalFaceWarp(source, point);
    }

    fn emptyHairSpringSample() -> HairSpringSample {
      var sample: HairSpringSample;
      sample.anglePos = 0.0;
      sample.anglePosY = 0.0;
      sample.waveX = 0.0;
      sample.waveY = 0.0;
      sample.headPosX = 0.0;
      sample.headPosY = 0.0;
      sample.headVelX = 0.0;
      sample.headVelY = 0.0;
      sample.angleVel = 0.0;
      sample.angleVelY = 0.0;
      sample.stretchX = 0.0;
      sample.stretchY = 0.0;
      return sample;
    }

    fn hairSpringSampleAt(baseIndex: u32) -> HairSpringSample {
      let a = hairSpringSamples[baseIndex];
      let b = hairSpringSamples[baseIndex + 1u];
      let c = hairSpringSamples[baseIndex + 2u];
      var sample: HairSpringSample;
      sample.anglePos = a.x;
      sample.anglePosY = a.y;
      sample.waveX = a.z;
      sample.waveY = a.w;
      sample.headPosX = b.x;
      sample.headPosY = b.y;
      sample.headVelX = b.z;
      sample.headVelY = b.w;
      sample.angleVel = c.x;
      sample.angleVelY = c.y;
      sample.stretchX = c.z;
      sample.stretchY = c.w;
      return sample;
    }

    fn hairBundleSampleAt(bundleIndex: u32, bucket: u32) -> HairSpringSample {
      let baseIndex = (bundleIndex * 5u + bucket) * 3u;
      let a = hairBundleSamples[baseIndex];
      let b = hairBundleSamples[baseIndex + 1u];
      let c = hairBundleSamples[baseIndex + 2u];
      var sample: HairSpringSample;
      sample.anglePos = a.x;
      sample.anglePosY = a.y;
      sample.waveX = a.z;
      sample.waveY = a.w;
      sample.headPosX = b.x;
      sample.headPosY = b.y;
      sample.headVelX = b.z;
      sample.headVelY = b.w;
      sample.angleVel = c.x;
      sample.angleVelY = c.y;
      sample.stretchX = c.z;
      sample.stretchY = c.w;
      return sample;
    }

    fn mixHairSpringSample(a: HairSpringSample, b: HairSpringSample, t: f32) -> HairSpringSample {
      var sample: HairSpringSample;
      sample.anglePos = mix(a.anglePos, b.anglePos, t);
      sample.anglePosY = mix(a.anglePosY, b.anglePosY, t);
      sample.waveX = mix(a.waveX, b.waveX, t);
      sample.waveY = mix(a.waveY, b.waveY, t);
      sample.headPosX = mix(a.headPosX, b.headPosX, t);
      sample.headPosY = mix(a.headPosY, b.headPosY, t);
      sample.headVelX = mix(a.headVelX, b.headVelX, t);
      sample.headVelY = mix(a.headVelY, b.headVelY, t);
      sample.angleVel = mix(a.angleVel, b.angleVel, t);
      sample.angleVelY = mix(a.angleVelY, b.angleVelY, t);
      sample.stretchX = mix(a.stretchX, b.stretchX, t);
      sample.stretchY = mix(a.stretchY, b.stretchY, t);
      return sample;
    }

    fn sampleHairSpring(n: f32) -> HairSpringSample {
      let nn = clamp(n, 0.0, 1.0) * 4.0;
      let i0 = min(3u, u32(floor(nn)));
      let f = nn - f32(i0);
      return mixHairSpringSample(hairSpringSampleAt(i0 * 3u), hairSpringSampleAt((i0 + 1u) * 3u), f);
    }

    fn sampleHairBundleSpring(bundleIndex: u32, n: f32) -> HairSpringSample {
      let nn = clamp(n, 0.0, 1.0) * 4.0;
      let i0 = min(3u, u32(floor(nn)));
      let f = nn - f32(i0);
      return mixHairSpringSample(hairBundleSampleAt(bundleIndex, i0), hairBundleSampleAt(bundleIndex, i0 + 1u), f);
    }

    fn hairRootTipMotionMask(source: vec2f) -> f32 {
      let isFront = hair.p[0].z;
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let topY = face.p[2].z;
      let rootY = topY + radius.y * mix(0.18, 0.26, isFront);
      let freeY = metricsCenter.y + radius.y * mix(1.04, 0.68, isFront);
      let vertical = smoothstep(rootY, freeY, source.y);
      let sideAmount = smoothstep(radius.x * 0.62, radius.x * 1.25, abs(source.x - metricsCenter.x));
      let sideUnlockY = smoothstep(topY + radius.y * 0.28, metricsCenter.y + radius.y * 0.62, source.y);
      let sideUnlock = sideAmount * sideUnlockY * mix(0.18, 0.28, isFront);
      return clamp(vertical + sideUnlock, 0.0, 1.0);
    }

    fn hairCrownRootLockMask(source: vec2f) -> f32 {
      if (hair.p[3].x <= 0.0) {
        return 0.0;
      }
      let metricsCenter = face.p[1].zw;
      let radius = face.p[2].xy;
      let topY = face.p[2].z;
      let u = abs((source.x - metricsCenter.x) / max(1.0, radius.x));
      let vertical = 1.0 - smoothstep(topY + radius.y * 0.18, topY + radius.y * 0.58, source.y);
      let center = 1.0 - smoothstep(0.22, 0.92, u);
      return clamp(vertical * (0.45 + center * 0.55), 0.0, 1.0);
    }

    fn hairBundleInfluence(source: vec2f, bundleIndex: u32) -> vec4f {
      let def0 = hairBundleDefs[bundleIndex * 2u];
      let def1 = hairBundleDefs[bundleIndex * 2u + 1u];
      if (def1.z <= 0.0) {
        return vec4f(0.0);
      }
      let root = def0.xy;
      let tip = def0.zw;
      let v = tip - root;
      let len2 = dot(v, v);
      if (len2 < 1.0) {
        return vec4f(0.0);
      }
      let len = sqrt(len2);
      let t = clamp(dot(source - root, v) / len2, 0.0, 1.0);
      let closest = root + v * t;
      let dist = length(source - closest);
      let width = def1.y * (0.72 + t * 0.38);
      let distanceWeight = 1.0 - smoothstep(width * 0.42, width, dist);
      if (distanceWeight <= 0.001) {
        return vec4f(0.0);
      }
      let rootDistance = clamp(length(source - root) / max(1.0, len), 0.0, 1.25);
      let tipWeight = smoothstep(0.12, 1.02, t * 0.78 + rootDistance * 0.22);
      let weight = distanceWeight * (0.28 + tipWeight * 0.72);
      return vec4f(t, tipWeight, weight, 1.0);
    }

    fn addWeightedHairSpring(total: HairSpringSample, sample: HairSpringSample, weight: f32) -> HairSpringSample {
      var outSample = total;
      outSample.anglePos += sample.anglePos * weight;
      outSample.anglePosY += sample.anglePosY * weight;
      outSample.waveX += sample.waveX * weight;
      outSample.waveY += sample.waveY * weight;
      outSample.headPosX += sample.headPosX * weight;
      outSample.headPosY += sample.headPosY * weight;
      outSample.headVelX += sample.headVelX * weight;
      outSample.headVelY += sample.headVelY * weight;
      outSample.angleVel += sample.angleVel * weight;
      outSample.angleVelY += sample.angleVelY * weight;
      outSample.stretchX += sample.stretchX * weight;
      outSample.stretchY += sample.stretchY * weight;
      return outSample;
    }

    fn scaleHairSpring(sample: HairSpringSample, weight: f32) -> HairSpringSample {
      var outSample = sample;
      outSample.anglePos *= weight;
      outSample.anglePosY *= weight;
      outSample.waveX *= weight;
      outSample.waveY *= weight;
      outSample.headPosX *= weight;
      outSample.headPosY *= weight;
      outSample.headVelX *= weight;
      outSample.headVelY *= weight;
      outSample.angleVel *= weight;
      outSample.angleVelY *= weight;
      outSample.stretchX *= weight;
      outSample.stretchY *= weight;
      return outSample;
    }

    fn blendHairBundleMotion(source: vec2f, baseSpring: HairSpringSample, baseMask: f32) -> HairBundleMotion {
      var motion: HairBundleMotion;
      motion.spring = baseSpring;
      motion.mask = baseMask;
      motion.motionScale = 1.0;
      motion.edgeScale = 1.0;
      let bundleStrength = hair.p[2].w;
      if (bundleStrength <= 0.001) {
        return motion;
      }

      var total = 0.0;
      var tipTotal = 0.0;
      var mixSample = emptyHairSpringSample();
      for (var i = 0u; i < ${HAIR_BUNDLE_DEFS.length}u; i = i + 1u) {
        let influence = hairBundleInfluence(source, i);
        if (influence.w <= 0.0) {
          continue;
        }
        let spring = sampleHairBundleSpring(i, influence.y);
        let weight = influence.z;
        total += weight;
        tipTotal += influence.y * weight;
        mixSample = addWeightedHairSpring(mixSample, spring, weight);
      }

      if (total <= 0.001) {
        return motion;
      }

      let inv = 1.0 / total;
      mixSample = scaleHairSpring(mixSample, inv);
      let tipWeight = clamp(tipTotal * inv, 0.0, 1.0);
      let blend = clamp(clamp(total, 0.0, 1.0) * 0.92 * bundleStrength, 0.0, 1.0);
      motion.spring = mixHairSpringSample(baseSpring, mixSample, blend);
      motion.mask = mix(baseMask, tipWeight, blend * 0.88);
      motion.motionScale = mix(1.0, clamp(tipWeight / max(baseMask, 0.18), 0.28, 1.38), blend);
      motion.edgeScale = mix(1.0, 0.38 + motion.mask * 0.62, blend);
      return motion;
    }

    fn hairWarp(source: vec2f) -> vec2f {
      let layerIsFront = hair.p[0].z;
      let hairAmount = hair.p[1].z;
      let springAmount = hair.p[1].w;
      let ax = hair.p[1].x;
      let ay = hair.p[1].y;
      let faceCenter = face.p[1].xy;
      let nx = (source.x - faceCenter.x) / max(1.0, face.p[0].x * 0.5);
      let edge = clamp(abs(nx), 0.0, 1.0);
      let n = clamp(source.y / max(1.0, face.p[0].y), 0.0, 1.0);
      let baseMask = hairRootTipMotionMask(source);
      let baseSpring = sampleHairSpring(n);
      let bundleMotion = blendHairBundleMotion(source, baseSpring, baseMask);
      let s = bundleMotion.spring;
      let activeMask = bundleMotion.mask;
      let angleLagX = s.anglePos - ax;
      let angleLagY = s.anglePosY - ay;
      let tipDelay = activeMask * activeMask * springAmount * clamp(angleLagX * 18.0, -18.0, 18.0);
      let tipDelayY = activeMask * activeMask * springAmount * clamp(angleLagY * 8.0, -8.0, 8.0);
      let head = hair.p[2].xy;
      let shiftX = s.waveX * bundleMotion.motionScale;
      let shiftY = s.waveY * bundleMotion.motionScale;
      let lagWeight = activeMask * activeMask * springAmount;
      let lagX = clamp((s.headPosX - head.x) * lagWeight * 1.6, -30.0, 30.0);
      let lagY = clamp((s.headPosY - head.y) * lagWeight * 0.85, -18.0, 18.0);
      let velocityLagX = clamp((-s.headVelX * 0.028 - s.angleVel * 2.4) * lagWeight, -18.0, 18.0);
      let velocityLagY = clamp(-s.headVelY * 0.018 * lagWeight, -12.0, 12.0);
      var point = deformerWarp(source);
      let crownLock = hairCrownRootLockMask(source);
      if (crownLock > 0.001) {
        let followAmount = layerIsFront * hair.p[2].z;
        let root = mix(source, faceRigidWarp(source), followAmount);
        let lockX = crownLock * mix(0.28, mix(0.28, 0.72, followAmount), layerIsFront);
        let lockY = crownLock * mix(0.72, mix(0.72, 0.76, followAmount), layerIsFront);
        point.x = mix(point.x, root.x, lockX);
        point.y = mix(point.y, root.y, lockY);
      }
      let rootMotionDampen = mix(1.0, 1.0 - crownLock * 0.85 * hair.p[2].z, layerIsFront);
      let sideDirection = mix(-3.0, 2.2, layerIsFront);
      point.x += shiftX + tipDelay + s.stretchX * bundleMotion.motionScale + lagX + velocityLagX +
        nx * edge * ax * sideDirection * hairAmount * bundleMotion.edgeScale * rootMotionDampen;
      point.y += shiftY + s.stretchY * bundleMotion.motionScale + tipDelayY + lagY + velocityLagY;
      if (hair.p[3].w > 0.0) {
        let upper = 1.0 - smoothstep(640.0, 980.0, source.y);
        point.x += hair.p[3].y * (0.55 + upper * 0.45);
        point.y += hair.p[3].z * (0.6 + upper * 0.4);
      }
      return point;
    }

    fn highlightWarp(source: vec2f) -> vec2f {
      let shift = hair.p[4].xy;
      var point = faceWarp(source) + shift;
      let leftEye = face.p[12].xy + shift;
      let rightEye = face.p[12].zw + shift;
      let leftD = dot(point - leftEye, point - leftEye);
      let rightD = dot(point - rightEye, point - rightEye);
      let useLeft = leftD <= rightD;
      let eye = select(rightEye, leftEye, useLeft);
      let pulse = select(face.p[15].zw, face.p[15].xy, useLeft);
      point = eye + (point - eye) * (vec2f(1.0, 1.0) + pulse);
      let film = hair.p[5];
      let rot = hair.p[6].xy;
      let slide = hair.p[6].zw;
      let pivot = eye + hair.p[7].xy;
      let d = point - pivot;
      let warped = vec2f(d.x * film.x + d.y * film.z, d.y * film.y + d.x * film.w);
      return pivot + vec2f(warped.x * rot.x - warped.y * rot.y, warped.x * rot.y + warped.y * rot.x) + slide;
    }

    fn clipFromLocalPoint(point: vec2f) -> vec4f {
      let zeroToOne = point / uniforms.resolution;
      let clip = zeroToOne * 2.0 - 1.0;
      return vec4f(clip.x, -clip.y, 0.0, 1.0);
    }

    fn clipFromStagePoint(localPoint: vec2f) -> vec4f {
      let stagePoint = vec2f(
        dot(uniforms.stageTransform0.xy, localPoint) + uniforms.stageTransform0.z,
        dot(uniforms.stageTransform1.xy, localPoint) + uniforms.stageTransform1.z
      );
      let zeroToOne = stagePoint / uniforms.stageResolution;
      let clip = zeroToOne * 2.0 - 1.0;
      return vec4f(clip.x, -clip.y, 0.0, 1.0);
    }

    @vertex
    fn faceVertexMain(@location(0) sourcePosition: vec2f, @location(1) uv: vec2f) -> VertexOut {
      var out: VertexOut;
      let warped = tearLensWarp(sourcePosition, faceWarp(sourcePosition));
      out.position = clipFromLocalPoint(warped);
      out.uv = uv;
      return out;
    }

    @vertex
    fn highlightVertexMain(@location(0) sourcePosition: vec2f, @location(1) uv: vec2f) -> VertexOut {
      var out: VertexOut;
      let warped = highlightWarp(sourcePosition);
      out.position = clipFromLocalPoint(warped);
      out.uv = uv;
      return out;
    }

    @vertex
    fn hairVertexMain(@location(0) sourcePosition: vec2f, @location(1) uv: vec2f) -> VertexOut {
      var out: VertexOut;
      let warped = hairWarp(sourcePosition);
      out.position = clipFromLocalPoint(warped);
      out.uv = uv;
      return out;
    }

    @vertex
    fn faceStageVertexMain(@location(0) sourcePosition: vec2f, @location(1) uv: vec2f) -> VertexOut {
      var out: VertexOut;
      let warped = tearLensWarp(sourcePosition, faceWarp(sourcePosition));
      out.position = clipFromStagePoint(warped);
      out.uv = uv;
      return out;
    }

    @vertex
    fn highlightStageVertexMain(@location(0) sourcePosition: vec2f, @location(1) uv: vec2f) -> VertexOut {
      var out: VertexOut;
      let warped = highlightWarp(sourcePosition);
      out.position = clipFromStagePoint(warped);
      out.uv = uv;
      return out;
    }

    @vertex
    fn hairStageVertexMain(@location(0) sourcePosition: vec2f, @location(1) uv: vec2f) -> VertexOut {
      var out: VertexOut;
      let warped = hairWarp(sourcePosition);
      out.position = clipFromStagePoint(warped);
      out.uv = uv;
      return out;
    }

    @fragment
    fn fragmentMain(input: VertexOut) -> @location(0) vec4f {
      let sample = textureSample(imageTexture, imageSampler, input.uv);
      return vec4f(sample.rgb, sample.a * uniforms.stageTransform0.w);
    }

    @fragment
    fn tintFragmentMain(input: VertexOut) -> @location(0) vec4f {
      let sample = textureSample(imageTexture, imageSampler, input.uv);
      let tint = hair.p[4];
      return vec4f(tint.rgb, sample.a * tint.a * uniforms.stageTransform0.w);
    }

    fn hueToRgb(p: f32, q: f32, rawT: f32) -> f32 {
      var t = rawT;
      if (t < 0.0) {
        t += 1.0;
      }
      if (t > 1.0) {
        t -= 1.0;
      }
      if (t < 1.0 / 6.0) {
        return p + (q - p) * 6.0 * t;
      }
      if (t < 0.5) {
        return q;
      }
      if (t < 2.0 / 3.0) {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
      }
      return p;
    }

    fn rgbToHsl(color: vec3f) -> vec3f {
      let maxValue = max(color.r, max(color.g, color.b));
      let minValue = min(color.r, min(color.g, color.b));
      let lightness = (maxValue + minValue) * 0.5;
      let delta = maxValue - minValue;
      if (delta <= 0.00001) {
        return vec3f(0.0, 0.0, lightness);
      }
      let saturation = delta / (1.0 - abs(2.0 * lightness - 1.0));
      var hue = 0.0;
      if (maxValue == color.r) {
        hue = (color.g - color.b) / delta;
        if (color.g < color.b) {
          hue += 6.0;
        }
      } else if (maxValue == color.g) {
        hue = (color.b - color.r) / delta + 2.0;
      } else {
        hue = (color.r - color.g) / delta + 4.0;
      }
      hue = hue / 6.0;
      if (hue < 0.0) {
        hue += 1.0;
      }
      return vec3f(hue, saturation, lightness);
    }

    fn hslToRgb(hsl: vec3f) -> vec3f {
      if (hsl.y <= 0.00001) {
        return vec3f(hsl.z);
      }
      let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
      let p = 2.0 * hsl.z - q;
      return vec3f(
        hueToRgb(p, q, hsl.x + 1.0 / 3.0),
        hueToRgb(p, q, hsl.x),
        hueToRgb(p, q, hsl.x - 1.0 / 3.0)
      );
    }

    @fragment
    fn hairTintFragmentMain(input: VertexOut) -> @location(0) vec4f {
      let sample = textureSample(imageTexture, imageSampler, input.uv);
      let tint = hair.p[4];
      let lightnessAmount = clamp(hair.p[5].x, 0.0, 1.0);
      let sourceLuma = dot(sample.rgb, vec3f(0.2126, 0.7152, 0.0722));
      var rgb = sample.rgb;
      if (tint.w > 0.0) {
        let tintHsl = rgbToHsl(tint.rgb);
        rgb = hslToRgb(vec3f(tintHsl.x, tintHsl.y, sourceLuma));
      }
      if (lightnessAmount > 0.0) {
        let pastel = mix(tint.rgb, vec3f(1.0), vec3f(0.74));
        let surfaceMask = smoothstep(0.025, 0.16, sourceLuma);
        let highlightMask = mix(0.72, 1.0, smoothstep(0.12, 0.72, sourceLuma));
        let mixAmount = lightnessAmount * surfaceMask * highlightMask * sample.a * 0.86;
        rgb = mix(rgb, pastel, vec3f(mixAmount));
      }
      return vec4f(rgb, sample.a * uniforms.stageTransform0.w);
    }
  `;
  const SHADOW_COMPOSITE_WEBGPU_SHADER = /* wgsl */ `
    struct FullscreenOut {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    struct BlurUniforms {
      step: vec2f,
      padding: vec2f,
    };

    @group(0) @binding(0) var shadowSampler: sampler;
    @group(0) @binding(1) var sourceTexture: texture_2d<f32>;
    @group(0) @binding(2) var maskTexture: texture_2d<f32>;
    @group(0) @binding(3) var<uniform> blur: BlurUniforms;

    @vertex
    fn fullscreenVertexMain(@builtin(vertex_index) vertexIndex: u32) -> FullscreenOut {
      let positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
      );
      let position = positions[vertexIndex];
      var out: FullscreenOut;
      out.position = vec4f(position, 0.0, 1.0);
      out.uv = position * vec2f(0.5, -0.5) + vec2f(0.5, 0.5);
      return out;
    }

    @fragment
    fn blurFragmentMain(input: FullscreenOut) -> @location(0) vec4f {
      let offset1 = blur.step * 1.3846153846;
      let offset2 = blur.step * 3.2307692308;
      var color = textureSample(sourceTexture, shadowSampler, input.uv) * 0.2270270270;
      color += textureSample(sourceTexture, shadowSampler, input.uv + offset1) * 0.3162162162;
      color += textureSample(sourceTexture, shadowSampler, input.uv - offset1) * 0.3162162162;
      color += textureSample(sourceTexture, shadowSampler, input.uv + offset2) * 0.0702702703;
      color += textureSample(sourceTexture, shadowSampler, input.uv - offset2) * 0.0702702703;
      return color;
    }

    @fragment
    fn maskFragmentMain(input: FullscreenOut) -> @location(0) vec4f {
      let shadow = textureSample(sourceTexture, shadowSampler, input.uv);
      let maskAlpha = textureSample(maskTexture, shadowSampler, input.uv).a;
      return vec4f(shadow.rgb * maskAlpha, shadow.a * maskAlpha);
    }
  `;
  const STAGE_ART_WEBGPU_SHADER = /* wgsl */ `
    struct StageOut {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    struct StageUniforms {
      p: array<vec4f, 4>,
    };

    @group(0) @binding(0) var<uniform> stage: StageUniforms;
    @group(0) @binding(1) var imageSampler: sampler;
    @group(0) @binding(2) var imageTexture: texture_2d<f32>;

    @vertex
    fn fullscreenVertexMain(@builtin(vertex_index) vertexIndex: u32) -> StageOut {
      let positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
      );
      let position = positions[vertexIndex];
      var out: StageOut;
      out.position = vec4f(position, 0.0, 1.0);
      out.uv = position * vec2f(0.5, -0.5) + vec2f(0.5, 0.5);
      return out;
    }

    @vertex
    fn quadVertexMain(@builtin(vertex_index) vertexIndex: u32) -> StageOut {
      let corners = array<vec2f, 6>(
        stage.p[1].xy,
        stage.p[1].zw,
        stage.p[2].xy,
        stage.p[1].xy,
        stage.p[2].xy,
        stage.p[2].zw
      );
      let uvRect = stage.p[3];
      let uvs = array<vec2f, 6>(
        uvRect.xy,
        vec2f(uvRect.z, uvRect.y),
        uvRect.zw,
        uvRect.xy,
        uvRect.zw,
        vec2f(uvRect.x, uvRect.w)
      );
      let point = corners[vertexIndex];
      let zeroToOne = point / stage.p[0].xy;
      let clip = zeroToOne * 2.0 - 1.0;
      var out: StageOut;
      out.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
      out.uv = uvs[vertexIndex];
      return out;
    }

    @fragment
    fn backgroundFragmentMain(input: StageOut) -> @location(0) vec4f {
      let point = input.uv * stage.p[0].xy;
      let distance = length(point - stage.p[3].xy);
      let mixAmount = smoothstep(0.0, max(1.0, stage.p[3].z), distance);
      let color = mix(stage.p[2], stage.p[1], mixAmount);
      return vec4f(color.rgb, 1.0);
    }

    @fragment
    fn groundShadowFragmentMain(input: StageOut) -> @location(0) vec4f {
      let point = input.uv * stage.p[0].xy;
      let center = stage.p[1].xy;
      let radius = max(1.0, stage.p[1].z);
      let delta = vec2f((point.x - center.x) / radius, (point.y - center.y) / (radius * 0.24));
      let falloff = 1.0 - smoothstep(0.0, 1.0, length(delta));
      return vec4f(stage.p[2].rgb, stage.p[2].a * falloff);
    }

    fn highlightDotAlpha(point: vec2f, center: vec2f, radius: vec2f, rot: vec2f) -> f32 {
      let delta = point - center;
      let local = vec2f(
        delta.x * rot.x + delta.y * rot.y,
        -delta.x * rot.y + delta.y * rot.x
      ) / max(radius, vec2f(0.001));
      let glowDistance = length(local - vec2f(-0.16, -0.2));
      let glowCore = 1.0 - smoothstep(0.02, 0.58, glowDistance);
      let glowMid = 1.0 - smoothstep(0.58, 0.78, glowDistance);
      let glowEdge = 1.0 - smoothstep(0.78, 1.38, glowDistance);
      let glowAlpha = max(max(glowCore, glowMid * 0.96), glowEdge * 0.62);
      let coreDistance = length(local - vec2f(-0.2, -0.24));
      let coreAlpha = mix(0.78, 1.0, 1.0 - smoothstep(0.02, 0.92, coreDistance));
      let coreMask = 1.0 - smoothstep(0.88, 0.92, coreDistance);
      let core = coreAlpha * coreMask;
      return clamp(core + glowAlpha * (1.0 - core), 0.0, 1.0);
    }

    @fragment
    fn highlightSourceFragmentMain(input: StageOut) -> @location(0) vec4f {
      let point = input.uv * stage.p[0].xy;
      let radius0 = stage.p[1].zw;
      let radius1 = stage.p[2].zw;
      let alpha0 = highlightDotAlpha(point, stage.p[1].xy, radius0, stage.p[3].xy);
      let alpha1 = highlightDotAlpha(point, stage.p[2].xy, radius1, stage.p[3].zw);
      let alpha = (alpha0 + alpha1 * (1.0 - alpha0)) * stage.p[0].z;
      return vec4f(1.0, 1.0, 1.0, alpha);
    }

    @fragment
    fn quadFragmentMain(input: StageOut) -> @location(0) vec4f {
      let sample = textureSample(imageTexture, imageSampler, input.uv);
      return vec4f(sample.rgb, sample.a * stage.p[0].z);
    }
  `;

  let meshGpuResourcesPromise = null;

  function getMeshGpuResources() {
    const gpu = navigator.gpu;
    if (!gpu) return Promise.resolve(null);
    if (meshGpuResourcesPromise) return meshGpuResourcesPromise;

    const cachedPromise = createMeshGpuResources(gpu, () => {
      if (meshGpuResourcesPromise === cachedPromise) meshGpuResourcesPromise = null;
    }).catch(() => {
      if (meshGpuResourcesPromise === cachedPromise) meshGpuResourcesPromise = null;
      return null;
    });

    meshGpuResourcesPromise = cachedPromise;
    return cachedPromise;
  }

  async function createMeshGpuResources(gpu, onLost) {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return null;

    const device = await adapter.requestDevice();
    const format = gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({ code: MESH_WEBGPU_SHADER });
    const shadowCompositeModule = device.createShaderModule({
      code: SHADOW_COMPOSITE_WEBGPU_SHADER,
    });
    const stageArtModule = device.createShaderModule({ code: STAGE_ART_WEBGPU_SHADER });
    const meshVertexBuffers = [
      {
        arrayStride: 8,
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
      },
      {
        arrayStride: 8,
        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x2" }],
      },
    ];
    const meshFragmentTargets = [
      {
        format,
        blend: {
          color: {
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
            operation: "add",
          },
          alpha: {
            srcFactor: "one",
            dstFactor: "one-minus-src-alpha",
            operation: "add",
          },
        },
      },
    ];
    const createPipeline = (entryPoint, fragmentEntryPoint = "fragmentMain") =>
      device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module,
          entryPoint,
          buffers: meshVertexBuffers,
        },
        fragment: {
          module,
          entryPoint: fragmentEntryPoint,
          targets: meshFragmentTargets,
        },
        primitive: { topology: "triangle-list" },
      });
    const facePipeline = createPipeline("faceVertexMain");
    const faceStagePipeline = createPipeline("faceStageVertexMain");
    const highlightPipeline = createPipeline("highlightVertexMain");
    const highlightStagePipeline = createPipeline("highlightStageVertexMain");
    const hairPipeline = createPipeline("hairVertexMain");
    const hairStagePipeline = createPipeline("hairStageVertexMain");
    const hairTintPipeline = createPipeline("hairVertexMain", "hairTintFragmentMain");
    const hairTintStagePipeline = createPipeline("hairStageVertexMain", "hairTintFragmentMain");
    const shadowHairPipeline = createPipeline("hairVertexMain", "tintFragmentMain");
    const shadowBlurPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shadowCompositeModule,
        entryPoint: "fullscreenVertexMain",
      },
      fragment: {
        module: shadowCompositeModule,
        entryPoint: "blurFragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });
    const shadowMaskPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shadowCompositeModule,
        entryPoint: "fullscreenVertexMain",
      },
      fragment: {
        module: shadowCompositeModule,
        entryPoint: "maskFragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });
    const createStageArtPipeline = (fragmentEntryPoint) =>
      device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: stageArtModule,
          entryPoint:
            fragmentEntryPoint === "quadFragmentMain" ? "quadVertexMain" : "fullscreenVertexMain",
        },
        fragment: {
          module: stageArtModule,
          entryPoint: fragmentEntryPoint,
          targets: meshFragmentTargets,
        },
        primitive: { topology: "triangle-list" },
      });
    const stageBackgroundPipeline = createStageArtPipeline("backgroundFragmentMain");
    const stageGroundShadowPipeline = createStageArtPipeline("groundShadowFragmentMain");
    const stageHighlightSourcePipeline = createStageArtPipeline("highlightSourceFragmentMain");
    const stageQuadPipeline = createStageArtPipeline("quadFragmentMain");
    const sampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
    });
    const resources = {
      device,
      facePipeline,
      faceStagePipeline,
      hairPipeline,
      hairStagePipeline,
      hairTintPipeline,
      hairTintStagePipeline,
      highlightPipeline,
      highlightStagePipeline,
      shadowHairPipeline,
      shadowBlurPipeline,
      shadowMaskPipeline,
      stageBackgroundPipeline,
      stageGroundShadowPipeline,
      stageHighlightSourcePipeline,
      stageQuadPipeline,
      format,
      lost: false,
      sampler,
    };

    void device.lost.then(() => {
      resources.lost = true;
      onLost();
    });

    return resources;
  }

  async function createWebGpuMeshRenderer(width, height) {
    const resources = await getMeshGpuResources();
    if (!resources || resources.lost) return null;

    const meshCanvas = document.createElement("canvas");
    meshCanvas.width = width;
    meshCanvas.height = height;
    const context = meshCanvas.getContext("webgpu");
    if (!context) return null;
    const stageContext = stageArtCanvas.getContext("webgpu");
    if (!stageContext) return null;
    const {
      device,
      facePipeline,
      faceStagePipeline,
      format,
      hairPipeline,
      hairStagePipeline,
      hairTintPipeline,
      hairTintStagePipeline,
      highlightPipeline,
      highlightStagePipeline,
      sampler,
      shadowBlurPipeline,
      shadowHairPipeline,
      shadowMaskPipeline,
      stageBackgroundPipeline,
      stageGroundShadowPipeline,
      stageHighlightSourcePipeline,
      stageQuadPipeline,
    } = resources;
    context.configure({ device, format, alphaMode: "premultiplied" });
    stageContext.configure({ device, format, alphaMode: "premultiplied" });

    const uniformBuffer = device.createBuffer({
      size: 48,
      usage: MESH_GPU_BUFFER_USAGE_UNIFORM | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const meshUniformValues = new Float32Array(12);
    const writeMeshUniforms = (
      stageWidth = width,
      stageHeight = height,
      transform = [1, 0, 0, 0, 1, 0],
      alpha = 1,
    ) => {
      meshUniformValues[0] = width;
      meshUniformValues[1] = height;
      meshUniformValues[2] = stageWidth;
      meshUniformValues[3] = stageHeight;
      meshUniformValues[4] = transform[0];
      meshUniformValues[5] = transform[1];
      meshUniformValues[6] = transform[2];
      meshUniformValues[7] = alpha;
      meshUniformValues[8] = transform[3];
      meshUniformValues[9] = transform[4];
      meshUniformValues[10] = transform[5];
      meshUniformValues[11] = 0;
      device.queue.writeBuffer(uniformBuffer, 0, meshUniformValues);
    };
    writeMeshUniforms();
    const faceUniformBuffer = device.createBuffer({
      size: MESH_FACE_UNIFORM_VEC4_COUNT * 16,
      usage: MESH_GPU_BUFFER_USAGE_UNIFORM | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const faceControlPointBuffer = device.createBuffer({
      size: MESH_FACE_CONTROL_POINT_COUNT * 8,
      usage: MESH_GPU_BUFFER_USAGE_STORAGE | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const faceRootControlPointBuffer = device.createBuffer({
      size: MESH_FACE_CONTROL_POINT_COUNT * 8,
      usage: MESH_GPU_BUFFER_USAGE_STORAGE | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const hairUniformBuffer = device.createBuffer({
      size: MESH_HAIR_UNIFORM_VEC4_COUNT * 16,
      usage: MESH_GPU_BUFFER_USAGE_UNIFORM | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const hairSpringBuffer = device.createBuffer({
      size: MESH_HAIR_SPRING_VEC4_COUNT * 16,
      usage: MESH_GPU_BUFFER_USAGE_STORAGE | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const hairBundleDefBuffer = device.createBuffer({
      size: MESH_HAIR_BUNDLE_DEF_VEC4_COUNT * 16,
      usage: MESH_GPU_BUFFER_USAGE_STORAGE | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const hairBundleSampleBuffer = device.createBuffer({
      size: MESH_HAIR_BUNDLE_SAMPLE_VEC4_COUNT * 16,
      usage: MESH_GPU_BUFFER_USAGE_STORAGE | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const shadowShapeTexture = device.createTexture({
      size: [width, height],
      format,
      usage: MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING | MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    const shadowBlurTexture = device.createTexture({
      size: [width, height],
      format,
      usage: MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING | MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    const shadowReceiverTexture = device.createTexture({
      size: [width, height],
      format,
      usage: MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING | MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    const shadowCompositeTexture = device.createTexture({
      size: [width, height],
      format,
      usage: MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING | MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    const itemDeformSourceTexture = device.createTexture({
      size: [width, height],
      format,
      usage: MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING | MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    const highlightSourceTexture = device.createTexture({
      size: [width, height],
      format,
      usage: MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING | MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    const shadowShapeView = shadowShapeTexture.createView();
    const shadowBlurView = shadowBlurTexture.createView();
    const shadowReceiverView = shadowReceiverTexture.createView();
    const shadowCompositeView = shadowCompositeTexture.createView();
    const itemDeformSourceView = itemDeformSourceTexture.createView();
    const highlightSourceView = highlightSourceTexture.createView();
    const shadowBlurHorizontalUniformBuffer = device.createBuffer({
      size: 16,
      usage: MESH_GPU_BUFFER_USAGE_UNIFORM | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const shadowBlurVerticalUniformBuffer = device.createBuffer({
      size: 16,
      usage: MESH_GPU_BUFFER_USAGE_UNIFORM | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const shadowBlurHorizontalBindGroup = device.createBindGroup({
      layout: shadowBlurPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: shadowShapeView },
        { binding: 3, resource: { buffer: shadowBlurHorizontalUniformBuffer } },
      ],
    });
    const shadowBlurVerticalBindGroup = device.createBindGroup({
      layout: shadowBlurPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: shadowBlurView },
        { binding: 3, resource: { buffer: shadowBlurVerticalUniformBuffer } },
      ],
    });
    const stageUniformBuffer = device.createBuffer({
      size: 64,
      usage: MESH_GPU_BUFFER_USAGE_UNIFORM | MESH_GPU_BUFFER_USAGE_COPY_DST,
    });
    const stageUniformValues = new Float32Array(16);
    const stageBackgroundBindGroup = device.createBindGroup({
      layout: stageBackgroundPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: stageUniformBuffer } }],
    });
    const stageGroundShadowBindGroup = device.createBindGroup({
      layout: stageGroundShadowPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: stageUniformBuffer } }],
    });
    const stageHighlightSourceBindGroup = device.createBindGroup({
      layout: stageHighlightSourcePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: stageUniformBuffer } }],
    });
    const shadowCompositeStageQuadBindGroup = device.createBindGroup({
      layout: stageQuadPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: stageUniformBuffer } },
        { binding: 1, resource: sampler },
        { binding: 2, resource: shadowCompositeView },
      ],
    });
    const highlightSourceEntry = {
      height,
      highlightStageBindGroup: device.createBindGroup({
        layout: highlightStagePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: highlightSourceView },
          { binding: 3, resource: { buffer: faceUniformBuffer } },
          { binding: 4, resource: { buffer: faceControlPointBuffer } },
          { binding: 6, resource: { buffer: hairUniformBuffer } },
        ],
      }),
      view: highlightSourceView,
      width,
    };
    const itemDeformSourceEntry = {
      faceBindGroup: device.createBindGroup({
        layout: facePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: itemDeformSourceView },
          { binding: 3, resource: { buffer: faceUniformBuffer } },
          { binding: 4, resource: { buffer: faceControlPointBuffer } },
        ],
      }),
      faceStageBindGroup: device.createBindGroup({
        layout: faceStagePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: itemDeformSourceView },
          { binding: 3, resource: { buffer: faceUniformBuffer } },
          { binding: 4, resource: { buffer: faceControlPointBuffer } },
        ],
      }),
      hairBindGroup: device.createBindGroup({
        layout: hairPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: itemDeformSourceView },
          { binding: 3, resource: { buffer: faceUniformBuffer } },
          { binding: 4, resource: { buffer: faceControlPointBuffer } },
          { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
          { binding: 6, resource: { buffer: hairUniformBuffer } },
          { binding: 7, resource: { buffer: hairSpringBuffer } },
          { binding: 8, resource: { buffer: hairBundleDefBuffer } },
          { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
        ],
      }),
      hairStageBindGroup: device.createBindGroup({
        layout: hairStagePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: itemDeformSourceView },
          { binding: 3, resource: { buffer: faceUniformBuffer } },
          { binding: 4, resource: { buffer: faceControlPointBuffer } },
          { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
          { binding: 6, resource: { buffer: hairUniformBuffer } },
          { binding: 7, resource: { buffer: hairSpringBuffer } },
          { binding: 8, resource: { buffer: hairBundleDefBuffer } },
          { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
        ],
      }),
      height,
      view: itemDeformSourceView,
      width,
    };
    let stageWidth = Math.max(1, window.innerWidth || 1);
    let stageHeight = Math.max(1, window.innerHeight || 1);
    let stageDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const textures = new Map();
    const textureSet = new Set();
    const geometryCache = new Map();
    let disposed = false;

    function currentTextureView() {
      try {
        return context.getCurrentTexture().createView();
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== "InvalidStateError") throw error;
        context.configure({ device, format, alphaMode: "premultiplied" });
        return context.getCurrentTexture().createView();
      }
    }

    function configureStageContext() {
      stageContext.configure({ device, format, alphaMode: "premultiplied" });
    }

    function stageCurrentTextureView() {
      try {
        return stageContext.getCurrentTexture().createView();
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== "InvalidStateError") throw error;
        configureStageContext();
        return stageContext.getCurrentTexture().createView();
      }
    }

    function destroyTextureEntry(entry) {
      if (!entry?.texture) return;
      textureSet.delete(entry.texture);
      entry.texture.destroy();
    }

    function rememberTextureEntry(image, entry) {
      textures.delete(image);
      textures.set(image, entry);
      while (textures.size > MESH_TEXTURE_CACHE_LIMIT) {
        const oldest = textures.entries().next().value;
        if (!oldest) break;
        const [oldImage, oldEntry] = oldest;
        textures.delete(oldImage);
        destroyTextureEntry(oldEntry);
      }
    }

    function meshGeometry(cols, rows, imgW, imgH) {
      const cacheKey = `${cols}x${rows}@${imgW}x${imgH}`;
      const cached = geometryCache.get(cacheKey);
      if (cached) return cached;

      const pointCount = (cols + 1) * (rows + 1);
      const vertexCount = cols * rows * 6;
      const gridX = new Float32Array(pointCount);
      const gridY = new Float32Array(pointCount);
      const sourcePositions = new Float32Array(vertexCount * 2);
      const texcoords = new Float32Array(vertexCount * 2);

      for (let y = 0; y <= rows; y += 1) {
        for (let x = 0; x <= cols; x += 1) {
          const idx = y * (cols + 1) + x;
          gridX[idx] = (x / cols) * CROP.w;
          gridY[idx] = (y / rows) * CROP.h;
        }
      }

      let vertex = 0;
      const pushIndex = (idx) => {
        sourcePositions[vertex * 2] = gridX[idx];
        sourcePositions[vertex * 2 + 1] = gridY[idx];
        texcoords[vertex * 2] = (CROP.x + gridX[idx]) / imgW;
        texcoords[vertex * 2 + 1] = (CROP.y + gridY[idx]) / imgH;
        vertex += 1;
      };

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const i00 = y * (cols + 1) + x;
          const i10 = i00 + 1;
          const i01 = i00 + cols + 1;
          const i11 = i01 + 1;
          pushIndex(i00);
          pushIndex(i10);
          pushIndex(i11);
          pushIndex(i00);
          pushIndex(i11);
          pushIndex(i01);
        }
      }

      const sourcePositionBuffer = device.createBuffer({
        size: sourcePositions.byteLength,
        usage: MESH_GPU_BUFFER_USAGE_VERTEX | MESH_GPU_BUFFER_USAGE_COPY_DST,
      });
      const texcoordBuffer = device.createBuffer({
        size: texcoords.byteLength,
        usage: MESH_GPU_BUFFER_USAGE_VERTEX | MESH_GPU_BUFFER_USAGE_COPY_DST,
      });
      device.queue.writeBuffer(sourcePositionBuffer, 0, sourcePositions);
      device.queue.writeBuffer(texcoordBuffer, 0, texcoords);

      const geometry = {
        sourcePositionBuffer,
        texcoordBuffer,
        vertexCount,
      };
      geometryCache.set(cacheKey, geometry);
      return geometry;
    }

    function textureFor(image) {
      const cached = textures.get(image);
      const version = Number(image?.__purupuruTextureVersion) || 0;
      const imgW = image.naturalWidth || image.width;
      const imgH = image.naturalHeight || image.height;
      if (imgW <= 0 || imgH <= 0) throw new Error("WebGPU texture source has no size");
      if (cached && cached.version === version && cached.width === imgW && cached.height === imgH)
        return cached;

      let entry = cached;
      if (entry && (entry.width !== imgW || entry.height !== imgH)) {
        textures.delete(image);
        destroyTextureEntry(entry);
        entry = null;
      }
      if (!entry) {
        const texture = device.createTexture({
          size: [imgW, imgH],
          format: "rgba8unorm",
          usage:
            MESH_GPU_TEXTURE_USAGE_TEXTURE_BINDING |
            MESH_GPU_TEXTURE_USAGE_COPY_DST |
            MESH_GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
        });
        textureSet.add(texture);
        const view = texture.createView();
        entry = {
            faceBindGroup: device.createBindGroup({
              layout: facePipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
              ],
            }),
            faceStageBindGroup: device.createBindGroup({
              layout: faceStagePipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
              ],
            }),
            hairBindGroup: device.createBindGroup({
              layout: hairPipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
                { binding: 7, resource: { buffer: hairSpringBuffer } },
                { binding: 8, resource: { buffer: hairBundleDefBuffer } },
                { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
              ],
            }),
            hairStageBindGroup: device.createBindGroup({
              layout: hairStagePipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
                { binding: 7, resource: { buffer: hairSpringBuffer } },
                { binding: 8, resource: { buffer: hairBundleDefBuffer } },
                { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
              ],
            }),
            hairTintBindGroup: device.createBindGroup({
              layout: hairTintPipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
                { binding: 7, resource: { buffer: hairSpringBuffer } },
                { binding: 8, resource: { buffer: hairBundleDefBuffer } },
                { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
              ],
            }),
            hairTintStageBindGroup: device.createBindGroup({
              layout: hairTintStagePipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
                { binding: 7, resource: { buffer: hairSpringBuffer } },
                { binding: 8, resource: { buffer: hairBundleDefBuffer } },
                { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
              ],
            }),
            shadowHairBindGroup: device.createBindGroup({
              layout: shadowHairPipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 5, resource: { buffer: faceRootControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
                { binding: 7, resource: { buffer: hairSpringBuffer } },
                { binding: 8, resource: { buffer: hairBundleDefBuffer } },
                { binding: 9, resource: { buffer: hairBundleSampleBuffer } },
              ],
            }),
            highlightBindGroup: device.createBindGroup({
              layout: highlightPipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
              ],
            }),
            highlightStageBindGroup: device.createBindGroup({
              layout: highlightStagePipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
                { binding: 3, resource: { buffer: faceUniformBuffer } },
                { binding: 4, resource: { buffer: faceControlPointBuffer } },
                { binding: 6, resource: { buffer: hairUniformBuffer } },
              ],
            }),
            stageQuadBindGroup: device.createBindGroup({
              layout: stageQuadPipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: stageUniformBuffer } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: view },
              ],
            }),
            height: imgH,
            texture,
            version,
            view,
            width: imgW,
        };
      }
      device.queue.copyExternalImageToTexture(
        { source: image },
        { texture: entry.texture },
        { width: imgW, height: imgH },
      );
      entry.version = version;
      rememberTextureEntry(image, entry);
      return entry;
    }

    function encodeGpuPipeline(
      encoder,
      geometry,
      pipelineToUse,
      bindGroup,
      targetView,
      loadOp = "clear",
    ) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: targetView,
            loadOp,
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      pass.setPipeline(pipelineToUse);
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, geometry.sourcePositionBuffer);
      pass.setVertexBuffer(1, geometry.texcoordBuffer);
      pass.draw(geometry.vertexCount);
      pass.end();
    }

    function drawGpuPipeline(
      geometry,
      pipelineToUse,
      bindGroup,
      targetView = null,
      loadOp = "clear",
    ) {
      const encoder = device.createCommandEncoder();
      encodeGpuPipeline(
        encoder,
        geometry,
        pipelineToUse,
        bindGroup,
        targetView || currentTextureView(),
        loadOp,
      );
      device.queue.submit([encoder.finish()]);
      return true;
    }

    function writeFaceWarpBuffers(gpuWarpSpec) {
      device.queue.writeBuffer(faceUniformBuffer, 0, gpuWarpSpec.uniforms);
      device.queue.writeBuffer(faceControlPointBuffer, 0, gpuWarpSpec.controlPoints);
      if (gpuWarpSpec.faceRootControlPoints) {
        device.queue.writeBuffer(faceRootControlPointBuffer, 0, gpuWarpSpec.faceRootControlPoints);
      }
    }

    function drawGpuWarpTextureEntry(
      textureEntry,
      geometry,
      gpuWarpSpec,
      targetView = null,
      stageDraw = false,
      loadOp = stageDraw ? "load" : "clear",
    ) {
      if (!gpuWarpSpec?.kind) return false;
      const hasFaceBuffers =
        gpuWarpSpec.uniforms?.length === MESH_FACE_UNIFORM_VEC4_COUNT * 4 &&
        gpuWarpSpec.controlPoints?.length === MESH_FACE_CONTROL_POINT_COUNT * 2;
      if (!hasFaceBuffers) return false;

      if (gpuWarpSpec.kind === "face-v1") {
        writeFaceWarpBuffers(gpuWarpSpec);
        return drawGpuPipeline(
          geometry,
          stageDraw ? faceStagePipeline : facePipeline,
          stageDraw ? textureEntry.faceStageBindGroup : textureEntry.faceBindGroup,
          targetView,
          loadOp,
        );
      }

      if (
        gpuWarpSpec.kind === "highlight-v1" &&
        gpuWarpSpec.hairUniforms?.length === MESH_HAIR_UNIFORM_VEC4_COUNT * 4
      ) {
        writeFaceWarpBuffers(gpuWarpSpec);
        device.queue.writeBuffer(hairUniformBuffer, 0, gpuWarpSpec.hairUniforms);
        return drawGpuPipeline(
          geometry,
          stageDraw ? highlightStagePipeline : highlightPipeline,
          stageDraw ? textureEntry.highlightStageBindGroup : textureEntry.highlightBindGroup,
          targetView,
          loadOp,
        );
      }

      if (
        (gpuWarpSpec.kind === "hair-v1" || gpuWarpSpec.kind === "hair-shadow-v1") &&
        gpuWarpSpec.faceRootControlPoints?.length === MESH_FACE_CONTROL_POINT_COUNT * 2 &&
        gpuWarpSpec.hairUniforms?.length === MESH_HAIR_UNIFORM_VEC4_COUNT * 4 &&
        gpuWarpSpec.hairSpringSamples?.length === MESH_HAIR_SPRING_VEC4_COUNT * 4 &&
        gpuWarpSpec.hairBundleDefs?.length === MESH_HAIR_BUNDLE_DEF_VEC4_COUNT * 4 &&
        gpuWarpSpec.hairBundleSamples?.length === MESH_HAIR_BUNDLE_SAMPLE_VEC4_COUNT * 4
      ) {
        const isShadowHair = gpuWarpSpec.kind === "hair-shadow-v1";
        const isTintedHair =
          !isShadowHair &&
          gpuWarpSpec.hairTintEnabled &&
          Boolean(stageDraw ? textureEntry.hairTintStageBindGroup : textureEntry.hairTintBindGroup);
        writeFaceWarpBuffers(gpuWarpSpec);
        device.queue.writeBuffer(hairUniformBuffer, 0, gpuWarpSpec.hairUniforms);
        device.queue.writeBuffer(hairSpringBuffer, 0, gpuWarpSpec.hairSpringSamples);
        device.queue.writeBuffer(hairBundleDefBuffer, 0, gpuWarpSpec.hairBundleDefs);
        device.queue.writeBuffer(hairBundleSampleBuffer, 0, gpuWarpSpec.hairBundleSamples);
        return drawGpuPipeline(
          geometry,
          stageDraw
            ? isTintedHair
              ? hairTintStagePipeline
              : hairStagePipeline
            : isShadowHair
              ? shadowHairPipeline
              : isTintedHair
                ? hairTintPipeline
                : hairPipeline,
          stageDraw
            ? isTintedHair
              ? textureEntry.hairTintStageBindGroup
              : textureEntry.hairStageBindGroup
            : isShadowHair
              ? textureEntry.shadowHairBindGroup
              : isTintedHair
                ? textureEntry.hairTintBindGroup
                : textureEntry.hairBindGroup,
          targetView,
          loadOp,
        );
      }

      return false;
    }

    function drawGpuWarp(
      image,
      geometry,
      gpuWarpSpec,
      targetView = null,
      stageDraw = false,
      loadOp = stageDraw ? "load" : "clear",
    ) {
      return drawGpuWarpTextureEntry(
        textureFor(image),
        geometry,
        gpuWarpSpec,
        targetView,
        stageDraw,
        loadOp,
      );
    }

    function encodeFullscreenPass(
      encoder,
      pipelineToUse,
      bindGroup,
      targetView,
      loadOp = "clear",
      vertexCount = 3,
    ) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: targetView,
            loadOp,
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      pass.setPipeline(pipelineToUse);
      pass.setBindGroup(0, bindGroup);
      pass.draw(vertexCount);
      pass.end();
    }

    function rgbaFromHex(color, fallback = "#F2F5FA", alpha = 1) {
      const normalized = normalizeHexColorValue(color, fallback);
      return [
        parseInt(normalized.slice(1, 3), 16) / 255,
        parseInt(normalized.slice(3, 5), 16) / 255,
        parseInt(normalized.slice(5, 7), 16) / 255,
        alpha,
      ];
    }

    function writeStageUniform(values) {
      stageUniformValues.fill(0);
      stageUniformValues.set(values.slice(0, stageUniformValues.length));
      device.queue.writeBuffer(stageUniformBuffer, 0, stageUniformValues);
    }

    function drawStageFullscreenPipeline(
      pipelineToUse,
      bindGroup,
      loadOp = "load",
      vertexCount = 3,
    ) {
      const encoder = device.createCommandEncoder();
      encodeFullscreenPass(
        encoder,
        pipelineToUse,
        bindGroup,
        stageCurrentTextureView(),
        loadOp,
        vertexCount,
      );
      device.queue.submit([encoder.finish()]);
    }

    function stageTransformValues(transform) {
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      return [
        cos * transform.scaleX,
        -sin * transform.scaleY,
        transform.anchorX -
          cos * transform.scaleX * transform.pivotX +
          sin * transform.scaleY * transform.pivotY,
        sin * transform.scaleX,
        cos * transform.scaleY,
        transform.anchorY -
          sin * transform.scaleX * transform.pivotX -
          cos * transform.scaleY * transform.pivotY,
      ];
    }

    function resizeStage(nextWidth, nextHeight, nextDpr) {
      const cssWidth = Math.max(1, Number(nextWidth) || 1);
      const cssHeight = Math.max(1, Number(nextHeight) || 1);
      const dpr = Math.max(1, Math.min(2, Number(nextDpr) || 1));
      const pixelWidth = Math.round(cssWidth * dpr);
      const pixelHeight = Math.round(cssHeight * dpr);
      const changed =
        stageArtCanvas.width !== pixelWidth ||
        stageArtCanvas.height !== pixelHeight ||
        stageWidth !== cssWidth ||
        stageHeight !== cssHeight ||
        stageDpr !== dpr;
      stageWidth = cssWidth;
      stageHeight = cssHeight;
      stageDpr = dpr;
      if (!changed) return;
      stageArtCanvas.width = pixelWidth;
      stageArtCanvas.height = pixelHeight;
      configureStageContext();
    }

    function clearStageFrame() {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: stageCurrentTextureView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    function beginStageFrame({ bgColor, transparent = false }) {
      if (transparent) {
        clearStageFrame();
        return;
      }
      const dark = bgColor === "#2B2926";
      const base = rgbaFromHex(bgColor, "#F2F5FA", 1);
      const glow = dark
        ? rgbaFromHex("#F4F7FB", "#F4F7FB", 0.1)
        : rgbaFromHex("#FFFFFF", "#FFFFFF", 0.18);
      const glowColor = [
        lerp(base[0], glow[0], glow[3]),
        lerp(base[1], glow[1], glow[3]),
        lerp(base[2], glow[2], glow[3]),
        1,
      ];
      writeStageUniform([
        stageWidth,
        stageHeight,
        0,
        0,
        base[0],
        base[1],
        base[2],
        base[3],
        glowColor[0],
        glowColor[1],
        glowColor[2],
        glowColor[3],
        stageWidth * 0.45,
        stageHeight * 0.42,
        stageHeight * 0.58,
        0,
      ]);
      drawStageFullscreenPipeline(
        stageBackgroundPipeline,
        stageBackgroundBindGroup,
        "clear",
      );
    }

    function drawStageGroundShadow(cx, cy, rx, voice) {
      writeStageUniform([
        stageWidth,
        stageHeight,
        0,
        0,
        cx,
        cy,
        rx,
        0,
        31 / 255,
        36 / 255,
        48 / 255,
        0.18 + voice * 0.05,
      ]);
      drawStageFullscreenPipeline(
        stageGroundShadowPipeline,
        stageGroundShadowBindGroup,
      );
    }

    function drawTextureQuadToTarget(
      bindGroup,
      corners,
      {
        alpha = 1,
        height: targetHeight = stageHeight,
        loadOp = "load",
        targetView = stageCurrentTextureView(),
        width: targetWidth = stageWidth,
      } = {},
    ) {
      if (!bindGroup || !corners?.every(Boolean)) return;
      writeStageUniform([
        targetWidth,
        targetHeight,
        clamp(alpha, 0, 1),
        0,
        corners[0].x,
        corners[0].y,
        corners[1].x,
        corners[1].y,
        corners[2].x,
        corners[2].y,
        corners[3].x,
        corners[3].y,
        0,
        0,
        1,
        1,
      ]);
      const encoder = device.createCommandEncoder();
      encodeFullscreenPass(encoder, stageQuadPipeline, bindGroup, targetView, loadOp, 6);
      device.queue.submit([encoder.finish()]);
    }

    function drawQuadToTarget(image, corners, options = {}) {
      if (!image) return;
      drawTextureQuadToTarget(textureFor(image).stageQuadBindGroup, corners, options);
    }

    function drawStageQuad(image, corners, { alpha = 1 } = {}) {
      drawQuadToTarget(image, corners, { alpha });
    }

    function drawFrontHairShadowToStage(corners, { alpha = 1 } = {}) {
      drawTextureQuadToTarget(shadowCompositeStageQuadBindGroup, corners, {
        alpha,
      });
    }

    function drawStageWarpedImage(image, cols, rows, options = {}) {
      if (!image || !options.characterTransform) return false;
      const gpuWarpSpec = options.gpuWarpSpec || null;
      const imgW = image.naturalWidth || image.width;
      const imgH = image.naturalHeight || image.height;
      const geometry = meshGeometry(cols, rows, imgW, imgH);
      writeMeshUniforms(
        stageWidth,
        stageHeight,
        stageTransformValues(options.characterTransform),
        clamp(options.alpha ?? 1, 0, 1),
      );
      return drawGpuWarp(image, geometry, gpuWarpSpec, stageCurrentTextureView(), true);
    }

    function clearItemDeformSource() {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: itemDeformSourceView,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    function drawItemDeformSource(image, corners, { alpha = 1 } = {}) {
      clearItemDeformSource();
      drawQuadToTarget(image, corners, {
        alpha,
        height,
        targetView: itemDeformSourceView,
        width,
      });
    }

    function drawItemDeformSourceWarpedToStage(cols, rows, options = {}) {
      if (!options.characterTransform) return false;
      const geometry = meshGeometry(cols, rows, width, height);
      writeMeshUniforms(
        stageWidth,
        stageHeight,
        stageTransformValues(options.characterTransform),
        clamp(options.alpha ?? 1, 0, 1),
      );
      return drawGpuWarpTextureEntry(
        itemDeformSourceEntry,
        geometry,
        options.gpuWarpSpec || null,
        stageCurrentTextureView(),
        true,
        "load",
      );
    }

    function drawItemDeformSourceWarpedToShadowReceiver(cols, rows, options = {}) {
      const geometry = meshGeometry(cols, rows, width, height);
      writeMeshUniforms();
      return drawGpuWarpTextureEntry(
        itemDeformSourceEntry,
        geometry,
        options.gpuWarpSpec || null,
        shadowReceiverView,
        false,
        "load",
      );
    }

    function drawHighlightSource(points, { alpha = 1, aspect = 1, diameter = 16 } = {}) {
      const left = points?.[0];
      const right = points?.[1];
      if (!left || !right) return false;
      const radiusY = Math.max(0.001, diameter * 0.5);
      const radiusX = Math.max(0.001, radiusY * aspect);
      const leftRotation = eyeLensRotationForIndex(0);
      const rightRotation = eyeLensRotationForIndex(1);
      writeStageUniform([
        width,
        height,
        clamp(alpha, 0, 1),
        0,
        left.x,
        left.y,
        radiusX,
        radiusY,
        right.x,
        right.y,
        radiusX,
        radiusY,
        Math.cos(leftRotation),
        Math.sin(leftRotation),
        Math.cos(rightRotation),
        Math.sin(rightRotation),
      ]);
      const encoder = device.createCommandEncoder();
      encodeFullscreenPass(
        encoder,
        stageHighlightSourcePipeline,
        stageHighlightSourceBindGroup,
        highlightSourceView,
        "clear",
      );
      device.queue.submit([encoder.finish()]);
      return true;
    }

    function drawHighlightSourceWarpedToStage(cols, rows, options = {}) {
      if (!options.characterTransform) return false;
      const geometry = meshGeometry(cols, rows, width, height);
      writeMeshUniforms(
        stageWidth,
        stageHeight,
        stageTransformValues(options.characterTransform),
        clamp(options.alpha ?? 1, 0, 1),
      );
      return drawGpuWarpTextureEntry(
        highlightSourceEntry,
        geometry,
        options.gpuWarpSpec || null,
        stageCurrentTextureView(),
        true,
        "load",
      );
    }

    function clearFrontHairShadowReceiver() {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: shadowReceiverView,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    function drawFrontHairShadowReceiverQuad(image, corners, { alpha = 1 } = {}) {
      drawQuadToTarget(image, corners, {
        alpha,
        height,
        targetView: shadowReceiverView,
        width,
      });
    }

    function drawFrontHairShadowReceiverWarpedImage(image, cols, rows, options = {}) {
      if (!image) return false;
      const gpuWarpSpec = options.gpuWarpSpec || null;
      const imgW = image.naturalWidth || image.width;
      const imgH = image.naturalHeight || image.height;
      const geometry = meshGeometry(cols, rows, imgW, imgH);
      writeMeshUniforms();
      return drawGpuWarp(image, geometry, gpuWarpSpec, shadowReceiverView, false, "load");
    }

    function drawFrontHairShadowComposite(image, cols, rows, options = {}) {
      if (disposed || resources.lost) throw new Error("WebGPU mesh renderer is unavailable");
      const gpuWarpSpec = options.gpuWarpSpec || null;
      if (gpuWarpSpec?.kind !== "hair-shadow-v1") {
        throw new Error("WebGPU front hair shadow draw requires a shadow hair warp spec");
      }

      const imgW = image.naturalWidth || image.width;
      const imgH = image.naturalHeight || image.height;
      const geometry = meshGeometry(cols, rows, imgW, imgH);
      writeMeshUniforms();
      if (!drawGpuWarp(image, geometry, gpuWarpSpec, shadowShapeView)) {
        throw new Error("WebGPU front hair shadow warp failed");
      }
      const blur = Math.max(0, Number(options.blur) || 0);
      device.queue.writeBuffer(
        shadowBlurHorizontalUniformBuffer,
        0,
        new Float32Array([blur / width, 0, 0, 0]),
      );
      device.queue.writeBuffer(
        shadowBlurVerticalUniformBuffer,
        0,
        new Float32Array([0, blur / height, 0, 0]),
      );

      const maskBindGroup = device.createBindGroup({
        layout: shadowMaskPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: shadowShapeView },
          { binding: 2, resource: shadowReceiverView },
        ],
      });
      const encoder = device.createCommandEncoder();
      encodeFullscreenPass(
        encoder,
        shadowBlurPipeline,
        shadowBlurHorizontalBindGroup,
        shadowBlurView,
      );
      encodeFullscreenPass(
        encoder,
        shadowBlurPipeline,
        shadowBlurVerticalBindGroup,
        shadowShapeView,
      );

      encodeFullscreenPass(encoder, shadowMaskPipeline, maskBindGroup, shadowCompositeView);
      device.queue.submit([encoder.finish()]);
      return true;
    }

    return {
      canvas: meshCanvas,
      rendererKind: 'webgpu',
      dispose() {
        if (disposed) return;
        disposed = true;
        textures.forEach((entry) => destroyTextureEntry(entry));
        textureSet.forEach((texture) => texture.destroy());
        geometryCache.forEach((geometry) => {
          geometry.sourcePositionBuffer.destroy();
          geometry.texcoordBuffer.destroy();
        });
        faceRootControlPointBuffer.destroy();
        faceControlPointBuffer.destroy();
        faceUniformBuffer.destroy();
        highlightSourceTexture.destroy();
        hairBundleDefBuffer.destroy();
        hairBundleSampleBuffer.destroy();
        hairSpringBuffer.destroy();
        hairUniformBuffer.destroy();
        itemDeformSourceTexture.destroy();
        shadowBlurHorizontalUniformBuffer.destroy();
        shadowBlurTexture.destroy();
        shadowBlurVerticalUniformBuffer.destroy();
        shadowCompositeTexture.destroy();
        shadowReceiverTexture.destroy();
        shadowShapeTexture.destroy();
        stageUniformBuffer.destroy();
        uniformBuffer.destroy();
        textures.clear();
        textureSet.clear();
        geometryCache.clear();
        context.unconfigure();
        stageContext.unconfigure();
      },
      beginStageFrame,
      clearFrontHairShadowReceiver,
      drawFrontHairShadowComposite,
      drawFrontHairShadowReceiverQuad,
      drawFrontHairShadowReceiverWarpedImage,
      drawFrontHairShadowToStage,
      drawItemDeformSource,
      drawItemDeformSourceWarpedToShadowReceiver,
      drawItemDeformSourceWarpedToStage,
      drawHighlightSource,
      drawHighlightSourceWarpedToStage,
      drawStageGroundShadow,
      drawStageQuad,
      drawStageWarpedImage,
      isLost() {
        return disposed || resources.lost;
      },
      draw(image, cols, rows, options = {}) {
        if (disposed || resources.lost) throw new Error("WebGPU mesh renderer is unavailable");
        const imgW = image.naturalWidth || image.width;
        const imgH = image.naturalHeight || image.height;
        const geometry = meshGeometry(cols, rows, imgW, imgH);
        writeMeshUniforms();
        if (drawGpuWarp(image, geometry, options.gpuWarpSpec)) return;
        throw new Error("WebGPU mesh draw is missing a GPU warp spec");
      },
      resizeStage,
    };
  }

  function createMeshRenderer(width, height) {
    const meshCanvas = document.createElement("canvas");
    meshCanvas.width = width;
    meshCanvas.height = height;
    const gl = meshCanvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return null;
    let contextLost = false;
    meshCanvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      contextLost = true;
    });
    meshCanvas.addEventListener("webglcontextrestored", () => {
      // 既存のprogram/buffer/textureは復元後に無効になるため、
      // 次回drawでCanvas2Dフォールバックへ切り替える。
      contextLost = true;
    });

    const vertexSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      uniform vec2 u_resolution;
      varying vec2 v_texcoord;

      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 clip = zeroToOne * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
        v_texcoord = a_texcoord;
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform sampler2D u_image;
      varying vec2 v_texcoord;

      void main() {
        gl_FragColor = texture2D(u_image, v_texcoord);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("WebGL shader creation failed");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(info || "WebGL shader compile failed");
      }
      return shader;
    };

    const program = gl.createProgram();
    if (!program) throw new Error("WebGL program creation failed");
    let vertexShader = null;
    let fragmentShader = null;
    try {
      vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
      fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
    } catch (error) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      throw error;
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const imageLocation = gl.getUniformLocation(program, "u_image");
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) throw new Error("WebGL buffer creation failed");
    const textures = new WeakMap();
    const textureSet = new Set();
    const geometryCache = new Map();
    let disposed = false;

    function meshGeometry(cols, rows, imgW, imgH) {
      const cacheKey = `${cols}x${rows}@${imgW}x${imgH}`;
      const cached = geometryCache.get(cacheKey);
      if (cached) return cached;

      const pointCount = (cols + 1) * (rows + 1);
      const vertexCount = cols * rows * 6;
      const gridX = new Float32Array(pointCount);
      const gridY = new Float32Array(pointCount);
      const dstGrid = new Float32Array(pointCount * 2);
      const pointIndices = new Uint16Array(vertexCount);
      const positions = new Float32Array(vertexCount * 2);
      const texcoords = new Float32Array(vertexCount * 2);

      for (let y = 0; y <= rows; y += 1) {
        for (let x = 0; x <= cols; x += 1) {
          const idx = y * (cols + 1) + x;
          gridX[idx] = (x / cols) * CROP.w;
          gridY[idx] = (y / rows) * CROP.h;
        }
      }

      let vertex = 0;
      const pushIndex = (idx) => {
        pointIndices[vertex] = idx;
        texcoords[vertex * 2] = (CROP.x + gridX[idx]) / imgW;
        texcoords[vertex * 2 + 1] = (CROP.y + gridY[idx]) / imgH;
        vertex += 1;
      };

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const i00 = y * (cols + 1) + x;
          const i10 = i00 + 1;
          const i01 = i00 + cols + 1;
          const i11 = i01 + 1;
          pushIndex(i00);
          pushIndex(i10);
          pushIndex(i11);
          pushIndex(i00);
          pushIndex(i11);
          pushIndex(i01);
        }
      }

      const texcoordBuffer = gl.createBuffer();
      if (!texcoordBuffer) throw new Error("WebGL buffer creation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

      const geometry = { gridX, gridY, dstGrid, pointIndices, positions, texcoordBuffer, vertexCount };
      geometryCache.set(cacheKey, geometry);
      return geometry;
    }

    function textureFor(image) {
      const cached = textures.get(image);
      const version = Number(image?.__purupuruTextureVersion) || 0;
      if (cached && cached.version === version) return cached.texture;

      const texture = cached?.texture || gl.createTexture();
      if (!texture) throw new Error("WebGL texture creation failed");
      textureSet.add(texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      textures.set(image, { texture, version });
      return texture;
    }

    return {
      canvas: meshCanvas,
      rendererKind: "canvas",
      dispose() {
        if (disposed) return;
        disposed = true;
        const canDelete = !gl.isContextLost?.();
        if (canDelete) {
          textureSet.forEach((texture) => gl.deleteTexture(texture));
          geometryCache.forEach((geometry) => {
            if (geometry.texcoordBuffer) gl.deleteBuffer(geometry.texcoordBuffer);
          });
          gl.deleteBuffer(positionBuffer);
          gl.deleteProgram(program);
        }
        textureSet.clear();
        geometryCache.clear();
        contextLost = true;
      },
      draw(image, warpFn, cols, rows) {
        if (disposed || contextLost || gl.isContextLost?.()) {
          throw new Error("WebGL context lost");
        }
        const imgW = image.naturalWidth || image.width;
        const imgH = image.naturalHeight || image.height;
        const geometry = meshGeometry(cols, rows, imgW, imgH);
        const { gridX, gridY, dstGrid, pointIndices, positions, texcoordBuffer, vertexCount } = geometry;

        for (let i = 0; i < gridX.length; i += 1) {
          const p = warpFn(gridX[i], gridY[i]);
          dstGrid[i * 2] = p.x;
          dstGrid[i * 2 + 1] = p.y;
        }

        for (let i = 0; i < pointIndices.length; i += 1) {
          const idx = pointIndices[i];
          positions[i * 2] = dstGrid[idx * 2];
          positions[i * 2 + 1] = dstGrid[idx * 2 + 1];
        }

        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, width, height);
        gl.uniform1i(imageLocation, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureFor(image));

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.enableVertexAttribArray(texcoordLocation);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
      },
    };
  }

  function drawMeshCroppedImage(targetCtx, image, warpFn, cols = 12, rows = 8, options = {}) {
    if (!image) return;
    if (OBS_MODE) {
      const quality = currentObsQuality();
      const qualityScale = quality === "low" ? 0.58 : quality === "standard" ? 0.82 : 1;
      cols = Math.max(4, Math.round(cols * qualityScale));
      rows = Math.max(3, Math.round(rows * qualityScale));
    }
    if (meshRenderer && meshRenderer.rendererKind !== "webgpu") {
      try {
        if (meshRenderer.draw(image, warpFn, cols, rows, options) !== false) {
          targetCtx.drawImage(meshRenderer.canvas, 0, 0);
          return;
        }
      } catch (error) {
        const failedRendererKind = meshRenderer.rendererKind;
        console.warn(rendererKindLabel(failedRendererKind) + "メッシュ描画に失敗したためCanvas描画へ切り替えます。", error);
        meshRenderer.dispose?.();
        meshRenderer = null;
        activeRendererKind = "canvas";
        if (failedRendererKind === "webgpu") {
          try {
            meshRenderer = createMeshRenderer(CROP.w, CROP.h);
          } catch (fallbackError) {
            console.warn("WebGLメッシュ初期化に失敗したためCanvas描画で続行します。", fallbackError);
          }
        }
        syncRendererModeUi();
      }
    }

    // WebGLが使えない/失敗した環境ではCanvas 2Dの三角形メッシュで描く。
    const srcGrid = [];
    const dstGrid = [];
    for (let y = 0; y <= rows; y += 1) {
      for (let x = 0; x <= cols; x += 1) {
        const p = { x: (x / cols) * CROP.w, y: (y / rows) * CROP.h };
        srcGrid.push(p);
        dstGrid.push(warpFn(p.x, p.y));
      }
    }
    const at = (grid, x, y) => grid[y * (cols + 1) + x];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const s00 = at(srcGrid, x, y);
        const s10 = at(srcGrid, x + 1, y);
        const s01 = at(srcGrid, x, y + 1);
        const s11 = at(srcGrid, x + 1, y + 1);
        const d00 = at(dstGrid, x, y);
        const d10 = at(dstGrid, x + 1, y);
        const d01 = at(dstGrid, x, y + 1);
        const d11 = at(dstGrid, x + 1, y + 1);
        drawTexturedTriangle(targetCtx, image, [s00, s10, s11], [d00, d10, d11]);
        drawTexturedTriangle(targetCtx, image, [s00, s11, s01], [d00, d11, d01]);
      }
    }
  }

  function currentFaceRigMetrics() {
    if (
      faceRigMetricsCacheFrame === motionFrameId &&
      faceRigMetricsCacheCenterSource === faceCenterRaw &&
      faceRigMetricsCacheDepthSource === faceDepthAnchorsRaw &&
      faceRigMetricsCacheEyesSource === highlightEyesRaw &&
      faceRigMetricsCache
    ) {
      return faceRigMetricsCache;
    }
    const faceCenter = currentFaceCenter();
    const anchors = currentFaceDepthAnchors() || defaultFaceDepthAnchors();
    const leftEye = anchors.leftEye;
    const rightEye = anchors.rightEye;
    const nose = anchors.nose;
    const mouth = anchors.mouth;
    const chin = anchors.chin;
    const eyeMid = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };
    const eyeDistance = clamp(Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y), 80, 520);
    const points = [leftEye, rightEye, nose, mouth, chin, faceCenter];
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const centerX = clamp((faceCenter.x * 2 + eyeMid.x + nose.x + mouth.x + chin.x) / 6, 0, CROP.w);
    const topY = Math.min(
      faceCenter.y - eyeDistance * 1.15,
      eyeMid.y - eyeDistance * 1.12,
      nose.y - eyeDistance * 1.35
    );
    const bottomY = Math.max(
      chin.y + eyeDistance * 0.18,
      mouth.y + eyeDistance * 0.48,
      faceCenter.y + eyeDistance * 1.2
    );
    const radiusX = clamp(Math.max(eyeDistance * 1.15, (maxX - minX) * 0.58 + eyeDistance * 0.42), 160, 460);
    const radiusY = clamp(Math.max((bottomY - topY) / 2, eyeDistance * 1.15), 200, 560);
    const centerY = clamp((topY + bottomY) / 2, 0, CROP.h);
    const scale = clamp(eyeDistance / 220, 0.62, 1.65);
    const result = {
      center: { x: centerX, y: centerY },
      faceCenter,
      anchors,
      eyeMid,
      eyeDistance,
      radiusX,
      radiusY,
      topY: centerY - radiusY,
      bottomY: centerY + radiusY,
      scale,
    };
    faceRigMetricsCache = result;
    faceRigMetricsCacheCenterSource = faceCenterRaw;
    faceRigMetricsCacheDepthSource = faceDepthAnchorsRaw;
    faceRigMetricsCacheEyesSource = highlightEyesRaw;
    faceRigMetricsCacheFrame = motionFrameId;
    return faceRigMetricsCache;
  }

  function normalizedLocal(x, y) {
    const faceCenter = currentFaceCenter();
    return {
      nx: (x - faceCenter.x) / (CROP.w * 0.5),
      ny: (y - faceCenter.y) / (CROP.h * 0.5),
    };
  }

  function warpInfo(x, y) {
    const metrics = currentFaceRigMetrics();
    const { nx, ny } = normalizedLocal(x, y);
    const absX = Math.abs(nx);
    const absY = Math.abs(ny);
    const dome = clamp(1 - absX * 0.42 - absY * 0.28, 0, 1);
    const lowerMask = clamp((y - (metrics.center.y - metrics.radiusY * 0.38)) / Math.max(1, metrics.radiusY * 0.82), 0, 1);
    const upperMask = 1 - clamp((y - metrics.topY) / Math.max(1, metrics.radiusY * 0.56), 0, 1);
    const sideMask = clamp(absX, 0, 1);
    return { nx, ny, absX, absY, dome, lowerMask, upperMask, sideMask };
  }

  function faceTurnDepthAmount() {
    return clamp(Number(state.faceTurnDepth) || 0, 0, 200) / 100;
  }

  function faceTurnVerticalAmount() {
    return clamp(Number(state.faceTurnVertical) || 0, 0, 150) / 100;
  }

  function faceHeadMask(x, y) {
    // 顔PNGの頭部だけにかける楕円マスク。
    // 固定座標ではなく、ウィザード/奥行き点編集で選んだ左右目・鼻・口・顎から顔範囲を作る。
    const metrics = currentFaceRigMetrics();
    const u = (x - metrics.center.x) / metrics.radiusX;
    const v = (y - metrics.center.y) / metrics.radiusY;
    const dist = Math.sqrt(u * u * 0.94 + v * v * 1.04);
    const ellipse = 1 - smoothstep(0.74, 1.14, dist);
    const topFadeStart = metrics.topY;
    const topFadeEnd = metrics.topY + metrics.radiusY * 0.22;
    const bottomFadeStart = metrics.bottomY - metrics.radiusY * 0.18;
    const bottomFadeEnd = metrics.bottomY;
    const vertical = smoothstep(topFadeStart, topFadeEnd, y) * (1 - smoothstep(bottomFadeStart, bottomFadeEnd, y));
    return clamp(ellipse * vertical, 0, 1);
  }

  function faceFeatureMask(x, y, cx, cy, rx, ry) {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return 1 - smoothstep(0.72, 1.06, Math.sqrt(dx * dx + dy * dy));
  }

  function currentEyeCentersForFaceRig() {
    const anchors = currentFaceDepthAnchors();
    return [anchors.leftEye, anchors.rightEye];
  }

  function faceDepthMap(x, y, mask = faceHeadMask(x, y)) {
    // パーツ分けなしの疑似奥行き。鼻筋・口・顎の中心線を深く、目/頬を中間、輪郭を浅くする。
    if (mask <= 0.001) return 0;

    const metrics = currentFaceRigMetrics();
    const faceCenter = metrics.faceCenter;
    const anchors = metrics.anchors;
    const u = clamp((x - metrics.center.x) / metrics.radiusX, -1.35, 1.35);
    const v = clamp((y - metrics.center.y) / metrics.radiusY, -1.3, 1.3);
    const absU = Math.abs(u);
    const faceVertical = 1 - smoothstep(1.02, 1.3, Math.abs(v));
    const roundness = clamp(1 - absU * 0.86 - Math.abs(v) * 0.24, 0, 1);
    const centerRidge = (1 - smoothstep(0.08, 0.48, absU)) * faceVertical;

    const leftEye = anchors.leftEye;
    const rightEye = anchors.rightEye;
    const eyeRx = Math.max(54, metrics.eyeDistance * 0.43);
    const eyeRy = Math.max(38, metrics.eyeDistance * 0.26);
    const cheekRx = Math.max(76, metrics.eyeDistance * 0.52);
    const cheekRy = Math.max(72, metrics.eyeDistance * 0.45);
    const cheekOffsetX = Math.max(90, metrics.eyeDistance * 0.54);
    const cheekY = lerp(anchors.nose.y, anchors.mouth.y, 0.72);
    const eyeDepth = Math.max(
      faceFeatureMask(x, y, leftEye.x, leftEye.y, eyeRx, eyeRy),
      faceFeatureMask(x, y, rightEye.x, rightEye.y, eyeRx, eyeRy),
    ) * 0.48;
    const cheekDepth = Math.max(
      faceFeatureMask(x, y, faceCenter.x - cheekOffsetX, cheekY, cheekRx, cheekRy),
      faceFeatureMask(x, y, faceCenter.x + cheekOffsetX, cheekY, cheekRx, cheekRy),
    ) * 0.38;
    const noseDepth = faceFeatureMask(x, y, anchors.nose.x, anchors.nose.y, Math.max(48, metrics.eyeDistance * 0.34), Math.max(70, metrics.eyeDistance * 0.58)) * 1.0;
    const mouthDepth = faceFeatureMask(x, y, anchors.mouth.x, anchors.mouth.y, Math.max(72, metrics.eyeDistance * 0.49), Math.max(48, metrics.eyeDistance * 0.3)) * 0.78;
    const chinDepth = faceFeatureMask(x, y, anchors.chin.x, anchors.chin.y, Math.max(96, metrics.eyeDistance * 0.62), Math.max(58, metrics.eyeDistance * 0.38)) * 0.66;
    const shallowContour = (0.08 + 0.2 * roundness) * mask;

    return clamp(
      Math.max(shallowContour, centerRidge * 0.42, eyeDepth, cheekDepth, noseDepth, mouthDepth, chinDepth) * mask,
      0,
      1,
    );
  }

  function applyFaceFeatureTurnWarp(x, y, point, amount, sign, mask, depth) {
    const metrics = currentFaceRigMetrics();
    const anchors = metrics.anchors;
    // 鼻マスクは縦方向を最初から絞り、口マスク側のガードを重ねずに分離する。
    const noseMask = faceFeatureMask(x, y, anchors.nose.x, anchors.nose.y, Math.max(30, metrics.eyeDistance * 0.18), Math.max(36, metrics.eyeDistance * 0.23)) * mask;
    const noseBridgeMask = faceFeatureMask(x, y, anchors.nose.x, lerp(metrics.eyeMid.y, anchors.nose.y, 0.46), Math.max(36, metrics.eyeDistance * 0.21), Math.max(56, metrics.eyeDistance * 0.34)) * mask;
    const leftEyeMask = faceFeatureMask(x, y, anchors.leftEye.x, anchors.leftEye.y, Math.max(56, metrics.eyeDistance * 0.4), Math.max(34, metrics.eyeDistance * 0.24)) * mask;
    const rightEyeMask = faceFeatureMask(x, y, anchors.rightEye.x, anchors.rightEye.y, Math.max(56, metrics.eyeDistance * 0.4), Math.max(34, metrics.eyeDistance * 0.24)) * mask;
    const eyeMask = Math.max(leftEyeMask, rightEyeMask);
    const mouthMask = faceFeatureMask(x, y, anchors.mouth.x, anchors.mouth.y, Math.max(54, metrics.eyeDistance * 0.38), Math.max(34, metrics.eyeDistance * 0.22)) * mask;
    const chinMask = faceFeatureMask(x, y, anchors.chin.x, anchors.chin.y, Math.max(66, metrics.eyeDistance * 0.46), Math.max(42, metrics.eyeDistance * 0.28)) * mask;
    const motionScale = metrics.scale;
    const mouthTurnDampen = 1 - clamp(mouthMotionLevel, 0, 1) * 0.32;

    // 顔全体は前段のプレーン回転に任せ、ここでは鼻筋・目・口・顎アンカー周辺だけを控えめに局所パララックスさせる。
    // 口元は口パク時のぷに変形と重なるため、開口中は少し弱める。
    point.x += sign * amount * motionScale * (
      noseMask * 60 +
      noseBridgeMask * 10 +
      eyeMask * 2.4 +
      mouthMask * 7 * mouthTurnDampen +
      chinMask * 6
    );
    // 顔面が横向きに倒れる時、鼻だけ真横移動だと貼り付き感が出るため、鼻先を少し下へ落とす。
    point.y += amount * motionScale * (noseMask * 9 + noseBridgeMask * 1.2) + amount * depth * motionScale * (mouthMask * 0.45 + chinMask * 0.65);
    return point;
  }

  function faceTurnWarpPoint(x, y, point) {
    if (state.editMode) return point;
    const depthStrength = faceTurnDepthAmount();
    const verticalDepth = faceTurnVerticalAmount();
    const yaw = clamp(state.angleX * (state.angleStrength / 100), -1.6, 1.6);
    const yawAmount = Math.min(1.25, Math.abs(yaw));
    const amount = yawAmount * depthStrength;
    // 立体上下補正は、横方向の奥行き量を下げても効きが消えないよう半独立にする。
    const verticalAmount = yawAmount * verticalDepth * (0.55 + depthStrength * 0.45);
    if (amount <= 0.001 && verticalAmount <= 0.001) return point;

    const sign = yaw < 0 ? -1 : 1;
    const metrics = currentFaceRigMetrics();
    const anchors = metrics.anchors;
    const u = clamp((x - metrics.center.x) / metrics.radiusX, -1.35, 1.35);
    const mask = faceHeadMask(x, y);
    if (mask <= 0.001) return point;

    const depth = faceDepthMap(x, y, mask);
    const lower = smoothstep(anchors.mouth.y - metrics.eyeDistance * 0.5, anchors.chin.y, y) * mask;
    const upper = (1 - smoothstep(metrics.eyeMid.y - metrics.eyeDistance * 1.05, metrics.eyeMid.y - metrics.eyeDistance * 0.2, y)) * mask;
    const featureDepthBlend = smoothstep(0.01, 0.15, depthStrength);
    const localAmount = Math.min(0.46, yawAmount * featureDepthBlend * (0.2 + depthStrength * 0.8));

    // 広域の立体ワープは前段の顔プレーン回転と競合して歪みに見えやすい。
    // ここでは斜め補正用の上下ねじれだけを残し、横方向の立体感はアンカー周辺の局所マスクで足す。
    const twistY = sign * verticalAmount * u * mask * (8 + depth * 12 + lower * 5 - upper * 4);

    point.y += twistY;
    return applyFaceFeatureTurnWarp(x, y, point, localAmount, sign, mask, depth);
  }

  function applyDiagonalFaceWarp(x, y, point) {
    if (
      !state.diagonalFaceWarpEnabled ||
      state.editMode ||
      state.eyeSetupMode ||
      state.highlightSetupMode ||
      state.faceDepthSetupMode ||
      state.neckPivotSetupMode ||
      state.hairBundleSetupMode ||
      characterWizard?.active
    ) {
      return point;
    }

    const yaw = clamp(state.angleX * (state.angleStrength / 100), -1.6, 1.6);
    const pitch = clamp(state.angleY * (state.angleStrength / 100), -1.6, 1.6);
    const yawBlend = smoothstep(0.12, 0.82, Math.abs(yaw));
    // デフォルトの下方向可動範囲は30%なので、弱い下向きでも少し分かるように早めに効かせる。
    const pitchBlend = smoothstep(0.05, 0.38, Math.abs(pitch));
    const depthBlend = 0.68 + Math.min(1, faceTurnDepthAmount()) * 0.28;
    const amount = yawBlend * pitchBlend * depthBlend;
    if (amount <= 0.001) return point;

    const mask = faceHeadMask(x, y);
    if (mask <= 0.001) return point;

    const sign = yaw < 0 ? -1 : 1;
    const metrics = currentFaceRigMetrics();
    const anchors = metrics.anchors;
    const mouth = anchors.mouth;
    const chin = anchors.chin;
    const leftEye = anchors.leftEye;
    const rightEye = anchors.rightEye;
    const featureScale = metrics.scale;
    const u = clamp((x - metrics.center.x) / metrics.radiusX, -1.35, 1.35);
    const depth = faceDepthMap(x, y, mask);
    const sideFromMouth = clamp((x - mouth.x) / Math.max(140, metrics.eyeDistance * 0.94), -1, 1);

    const leftEyeMask = faceFeatureMask(x, y, leftEye.x, leftEye.y, Math.max(60, metrics.eyeDistance * 0.44), Math.max(40, metrics.eyeDistance * 0.27)) * mask;
    const rightEyeMask = faceFeatureMask(x, y, rightEye.x, rightEye.y, Math.max(60, metrics.eyeDistance * 0.44), Math.max(40, metrics.eyeDistance * 0.27)) * mask;
    const eyeMask = Math.max(leftEyeMask, rightEyeMask);
    const mouthMask = faceFeatureMask(x, y, mouth.x, mouth.y + 4 * featureScale, Math.max(78, metrics.eyeDistance * 0.54), Math.max(50, metrics.eyeDistance * 0.33)) * mask;
    const chinMask = faceFeatureMask(x, y, chin.x, chin.y - 2 * featureScale, Math.max(100, metrics.eyeDistance * 0.68), Math.max(66, metrics.eyeDistance * 0.44)) * mask;
    const cheekOffsetX = Math.max(88, metrics.eyeDistance * 0.52);
    const cheekOffsetY = Math.max(30, metrics.eyeDistance * 0.18);
    const cheekMask =
      Math.max(
        faceFeatureMask(x, y, mouth.x - cheekOffsetX, mouth.y + cheekOffsetY, Math.max(82, metrics.eyeDistance * 0.54), Math.max(72, metrics.eyeDistance * 0.48)),
        faceFeatureMask(x, y, mouth.x + cheekOffsetX, mouth.y + cheekOffsetY, Math.max(82, metrics.eyeDistance * 0.54), Math.max(72, metrics.eyeDistance * 0.48)),
      ) * mask;
    const lowerBand =
      smoothstep(mouth.y - metrics.eyeDistance * 0.1, chin.y + metrics.eyeDistance * 0.28, y) *
      (1 - smoothstep(chin.y + metrics.eyeDistance * 0.3, chin.y + metrics.eyeDistance * 0.86, y)) *
      (1 - smoothstep(0.86, 1.26, Math.abs((x - mouth.x) / Math.max(170, metrics.eyeDistance * 1.12)))) *
      mask;
    const upperBand = (1 - smoothstep(metrics.eyeMid.y - metrics.eyeDistance * 0.68, metrics.eyeMid.y + metrics.eyeDistance * 0.24, y)) * mask;

    if (pitch > 0) {
      // downLeft / downRight 相当。口そのものは揺らさず、顎と頬だけを少し丸くする。
      const down = amount;
      const mouthGuard = 1 - mouthMask * 0.82;
      point.y += down * featureScale * (chinMask * 6.2 + cheekMask * 2.1 + lowerBand * 2.4 * mouthGuard);
      point.x -= sideFromMouth * down * featureScale * (chinMask * 1.9 + lowerBand * 0.7 * mouthGuard);
      point.x += sideFromMouth * down * featureScale * cheekMask * 0.85;
      point.y -= down * featureScale * eyeMask * 1.25;
      point.y += sign * down * featureScale * u * lowerBand * 0.85 * mouthGuard;
    }
    else {
      // upLeft / upRight 相当。効果は地味なので、額側だけ弱く持ち上げる。
      const up = amount * 0.58;
      point.y -= up * featureScale * (upperBand * (1.8 + depth * 0.8) + eyeMask * 0.4);
      point.y += up * featureScale * chinMask * 0.7;
    }

    return point;
  }

  function keyPoint(layer, key, col, row) {
    const base = baseGridPoint(col, row);
    const offsets = deformers?.[layer]?.keys?.[key];
    const offset = offsets?.[gridIndex(col, row)] || { x: 0, y: 0 };
    return { x: base.x + offset.x, y: base.y + offset.y };
  }

  function interpolatedControlPoint(layer, col, row) {
    const base = baseGridPoint(col, row);
    if (!deformers?.[layer]) return base;

    const center = keyPoint(layer, "center", col, row);
    const sxRaw = state.angleX * (state.angleStrength / 100);
    const syRaw = state.angleY * (state.angleStrength / 100);
    const sx = clamp(sxRaw, -1.6, 1.6);
    const sy = clamp(syRaw, -1.6, 1.6);
    const xKeyName = sx >= 0 ? "right" : "left";
    const yKeyName = sy >= 0 ? "down" : "up";
    const xKey = keyPoint(layer, xKeyName, col, row);
    const yKey = keyPoint(layer, yKeyName, col, row);
    const globalScale = state.editMode ? 1 : state.faceWarp / 100;
    const xScale = Math.abs(sx) * (state.editMode ? 1 : state.angleXDeform / 100) * globalScale;
    const yScale = Math.abs(sy) * (state.editMode ? 1 : state.angleYDeform / 100) * globalScale;

    return {
      x: center.x + (xKey.x - center.x) * xScale + (yKey.x - center.x) * yScale,
      y: center.y + (xKey.y - center.y) * xScale + (yKey.y - center.y) * yScale,
    };
  }

  function deformerWarpPoint(layer, x, y) {
    if (!deformers?.[layer]) return { x, y };
    const gx = clamp((x / CROP.w) * DEFORMER_COLS, 0, DEFORMER_COLS);
    const gy = clamp((y / CROP.h) * DEFORMER_ROWS, 0, DEFORMER_ROWS);
    const col = Math.min(DEFORMER_COLS - 1, Math.max(0, Math.floor(gx)));
    const row = Math.min(DEFORMER_ROWS - 1, Math.max(0, Math.floor(gy)));
    const tx = gx - col;
    const ty = gy - row;

    const p00 = interpolatedControlPoint(layer, col, row);
    const p10 = interpolatedControlPoint(layer, col + 1, row);
    const p01 = interpolatedControlPoint(layer, col, row + 1);
    const p11 = interpolatedControlPoint(layer, col + 1, row + 1);
    const top = { x: lerp(p00.x, p10.x, tx), y: lerp(p00.y, p10.y, tx) };
    const bottom = { x: lerp(p01.x, p11.x, tx), y: lerp(p01.y, p11.y, tx) };
    return {
      x: lerp(top.x, bottom.x, ty),
      y: lerp(top.y, bottom.y, ty),
    };
  }

  function editKeyPoint(layer, key, col, row) {
    return keyPoint(layer, key, col, row);
  }

  function applyMouthPuniWarp(x, y, point) {
    const amount = clamp(jawPuniLevel * pyokoScale(), 0, 1.35);
    if (amount <= 0.001 || state.editMode || state.eyeSetupMode || state.faceDepthSetupMode) return point;

    const metrics = currentFaceRigMetrics();
    const anchors = metrics.anchors;
    const mouth = anchors.mouth;
    const chin = anchors.chin;
    const featureScale = metrics.scale;
    const cheekOffsetX = Math.max(88, metrics.eyeDistance * 0.52);
    const cheekOffsetY = Math.max(30, metrics.eyeDistance * 0.19);
    const mouthMask = faceFeatureMask(x, y, mouth.x, mouth.y + 8 * featureScale, Math.max(82, metrics.eyeDistance * 0.55), Math.max(52, metrics.eyeDistance * 0.34));
    const chinMask = faceFeatureMask(x, y, chin.x, chin.y - 4 * featureScale, Math.max(104, metrics.eyeDistance * 0.7), Math.max(64, metrics.eyeDistance * 0.43));
    const leftCheekMask = faceFeatureMask(x, y, mouth.x - cheekOffsetX, mouth.y + cheekOffsetY, Math.max(82, metrics.eyeDistance * 0.54), Math.max(70, metrics.eyeDistance * 0.46));
    const rightCheekMask = faceFeatureMask(x, y, mouth.x + cheekOffsetX, mouth.y + cheekOffsetY, Math.max(82, metrics.eyeDistance * 0.54), Math.max(70, metrics.eyeDistance * 0.46));
    const cheekMask = Math.max(leftCheekMask, rightCheekMask);
    const lowerBand =
      smoothstep(mouth.y - metrics.eyeDistance * 0.12, chin.y + metrics.eyeDistance * 0.24, y) *
      (1 - smoothstep(chin.y + metrics.eyeDistance * 0.38, chin.y + metrics.eyeDistance * 0.9, y)) *
      (1 - smoothstep(0.82, 1.22, Math.abs((x - mouth.x) / Math.max(160, metrics.eyeDistance * 1.06))));
    const side = clamp((x - mouth.x) / Math.max(130, metrics.eyeDistance * 0.86), -1, 1);
    const openStretch = clamp(mouthMotionLevel, 0, 1);

    // 口が大きく開いた時だけ、口下〜顎を少し下げ、頬を外側/下方向へ逃がす。
    point.y += amount * featureScale * (mouthMask * 1.8 + chinMask * 6.2 + cheekMask * 2.0 + lowerBand * 3.8);
    point.x += side * amount * featureScale * (cheekMask * 2.6 + lowerBand * 1.1);
    point.y += lowerBand * openStretch * featureScale * 1.6;
    return point;
  }

  function faceWarpPoint(x, y) {
    const { nx, lowerMask, dome } = warpInfo(x, y);
    let p = deformerWarpPoint("face", x, y);
    p = faceTurnWarpPoint(x, y, p);
    p = applyDiagonalFaceWarp(x, y, p);

    // 声に合わせた軽いぷに感。表情PNG全体を崩しすぎないよう弱め。
    const voice = voiceLevel * pyokoScale();
    p.x += nx * voice * 3.5 * dome;
    p.y += -Math.abs(nx) * voice * 1.5 * dome + lowerMask * voice * 2.5;
    p = applyMouthPuniWarp(x, y, p);

    return p;
  }

  function faceRigidFollowPoint(x, y) {
    let p = deformerWarpPoint("face", x, y);
    p = faceTurnWarpPoint(x, y, p);
    p = applyDiagonalFaceWarp(x, y, p);
    return p;
  }

  function frontHairRootFollowAmount() {
    return activeCharacterSourceKind === DEMO_AVATAR03_SOURCE_KIND ? 1 : 0;
  }

  function frontHairRootFollowPoint(x, y, hairPoint) {
    const amount = frontHairRootFollowAmount();
    if (amount <= 0.001) return hairPoint || { x, y };
    const facePoint = faceRigidFollowPoint(x, y);
    if (!hairPoint) return facePoint;
    return {
      x: lerp(hairPoint.x, facePoint.x, amount),
      y: lerp(hairPoint.y, facePoint.y, amount),
    };
  }

  function frontHairRigidFollowPoint(x, y) {
    let p = deformerWarpPoint("frontHair", x, y);
    const crownLock = hairCrownRootLockMask(x, y);
    if (crownLock > 0.001) {
      const root = frontHairRootFollowPoint(x, y, { x, y });
      const followAmount = frontHairRootFollowAmount();
      p.x = lerp(p.x, root.x, crownLock * lerp(0.28, 0.72, followAmount));
      p.y = lerp(p.y, root.y, crownLock * lerp(0.72, 0.76, followAmount));
    }
    return p;
  }

  function maskFromY(n, threshold, power) {
    if (n <= threshold) return 0;
    return Math.pow((n - threshold) / (1 - threshold), power);
  }

  function landingPulse(beat) {
    return Math.pow(Math.abs(Math.cos(Math.PI * beat)), 18);
  }

  function hairWarpAmount() {
    return (state.hairWarp / 100) * HAIR_WARP_EFFECT_MULTIPLIER;
  }

  function hairBundleStrengthAmount() {
    return clamp(Number(state.hairBundleStrength) || 0, 0, 150) / 100;
  }

  function pyokopyokoHairShift(n, layer) {
    const isFront = layer === "front";
    const beat = animationSeconds * (160 / 60);
    const voiceMotionLevel = clamp(voiceLevel * pyokoScale(), 0, 2);
    const voiceMotion = 1.5;
    const idle = 1.2;
    const voiceBoost = 1 + voiceMotionLevel * voiceMotion * (isFront ? 0.36 : 0.42);
    const strength = hairWarpAmount() * 0.66 * voiceBoost;

    if (!isFront) {
      const mask = maskFromY(n, 0.1, 1.25);
      const slow = Math.sin(TAU * (beat - 0.255));
      const quick = Math.sin(TAU * 2 * (beat - 0.08));
      const wave = Math.sin(TAU * (beat * 0.72 + n * 1.55 + 0.16));
      const idleDrift = Math.sin(TAU * (beat * 0.42 + n * 0.82 + state.wobbleSeed));
      const idleFloat = Math.cos(TAU * (beat * 0.36 + n * 0.38));
      const voiceFlutter = Math.sin(TAU * (beat * 1.35 + n * 1.25 + 0.33)) * voiceMotionLevel;
      const land = landingPulse(beat) * Math.sin(TAU * (n * 0.72 + beat * 0.5));
      return {
        x: mask * strength * (
          8.5 * idle * idleDrift +
          4.2 * idle * wave +
          5.4 * voiceMotionLevel * slow +
          2.2 * voiceFlutter +
          3.2 * voiceMotionLevel * land
        ),
        y: mask * strength * (
          2.5 * idle * idleFloat +
          0.7 * voiceMotionLevel * quick
        ),
      };
    }

    const mask = maskFromY(n, 0.15, 1.16);
    const slow = Math.sin(TAU * (beat - 0.205));
    const quick = Math.sin(TAU * 2 * (beat - 0.045));
    const wave = Math.sin(TAU * (beat * 0.86 + n * 1.88 - 0.2));
    const idleDrift = Math.sin(TAU * (beat * 0.48 + n * 0.9 - 0.18));
    const idleFloat = Math.cos(TAU * (beat * 0.4 + n * 0.55 + state.wobbleSeed));
    const voiceFlutter = Math.sin(TAU * (beat * 1.55 + n * 1.4 - 0.27)) * voiceMotionLevel;
    const land = landingPulse(beat) * Math.sin(TAU * (n * 0.82 - 0.18));
    return {
      x: mask * strength * (
        8.2 * idle * idleDrift +
        4.0 * idle * wave +
        5.8 * voiceMotionLevel * slow +
        2.0 * voiceFlutter +
        3.0 * voiceMotionLevel * land
      ),
      y: mask * strength * (
        1.7 * idle * idleFloat +
        0.65 * voiceMotionLevel * quick
      ),
    };
  }

  // 髪のバネ物理を固定タイムステップで積分更新（★1 angleX 遅延 / ★2 波形慣性化 / ★3 伸びキャッシュ）。
  // tick 内の updateVoice 後・render 前に呼ぶ。delta が大きい（タブ復帰等）場合はサブステップ分割で発散防止。
  const HAIR_FIXED_DT = 1 / 120;
  const HAIR_ANGLE_LAG_X = 18;
  const HAIR_ANGLE_LAG_Y = 8;
  const HAIR_ANGLE_LAG_LIMIT_X = 18;
  const HAIR_ANGLE_LAG_LIMIT_Y = 8;
  const HAIR_HEAD_LAG_X = 1.6;
  const HAIR_HEAD_LAG_Y = 0.85;
  const HAIR_HEAD_LAG_LIMIT_X = 30;
  const HAIR_HEAD_LAG_LIMIT_Y = 18;
  const HAIR_SAMPLE_KEYS = [
    "anglePos",
    "anglePosY",
    "waveX",
    "waveY",
    "headPosX",
    "headPosY",
    "headVelX",
    "headVelY",
    "angleVel",
    "angleVelY",
    "stretchX",
    "stretchY",
  ];
  const hairWarpBaseSpringSample = {};
  const hairBundleSpringSampleScratch = {};
  const hairBundleRigMixScratch = {};
  const hairBundleRigMotionSpringScratch = {};
  const hairBundleRigMotionScratch = {
    spring: hairWarpBaseSpringSample,
    mask: 0,
    motionScale: 1,
    edgeScale: 1,
  };

  function ensureHairBundleSpringStates() {
    if (!hairBundleSpringStates) {
      hairBundleSpringStates = {};
      for (const def of HAIR_BUNDLE_DEFS) {
        hairBundleSpringStates[def.key] = newHairSpringState();
      }
    }
    return hairBundleSpringStates;
  }

  function hairBundleWaveTarget(t, def) {
    const base = pyokopyokoHairShift(t, def.layer);
    const beat = animationSeconds * (160 / 60);
    const side = def.key.includes("Left") ? -1 : def.key.includes("Right") ? 1 : 0;
    const strandDrift = Math.sin(TAU * (beat * 0.34 + def.phase + t * 0.62)) * hairWarpAmount() * 2.2;
    const tipFlutter = Math.sin(TAU * (beat * 0.74 + def.phase * 0.7 + t * 0.9)) * hairWarpAmount() * 0.9;
    return {
      x: base.x * def.swing + side * strandDrift * t * t,
      y: base.y * def.swing + tipFlutter * t * t * (def.layer === "back" ? 0.78 : 0.48),
    };
  }

  // 頭（キャラ中心）の移動成分を計算（computeCharacterTransform の centerX/Y 変動分と同一式）。
  // 髪がこの移動に遅れて追いつく位置バネ(★4)のターゲット。声/呼吸のバウンド + 顔向き/位置移動 + 呼吸スウェイ。
  function computeHeadOffset() {
    if (headOffsetCacheFrame === motionFrameId) return headOffsetCache;
    const frozenSetup = shouldFreezeCharacterMotion();
    const breathAmt = frozenSetup ? 0 : state.breathStrength / 100;
    const breath = Math.sin(TAU * animationSeconds * 0.18);
    const breathY = breath * 3.2 * breathAmt;
    const swayX = Math.sin(TAU * (animationSeconds * 0.1 + 0.5)) * 4.4 * breathAmt;
    const pyokoVoice = frozenSetup ? 0 : voiceLevel * pyokoScale();
    const bounce = frozenSetup ? 0 : pyokoVoice * 18 + Math.sin(TAU * animationSeconds * 0.42) * 1.5 + breathY;
    headOffsetCache.x = state.avatarX + state.angleX * 20 * (state.angleStrength / 100) + swayX;
    headOffsetCache.y = state.avatarY - bounce + state.angleY * 22 * (state.angleStrength / 100);
    headOffsetCacheFrame = motionFrameId;
    return headOffsetCache;
  }

  function integrateHairSpringBucket(bucket, t, wave, targets, options) {
    const stiffness = options.stiffness ?? 1;
    const damping = options.damping ?? 1;
    const k1 = lerp(190, 55, t) * stiffness;
    const c1 = lerp(26, 14, t) * damping;
    const k2 = lerp(260, 120, t) * stiffness;
    const c2 = lerp(30, 20, t) * damping;
    const kP = lerp(132, 34, t) * stiffness;
    const cP = lerp(22, 11.5, t) * damping;

    for (let s = 0; s < targets.subSteps; s += 1) {
      const a1 = -k1 * (bucket.anglePos - targets.axTarget) - c1 * bucket.angleVel;
      bucket.angleVel += a1 * targets.h;
      bucket.anglePos += bucket.angleVel * targets.h;

      const a1y = -k1 * (bucket.anglePosY - targets.ayTarget) - c1 * bucket.angleVelY;
      bucket.angleVelY += a1y * targets.h;
      bucket.anglePosY += bucket.angleVelY * targets.h;

      const ax2 = -k2 * (bucket.wavePosX - wave.x) - c2 * bucket.waveVelX;
      const ay2 = -k2 * (bucket.wavePosY - wave.y) - c2 * bucket.waveVelY;
      bucket.waveVelX += ax2 * targets.h;
      bucket.wavePosX += bucket.waveVelX * targets.h;
      bucket.waveVelY += ay2 * targets.h;
      bucket.wavePosY += bucket.waveVelY * targets.h;

      const apx = -kP * (bucket.headPosX - targets.head.x) - cP * bucket.headVelX;
      const apy = -kP * (bucket.headPosY - targets.head.y) - cP * bucket.headVelY;
      bucket.headVelX += apx * targets.h;
      bucket.headPosX += bucket.headVelX * targets.h;
      bucket.headVelY += apy * targets.h;
      bucket.headPosY += bucket.headVelY * targets.h;
    }

    bucket.stretchX = bucket.waveVelX * options.stretchScale * t * t;
    bucket.stretchY = bucket.waveVelY * options.stretchScale * t * t;
  }

  function updateHairPhysics(delta) {
    if (delta <= 0) return;
    const frozenSetup = shouldFreezeCharacterMotion();
    const axTarget = frozenSetup ? 0 : state.angleX * (state.angleStrength / 100);
    const ayTarget = frozenSetup ? 0 : state.angleY * (state.angleStrength / 100); // ★1-Y: 顔上下向きのバネ遅延ターゲット
    const springAmt = state.hairSpring / 100; // ★1/★3/★4 の強度スケール（hairWarp の揺れ強度とは別調整）。※ループ変数 spring と衝突しないよう springAmt と命名
    const head = computeHeadOffset(); // 頭の移動成分。位置バネ(★4)のターゲット。

    const subSteps = Math.max(1, Math.ceil(delta / HAIR_FIXED_DT));
    const h = delta / subSteps;
    const targets = { axTarget, ayTarget, head, subSteps, h };

    for (const spring of [hairSpringBack, hairSpringFront]) {
      const layer = spring === hairSpringFront ? "front" : "back";
      for (let i = 0; i < HAIR_SPRING_BUCKETS; i += 1) {
        const t = i / (HAIR_SPRING_BUCKETS - 1); // 0=根元 .. 1=毛先
        const b = spring.buckets[i];
        const wave = pyokopyokoHairShift(t, layer); // ★2 のターゲット（波形合成出力 {x,y}）

        // ★3 伸び: バネ速度方向に毛先を引き伸ばす。速度[unit/s] × (springAmt*0.06 ≒ 1フレーム相当) × 毛先重み(t^2)。
        // 0.06 は現行サンプルで伸びすぎず遅れ感が残る上限として固定。大きな変更時は髪束テンプレートと合わせて再調整する。
        integrateHairSpringBucket(b, t, wave, targets, { stretchScale: springAmt * 0.06 });
      }
    }

    const bundleStates = ensureHairBundleSpringStates();
    for (const def of HAIR_BUNDLE_DEFS) {
      const spring = bundleStates[def.key];
      for (let i = 0; i < HAIR_SPRING_BUCKETS; i += 1) {
        const t = i / (HAIR_SPRING_BUCKETS - 1);
        const b = spring.buckets[i];
        const wave = hairBundleWaveTarget(t, def);
        const stiffness = clamp(def.stiffness || 1, 0.45, 1.6);
        const damping = clamp(def.damping || 1, 0.7, 1.35);
        integrateHairSpringBucket(b, t, wave, targets, {
          stiffness,
          damping,
          stretchScale: springAmt * 0.06 * (def.swing || 1),
        });
      }
    }
  }

  // 描画側: 連続 n に対しバケット間を線形補間してバネ状態を返す。
  function sampleHairSpringState(spring, n, out) {
    const nn = clamp(n, 0, 1) * (HAIR_SPRING_BUCKETS - 1);
    const i0 = Math.min(HAIR_SPRING_BUCKETS - 2, Math.floor(nn));
    const f = nn - i0;
    const a = spring.buckets[i0];
    const b = spring.buckets[i0 + 1];
    out.anglePos = lerp(a.anglePos, b.anglePos, f);
    out.anglePosY = lerp(a.anglePosY, b.anglePosY, f);
    out.waveX = lerp(a.wavePosX, b.wavePosX, f);
    out.waveY = lerp(a.wavePosY, b.wavePosY, f);
    out.headPosX = lerp(a.headPosX, b.headPosX, f);
    out.headPosY = lerp(a.headPosY, b.headPosY, f);
    out.headVelX = lerp(a.headVelX, b.headVelX, f);
    out.headVelY = lerp(a.headVelY, b.headVelY, f);
    out.angleVel = lerp(a.angleVel, b.angleVel, f);
    out.angleVelY = lerp(a.angleVelY, b.angleVelY, f);
    out.stretchX = lerp(a.stretchX, b.stretchX, f);
    out.stretchY = lerp(a.stretchY, b.stretchY, f);
    return out;
  }

  function sampleHairSpring(layer, n, out = hairWarpBaseSpringSample) {
    return sampleHairSpringState(layer === "front" ? hairSpringFront : hairSpringBack, n, out);
  }

  function sampleHairBundleSpring(key, n, out = hairBundleSpringSampleScratch) {
    const states = ensureHairBundleSpringStates();
    const spring = states[key];
    if (!spring) return null;
    return sampleHairSpringState(spring, n, out);
  }

  function hairBundleInfluence(x, y, def, line) {
    const root = line.root;
    const tip = line.tip;
    const vx = tip.x - root.x;
    const vy = tip.y - root.y;
    const len2 = vx * vx + vy * vy;
    if (len2 < 1) return null;
    const len = Math.sqrt(len2);
    const t = clamp(((x - root.x) * vx + (y - root.y) * vy) / len2, 0, 1);
    const closestX = root.x + vx * t;
    const closestY = root.y + vy * t;
    const dist = Math.hypot(x - closestX, y - closestY);
    const width = def.width * (0.72 + t * 0.38);
    const distanceWeight = 1 - smoothstep(width * 0.42, width, dist);
    if (distanceWeight <= 0.001) return null;
    const rootDistance = clamp(Math.hypot(x - root.x, y - root.y) / Math.max(1, len), 0, 1.25);
    const tipWeight = smoothstep(0.12, 1.02, t * 0.78 + rootDistance * 0.22);
    return {
      t,
      tipWeight,
      weight: distanceWeight * (0.28 + tipWeight * 0.72),
    };
  }

  function sampleHairBundleRigMotion(x, y, layer, baseSpring, baseMask) {
    const bundleStrength = hairBundleStrengthAmount();
    if (bundleStrength <= 0.001) {
      hairBundleRigMotionScratch.spring = baseSpring;
      hairBundleRigMotionScratch.mask = baseMask;
      hairBundleRigMotionScratch.motionScale = 1;
      hairBundleRigMotionScratch.edgeScale = 1;
      return hairBundleRigMotionScratch;
    }

    const rig = currentHairBundleRig();
    let total = 0;
    let tipTotal = 0;
    const mix = hairBundleRigMixScratch;
    for (const key of HAIR_SAMPLE_KEYS) mix[key] = 0;

    for (const def of HAIR_BUNDLE_DEFS) {
      if (def.layer !== layer) continue;
      const line = rig[def.key];
      if (!line) continue;
      const influence = hairBundleInfluence(x, y, def, line);
      if (!influence) continue;
      const spring = sampleHairBundleSpring(def.key, influence.tipWeight);
      if (!spring) continue;
      const w = influence.weight;
      total += w;
      tipTotal += influence.tipWeight * w;
      for (const key of HAIR_SAMPLE_KEYS) {
        mix[key] += spring[key] * w;
      }
    }

    if (total <= 0.001) {
      hairBundleRigMotionScratch.spring = baseSpring;
      hairBundleRigMotionScratch.mask = baseMask;
      hairBundleRigMotionScratch.motionScale = 1;
      hairBundleRigMotionScratch.edgeScale = 1;
      return hairBundleRigMotionScratch;
    }

    const inv = 1 / total;
    for (const key of HAIR_SAMPLE_KEYS) mix[key] *= inv;
    const tipWeight = clamp(tipTotal * inv, 0, 1);
    const blend = clamp(clamp(total, 0, 1) * 0.92 * bundleStrength, 0, 1);
    const spring = hairBundleRigMotionSpringScratch;
    for (const key of HAIR_SAMPLE_KEYS) {
      spring[key] = lerp(baseSpring[key], mix[key], blend);
    }
    const mask = lerp(baseMask, tipWeight, blend * 0.88);
    const motionScale = lerp(1, clamp(tipWeight / Math.max(baseMask, 0.18), 0.28, 1.38), blend);
    hairBundleRigMotionScratch.spring = spring;
    hairBundleRigMotionScratch.mask = mask;
    hairBundleRigMotionScratch.motionScale = motionScale;
    hairBundleRigMotionScratch.edgeScale = lerp(1, 0.38 + mask * 0.62, blend);
    return hairBundleRigMotionScratch;
  }

  function hairRootTipMotionMask(x, y, layer) {
    const metrics = currentFaceRigMetrics();
    const isFront = layer === "front";
    // 髪の遅れ・揺れは画面Yだけで決めず、頭蓋に近い根元を固定し、毛先ほど解放する。
    const rootY = metrics.topY + metrics.radiusY * (isFront ? 0.26 : 0.18);
    const freeY = metrics.center.y + metrics.radiusY * (isFront ? 0.68 : 1.04);
    const vertical = smoothstep(rootY, freeY, y);

    // 横髪は顔横に根元があるため、外側だけ少し早めに動けるようにする。
    const sideAmount = smoothstep(
      metrics.radiusX * 0.62,
      metrics.radiusX * 1.25,
      Math.abs(x - metrics.center.x)
    );
    const sideUnlockY = smoothstep(
      metrics.topY + metrics.radiusY * 0.28,
      metrics.center.y + metrics.radiusY * 0.62,
      y
    );
    const sideUnlock = sideAmount * sideUnlockY * (isFront ? 0.28 : 0.18);

    return clamp(vertical + sideUnlock, 0, 1);
  }

  function hairCrownRootLockMask(x, y) {
    if (state.editMode || setupModeActive()) return 0;
    const metrics = currentFaceRigMetrics();
    const u = Math.abs((x - metrics.center.x) / Math.max(1, metrics.radiusX));
    const vertical =
      1 - smoothstep(
        metrics.topY + metrics.radiusY * 0.18,
        metrics.topY + metrics.radiusY * 0.58,
        y
      );
    const center = 1 - smoothstep(0.22, 0.92, u);
    return clamp(vertical * (0.45 + center * 0.55), 0, 1);
  }

  function hairWarpPoint(x, y, layer) {
    const layerKey = layer === "front" ? "frontHair" : "backHair";
    const hair = hairWarpAmount();
    const springAmt = state.hairSpring / 100;
    const ax = state.angleX * (state.angleStrength / 100);
    const ay = state.angleY * (state.angleStrength / 100);
    const { nx, ny } = warpInfo(x, y);
    const mask = hairRootTipMotionMask(x, y, layer);
    const edge = clamp(Math.abs(nx), 0, 1);
    const n = clamp(y / CROP.h, 0, 1);
    const baseSpring = sampleHairSpring(layer, n);
    const bundleMotion = sampleHairBundleRigMotion(x, y, layer, baseSpring, mask);
    const s = bundleMotion.spring;
    const activeMask = bundleMotion.mask;
    const angleLagX = s.anglePos - ax;
    const angleLagY = s.anglePosY - ay;
    const tipDelay = activeMask * activeMask * springAmt * clamp(angleLagX * HAIR_ANGLE_LAG_X, -HAIR_ANGLE_LAG_LIMIT_X, HAIR_ANGLE_LAG_LIMIT_X); // ★1-X: 現在角度との差分で、動いた瞬間だけ毛先を遅らせる
    const tipDelayY = activeMask * activeMask * springAmt * clamp(angleLagY * HAIR_ANGLE_LAG_Y, -HAIR_ANGLE_LAG_LIMIT_Y, HAIR_ANGLE_LAG_LIMIT_Y); // ★1-Y: 上下は浮きすぎ防止のため弱め
    const head = computeHeadOffset();
    const shiftX = s.waveX * bundleMotion.motionScale; // ★2: 波形をバネに通した慣性化済みの変位
    const shiftY = s.waveY * bundleMotion.motionScale;
    const lagWeight = activeMask * activeMask * springAmt;
    const lagX = clamp((s.headPosX - head.x) * lagWeight * HAIR_HEAD_LAG_X, -HAIR_HEAD_LAG_LIMIT_X, HAIR_HEAD_LAG_LIMIT_X); // ★4-X: 頭の横移動に対する重みのある遅れ追従
    const lagY = clamp((s.headPosY - head.y) * lagWeight * HAIR_HEAD_LAG_Y, -HAIR_HEAD_LAG_LIMIT_Y, HAIR_HEAD_LAG_LIMIT_Y); // ★4-Y: 頭の縦バウンドに対する遅れ追従（浮きすぎ防止）
    const velocityLagX = clamp((-s.headVelX * 0.028 - s.angleVel * 2.4) * lagWeight, -18, 18); // 頭の速度・角速度に逆向きへ流す追加慣性。角度差分遅れとの二重効きを避けるため角速度は控えめ
    const velocityLagY = clamp(-s.headVelY * 0.018 * lagWeight, -12, 12); // 上下移動に遅れて毛先が残る重めの慣性

    let p = deformerWarpPoint(layerKey, x, y);
    const crownLock = hairCrownRootLockMask(x, y);
    if (crownLock > 0.001) {
      // 前髪の根元は顔の剛体追従へ寄せ、顔パーツと頭皮が離れて「カツラ」に見えるのを防ぐ。
      // 後ろ髪は従来通り、頭頂部だけデフォーマ差分を弱める。
      // 毛先側は hairRootTipMotionMask() と髪束バネの遅れをそのまま活かす。
      const followAmount = layer === "front" ? frontHairRootFollowAmount() : 0;
      const root = layer === "front" ? frontHairRootFollowPoint(x, y, { x, y }) : { x, y };
      p.x = lerp(p.x, root.x, crownLock * (layer === "front" ? lerp(0.28, 0.72, followAmount) : 0.28));
      p.y = lerp(p.y, root.y, crownLock * (layer === "front" ? lerp(0.72, 0.76, followAmount) : 0.72));
    }
    const rootMotionDampen = layer === "front" ? 1 - crownLock * 0.85 * frontHairRootFollowAmount() : 1;
    p.x += shiftX + tipDelay + s.stretchX * bundleMotion.motionScale + lagX + velocityLagX + nx * edge * ax * (layer === "front" ? 2.2 : -3.0) * hair * bundleMotion.edgeScale * rootMotionDampen;
    p.y += shiftY + s.stretchY * bundleMotion.motionScale + tipDelayY + lagY + velocityLagY; // ★1-Y + ★3 + ★4 + 速度慣性
    return p;
  }

  function drawMeshGuide(targetCtx, warpFn, cols = 7, rows = 5) {
    targetCtx.save();
    targetCtx.lineWidth = 1;
    targetCtx.strokeStyle = "rgba(53, 190, 95, 0.82)";
    targetCtx.setLineDash([5, 4]);
    for (let y = 0; y <= rows; y += 1) {
      targetCtx.beginPath();
      for (let x = 0; x <= cols; x += 1) {
        const p = warpFn((x / cols) * CROP.w, (y / rows) * CROP.h);
        if (x === 0) targetCtx.moveTo(p.x, p.y);
        else targetCtx.lineTo(p.x, p.y);
      }
      targetCtx.stroke();
    }
    for (let x = 0; x <= cols; x += 1) {
      targetCtx.beginPath();
      for (let y = 0; y <= rows; y += 1) {
        const p = warpFn((x / cols) * CROP.w, (y / rows) * CROP.h);
        if (y === 0) targetCtx.moveTo(p.x, p.y);
        else targetCtx.lineTo(p.x, p.y);
      }
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  function computeCharacterTransform() {
    const fit = Math.min(stage.w / (CROP.w + 50), stage.h / (CROP.h * 0.76));
    const frozenSetup = shouldFreezeCharacterMotion();
    // 呼吸・重心ドリフト(C)。breathStrength=0 で現状同等。
    const breathAmt = frozenSetup ? 0 : state.breathStrength / 100;
    const breath = Math.sin(TAU * animationSeconds * 0.18); // 約5.6秒周期
    const breathScale = 1 + breath * 0.024 * breathAmt;
    const breathY = breath * 3.2 * breathAmt;
    const swayX = Math.sin(TAU * (animationSeconds * 0.1 + 0.5)) * 4.4 * breathAmt;
    const baseScale = fit * (state.avatarSize / 100) * breathScale;
    const pyokoVoice = frozenSetup ? 0 : voiceLevel * pyokoScale();
    const bounce = frozenSetup ? 0 : pyokoVoice * 18 + Math.sin(TAU * animationSeconds * 0.42) * 1.5 + breathY;
    const squash = pyokoVoice;
    const scaleX = baseScale * (1 + squash * 0.025);
    const scaleY = baseScale * (1 - squash * 0.018);
    const drawW = CROP.w * scaleX;
    const drawH = CROP.h * scaleY;
    const centerX = stage.w * 0.5 + state.avatarX + state.angleX * 20 * (state.angleStrength / 100) + swayX;
    const centerY = stage.h * 0.5 + state.avatarY - bounce + state.angleY * 22 * (state.angleStrength / 100);
    const rollAmt = frozenSetup ? 0 : state.rollStrength / 100;
    const rollIdle = Math.sin(TAU * (animationSeconds * 0.13 + 0.3)) * 5.0 * rollAmt; // 約7.7秒周期の首傾け
    const rotation =
      (Math.PI / 180) *
      (state.angleX * 2.2 * (state.angleStrength / 100) +
        Math.sin(TAU * (animationSeconds * 0.34 + 0.1)) * 0.7 +
        rollIdle);

    const neckPivot = currentNeckPivot();
    const pivotX = neckPivot.x;
    const pivotY = neckPivot.y;
    const anchorX = centerX + (pivotX - CROP.w / 2) * scaleX;
    const anchorY = centerY + (pivotY - CROP.h / 2) * scaleY;

    return { centerX, centerY, anchorX, anchorY, pivotX, pivotY, scaleX, scaleY, rotation, drawW, drawH, pyokoVoice, frozenSetup };
  }

  function gpuStageActive() {
    return Boolean(meshRenderer?.rendererKind === "webgpu" && meshRenderer.beginStageFrame && !meshRenderer.isLost?.());
  }

  function fallbackFromLostWebGpuRenderer() {
    if (meshRenderer?.rendererKind !== "webgpu" || !meshRenderer.isLost?.()) return;
    console.warn("WebGPUデバイスが失われたためCanvas/WebGL描画へ切り替えます。");
    try {
      meshRenderer.dispose?.();
    } catch (disposeError) {
      console.warn("meshRenderer dispose failed", disposeError);
    }
    meshRenderer = null;
    activeRendererKind = "canvas";
    setStageArtVisible(false);
    try {
      meshRenderer = createMeshRenderer(CROP.w, CROP.h);
    } catch (fallbackError) {
      console.warn("WebGLメッシュ初期化に失敗したためCanvas描画で続行します。", fallbackError);
    }
    syncRendererModeUi();
  }

  function disposeGpuStageAfterDrawError(label, error) {
    console.warn(`${label}に失敗したためCanvas/WebGL描画へ切り替えます。`, error);
    try {
      meshRenderer?.dispose?.();
    } catch (disposeError) {
      console.warn("meshRenderer dispose failed", disposeError);
    }
    meshRenderer = null;
    activeRendererKind = "canvas";
    rendererFallbackRequested = true;
    setStageArtVisible(false);
    try {
      meshRenderer = createMeshRenderer(CROP.w, CROP.h);
    } catch (fallbackError) {
      console.warn("WebGLメッシュ初期化に失敗したためCanvas描画で続行します。", fallbackError);
    }
    syncRendererModeUi();
  }

  function retryRenderAfterRendererFallback(retryingAfterRendererFallback) {
    if (retryingAfterRendererFallback || !rendererFallbackRequested) return false;
    rendererFallbackRequested = false;
    render({ retryingAfterRendererFallback: true });
    return true;
  }

  function characterLocalRectStageCorners() {
    const corners = [
      charPointToStage({ x: 0, y: 0 }),
      charPointToStage({ x: CROP.w, y: 0 }),
      charPointToStage({ x: CROP.w, y: CROP.h }),
      charPointToStage({ x: 0, y: CROP.h }),
    ];
    return corners.every(Boolean) ? corners : null;
  }

  function drawGpuStageWarpedImage(image, cols, rows, options = {}) {
    if (!gpuStageActive() || !lastCharacterTransform) return false;
    try {
      return meshRenderer.drawStageWarpedImage(image, cols, rows, {
        ...options,
        characterTransform: lastCharacterTransform,
      });
    } catch (error) {
      disposeGpuStageAfterDrawError("WebGPUステージメッシュ描画", error);
      return false;
    }
  }

  function clearCharacterCanvas() {
    charCtx.setTransform(1, 0, 0, 1, 0, 0);
    charCtx.globalAlpha = 1;
    charCtx.globalCompositeOperation = "source-over";
    charCtx.clearRect(0, 0, CROP.w, CROP.h);
  }

  function drawCharacterCanvasToStage() {
    if (!lastCharacterTransform) return;
    const t = lastCharacterTransform;
    ctx.save();
    ctx.translate(t.anchorX, t.anchorY);
    ctx.rotate(t.rotation);
    ctx.drawImage(charCanvas, -t.pivotX * t.scaleX, -t.pivotY * t.scaleY, t.drawW, t.drawH);
    ctx.restore();
  }

  function applyCharacterLocalTransform(targetCtx) {
    const t = lastCharacterTransform;
    if (!t) return false;
    targetCtx.translate(t.anchorX, t.anchorY);
    targetCtx.rotate(t.rotation);
    targetCtx.scale(t.scaleX, t.scaleY);
    targetCtx.translate(-t.pivotX, -t.pivotY);
    return true;
  }

  function drawCharacterAnchoredItemLayers(slotKey) {
    if (gpuStageActive() && drawArtItemLayers(slotKey)) {
      return;
    }
    ctx.save();
    if (applyCharacterLocalTransform(ctx)) {
      drawItemLayers(ctx, slotKey);
    }
    ctx.restore();
  }

  function drawBackHairLayer() {
    if (!state.hairVisible) return;
    if (
      gpuStageActive() &&
      drawGpuStageWarpedImage(images.backHair, 14, 10, {
        gpuWarpSpec: buildHairGpuWarpSpec("back"),
      })
    ) {
      return;
    }
    const backHairImage = getTintedHairImage(images.backHair);
    clearCharacterCanvas();
    drawMeshCroppedImage(charCtx, backHairImage, (x, y) => hairWarpPoint(x, y, "back"), 14, 10);
    drawCharacterCanvasToStage();
  }

  function frontHairShadowStrengthAmount() {
    return clamp(Number(state.frontHairShadowStrength) || 0, 0, 100) / 100;
  }

  function frontHairShadowDistancePx() {
    return clamp(Number(state.frontHairShadowDistance) || 0, 0, 32);
  }

  function frontHairShadowGeometry(distance) {
    const yaw = clamp(state.angleX * (state.angleStrength / 100), -1.6, 1.6);
    const pitch = clamp(state.angleY * (state.angleStrength / 100), -1.6, 1.6);
    return {
      offsetX: clamp(yaw * 2.8, -7, 7) + distance * 0.12,
      offsetY: distance + clamp(pitch * 1.6, -2, 3),
      blur: clamp(distance * 0.18 + 1.2, 1.2, 5.2),
    };
  }

  function frontHairShadowShouldRefresh() {
    if (frontHairShadowCompositeFrame < 0) return true;
    if (state.editMode || setupModeActive() || state.rangePreviewDirection) return true;
    return motionFrameId - frontHairShadowCompositeFrame >= 2;
  }

  function frontHairShadowShapeSpec(distance) {
    const { offsetX, offsetY, blur } = frontHairShadowGeometry(distance);
    return {
      blur,
      gpuWarpSpec: buildHairGpuWarpSpec("front", {
        offsetX,
        offsetY,
        tint: [0x3b / 255, 0x25 / 255, 0x20 / 255, 1],
      }),
    };
  }

  function drawFrontHairShadowShape(distance) {
    const { offsetX, offsetY, blur } = frontHairShadowGeometry(distance);
    frontHairShadowCtx.setTransform(1, 0, 0, 1, 0, 0);
    frontHairShadowCtx.globalAlpha = 1;
    frontHairShadowCtx.globalCompositeOperation = "source-over";
    frontHairShadowCtx.filter = "none";
    frontHairShadowCtx.clearRect(0, 0, CROP.w, CROP.h);

    drawMeshCroppedImage(
      frontHairShadowCtx,
      images.frontHair,
      (x, y) => {
        const p = hairWarpPoint(x, y, "front");
        // 上側の前髪ほど顔に近い影として少しだけ落とす。毛先側は自然に弱くなるよう後段のsource-atopで顔側へ限定する。
        const upper = 1 - smoothstep(640, 980, y);
        return {
          x: p.x + offsetX * (0.55 + upper * 0.45),
          y: p.y + offsetY * (0.6 + upper * 0.4),
        };
      },
      14,
      10
    );

    frontHairShadowCtx.globalCompositeOperation = "source-in";
    frontHairShadowCtx.fillStyle = "#3b2520";
    frontHairShadowCtx.fillRect(0, 0, CROP.w, CROP.h);
    frontHairShadowCtx.globalCompositeOperation = "source-over";
    return { blur };
  }

  function currentHairTintUniform() {
    const color = normalizeHexColor(state.hairColor);
    const lightness = clamp(Number(state.hairTintLightness) || 0, 0, 100) / 100;
    const enabled = Boolean(state.hairTintEnabled && (color !== "#2C292C" || lightness > 0));
    const rgb = hexToRgb(color);
    return {
      enabled,
      lightness,
      rgb: [rgb.r / 255, rgb.g / 255, rgb.b / 255],
      signature: enabled ? `${color}:${lightness}` : "none",
    };
  }

  function buildLayerGpuControlPoints(layer) {
    const controlPoints = new Float32Array(MESH_FACE_CONTROL_POINT_COUNT * 2);
    let controlIndex = 0;
    for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
      for (let col = 0; col <= DEFORMER_COLS; col += 1) {
        const point = interpolatedControlPoint(layer, col, row);
        controlPoints[controlIndex] = point.x;
        controlPoints[controlIndex + 1] = point.y;
        controlIndex += 2;
      }
    }
    return controlPoints;
  }

  function writeHairSpringBucket(target, vec4Index, bucket) {
    let offset = vec4Index * 4;
    target[offset] = bucket.anglePos;
    target[offset + 1] = bucket.anglePosY;
    target[offset + 2] = bucket.wavePosX;
    target[offset + 3] = bucket.wavePosY;
    offset += 4;
    target[offset] = bucket.headPosX;
    target[offset + 1] = bucket.headPosY;
    target[offset + 2] = bucket.headVelX;
    target[offset + 3] = bucket.headVelY;
    offset += 4;
    target[offset] = bucket.angleVel;
    target[offset + 1] = bucket.angleVelY;
    target[offset + 2] = bucket.stretchX;
    target[offset + 3] = bucket.stretchY;
  }

  function buildFaceGpuWarpSpec(includeTearLens = true, includeEyeCenters = includeTearLens) {
    if (faceGpuWarpSpecCacheFrame !== motionFrameId || !faceGpuWarpSpecCache) {
      faceGpuWarpSpecCacheFrame = motionFrameId;
      faceGpuWarpSpecCache = new Map();
    }
    const cacheKey = `${includeTearLens ? "tear" : "plain"}:${includeEyeCenters ? "eyes" : "no-eyes"}`;
    const cached = faceGpuWarpSpecCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const uniforms = new Float32Array(MESH_FACE_UNIFORM_VEC4_COUNT * 4);
    const controlPoints = buildLayerGpuControlPoints("face");
    const setUniform = (index, x = 0, y = 0, z = 0, w = 0) => {
      const offset = index * 4;
      uniforms[offset] = x;
      uniforms[offset + 1] = y;
      uniforms[offset + 2] = z;
      uniforms[offset + 3] = w;
    };

    const metrics = currentFaceRigMetrics();
    const anchors = metrics.anchors;
    const pyoko = pyokoScale();
    const yaw = clamp(state.angleX * (state.angleStrength / 100), -1.6, 1.6);
    const pitch = clamp(state.angleY * (state.angleStrength / 100), -1.6, 1.6);
    const depthStrength = state.editMode ? 0 : faceTurnDepthAmount();
    const verticalDepth = state.editMode ? 0 : faceTurnVerticalAmount();
    const diagonalEnabled =
      state.diagonalFaceWarpEnabled &&
      !state.editMode &&
      !state.eyeSetupMode &&
      !state.highlightSetupMode &&
      !state.faceDepthSetupMode &&
      !state.neckPivotSetupMode &&
      !state.hairBundleSetupMode &&
      !characterWizard?.active
        ? 1
        : 0;
    const mouthPuni =
      state.editMode || state.eyeSetupMode || state.faceDepthSetupMode
        ? 0
        : clamp(jawPuniLevel * pyoko, 0, 1.35);
    const tearEnabled =
      includeTearLens &&
      !state.eyeSetupMode &&
      !state.faceDepthSetupMode &&
      state.tearLensEnabled &&
      state.tearLensStrength > 0 &&
      !blinkClosed;
    const centers = tearEnabled || includeEyeCenters ? ensureEyeCenters() : null;
    const radius = eyeLensRadius();
    const leftCenter = centers?.[0] || { x: 0, y: 0 };
    const rightCenter = centers?.[1] || { x: 0, y: 0 };
    const leftWarped = centers
      ? highlightEyesWarped?.[0] || faceWarpPoint(leftCenter.x, leftCenter.y)
      : { x: 0, y: 0 };
    const rightWarped = centers
      ? highlightEyesWarped?.[1] || faceWarpPoint(rightCenter.x, rightCenter.y)
      : { x: 0, y: 0 };
    const leftRotation = eyeLensRotationForIndex(0);
    const rightRotation = eyeLensRotationForIndex(1);
    const leftShimmer =
      Math.sin(TAU * (animationSeconds * 1.45)) * 0.006 +
      Math.sin(TAU * (animationSeconds * 2.35)) * 0.003;
    const rightShimmer =
      Math.sin(TAU * (animationSeconds * 1.45 + 0.17)) * 0.006 +
      Math.sin(TAU * (animationSeconds * 2.35 + 0.31)) * 0.003;

    setUniform(0, CROP.w, CROP.h);
    setUniform(1, metrics.faceCenter.x, metrics.faceCenter.y, metrics.center.x, metrics.center.y);
    setUniform(2, metrics.radiusX, metrics.radiusY, metrics.topY, metrics.bottomY);
    setUniform(3, metrics.eyeDistance, metrics.scale, voiceLevel * pyoko, mouthMotionLevel);
    setUniform(4, anchors.leftEye.x, anchors.leftEye.y, anchors.rightEye.x, anchors.rightEye.y);
    setUniform(5, anchors.nose.x, anchors.nose.y, anchors.mouth.x, anchors.mouth.y);
    setUniform(6, anchors.chin.x, anchors.chin.y, metrics.eyeMid.x, metrics.eyeMid.y);
    setUniform(7, yaw, pitch, depthStrength, verticalDepth);
    setUniform(8, diagonalEnabled);
    setUniform(9, mouthPuni);
    setUniform(10, centers ? 1 : 0, state.tearLensStrength / 25, radius.x, radius.y);
    setUniform(11, leftCenter.x, leftCenter.y, rightCenter.x, rightCenter.y);
    setUniform(12, leftWarped.x, leftWarped.y, rightWarped.x, rightWarped.y);
    setUniform(
      13,
      Math.cos(-leftRotation),
      Math.sin(-leftRotation),
      Math.cos(leftRotation),
      Math.sin(leftRotation),
    );
    setUniform(
      14,
      Math.cos(-rightRotation),
      Math.sin(-rightRotation),
      Math.cos(rightRotation),
      Math.sin(rightRotation),
    );
    setUniform(
      15,
      highlightPulseLeftX - 1,
      highlightPulseLeftY - 1,
      highlightPulseRightX - 1,
      highlightPulseRightY - 1,
    );
    setUniform(16, leftShimmer, rightShimmer);

    const spec = {
      controlPoints,
      kind: "face-v1",
      uniforms,
    };
    faceGpuWarpSpecCache.set(cacheKey, spec);
    return spec;
  }

  function buildHighlightGpuWarpSpec(filmWobbleValue = state.highlightFilmWobble) {
    const cacheKey = `${filmWobbleValue}`;
    if (highlightGpuWarpSpecCacheFrame !== motionFrameId || !highlightGpuWarpSpecCache) {
      highlightGpuWarpSpecCacheFrame = motionFrameId;
      highlightGpuWarpSpecCache = new Map();
    }
    const cached = highlightGpuWarpSpecCache.get(cacheKey);
    if (cached) return cached;

    const faceSpec = buildFaceGpuWarpSpec(false, true);
    const hairUniforms = new Float32Array(MESH_HAIR_UNIFORM_VEC4_COUNT * 4);
    const setUniform = (index, x = 0, y = 0, z = 0, w = 0) => {
      const offset = index * 4;
      hairUniforms[offset] = x;
      hairUniforms[offset + 1] = y;
      hairUniforms[offset + 2] = z;
      hairUniforms[offset + 3] = w;
    };

    const ax = state.angleX * (state.angleStrength / 100);
    const ay = state.angleY * (state.angleStrength / 100);
    setUniform(4, ax * 3, ay * 3);

    const film = computeHighlightFilmWobble(filmWobbleValue);
    if (film.amount > 0) {
      setUniform(5, film.scaleX, film.scaleY, film.shearX, film.shearY);
      setUniform(6, Math.cos(film.rotation), Math.sin(film.rotation), film.slideX, film.slideY);
      setUniform(7, film.pivotX, film.pivotY);
    } else {
      setUniform(5, 1, 1, 0, 0);
      setUniform(6, 1, 0, 0, 0);
    }

    const spec = {
      controlPoints: faceSpec.controlPoints,
      hairUniforms,
      kind: "highlight-v1",
      uniforms: faceSpec.uniforms,
    };
    highlightGpuWarpSpecCache.set(cacheKey, spec);
    return spec;
  }

  function buildHairGpuWarpSpec(layer, shadowOffset = null) {
    const layerKey = layer === "front" ? "frontHair" : "backHair";
    if (hairGpuWarpSpecCacheFrame !== motionFrameId || !hairGpuWarpSpecCache) {
      hairGpuWarpSpecCacheFrame = motionFrameId;
      hairGpuWarpSpecCache = new Map();
    }
    const shadowTint = shadowOffset?.tint || null;
    const hairTint = shadowTint ? null : currentHairTintUniform();
    const cacheKey = shadowOffset
      ? `${layer}:shadow:${shadowOffset.offsetX}:${shadowOffset.offsetY}:${shadowTint?.join(",") || ""}`
      : `${layer}:tint:${hairTint.signature}`;
    const cached = hairGpuWarpSpecCache.get(cacheKey);
    if (cached) return cached;

    const faceSpec = buildFaceGpuWarpSpec(false, false);
    const hairUniforms = new Float32Array(MESH_HAIR_UNIFORM_VEC4_COUNT * 4);
    const hairSpringSamples = new Float32Array(MESH_HAIR_SPRING_VEC4_COUNT * 4);
    const hairBundleDefs = new Float32Array(MESH_HAIR_BUNDLE_DEF_VEC4_COUNT * 4);
    const hairBundleSamples = new Float32Array(MESH_HAIR_BUNDLE_SAMPLE_VEC4_COUNT * 4);
    const setUniform = (index, x = 0, y = 0, z = 0, w = 0) => {
      const offset = index * 4;
      hairUniforms[offset] = x;
      hairUniforms[offset + 1] = y;
      hairUniforms[offset + 2] = z;
      hairUniforms[offset + 3] = w;
    };

    const ax = state.angleX * (state.angleStrength / 100);
    const ay = state.angleY * (state.angleStrength / 100);
    const head = computeHeadOffset();
    const isFront = layer === "front";
    setUniform(0, CROP.w, CROP.h, isFront ? 1 : 0);
    setUniform(1, ax, ay, hairWarpAmount(), state.hairSpring / 100);
    setUniform(2, head.x, head.y, frontHairRootFollowAmount(), hairBundleStrengthAmount());
    setUniform(
      3,
      state.editMode || setupModeActive() ? 0 : 1,
      shadowOffset?.offsetX || 0,
      shadowOffset?.offsetY || 0,
      shadowOffset ? 1 : 0,
    );
    if (shadowTint)
      setUniform(4, shadowTint[0], shadowTint[1], shadowTint[2], shadowTint[3] ?? 1);
    else if (hairTint?.enabled) {
      setUniform(4, hairTint.rgb[0], hairTint.rgb[1], hairTint.rgb[2], 1);
      setUniform(5, hairTint.lightness, 0, 0, 0);
    }

    const spring = isFront ? hairSpringFront : hairSpringBack;
    for (let index = 0; index < HAIR_SPRING_BUCKETS; index += 1) {
      writeHairSpringBucket(hairSpringSamples, index * 3, spring.buckets[index]);
    }

    const rig = currentHairBundleRig();
    const bundleStates = ensureHairBundleSpringStates();
    for (let defIndex = 0; defIndex < HAIR_BUNDLE_DEFS.length; defIndex += 1) {
      const def = HAIR_BUNDLE_DEFS[defIndex];
      const line = rig[def.key];
      const defOffset = defIndex * 8;
      hairBundleDefs[defOffset] = line?.root?.x || 0;
      hairBundleDefs[defOffset + 1] = line?.root?.y || 0;
      hairBundleDefs[defOffset + 2] = line?.tip?.x || 0;
      hairBundleDefs[defOffset + 3] = line?.tip?.y || 0;
      hairBundleDefs[defOffset + 4] = def.layer === "front" ? 1 : 0;
      hairBundleDefs[defOffset + 5] = def.width;
      hairBundleDefs[defOffset + 6] = def.layer === layer ? 1 : 0;
      const bundleSpring = bundleStates[def.key];
      for (let index = 0; index < HAIR_SPRING_BUCKETS; index += 1) {
        writeHairSpringBucket(
          hairBundleSamples,
          (defIndex * HAIR_SPRING_BUCKETS + index) * 3,
          bundleSpring.buckets[index],
        );
      }
    }

    const spec = {
      controlPoints: buildLayerGpuControlPoints(layerKey),
      faceRootControlPoints: faceSpec.controlPoints,
      hairBundleDefs,
      hairBundleSamples,
      hairSpringSamples,
      hairTintEnabled: Boolean(hairTint?.enabled),
      hairUniforms,
      kind: shadowTint ? "hair-shadow-v1" : "hair-v1",
      uniforms: faceSpec.uniforms,
    };
    hairGpuWarpSpecCache.set(cacheKey, spec);
    return spec;
  }

  function currentFaceMeshSpec() {
    const useTearLensMesh = state.tearLensEnabled && state.tearLensStrength > 0 && !state.eyeSetupMode && !state.faceDepthSetupMode && !blinkClosed;
    const yaw = Math.abs(clamp(state.angleX * (state.angleStrength / 100), -1.6, 1.6));
    const useFeatureTurnMesh = faceTurnDepthAmount() > 0.001 && yaw > 0.02 && !state.eyeSetupMode && !state.faceDepthSetupMode;
    const useHighMesh = useTearLensMesh || useFeatureTurnMesh;
    return {
      warpFn: (x, y) => tearLensWarpPoint(x, y),
      gpuWarpSpec: () => buildFaceGpuWarpSpec(true),
      cols: useHighMesh ? 28 : 14,
      rows: useHighMesh ? 20 : 10,
    };
  }

  function drawFrontHairShadowReceiverItemLayer(layer) {
    if (!layer?.visible || !layer.image || !gpuStageActive()) return;
    const deformSpec = itemLayerDeformFollowSpec(layer);
    if (deformSpec) {
      if (!prepareDeformedItemSource(layer)) return;
      meshRenderer.drawItemDeformSourceWarpedToShadowReceiver(deformSpec.cols, deformSpec.rows, {
        gpuWarpSpec: deformSpec.gpuWarpSpec?.(),
      });
      return;
    }
    const corners = itemLayerRenderedLocalCorners(layer);
    if (!corners) return;
    meshRenderer.drawFrontHairShadowReceiverQuad(layer.image, corners, {
      alpha: clamp(layer.opacity / 100, 0, 1),
    });
  }

  function drawFrontHairShadowReceiverItemLayers(slotKey) {
    for (const layer of itemLayers) {
      if (layer.slot === slotKey) drawFrontHairShadowReceiverItemLayer(layer);
    }
  }

  function drawFrontHairShadowReceiverMask() {
    if (gpuStageActive()) {
      try {
        meshRenderer.clearFrontHairShadowReceiver();
        drawFrontHairShadowReceiverItemLayers("characterBack");
        meshRenderer.drawFrontHairShadowReceiverWarpedImage(images.backHair, 14, 10, {
          gpuWarpSpec: buildHairGpuWarpSpec("back"),
        });
        drawFrontHairShadowReceiverItemLayers("faceBack");
        const faceSpec = currentFaceMeshSpec();
        meshRenderer.drawFrontHairShadowReceiverWarpedImage(images[expressionKey()], faceSpec.cols, faceSpec.rows, {
          gpuWarpSpec: faceSpec.gpuWarpSpec(),
        });
        drawFrontHairShadowReceiverItemLayers("faceFront");
        return true;
      } catch (error) {
        disposeGpuStageAfterDrawError("WebGPU前髪影受け面描画", error);
        return false;
      }
    }

    frontHairShadowReceiverCtx.setTransform(1, 0, 0, 1, 0, 0);
    frontHairShadowReceiverCtx.globalAlpha = 1;
    frontHairShadowReceiverCtx.globalCompositeOperation = "source-over";
    frontHairShadowReceiverCtx.filter = "none";
    frontHairShadowReceiverCtx.clearRect(0, 0, CROP.w, CROP.h);

    drawItemLayers(frontHairShadowReceiverCtx, "characterBack");
    drawMeshCroppedImage(frontHairShadowReceiverCtx, images.backHair, (x, y) => hairWarpPoint(x, y, "back"), 14, 10);
    drawItemLayers(frontHairShadowReceiverCtx, "faceBack");
    const faceSpec = currentFaceMeshSpec();
    drawMeshCroppedImage(frontHairShadowReceiverCtx, images[expressionKey()], faceSpec.warpFn, faceSpec.cols, faceSpec.rows);
    drawItemLayers(frontHairShadowReceiverCtx, "faceFront");
  }

  function drawFrontHairCastShadow() {
    const strength = frontHairShadowStrengthAmount();
    const distance = frontHairShadowDistancePx();
    if (OBS_MODE && normalizeObsPresetKey(obsPresetKey) === "light") return;
    if (!state.hairVisible) return;
    if (!state.frontHairShadowEnabled || strength <= 0.001 || distance <= 0.001 || !images.frontHair || !lastCharacterTransform) return;

    if (gpuStageActive()) {
      let gpuDrawn = true;
      if (frontHairShadowShouldRefresh()) {
        const { blur, gpuWarpSpec } = frontHairShadowShapeSpec(distance);
        gpuDrawn = drawFrontHairShadowReceiverMask();
        if (gpuDrawn) {
          try {
            meshRenderer.drawFrontHairShadowComposite(images.frontHair, 14, 10, { blur, gpuWarpSpec });
            frontHairShadowCompositeFrame = motionFrameId;
          } catch (error) {
            disposeGpuStageAfterDrawError("WebGPU前髪影合成", error);
            gpuDrawn = false;
          }
        }
      }

      if (gpuDrawn && gpuStageActive()) {
        try {
          const corners = characterLocalRectStageCorners();
          if (corners) meshRenderer.drawFrontHairShadowToStage(corners, { alpha: strength * 0.62 });
          return;
        } catch (error) {
          disposeGpuStageAfterDrawError("WebGPU前髪影ステージ描画", error);
        }
      }
    }

    const { blur } = drawFrontHairShadowShape(distance);
    drawFrontHairShadowReceiverMask();

    frontHairShadowCompositeCtx.setTransform(1, 0, 0, 1, 0, 0);
    frontHairShadowCompositeCtx.globalAlpha = 1;
    frontHairShadowCompositeCtx.globalCompositeOperation = "source-over";
    frontHairShadowCompositeCtx.filter = "none";
    frontHairShadowCompositeCtx.clearRect(0, 0, CROP.w, CROP.h);
    frontHairShadowCompositeCtx.filter = `blur(${blur}px)`;
    frontHairShadowCompositeCtx.drawImage(frontHairShadowCanvas, 0, 0);
    frontHairShadowCompositeCtx.filter = "none";
    // 前髪より下のキャラ本体/アイテムだけを受け面にする。背景や前髪より上のアイテムには出さない。
    frontHairShadowCompositeCtx.globalCompositeOperation = "destination-in";
    frontHairShadowCompositeCtx.drawImage(frontHairShadowReceiverCanvas, 0, 0);
    frontHairShadowCompositeCtx.globalCompositeOperation = "source-over";

    ctx.save();
    if (applyCharacterLocalTransform(ctx)) {
      ctx.globalAlpha = strength * 0.62;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(frontHairShadowCompositeCanvas, 0, 0);
    }
    ctx.restore();
  }

  function drawGpuHighlightDots(points, diameter, aspect, filmWobbleValue, alpha, sourceAlpha = 1) {
    if (!gpuStageActive() || !lastCharacterTransform || !points) return false;
    try {
      if (!meshRenderer.drawHighlightSource(points, { alpha: sourceAlpha, aspect, diameter })) return false;
      meshRenderer.drawHighlightSourceWarpedToStage(14, 10, {
        alpha,
        characterTransform: lastCharacterTransform,
        gpuWarpSpec: buildHighlightGpuWarpSpec(filmWobbleValue),
      });
      return true;
    } catch (error) {
      disposeGpuStageAfterDrawError("WebGPU目ハイライト描画", error);
      return false;
    }
  }

  function drawFaceAndHighlightLayer() {
    const faceSpec = currentFaceMeshSpec();
    if (gpuStageActive()) {
      let gpuDrawn = drawGpuStageWarpedImage(images[expressionKey()], faceSpec.cols, faceSpec.rows, {
        gpuWarpSpec: faceSpec.gpuWarpSpec(),
      });
      if (gpuDrawn && state.highlightEnabled) {
        const points = ensureHighlightPoints();
        if (points) {
          const blinkAlpha = state.highlightAlphaOnBlink && blinkClosed ? 0 : 1;
          const alpha = (state.highlightStrength / 100) * blinkAlpha;
          gpuDrawn = drawGpuHighlightDots(points, highlightDiameter(), highlightAspectScale(), state.highlightFilmWobble, alpha);
          if (gpuDrawn && state.subHighlightEnabled) {
            gpuDrawn = drawGpuHighlightDots(
              ensureSubHighlightPoints(),
              subHighlightDiameter(),
              subHighlightAspectScale(),
              state.subHighlightFilmWobble,
              alpha,
              0.86
            ) && gpuDrawn;
          }
        }
      }
      if (gpuDrawn && gpuStageActive()) return;
    }

    clearCharacterCanvas();
    drawMeshCroppedImage(charCtx, images[expressionKey()], faceSpec.warpFn, faceSpec.cols, faceSpec.rows);

    // 目ハイライト(D): 各目中心基準でぷるぷるスケール、前髪の下、まばたき連動
    if (state.highlightEnabled) {
      const generatedHighlightImage = getGeneratedEyeHighlightImage();
      if (generatedHighlightImage) {
        const prevAlpha = charCtx.globalAlpha;
        const blinkAlpha = state.highlightAlphaOnBlink && blinkClosed ? 0 : 1;
        charCtx.globalAlpha = (state.highlightStrength / 100) * blinkAlpha;
        drawMeshCroppedImage(charCtx, generatedHighlightImage, (x, y) => highlightWarpPoint(x, y, state.highlightFilmWobble), 14, 10);
        const generatedSubHighlightImage = getGeneratedSubEyeHighlightImage();
        if (generatedSubHighlightImage) {
          drawMeshCroppedImage(
            charCtx,
            generatedSubHighlightImage,
            (x, y) => highlightWarpPoint(x, y, state.subHighlightFilmWobble),
            14,
            10
          );
        }
        charCtx.globalAlpha = prevAlpha;
      }
    }

    drawCharacterCanvasToStage();
  }

  function drawFrontHairLayer() {
    if (!state.hairVisible) return;
    if (
      gpuStageActive() &&
      drawGpuStageWarpedImage(images.frontHair, 14, 10, {
        gpuWarpSpec: buildHairGpuWarpSpec("front"),
      })
    ) {
      return;
    }
    const frontHairImage = getTintedHairImage(images.frontHair);
    clearCharacterCanvas();
    drawMeshCroppedImage(charCtx, frontHairImage, (x, y) => hairWarpPoint(x, y, "front"), 14, 10);
    drawCharacterCanvasToStage();
  }

  function drawCharacterMeshGuideLayer() {
    if (!state.showMesh) return;
    clearCharacterCanvas();
    const faceSpec = currentFaceMeshSpec();
    drawMeshGuide(charCtx, (x, y) => faceWarpPoint(x, y), faceSpec.cols, faceSpec.rows);
    drawCharacterCanvasToStage();
  }

  function drawBackground() {
    if (gpuStageActive()) {
      try {
        meshRenderer.beginStageFrame({ bgColor: state.bgColor, transparent: OBS_TRANSPARENT });
        return;
      } catch (error) {
        disposeGpuStageAfterDrawError("WebGPUステージ背景描画", error);
      }
    }
    ctx.clearRect(0, 0, stage.w, stage.h);
    if (OBS_TRANSPARENT) return;
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, stage.w, stage.h);
    const dark = state.bgColor === "#2B2926";
    ctx.save();
    ctx.globalAlpha = dark ? 0.1 : 0.18;
    const gradient = ctx.createRadialGradient(stage.w * 0.45, stage.h * 0.42, 10, stage.w * 0.45, stage.h * 0.42, stage.h * 0.58);
    gradient.addColorStop(0, dark ? "#fff3dd" : "#ffffff");
    gradient.addColorStop(1, dark ? "#2B2926" : state.bgColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, stage.w, stage.h);
    ctx.restore();
  }

  function drawLoading() {
    ctx.save();
    ctx.fillStyle = state.bgColor === "#2B2926" ? "#fff8ee" : "#34271f";
    ctx.globalAlpha = 0.72;
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(loadError || "素材を読み込み中...", stage.w / 2, stage.h / 2);
    ctx.restore();
  }

  function drawShadow(cx, cy, rx, voice) {
    if (gpuStageActive()) {
      try {
        meshRenderer.drawStageGroundShadow(cx, cy, rx, voice);
        return;
      } catch (error) {
        disposeGpuStageAfterDrawError("WebGPUステージ影描画", error);
      }
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.24);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, `rgba(52,39,31,${0.18 + voice * 0.05})`);
    grad.addColorStop(1, "rgba(52,39,31,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function charPointToStage(point) {
    if (!lastCharacterTransform) return null;
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const { anchorX, anchorY, pivotX, pivotY, scaleX, scaleY, rotation } = lastCharacterTransform;
    const lx = (x - pivotX) * scaleX;
    const ly = (y - pivotY) * scaleY;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: anchorX + lx * cos - ly * sin,
      y: anchorY + lx * sin + ly * cos,
    };
  }

  function stagePointToChar(point) {
    if (!lastCharacterTransform) return null;
    const { anchorX, anchorY, pivotX, pivotY, scaleX, scaleY, rotation } = lastCharacterTransform;
    const dx = point.x - anchorX;
    const dy = point.y - anchorY;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return {
      x: lx / Math.max(0.0001, scaleX) + pivotX,
      y: ly / Math.max(0.0001, scaleY) + pivotY,
    };
  }

  function itemLayerOrigin(layer) {
    const slot = itemSlotInfo(layer?.slot);
    if (slot.anchor === "stage") return { x: stage.w / 2, y: stage.h / 2 };
    return { x: CROP.w / 2, y: CROP.h / 2 };
  }

  function itemLayerCenter(layer) {
    const origin = itemLayerOrigin(layer);
    return { x: origin.x + layer.x, y: origin.y + layer.y };
  }

  function itemLayerSupportsDeformFollow(layer) {
    const slot = itemSlotInfo(layer?.slot);
    const target = slot.deformFollow || slot.rigidFollow;
    return slot.anchor === "character" && (target === "face" || target === "frontHair" || target === "backHair");
  }

  function itemLayerSupportsRigidFollow(layer) {
    const slot = itemSlotInfo(layer?.slot);
    return slot.anchor === "character" && Boolean(slot.rigidFollow);
  }

  function itemLayerDeformFollowSpec(layer) {
    if (!layer?.deformFollowEnabled || !itemLayerSupportsDeformFollow(layer)) return null;
    const slot = itemSlotInfo(layer.slot);
    const target = slot.deformFollow || slot.rigidFollow;
    if (target === "face") {
      const faceSpec = currentFaceMeshSpec();
      return { warpFn: (x, y) => faceWarpPoint(x, y), cols: faceSpec.cols, rows: faceSpec.rows, gpuWarpSpec: () => buildFaceGpuWarpSpec(false, false) };
    }
    if (target === "frontHair") {
      return { warpFn: (x, y) => hairWarpPoint(x, y, "front"), cols: 14, rows: 10, gpuWarpSpec: () => buildHairGpuWarpSpec("front") };
    }
    if (target === "backHair") {
      return { warpFn: (x, y) => hairWarpPoint(x, y, "back"), cols: 14, rows: 10, gpuWarpSpec: () => buildHairGpuWarpSpec("back") };
    }
    return null;
  }

  function itemLayerFollowStrengthAmount(layer) {
    const value = Number(layer?.followStrength ?? ITEM_LAYER_DEFAULTS.followStrength);
    const normalized = Number.isFinite(value) ? value : ITEM_LAYER_DEFAULTS.followStrength;
    return clamp(normalized, ITEM_LAYER_LIMITS.followStrength.min, ITEM_LAYER_LIMITS.followStrength.max) / 100;
  }

  function itemLayerRigidFollowOffset(layer) {
    const slot = itemSlotInfo(layer?.slot);
    if (slot.anchor === "stage" || !slot.rigidFollow) return { x: 0, y: 0 };
    const center = itemLayerCenter(layer);
    let followed = null;
    if (slot.rigidFollow === "face") {
      followed = faceRigidFollowPoint(center.x, center.y);
    } else if (slot.rigidFollow === "frontHair") {
      followed = frontHairRigidFollowPoint(center.x, center.y);
    }
    if (!followed) return { x: 0, y: 0 };
    const strength = itemLayerFollowStrengthAmount(layer);
    return {
      x: (followed.x - center.x) * strength,
      y: (followed.y - center.y) * strength,
    };
  }

  function itemLayerRenderedCenter(layer) {
    const center = itemLayerCenter(layer);
    const deformSpec = itemLayerDeformFollowSpec(layer);
    if (deformSpec) return deformSpec.warpFn(center.x, center.y);
    const offset = itemLayerRigidFollowOffset(layer);
    return { x: center.x + offset.x, y: center.y + offset.y };
  }

  function itemLayerRenderedAnchorPoint(layer, anchorPoint) {
    if (!anchorPoint) return null;
    const deformSpec = itemLayerDeformFollowSpec(layer);
    if (deformSpec) return deformSpec.warpFn(anchorPoint.x, anchorPoint.y);
    const offset = itemLayerRigidFollowOffset(layer);
    return { x: anchorPoint.x + offset.x, y: anchorPoint.y + offset.y };
  }

  function itemAnchorPointToStage(layer, anchorPoint) {
    if (!anchorPoint) return null;
    const slot = itemSlotInfo(layer?.slot);
    return slot.anchor === "stage" ? anchorPoint : charPointToStage(itemLayerRenderedAnchorPoint(layer, anchorPoint));
  }

  function stagePointToItemAnchor(layer, stagePoint) {
    const slot = itemSlotInfo(layer?.slot);
    if (slot.anchor === "stage") return stagePoint;
    const charPoint = stagePointToChar(stagePoint);
    if (!charPoint) return null;
    if (itemLayerDeformFollowSpec(layer)) return charPoint;
    const offset = itemLayerRigidFollowOffset(layer);
    return { x: charPoint.x - offset.x, y: charPoint.y - offset.y };
  }

  function itemLayerAnchorToLocal(layer, anchorPoint) {
    if (!layer?.image || !anchorPoint) return null;
    const { w, h } = imageSize(layer.image);
    const center = itemLayerCenter(layer);
    const scale = Math.max(0.001, layer.scale / 100);
    const angle = (-layer.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = anchorPoint.x - center.x;
    const dy = anchorPoint.y - center.y;
    return {
      x: (dx * cos - dy * sin) / scale + w / 2,
      y: (dx * sin + dy * cos) / scale + h / 2,
    };
  }

  function itemLayerCorner(layer, cornerX, cornerY) {
    if (!layer?.image) return null;
    const { w, h } = imageSize(layer.image);
    const center = itemLayerCenter(layer);
    const scale = layer.scale / 100;
    const angle = (layer.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = (cornerX * w * scale) / 2;
    const dy = (cornerY * h * scale) / 2;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  }

  function itemResizeHandleStagePoint(layer) {
    if (!layer?.visible) return null;
    return itemAnchorPointToStage(layer, itemLayerCorner(layer, 1, -1));
  }

  function itemLayerStageCorners(layer) {
    const corners = [
      itemLayerCorner(layer, -1, -1),
      itemLayerCorner(layer, 1, -1),
      itemLayerCorner(layer, 1, 1),
      itemLayerCorner(layer, -1, 1),
    ];
    const stageCorners = corners.map((corner) => itemAnchorPointToStage(layer, corner));
    return stageCorners.every(Boolean) ? stageCorners : null;
  }

  function itemLayerLocalCorners(layer) {
    const corners = [
      itemLayerCorner(layer, -1, -1),
      itemLayerCorner(layer, 1, -1),
      itemLayerCorner(layer, 1, 1),
      itemLayerCorner(layer, -1, 1),
    ];
    return corners.every(Boolean) ? corners : null;
  }

  function itemLayerRenderedLocalCorners(layer) {
    const corners = [
      itemLayerCorner(layer, -1, -1),
      itemLayerCorner(layer, 1, -1),
      itemLayerCorner(layer, 1, 1),
      itemLayerCorner(layer, -1, 1),
    ];
    const renderedCorners = corners.map((corner) => itemLayerRenderedAnchorPoint(layer, corner));
    return renderedCorners.every(Boolean) ? renderedCorners : null;
  }

  function prepareDeformedItemSource(layer) {
    if (!gpuStageActive()) return false;
    const corners = itemLayerLocalCorners(layer);
    if (!corners) return false;
    try {
      meshRenderer.drawItemDeformSource(layer.image, corners, {
        alpha: clamp(layer.opacity / 100, 0, 1),
      });
      return true;
    } catch (error) {
      disposeGpuStageAfterDrawError("WebGPUアイテム変形元描画", error);
      return false;
    }
  }

  function drawArtFlatItemLayer(layer) {
    const corners = itemLayerStageCorners(layer);
    if (!corners) return true;
    if (!gpuStageActive()) return false;
    try {
      meshRenderer.drawStageQuad(layer.image, corners, {
        alpha: clamp(layer.opacity / 100, 0, 1),
      });
      return true;
    } catch (error) {
      disposeGpuStageAfterDrawError("WebGPUアイテム描画", error);
      return false;
    }
  }

  function drawArtDeformedItemLayer(layer, deformSpec) {
    if (!lastCharacterTransform) return true;
    if (!prepareDeformedItemSource(layer)) return false;
    try {
      meshRenderer.drawItemDeformSourceWarpedToStage(deformSpec.cols, deformSpec.rows, {
        characterTransform: lastCharacterTransform,
        gpuWarpSpec: deformSpec.gpuWarpSpec?.(),
      });
      return true;
    } catch (error) {
      disposeGpuStageAfterDrawError("WebGPUアイテム変形描画", error);
      return false;
    }
  }

  function drawArtItemLayer(layer) {
    if (!layer?.visible || !layer.image) return true;
    const deformSpec = itemLayerDeformFollowSpec(layer);
    if (deformSpec) {
      return drawArtDeformedItemLayer(layer, deformSpec);
    }
    return drawArtFlatItemLayer(layer);
  }

  function drawArtItemLayers(slotKey) {
    if (!gpuStageActive()) return false;
    let ok = true;
    for (const layer of itemLayers) {
      if (layer.slot === slotKey && !drawArtItemLayer(layer)) ok = false;
    }
    return ok && gpuStageActive();
  }

  function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[i];
      const b = polygon[j];
      const crosses = a.y > point.y !== b.y > point.y;
      if (!crosses) continue;
      const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < x) inside = !inside;
    }
    return inside;
  }

  function drawFlatItemLayer(targetCtx, layer, center) {
    const { w, h } = imageSize(layer.image);
    targetCtx.save();
    targetCtx.globalAlpha = clamp(layer.opacity / 100, 0, 1);
    targetCtx.translate(center.x, center.y);
    targetCtx.rotate((layer.rotation * Math.PI) / 180);
    const scale = layer.scale / 100;
    targetCtx.scale(scale, scale);
    targetCtx.drawImage(layer.image, -w / 2, -h / 2);
    targetCtx.restore();
  }

  function drawDeformedItemLayer(targetCtx, layer, deformSpec) {
    if (!itemDeformFollowCtx) return;
    itemDeformFollowCtx.setTransform(1, 0, 0, 1, 0, 0);
    itemDeformFollowCtx.globalAlpha = 1;
    itemDeformFollowCtx.globalCompositeOperation = "source-over";
    itemDeformFollowCtx.filter = "none";
    itemDeformFollowCtx.clearRect(0, 0, CROP.w, CROP.h);
    drawFlatItemLayer(itemDeformFollowCtx, layer, itemLayerCenter(layer));
    markCanvasTextureDirty(itemDeformFollowCanvas);
    drawMeshCroppedImage(targetCtx, itemDeformFollowCanvas, deformSpec.warpFn, deformSpec.cols, deformSpec.rows);
  }

  function drawItemLayer(targetCtx, layer) {
    if (!layer?.visible || !layer.image) return;
    const deformSpec = itemLayerDeformFollowSpec(layer);
    if (deformSpec) {
      drawDeformedItemLayer(targetCtx, layer, deformSpec);
      return;
    }
    drawFlatItemLayer(targetCtx, layer, itemLayerRenderedCenter(layer));
  }

  function drawItemLayers(targetCtx, slotKey) {
    for (const layer of itemLayers) {
      if (layer.slot === slotKey) drawItemLayer(targetCtx, layer);
    }
  }

  function itemLayerHitTest(layer, stagePoint) {
    if (!layer?.visible || !layer.image) return false;
    const corners = itemLayerStageCorners(layer);
    if (!corners) return false;
    return isPointInPolygon(stagePoint, corners);
  }

  function findItemLayerAt(stagePoint, { includeLocked = true } = {}) {
    for (const slotKey of ITEM_HIT_ORDER) {
      for (let index = itemLayers.length - 1; index >= 0; index -= 1) {
        const layer = itemLayers[index];
        if (layer.slot !== slotKey) continue;
        if (!includeLocked && layer.locked) continue;
        if (itemLayerHitTest(layer, stagePoint)) return layer;
      }
    }
    return null;
  }

  function isItemResizeHandleHit(layer, stagePoint) {
    const handle = itemResizeHandleStagePoint(layer);
    if (!handle) return false;
    return Math.hypot(stagePoint.x - handle.x, stagePoint.y - handle.y) <= ITEM_RESIZE_HANDLE_RADIUS;
  }

  function drawItemSelectionOverlay() {
    if (interactionModeActive()) return;
    if (!itemHandleVisible) return;
    const layer = activeItemLayer();
    if (!layer || layer.locked) return;
    const handle = itemResizeHandleStagePoint(layer);
    if (!handle) return;
    ctx.save();
    ctx.translate(handle.x, handle.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#fff8ee";
    ctx.strokeStyle = "rgba(217, 108, 79, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-7, -7, 14, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawEditOverlay() {
    if (!state.editMode || !deformers?.[state.editLayer]) return;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(0, 120, 54, 0.76)";
    ctx.fillStyle = "#067a37";
    ctx.setLineDash([]);

    const point = (col, row) => charPointToStage(editKeyPoint(state.editLayer, state.editKey, col, row));

    for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
      ctx.beginPath();
      for (let col = 0; col <= DEFORMER_COLS; col += 1) {
        const p = point(col, row);
        if (!p) continue;
        if (col === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let col = 0; col <= DEFORMER_COLS; col += 1) {
      ctx.beginPath();
      for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
        const p = point(col, row);
        if (!p) continue;
        if (row === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
      for (let col = 0; col <= DEFORMER_COLS; col += 1) {
        const p = point(col, row);
        if (!p) continue;
        const idx = gridIndex(col, row);
        ctx.beginPath();
        ctx.arc(p.x, p.y, editDrag?.index === idx ? 7 : 4.5, 0, TAU);
        ctx.fillStyle = editDrag?.index === idx ? "#ff7a3d" : "#067a37";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawEyeSetupOverlay() {
    if (!state.eyeSetupMode) return;
    const centers = ensureEyeCenters();
    if (!centers) return;
    const radius = eyeLensRadius();
    ctx.save();
    const { scaleX = 1, scaleY = 1, rotation = 0 } = lastCharacterTransform || {};
    centers.forEach((center, index) => {
      const p = charPointToStage(center);
      if (!p) return;
      const lensRot = eyeLensRotationForIndex(index);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rotation + lensRot);
      ctx.lineWidth = 2;
      ctx.strokeStyle = index === 0 ? "rgba(61, 140, 255, 0.9)" : "rgba(255, 122, 61, 0.9)";
      ctx.fillStyle = index === 0 ? "rgba(61, 140, 255, 0.16)" : "rgba(255, 122, 61, 0.16)";
      ctx.beginPath();
      ctx.ellipse(0, 0, radius.x * scaleX, radius.y * scaleY, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(p.x, p.y, eyeSetupDrag?.index === index ? 10 : 7, 0, TAU);
      ctx.fillStyle = index === 0 ? "#3d8cff" : "#ff7a3d";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.stroke();
      ctx.fillStyle = "rgba(52,39,31,0.8)";
      ctx.font = "800 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(index === 0 ? "L" : "R", p.x, p.y - 14);
    });
    ctx.restore();
  }

  function drawHighlightSetupOverlay() {
    if (!state.highlightSetupMode) return;
    const points = ensureHighlightPoints();
    if (!points) return;
    ctx.save();
    const { scaleX = 1, scaleY = 1, rotation = 0 } = lastCharacterTransform || {};
    const drawMarkers = (markerPoints, kind, diameter, aspect, labelPrefix, primaryColor, secondaryColor) => {
      markerPoints.forEach((point, index) => {
        const p = charPointToStage(point);
        if (!p) return;
        const lensRot = eyeLensRotationForIndex(index);
        const active = highlightSetupDrag?.kind === kind && highlightSetupDrag?.index === index;
        const color = index === 0 ? primaryColor : secondaryColor;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rotation + lensRot);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color.stroke;
        ctx.fillStyle = color.fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, diameter * 0.5 * aspect * scaleX, diameter * 0.5 * scaleY, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(p.x, p.y, active ? 10 : 7, 0, TAU);
        ctx.fillStyle = color.dot;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color.outline;
        ctx.stroke();
        ctx.fillStyle = "rgba(52,39,31,0.84)";
        ctx.font = "800 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${labelPrefix}${index === 0 ? "L" : "R"}`, p.x, p.y - 14);
      });
    };
    drawMarkers(
      points,
      "main",
      highlightDiameter(),
      highlightAspectScale(),
      "光",
      {
        stroke: "rgba(255, 220, 92, 0.96)",
        fill: "rgba(255, 220, 92, 0.18)",
        dot: "#ffdc5c",
        outline: "rgba(52,39,31,0.85)",
      },
      {
        stroke: "rgba(255, 255, 255, 0.96)",
        fill: "rgba(255, 255, 255, 0.18)",
        dot: "#ffffff",
        outline: "rgba(52,39,31,0.85)",
      }
    );
    if (state.subHighlightEnabled) {
      const subPoints = ensureSubHighlightPoints();
      if (subPoints) {
        drawMarkers(
          subPoints,
          "sub",
          subHighlightDiameter(),
          subHighlightAspectScale(),
          "サブ",
          {
            stroke: "rgba(126, 231, 255, 0.96)",
            fill: "rgba(126, 231, 255, 0.16)",
            dot: "#7ee7ff",
            outline: "rgba(52,39,31,0.85)",
          },
          {
            stroke: "rgba(196, 244, 255, 0.96)",
            fill: "rgba(196, 244, 255, 0.16)",
            dot: "#c4f4ff",
            outline: "rgba(52,39,31,0.85)",
          }
        );
      }
    }
    ctx.restore();
  }

  function drawFaceDepthSetupOverlay() {
    if (!state.faceDepthSetupMode) return;
    const anchors = ensureFaceDepthAnchors();
    if (!anchors) return;
    ctx.save();
    const points = FACE_DEPTH_ANCHOR_DEFS
      .map((def) => ({ def, stage: charPointToStage(anchors[def.key]) }))
      .filter((item) => item.stage);
    const line = (fromKey, toKey) => {
      const from = charPointToStage(anchors[fromKey]);
      const to = charPointToStage(anchors[toKey]);
      if (!from || !to) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    };
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.setLineDash([6, 5]);
    line("leftEye", "rightEye");
    line("nose", "mouth");
    line("mouth", "chin");
    ctx.setLineDash([]);
    for (const { def, stage: p } of points) {
      const active = faceDepthSetupDrag?.key === def.key;
      ctx.beginPath();
      ctx.arc(p.x, p.y, active ? 11 : 8, 0, TAU);
      ctx.fillStyle = def.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(52,39,31,0.86)";
      ctx.stroke();
      ctx.fillStyle = "rgba(52,39,31,0.86)";
      ctx.font = "800 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(def.short, p.x, p.y - 15);
    }
    ctx.restore();
  }

  function drawNeckPivotSetupOverlay() {
    if (!state.neckPivotSetupMode) return;
    const pivot = ensureNeckPivot();
    const p = charPointToStage(pivot);
    if (!p) return;
    ctx.save();
    const face = charPointToStage(currentFaceCenter());
    if (face) {
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.78)";
      ctx.beginPath();
      ctx.moveTo(face.x, face.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, neckPivotSetupDrag ? 12 : 9, 0, TAU);
    ctx.fillStyle = "#8b5cf6";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.stroke();
    ctx.fillStyle = "rgba(52,39,31,0.86)";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("首", p.x, p.y - 16);
    ctx.restore();
  }

  function fillRoundedRect(targetCtx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    targetCtx.beginPath();
    targetCtx.moveTo(x + radius, y);
    targetCtx.lineTo(x + w - radius, y);
    targetCtx.quadraticCurveTo(x + w, y, x + w, y + radius);
    targetCtx.lineTo(x + w, y + h - radius);
    targetCtx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    targetCtx.lineTo(x + radius, y + h);
    targetCtx.quadraticCurveTo(x, y + h, x, y + h - radius);
    targetCtx.lineTo(x, y + radius);
    targetCtx.quadraticCurveTo(x, y, x + radius, y);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.stroke();
  }

  function drawHairBundleBadge(text, x, y, color, { active = false, small = false } = {}) {
    ctx.save();
    ctx.font = `${small ? 700 : 900} ${small ? 12 : 15}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const paddingX = small ? 7 : 10;
    const paddingY = small ? 4 : 6;
    const metrics = ctx.measureText(text);
    const w = metrics.width + paddingX * 2;
    const h = (small ? 18 : 24) + paddingY * 0.35;
    ctx.fillStyle = active ? color : "rgba(255, 248, 238, 0.94)";
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 3 : 2;
    fillRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 8);
    ctx.fillStyle = active ? "rgba(52,39,31,0.95)" : "rgba(52,39,31,0.9)";
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function drawHairBundleLegend() {
    const x = 18;
    const y = 18;
    const w = 360;
    const h = 164;
    ctx.save();
    ctx.fillStyle = "rgba(255, 248, 238, 0.92)";
    ctx.strokeStyle = "rgba(52,39,31,0.28)";
    ctx.lineWidth = 1.5;
    fillRoundedRect(ctx, x, y, w, h, 12);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(52,39,31,0.92)";
    ctx.font = "900 14px system-ui, sans-serif";
    ctx.fillText("髪束編集：どこに合わせる？", x + 14, y + 24);
    const rows = [
      { color: "#ff9b3d", text: "前髪：顔の前にかかる髪" },
      { color: "#45c7e8", text: "横髪：耳横・頬横の長い髪" },
      { color: "#8b5cf6", text: "後ろ髪：顔の後ろ・背面の髪" },
    ];
    ctx.font = "800 12px system-ui, sans-serif";
    rows.forEach((row, index) => {
      const yy = y + 46 + index * 20;
      ctx.strokeStyle = row.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 16, yy - 4);
      ctx.lineTo(x + 42, yy - 4);
      ctx.stroke();
      ctx.fillStyle = "rgba(52,39,31,0.86)";
      ctx.fillText(row.text, x + 52, yy);
    });
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(52,39,31,0.78)";
    ctx.fillText("白丸=頭側の固定点：束の上端/頭に入っていくあたり。", x + 14, y + 108);
    ctx.fillText("生え際が見えない時は、髪束の上の隠れた開始位置に置きます。", x + 14, y + 126);
    ctx.fillText(`表示中: ${hairBundleFocusLabel()} / 触れるのは表示中の線だけ。`, x + 14, y + 146);
    ctx.restore();
  }

  function drawHairBundleSetupOverlay() {
    if (!state.hairBundleSetupMode) return;
    const rig = ensureHairBundleRig();
    if (!rig) return;
    ctx.save();
    drawHairBundleLegend();
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineCap = "round";
    for (const def of visibleHairBundleDefs()) {
      const line = rig[def.key];
      const root = charPointToStage(line.root);
      const tip = charPointToStage(line.tip);
      if (!root || !tip) continue;
      const rootActive = hairBundleSetupDrag?.key === def.key && hairBundleSetupDrag?.point === "root";
      const tipActive = hairBundleSetupDrag?.key === def.key && hairBundleSetupDrag?.point === "tip";
      const lineActive = rootActive || tipActive;
      const dx = tip.x - root.x;
      const dy = tip.y - root.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / len;
      const normalY = dx / len;
      const sideSign = def.positionLabel === "左" ? -1 : def.positionLabel === "右" ? 1 : 0;
      const labelOffset = def.group === "back" ? -26 : 24;
      const labelX = root.x + dx * 0.42 + normalX * labelOffset + sideSign * 12;
      const labelY = root.y + dy * 0.42 + normalY * labelOffset;

      ctx.lineWidth = lineActive ? 7 : 5;
      ctx.strokeStyle = `${def.color}cc`;
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();

      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.78)";
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawHairBundleBadge(def.short, labelX, labelY, def.color, { active: lineActive });

      ctx.beginPath();
      ctx.arc(root.x, root.y, rootActive ? 12 : 8, 0, TAU);
      ctx.fillStyle = "#fff8ee";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = def.color;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, tipActive ? 13 : 9, 0, TAU);
      ctx.fillStyle = def.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(52,39,31,0.86)";
      ctx.stroke();

      drawHairBundleBadge("頭側", root.x, root.y - 20, def.color, { active: rootActive, small: true });
      drawHairBundleBadge("毛先", tip.x, tip.y + 24, def.color, { active: tipActive, small: true });
    }
    ctx.restore();
  }

  function drawCharacterWizardPoint(point, label, color, { active = false } = {}) {
    const p = charPointToStage(point);
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, active ? 13 : 9, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = active ? 3 : 2;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.stroke();
    drawHairBundleBadge(label, p.x, p.y - 22, color, { active, small: true });
  }

  function drawCharacterWizardOverlay() {
    if (!characterWizard?.active) return;
    if (characterWizardStepKey() === "hairBundles") return;
    const draft = characterWizard.draft;
    if (!draft) return;
    const stepKey = characterWizardStepKey();
    ctx.save();
    const face = charPointToStage(draft.faceCenter);
    const neck = charPointToStage(draft.neckPivot);
    if (face && neck) {
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255,255,255,0.78)";
      ctx.beginPath();
      ctx.moveTo(face.x, face.y);
      ctx.lineTo(neck.x, neck.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const anchors = draft.faceAnchors || {};
    const leftEye = charPointToStage(anchors.leftEye);
    const rightEye = charPointToStage(anchors.rightEye);
    if (leftEye && rightEye) {
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.beginPath();
      ctx.moveTo(leftEye.x, leftEye.y);
      ctx.lineTo(rightEye.x, rightEye.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const entries = [
      ["faceCenter", draft.faceCenter],
      ["leftEye", anchors.leftEye],
      ["rightEye", anchors.rightEye],
      ["nose", anchors.nose],
      ["mouth", anchors.mouth],
      ["chin", anchors.chin],
      ["neckPivot", draft.neckPivot],
    ];
    for (const [key, point] of entries) {
      const def = CHARACTER_WIZARD_STEP_DEFS[key];
      if (!def || !point) continue;
      drawCharacterWizardPoint(point, def.label, def.color, { active: key === stepKey });
    }
    if (stepKey !== "finish") {
      const def = characterWizardStepDef();
      const p = characterWizardPointForStep(stepKey);
      if (p) {
        const stagePoint = charPointToStage(p);
        if (stagePoint) {
          ctx.beginPath();
          ctx.arc(stagePoint.x, stagePoint.y, 24, 0, TAU);
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.74)";
          ctx.stroke();
          drawHairBundleBadge("今ここ", stagePoint.x, stagePoint.y + 30, def.color, { active: true, small: true });
        }
      }
    }
    ctx.restore();
  }

  function findEditPoint(stagePoint) {
    if (!state.editMode || !lastCharacterTransform || !deformers?.[state.editLayer]) return null;
    let best = null;
    for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
      for (let col = 0; col <= DEFORMER_COLS; col += 1) {
        const idx = gridIndex(col, row);
        const p = charPointToStage(editKeyPoint(state.editLayer, state.editKey, col, row));
        if (!p) continue;
        const d = Math.hypot(stagePoint.x - p.x, stagePoint.y - p.y);
        if (d <= 18 && (!best || d < best.distance)) {
          best = { col, row, index: idx, distance: d };
        }
      }
    }
    return best;
  }

  function findEyeSetupPoint(stagePoint) {
    if (!state.eyeSetupMode || !lastCharacterTransform) return null;
    const centers = ensureEyeCenters();
    let best = null;
    centers.forEach((center, index) => {
      const p = charPointToStage(center);
      if (!p) return;
      const d = Math.hypot(stagePoint.x - p.x, stagePoint.y - p.y);
      if (d <= 24 && (!best || d < best.distance)) {
        best = { index, distance: d };
      }
    });
    return best;
  }

  function findHighlightSetupPoint(stagePoint) {
    if (!state.highlightSetupMode || !lastCharacterTransform) return null;
    const mainPoints = ensureHighlightPoints();
    if (!mainPoints) return null;
    let best = null;
    const checkPoints = (points, kind) => {
      points.forEach((point, index) => {
        const p = charPointToStage(point);
        if (!p) return;
        const d = Math.hypot(stagePoint.x - p.x, stagePoint.y - p.y);
        if (d <= 24 && (!best || d < best.distance)) {
          best = { kind, index, distance: d };
        }
      });
    };
    checkPoints(mainPoints, "main");
    if (state.subHighlightEnabled) {
      const subPoints = ensureSubHighlightPoints();
      if (subPoints) checkPoints(subPoints, "sub");
    }
    return best;
  }

  function findFaceDepthSetupPoint(stagePoint) {
    if (!state.faceDepthSetupMode || !lastCharacterTransform) return null;
    const anchors = ensureFaceDepthAnchors();
    let best = null;
    for (const def of FACE_DEPTH_ANCHOR_DEFS) {
      const p = charPointToStage(anchors[def.key]);
      if (!p) continue;
      const d = Math.hypot(stagePoint.x - p.x, stagePoint.y - p.y);
      if (d <= 28 && (!best || d < best.distance)) {
        best = { key: def.key, label: def.label, distance: d };
      }
    }
    return best;
  }

  function findNeckPivotSetupPoint(stagePoint) {
    if (!state.neckPivotSetupMode || !lastCharacterTransform) return null;
    const pivot = ensureNeckPivot();
    const p = charPointToStage(pivot);
    if (!p) return null;
    const d = Math.hypot(stagePoint.x - p.x, stagePoint.y - p.y);
    return d <= 32 ? { distance: d } : null;
  }

  function findHairBundleSetupPoint(stagePoint) {
    if (!state.hairBundleSetupMode || !lastCharacterTransform) return null;
    const rig = ensureHairBundleRig();
    let best = null;
    for (const def of visibleHairBundleDefs()) {
      const line = rig[def.key];
      for (const point of ["root", "tip"]) {
        const p = charPointToStage(line[point]);
        if (!p) continue;
        const d = Math.hypot(stagePoint.x - p.x, stagePoint.y - p.y);
        if (d <= 30 && (!best || d < best.distance)) {
          best = { key: def.key, point, label: def.label, distance: d };
        }
      }
    }
    return best;
  }

  function isCharacterHit(stagePoint) {
    const p = stagePointToChar(stagePoint);
    if (!p) return false;
    return p.x >= 0 && p.x <= CROP.w && p.y >= 0 && p.y <= CROP.h;
  }

  function setEditPreviewFromKey() {
    const target = EDIT_KEY_TARGETS[state.editKey] || EDIT_KEY_TARGETS.center;
    state.targetX = target.x;
    state.targetY = target.y;
    state.angleX = target.x;
    state.angleY = target.y;
  }

  function resetEditKey(layer = state.editLayer, key = state.editKey) {
    if (!deformers?.[layer]?.keys?.[key]) return;
    for (let row = 0; row <= DEFORMER_ROWS; row += 1) {
      for (let col = 0; col <= DEFORMER_COLS; col += 1) {
        deformers[layer].keys[key][gridIndex(col, row)] = layer === "face"
          ? seedFaceOffset(key, col, row)
          : seedHairOffset(key, col, row, layer);
      }
    }
    setEditStatus("現在のキーを初期化しました。");
  }

  function handleCharacterWizardPointerDown(event) {
    if (!characterWizard?.active) return false;
    const stepKey = characterWizardStepKey();
    if (stepKey === "hairBundles" || stepKey === "finish") return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) {
      setCharacterWizardStatus("キャラの上をクリックして点を置いてください。");
      event.preventDefault();
      return true;
    }
    setCharacterWizardPointForStep(charPoint, stepKey);
    const def = characterWizardStepDef();
    setCharacterWizardStatus(`${def.label}: x=${Math.round(charPoint.x)}, y=${Math.round(charPoint.y)}。良ければ「この点でOK」。`);
    event.preventDefault();
    return true;
  }

  function handleEditPointerDown(event) {
    if (!state.editMode) return false;
    const hit = findEditPoint({ x: event.clientX, y: event.clientY });
    if (!hit) return true;
    editDrag = hit;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return true;
  }

  function handleEditPointerMove(event) {
    if (!state.editMode || !editDrag) return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) return true;
    const base = baseGridPoint(editDrag.col, editDrag.row);
    const rootLock = state.editLayer === "frontHair" || state.editLayer === "backHair"
      ? clamp((base.y - 92) / 260, 0, 1)
      : 1;
    deformers[state.editLayer].keys[state.editKey][editDrag.index] = {
      x: clamp((charPoint.x - base.x) * rootLock, -500, 500),
      y: clamp((charPoint.y - base.y) * rootLock, -500, 500),
    };
    setEditStatus(`${state.editLayer} / ${state.editKey} / 点${editDrag.index} を編集中`);
    event.preventDefault();
    return true;
  }

  function handleEditPointerUp(event) {
    if (!editDrag) return false;
    editDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    setEditStatus("格子点を更新しました。必要なら保存してください。");
    markActiveCharacterDirty("settings", "warp-edit");
    event.preventDefault();
    return true;
  }

  function handleEyeSetupPointerDown(event) {
    if (!state.eyeSetupMode) return false;
    const hit = findEyeSetupPoint({ x: event.clientX, y: event.clientY });
    if (hit) {
      eyeSetupDrag = hit;
      canvas.setPointerCapture?.(event.pointerId);
      setEyeSetupStatus(`${hit.index === 0 ? "左" : "右"}目の瞳位置をドラッグ中です。`);
    } else {
      setEyeSetupStatus("左右の丸をドラッグして、黒目や虹彩の中心に合わせてください。");
    }
    event.preventDefault();
    return true;
  }

  function handleEyeSetupPointerMove(event) {
    if (!state.eyeSetupMode || !eyeSetupDrag) return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) return true;
    const centers = ensureEyeCenters();
    const index = eyeSetupDrag.index;
    const other = centers[index === 0 ? 1 : 0];
    const margin = 18;
    const x = index === 0
      ? clamp(charPoint.x, 0, other.x - margin)
      : clamp(charPoint.x, other.x + margin, CROP.w);
    centers[index] = {
      x,
      y: clamp(charPoint.y, 0, CROP.h),
    };
    setEyeSetupStatus(
      `${index === 0 ? "左" : "右"}目: x=${Math.round(centers[index].x)}, y=${Math.round(centers[index].y)} / 良ければ保存`,
    );
    event.preventDefault();
    return true;
  }

  function handleEyeSetupPointerUp(event) {
    if (!eyeSetupDrag) return false;
    eyeSetupDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    setEyeSetupStatus("瞳位置を更新しました。良ければ「瞳位置を保存」を押してください。");
    markActiveCharacterDirty("settings", "eye-setup");
    event.preventDefault();
    return true;
  }

  function handleHighlightSetupPointerDown(event) {
    if (!state.highlightSetupMode) return false;
    const hit = findHighlightSetupPoint({ x: event.clientX, y: event.clientY });
    if (hit) {
      highlightSetupDrag = hit;
      canvas.setPointerCapture?.(event.pointerId);
      setHighlightSetupStatus(
        `${hit.index === 0 ? "左" : "右"}目の${hit.kind === "sub" ? "サブ" : "メイン"}ハイライト位置をドラッグ中です。`
      );
    } else {
      setHighlightSetupStatus("左右の光マーカーをドラッグして、白い光を置きたい位置に合わせてください。");
    }
    event.preventDefault();
    return true;
  }

  function handleHighlightSetupPointerMove(event) {
    if (!state.highlightSetupMode || !highlightSetupDrag) return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) return true;
    const points = highlightSetupDrag.kind === "sub" ? ensureSubHighlightPoints() : ensureHighlightPoints();
    if (!points) return true;
    const index = highlightSetupDrag.index;
    const other = points[index === 0 ? 1 : 0];
    const margin = 8;
    const x = index === 0
      ? clamp(charPoint.x, 0, other.x - margin)
      : clamp(charPoint.x, other.x + margin, CROP.w);
    points[index] = {
      x,
      y: clamp(charPoint.y, 0, CROP.h),
    };
    setHighlightSetupStatus(
      `${index === 0 ? "左" : "右"}目の${highlightSetupDrag.kind === "sub" ? "サブ光" : "メイン光"}: x=${Math.round(points[index].x)}, y=${Math.round(points[index].y)} / 良ければ保存`,
    );
    event.preventDefault();
    return true;
  }

  function handleHighlightSetupPointerUp(event) {
    if (!highlightSetupDrag) return false;
    highlightSetupDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    setHighlightSetupStatus("ハイライト位置を更新しました。良ければ「ハイライト位置を保存」を押してください。");
    markActiveCharacterDirty("settings", "highlight-setup");
    event.preventDefault();
    return true;
  }

  function handleFaceDepthSetupPointerDown(event) {
    if (!state.faceDepthSetupMode) return false;
    const hit = findFaceDepthSetupPoint({ x: event.clientX, y: event.clientY });
    if (hit) {
      faceDepthSetupDrag = hit;
      canvas.setPointerCapture?.(event.pointerId);
      setFaceDepthSetupStatus(`${hit.label}の奥行き点をドラッグ中です。`);
    } else {
      setFaceDepthSetupStatus("5つの丸を、左目・右目・鼻・口・顎の中心へドラッグしてください。");
    }
    event.preventDefault();
    return true;
  }

  function handleFaceDepthSetupPointerMove(event) {
    if (!state.faceDepthSetupMode || !faceDepthSetupDrag) return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) return true;
    const anchors = ensureFaceDepthAnchors();
    const key = faceDepthSetupDrag.key;
    let x = clamp(charPoint.x, 0, CROP.w);
    const y = clamp(charPoint.y, 0, CROP.h);
    const margin = 18;
    if (key === "leftEye") x = clamp(x, 0, anchors.rightEye.x - margin);
    if (key === "rightEye") x = clamp(x, anchors.leftEye.x + margin, CROP.w);
    anchors[key] = { x, y };
    faceDepthAnchorsRaw = anchors;
    setFaceDepthSetupStatus(
      `${faceDepthSetupDrag.label}: x=${Math.round(x)}, y=${Math.round(y)} / 良ければ保存`,
    );
    event.preventDefault();
    return true;
  }

  function handleFaceDepthSetupPointerUp(event) {
    if (!faceDepthSetupDrag) return false;
    faceDepthSetupDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    setFaceDepthSetupStatus("顔奥行き点を更新しました。良ければ「奥行き点を保存」を押してください。");
    markActiveCharacterDirty("settings", "face-depth-setup");
    event.preventDefault();
    return true;
  }

  function handleNeckPivotSetupPointerDown(event) {
    if (!state.neckPivotSetupMode) return false;
    const hit = findNeckPivotSetupPoint({ x: event.clientX, y: event.clientY });
    if (hit) {
      neckPivotSetupDrag = { pointerId: event.pointerId };
      canvas.setPointerCapture?.(event.pointerId);
      setNeckPivotSetupStatus("首支点をドラッグ中です。");
    } else {
      setNeckPivotSetupStatus("紫の丸を首の付け根へドラッグしてください。");
    }
    event.preventDefault();
    return true;
  }

  function handleNeckPivotSetupPointerMove(event) {
    if (!state.neckPivotSetupMode || !neckPivotSetupDrag) return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) return true;
    neckPivotRaw = {
      x: clamp(charPoint.x, 0, CROP.w),
      y: clamp(charPoint.y, 0, CROP.h),
    };
    setNeckPivotSetupStatus(
      `首支点: x=${Math.round(neckPivotRaw.x)}, y=${Math.round(neckPivotRaw.y)} / 良ければ保存`,
    );
    event.preventDefault();
    return true;
  }

  function handleNeckPivotSetupPointerUp(event) {
    if (!neckPivotSetupDrag) return false;
    neckPivotSetupDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    setNeckPivotSetupStatus("首支点を更新しました。良ければ「首支点を保存」を押してください。");
    markActiveCharacterDirty("settings", "neck-pivot-setup");
    event.preventDefault();
    return true;
  }

  function handleHairBundleSetupPointerDown(event) {
    if (!state.hairBundleSetupMode) return false;
    const hit = findHairBundleSetupPoint({ x: event.clientX, y: event.clientY });
    if (hit) {
      hairBundleSetupDrag = { ...hit, pointerId: event.pointerId };
      canvas.setPointerCapture?.(event.pointerId);
      setHairBundleSetupStatus(`${hit.label}の${hit.point === "root" ? "頭側の固定点" : "毛先"}をドラッグ中です。`);
    } else {
      setHairBundleSetupStatus(`表示中: ${hairBundleFocusLabel()}。白丸は頭側、色丸は毛先です。必要なら髪束の表示を切り替えてください。`);
    }
    event.preventDefault();
    return true;
  }

  function handleHairBundleSetupPointerMove(event) {
    if (!state.hairBundleSetupMode || !hairBundleSetupDrag) return false;
    const charPoint = stagePointToChar({ x: event.clientX, y: event.clientY });
    if (!charPoint) return true;
    const rig = ensureHairBundleRig();
    const line = rig[hairBundleSetupDrag.key];
    if (!line) return true;
    const point = {
      x: clamp(charPoint.x, 0, CROP.w),
      y: clamp(charPoint.y, 0, CROP.h),
    };
    const otherPointName = hairBundleSetupDrag.point === "root" ? "tip" : "root";
    const other = line[otherPointName];
    if (Math.hypot(point.x - other.x, point.y - other.y) < 24) {
      setHairBundleSetupStatus("頭側の固定点と毛先が近すぎます。少し離して配置してください。");
      event.preventDefault();
      return true;
    }
    line[hairBundleSetupDrag.point] = point;
    setHairBundleRigRaw(rig, { normalized: true });
    setHairBundleSetupStatus(
      `${hairBundleSetupDrag.label} ${hairBundleSetupDrag.point === "root" ? "頭側" : "毛先"}: x=${Math.round(point.x)}, y=${Math.round(point.y)} / 良ければ保存`,
    );
    event.preventDefault();
    return true;
  }

  function handleHairBundleSetupPointerUp(event) {
    if (!hairBundleSetupDrag) return false;
    hairBundleSetupDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    setHairBundleSetupStatus("髪束ラインを更新しました。良ければ「髪束を保存」を押してください。");
    markActiveCharacterDirty("settings", "hair-bundle-setup");
    event.preventDefault();
    return true;
  }

  function handleCharacterPointerDown(event) {
    if (interactionModeActive()) return false;
    if (!isCharacterHit({ x: event.clientX, y: event.clientY })) return false;
    characterDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      avatarX: state.avatarX,
      avatarY: state.avatarY,
    };
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return true;
  }

  function handleCharacterPointerMove(event) {
    if (!characterDrag || characterDrag.pointerId !== event.pointerId) return false;
    state.avatarX = Math.round(characterDrag.avatarX + event.clientX - characterDrag.startX);
    state.avatarY = Math.round(characterDrag.avatarY + event.clientY - characterDrag.startY);
    event.preventDefault();
    return true;
  }

  function handleCharacterPointerUp(event) {
    if (!characterDrag || characterDrag.pointerId !== event.pointerId) return false;
    characterDrag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    markActiveCharacterDirty("settings", "character-drag");
    event.preventDefault();
    return true;
  }

  function handleCharacterWheel(event) {
    const wizardSizeAllowed = Boolean(characterWizard?.active);
    if (interactionModeActive() && !wizardSizeAllowed) return false;
    if (!isCharacterHit({ x: event.clientX, y: event.clientY })) return false;
    const direction = event.deltaY < 0 ? 1 : -1;
    const step = event.shiftKey ? 2 : 7;
    setAvatarSize(state.avatarSize + direction * step);
    markActiveCharacterDirty("settings", "character-wheel");
    event.preventDefault();
    return true;
  }

  function handleItemPointerDown(event) {
    if (interactionModeActive()) return false;
    if (itemMutationActive) return false;
    const stagePoint = { x: event.clientX, y: event.clientY };
    const current = activeItemLayer();

    if (current && !current.locked && itemHandleVisible && isItemResizeHandleHit(current, stagePoint)) {
      const anchorPoint = stagePointToItemAnchor(current, stagePoint);
      const center = itemLayerCenter(current);
      if (!anchorPoint || !center) return false;
      itemDrag = {
        type: "resize",
        pointerId: event.pointerId,
        layerId: current.id,
        center,
        startDistance: Math.max(1, Math.hypot(anchorPoint.x - center.x, anchorPoint.y - center.y)),
        startScale: current.scale,
      };
      canvas.classList.add("is-dragging");
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return true;
    }

    const hitLayer = findItemLayerAt(stagePoint, { includeLocked: false });
    if (!hitLayer) {
      if (itemHandleVisible) {
        itemHandleVisible = false;
        updateItemLayerUi({ rebuildList: false });
      }
      return false;
    }

    activeItemLayerId = hitLayer.id;
    const anchorPoint = stagePointToItemAnchor(hitLayer, stagePoint);
    if (!anchorPoint) return false;
    itemHandleVisible = true;
    itemDrag = {
      type: "move",
      pointerId: event.pointerId,
      layerId: hitLayer.id,
      startPoint: anchorPoint,
      startX: hitLayer.x,
      startY: hitLayer.y,
    };
    updateItemLayerUi();
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return true;
  }

  function handleItemPointerMove(event) {
    if (!itemDrag || itemDrag.pointerId !== event.pointerId) return false;
    const layer = itemLayers.find((item) => item.id === itemDrag.layerId);
    if (!layer || layer.locked) return true;
    const stagePoint = { x: event.clientX, y: event.clientY };
    const anchorPoint = stagePointToItemAnchor(layer, stagePoint);
    if (!anchorPoint) return true;

    if (itemDrag.type === "move") {
      layer.x = Math.round(clamp(itemDrag.startX + anchorPoint.x - itemDrag.startPoint.x, -3000, 3000));
      layer.y = Math.round(clamp(itemDrag.startY + anchorPoint.y - itemDrag.startPoint.y, -3000, 3000));
    } else if (itemDrag.type === "resize") {
      const distance = Math.max(1, Math.hypot(anchorPoint.x - itemDrag.center.x, anchorPoint.y - itemDrag.center.y));
      layer.scale = Math.round(clamp(itemDrag.startScale * (distance / itemDrag.startDistance), 10, 500));
    }

    updateItemLayerUi({ rebuildList: false });
    event.preventDefault();
    return true;
  }

  function handleItemPointerUp(event) {
    if (!itemDrag || itemDrag.pointerId !== event.pointerId) return false;
    itemDrag = null;
    canvas.classList.remove("is-dragging");
    canvas.releasePointerCapture?.(event.pointerId);
    updateItemLayerUi({ rebuildList: false });
    markActiveCharacterDirty("settings", "item-drag");
    event.preventDefault();
    return true;
  }

  function render({ retryingAfterRendererFallback = false } = {}) {
    if (!retryingAfterRendererFallback) rendererFallbackRequested = false;
    fallbackFromLostWebGpuRenderer();
    resizeCanvas();
    if (gpuStageActive()) {
      setStageArtVisible(true);
      meshRenderer.resizeStage(stage.w, stage.h, stage.dpr);
      ctx.clearRect(0, 0, stage.w, stage.h);
    } else {
      setStageArtVisible(false);
    }
    drawBackground();
    const stageBackDrawn = gpuStageActive() && drawArtItemLayers("stageBack");
    if (!stageBackDrawn) drawItemLayers(ctx, "stageBack");
    if (!imagesReady) {
      drawLoading();
      if (retryRenderAfterRendererFallback(retryingAfterRendererFallback)) return;
      return;
    }

    lastCharacterTransform = computeCharacterTransform();
    drawShadow(
      lastCharacterTransform.centerX,
      lastCharacterTransform.centerY + lastCharacterTransform.drawH * 0.43,
      lastCharacterTransform.drawW * 0.34,
      lastCharacterTransform.pyokoVoice
    );
    drawCharacterAnchoredItemLayers("characterBack");
    drawBackHairLayer();
    drawCharacterAnchoredItemLayers("faceBack");
    drawFaceAndHighlightLayer();
    drawCharacterAnchoredItemLayers("faceFront");
    drawFrontHairCastShadow();
    drawFrontHairLayer();
    drawCharacterAnchoredItemLayers("frontHairFront");
    drawCharacterMeshGuideLayer();
    const stageFrontDrawn = gpuStageActive() && drawArtItemLayers("stageFront");
    if (!stageFrontDrawn) drawItemLayers(ctx, "stageFront");
    if (retryRenderAfterRendererFallback(retryingAfterRendererFallback)) return;
    if (OBS_MODE) return;
    drawItemSelectionOverlay();
    drawEditOverlay();
    drawEyeSetupOverlay();
    drawHighlightSetupOverlay();
    drawFaceDepthSetupOverlay();
    drawNeckPivotSetupOverlay();
    drawHairBundleSetupOverlay();
    drawCharacterWizardOverlay();
  }

  function createFaceTracker(onPose) {
    const st = {
      video: null,
      stream: null,
      landmarker: null,
      raf: null,
      running: false,
      ready: false,
      calibrated: false,
      calibrating: false,
      baseYaw: 0,
      basePitch: 0,
      calibYawSum: 0,
      calibPitchSum: 0,
      calibFrames: 0,
      yaw: 0,
      pitch: 0,
      lastVideoTime: -1,
      lastDetectAt: 0,
      lastSeenAt: 0,
      lastNoFaceStatusAt: 0,
      detectErrorCount: 0,
    };

    function ensureVideo() {
      if (st.video) return st.video;
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.style.position = "fixed";
      video.style.left = "-2px";
      video.style.top = "-2px";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      document.body.appendChild(video);
      st.video = video;
      return video;
    }

    async function createLandmarker(delegate) {
      const vision = await import(FACE_TRACKING_CONFIG.visionModuleUrl);
      const { FilesetResolver, FaceLandmarker } = vision;
      const fileset = await FilesetResolver.forVisionTasks(FACE_TRACKING_CONFIG.wasmRoot);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: FACE_TRACKING_CONFIG.modelAssetPath,
          delegate,
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    }

    async function loadLandmarker() {
      if (st.landmarker) return;
      setFaceTrackStatus("顔トラッキング: MediaPipeを読み込み中...");
      try {
        st.landmarker = await createLandmarker("GPU");
      } catch (gpuError) {
        console.warn("MediaPipe GPU初期化に失敗したためCPUへ切り替えます。", gpuError);
        try {
          st.landmarker = await createLandmarker("CPU");
        } catch (cpuError) {
          console.warn("MediaPipe CPU初期化にも失敗しました。", cpuError);
          throw new Error("MediaPipeを読み込めませんでした。ネットワーク接続またはCDNへのアクセスを確認してください。");
        }
      }
      st.ready = true;
    }

    function poseFromLandmarks(landmarks) {
      const nose = landmarks[FACE_LANDMARKS.noseTip];
      const leftEye = landmarks[FACE_LANDMARKS.leftEyeOuter];
      const rightEye = landmarks[FACE_LANDMARKS.rightEyeOuter];
      const chin = landmarks[FACE_LANDMARKS.chin];
      if (!nose || !leftEye || !rightEye || !chin) return null;

      const eyeMidX = (leftEye.x + rightEye.x) * 0.5;
      const eyeMidY = (leftEye.y + rightEye.y) * 0.5;
      const faceHalfWidth = Math.abs(rightEye.x - leftEye.x) * 0.5;
      const eyeToChin = Math.abs(chin.y - eyeMidY);
      const noseToEye = eyeMidY - nose.y;
      return {
        rawYaw: faceHalfWidth > 0.01 ? (nose.x - eyeMidX) / faceHalfWidth : 0,
        rawPitch: eyeToChin > 0.01 ? noseToEye / eyeToChin : 0,
      };
    }

    function requestCalibration() {
      st.calibrating = true;
      st.calibrated = false;
      st.calibYawSum = 0;
      st.calibPitchSum = 0;
      st.calibFrames = 0;
      st.yaw = 0;
      st.pitch = 0;
      setPreviewTarget(0, 0);
      setFaceTrackStatus("顔トラッキング: 正面を向いたまま少し待ってください...");
    }

    function collectCalibration(rawYaw, rawPitch) {
      st.calibYawSum += rawYaw;
      st.calibPitchSum += rawPitch;
      st.calibFrames += 1;
      if (st.calibFrames < FACE_TRACKING_CONFIG.calibrationFrames) return false;

      st.baseYaw = st.calibYawSum / st.calibFrames;
      st.basePitch = st.calibPitchSum / st.calibFrames;
      st.calibrating = false;
      st.calibrated = true;
      setFaceTrackStatus("顔トラッキング: ON");
      return true;
    }

    function detectLoop() {
      if (!st.running) {
        st.raf = null;
        return;
      }
      st.raf = requestAnimationFrame(detectLoop);
      if (!st.ready || !st.landmarker || !st.video) return;
      if (st.video.readyState < 2 || st.video.videoWidth === 0) return;
      if (st.video.currentTime === st.lastVideoTime) return;
      st.lastVideoTime = st.video.currentTime;

      const now = performance.now();
      let result = null;
      try {
        result = st.landmarker.detectForVideo(st.video, now);
      } catch (error) {
        console.warn("FaceLandmarker detect error:", error);
        st.detectErrorCount += 1;
        if (st.detectErrorCount >= 5) {
          stop();
          syncButtonPressed(ui.faceTrackButton, "顔トラッキング停止", "顔トラッキング開始", false);
          setFaceTrackStatus("顔トラッキング: 検出エラーが続いたため停止しました", true);
        }
        return;
      }
      st.detectErrorCount = 0;

      const landmarks = result?.faceLandmarks?.[0];
      if (!landmarks) {
        if (now - st.lastSeenAt > 600) {
          setPreviewTarget(0, 0);
          if (now - st.lastNoFaceStatusAt > 1000) {
            st.lastNoFaceStatusAt = now;
            setFaceTrackStatus("顔トラッキング: 顔が見つかりません");
          }
        }
        return;
      }

      st.lastSeenAt = now;
      const pose = poseFromLandmarks(landmarks);
      if (!pose) return;
      if (st.calibrating || !st.calibrated) {
        collectCalibration(pose.rawYaw, pose.rawPitch);
        return;
      }

      const targetYaw = clamp(-(pose.rawYaw - st.baseYaw) * FACE_TRACKING_CONFIG.yawGain, -1, 1);
      const targetPitch = clamp((pose.rawPitch - st.basePitch) * FACE_TRACKING_CONFIG.pitchGain, -1, 1);
      const dt = st.lastDetectAt ? clamp((now - st.lastDetectAt) / 1000, 0.001, 0.1) : 1 / 60;
      st.lastDetectAt = now;
      const smoothing = clamp(FACE_TRACKING_CONFIG.smoothing, 0.001, 0.999);
      const smoothingRate = -Math.log(1 - smoothing) * 60;
      const follow = 1 - Math.exp(-dt * smoothingRate);
      st.yaw = lerp(st.yaw, targetYaw, follow);
      st.pitch = lerp(st.pitch, targetPitch, follow);
      onPose({ yaw: st.yaw, pitch: st.pitch });
    }

    async function start() {
      if (st.running) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("このブラウザではカメラ取得に対応していません。");
      }

      try {
        setFaceTrackStatus("顔トラッキング: カメラを起動中...");
        const video = ensureVideo();
        st.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });
        video.srcObject = st.stream;
        await video.play();
        await loadLandmarker();
        st.running = true;
        st.lastDetectAt = 0;
        st.detectErrorCount = 0;
        st.lastSeenAt = performance.now();
        requestCalibration();
        detectLoop();
      } catch (error) {
        stop();
        throw error;
      }
    }

    function stop() {
      st.running = false;
      st.ready = false;
      st.calibrated = false;
      st.calibrating = false;
      st.lastDetectAt = 0;
      st.detectErrorCount = 0;
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = null;
      if (st.landmarker) {
        try {
          st.landmarker.close();
        } catch (error) {
          console.warn("FaceLandmarker close error:", error);
        }
      }
      st.landmarker = null;
      if (st.stream) {
        st.stream.getTracks().forEach((track) => track.stop());
      }
      st.stream = null;
      if (st.video) {
        st.video.srcObject = null;
        st.video.remove();
        st.video = null;
      }
      setPreviewTarget(0, 0);
    }

    return {
      start,
      stop,
      requestCalibration,
      isRunning: () => st.running,
    };
  }

  function createAudioEngine() {
    const audio = {
      ctx: null,
      analyser: null,
      source: null,
      stream: null,
      buffer: null,
    };

    function context() {
      if (!audio.ctx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) throw new Error("このブラウザはWeb Audio APIに対応していません。");
        audio.ctx = new AudioCtor();
      }
      return audio.ctx;
    }

    function disconnectAudioNodes() {
      if (audio.source) {
        try {
          audio.source.disconnect();
        } catch (error) {
          console.warn("Audio source disconnect error:", error);
        }
      }
      if (audio.analyser) {
        try {
          audio.analyser.disconnect();
        } catch (error) {
          console.warn("Audio analyser disconnect error:", error);
        }
      }
      audio.source = null;
      audio.analyser = null;
    }

    function stopMic() {
      disconnectAudioNodes();
      if (audio.stream) audio.stream.getTracks().forEach((track) => track.stop());
      audio.stream = null;
    }

    return {
      async startMic() {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("マイクは localhost または HTTPS で開いた時に利用できます。");
        }
        stopMic();
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          const ctxAudio = context();
          await ctxAudio.resume();
          const source = ctxAudio.createMediaStreamSource(stream);
          const analyser = ctxAudio.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0;
          source.connect(analyser);
          audio.stream = stream;
          audio.source = source;
          audio.analyser = analyser;
        } catch (error) {
          if (stream) stream.getTracks().forEach((track) => track.stop());
          disconnectAudioNodes();
          audio.stream = null;
          throw error;
        }
      },
      stopMic,
      close() {
        stopMic();
        if (!audio.ctx) return Promise.resolve();
        const ctxAudio = audio.ctx;
        audio.ctx = null;
        audio.buffer = null;
        if (ctxAudio.state === "closed") return Promise.resolve();
        return ctxAudio.close().catch((error) => {
          console.warn("AudioContext close error:", error);
        });
      },
      level() {
        if (!audio.analyser) return 0;
        if (!audio.buffer || audio.buffer.length !== audio.analyser.fftSize) {
          audio.buffer = new Float32Array(audio.analyser.fftSize);
        }
        audio.analyser.getFloatTimeDomainData(audio.buffer);
        let sum = 0;
        for (let i = 0; i < audio.buffer.length; i += 1) {
          sum += audio.buffer[i] * audio.buffer[i];
        }
        return Math.sqrt(sum / audio.buffer.length);
      },
    };
  }

  function demoLevel(t) {
    const syllable = Math.max(0, Math.sin(TAU * t * 2.7));
    const phrase = 0.35 + 0.65 * Math.max(0, Math.sin(TAU * (t * 0.36 - 0.08)));
    return syllable * phrase * 0.34;
  }

  function currentRawVoiceLevel() {
    return state.demoTalk ? demoLevel(animationSeconds) : audioEngine.level() * (state.micGain / 100);
  }

  function updateVoiceFromRaw(raw, nowMs) {
    lastVoiceRaw = raw;
    const attack = 0.42;
    const release = clamp(state.mouthRelease / 100, 0.04, 0.45);
    const k = raw > voicePeak ? attack : release;
    voicePeak = lerp(voicePeak, raw, k);
    voiceLevel = clamp(voicePeak, 0, 1);

    const half = Math.min(state.mouthHalf, state.mouthFull - 1) / 100;
    const full = Math.max(state.mouthFull, state.mouthHalf + 1) / 100;
    const mouthFloor = Math.max(0.004, half * 0.45);
    const mouthTarget = clamp((voiceLevel - mouthFloor) / Math.max(0.01, full - mouthFloor), 0, 1);
    const previousMouthMotionLevel = mouthMotionLevel;
    // 口PNGの開閉まで遅くしすぎないよう、顎ぷに用の内部強度だけ少し遅らせる。
    const mouthFollow = mouthTarget > mouthMotionLevel ? 0.55 : clamp(0.1 + release * 0.35, 0.1, 0.26);
    mouthMotionLevel = lerp(mouthMotionLevel, mouthTarget, mouthFollow);
    const openingKick = Math.max(0, mouthMotionLevel - previousMouthMotionLevel);
    const puniTarget = Math.pow(mouthMotionLevel, 1.35);
    const puniFollow = puniTarget > jawPuniLevel ? 0.34 : clamp(release * 0.36, 0.018, 0.16);
    jawPuniLevel = clamp(lerp(jawPuniLevel, puniTarget, puniFollow) + openingKick * 0.65, 0, 1.2);

    const mouthVisualLevel = mouthTarget;
    const nextMouth = mouthVisualLevel >= 0.78 ? 2 : mouthVisualLevel >= 0.22 ? 1 : 0;
    mouthState = nextMouth;
    maybeTriggerTalkStartBlink(nowMs, nextMouth);
    previousMouthState = nextMouth;

    if (ui.meterFill) ui.meterFill.style.width = `${clamp(voiceLevel / 0.45, 0, 1) * 100}%`;
    if (ui.mouthReadout) ui.mouthReadout.textContent = ["とじ", "はんびらき", "ぜんかい"][mouthState];
    if (ui.angleReadout) {
      ui.angleReadout.textContent = `${Math.round(state.angleX * 100)}, ${Math.round(state.angleY * 100)}`;
    }
  }

  function updateVoice(nowMs) {
    const raw = OBS_MODE ? externalVoiceLevel(nowMs) : currentRawVoiceLevel();
    updateVoiceFromRaw(raw, nowMs);
  }

  function nextActiveAnimationDelayMs() {
    if (OBS_MODE || setupModeActive() || state.rangePreviewDirection || !activeAnimationLastFrameAt) return 0;
    return Math.max(0, activeAnimationFrameDelayMs() - (performance.now() - activeAnimationLastFrameAt) + 1);
  }

  function requestNextTick() {
    if (tickRafId || tickTimerId) return;
    const delay = nextActiveAnimationDelayMs();
    if (delay > 1) {
      tickTimerId = window.setTimeout(() => {
        tickTimerId = 0;
        tickRafId = requestAnimationFrame(tick);
      }, delay);
      return;
    }
    tickRafId = requestAnimationFrame(tick);
  }

  function tick(timestamp) {
    tickRafId = 0;
    const obsFrameInterval = OBS_MODE ? 1000 / currentObsRenderFps() : 0;
    const obsFrameSkipThreshold = Math.max(0, obsFrameInterval - 8);
    if (OBS_MODE && obsLastFrameAt && timestamp - obsLastFrameAt < obsFrameSkipThreshold) {
      requestNextTick();
      return;
    }
    if (OBS_MODE) obsLastFrameAt = timestamp;
    const setupActive = setupModeActive();
    const activeFrameInterval = !OBS_MODE && !setupActive && !state.rangePreviewDirection ? activeAnimationFrameDelayMs() : 0;
    const activeFrameSkipThreshold = Math.max(0, activeFrameInterval - 4);
    if (activeFrameInterval && activeAnimationLastFrameAt && timestamp - activeAnimationLastFrameAt < activeFrameSkipThreshold) {
      requestNextTick();
      return;
    }
    activeAnimationLastFrameAt = activeFrameInterval ? timestamp : 0;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = Math.max(0, Math.min(0.05, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;
    motionFrameId += 1;

    if (setupActive || state.rangePreviewDirection) {
      if (setupActive) {
        state.targetX = 0;
        state.targetY = 0;
        state.angleX = 0;
        state.angleY = 0;
      } else {
        applyRangePreviewTarget(state.rangePreviewDirection);
      }
      blinkClosed = false;
      mouthState = 0;
      voiceLevel = 0;
      voicePeak = 0;
      lastVoiceRaw = 0;
      mouthMotionLevel = 0;
      jawPuniLevel = 0;
      highlightPulseLeftX = 1;
      highlightPulseLeftY = 1;
      highlightPulseRightX = 1;
      highlightPulseRightY = 1;
      highlightPulseLeftTargetX = 1;
      highlightPulseLeftTargetY = 1;
      highlightPulseRightTargetX = 1;
      highlightPulseRightTargetY = 1;
      highlightGyroX = 0;
      highlightGyroY = 0;
      highlightGyroLagX = 0;
      highlightGyroLagY = 0;
      if (ui.meterFill) ui.meterFill.style.width = "0%";
      if (ui.mouthReadout) ui.mouthReadout.textContent = "とじ";
      if (ui.angleReadout) ui.angleReadout.textContent = `${Math.round(state.angleX * 100)}, ${Math.round(state.angleY * 100)}`;
      render();
      requestNextTick();
      return;
    }

    animationSeconds += delta;

    if (OBS_MODE) applyObsExternalTarget(timestamp);
    else updateIdleMotionTarget(timestamp);
    if (state.editMode) {
      setEditPreviewFromKey();
    } else {
      const follow = clamp(state.followSpeed / 100, 0.02, 0.5);
      state.angleX += (state.targetX - state.angleX) * follow;
      state.angleY += (state.targetY - state.angleY) * follow;
    }
    maybeTriggerPoseSettleBlink(timestamp, delta);
    updateVoice(timestamp);
    publishObsInput(timestamp);
    advanceBlinkEvent(timestamp);
    updateHairPhysics(delta);
    updateHighlightPulse(delta);
    render();
    requestNextTick();
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function blinkStep(closeMs, holdMs, openMs, gapMs = 0) {
    return { closeMs, holdMs, openMs, gapMs };
  }

  function blinkEventSteps(kind = "normal") {
    switch (kind) {
      case "double":
        return [
          blinkStep(randomBetween(62, 86), randomBetween(32, 56), randomBetween(108, 146), randomBetween(86, 142)),
          blinkStep(randomBetween(58, 82), randomBetween(30, 52), randomBetween(118, 158)),
        ];
      case "long":
        return [blinkStep(randomBetween(72, 98), randomBetween(120, 210), randomBetween(150, 210))];
      case "talkStart":
        return [blinkStep(randomBetween(54, 78), randomBetween(24, 44), randomBetween(112, 158))];
      case "poseSettle":
        return [blinkStep(randomBetween(64, 90), randomBetween(38, 72), randomBetween(130, 190))];
      default:
        return [blinkStep(randomBetween(62, 90), randomBetween(32, 66), randomBetween(122, 178))];
    }
  }

  function nextRandomBlinkKind() {
    const roll = Math.random();
    if (roll < 0.18) return "double";
    if (roll < 0.27) return "long";
    return "normal";
  }

  function scheduleNextBlinkEvent() {
    clearTimeout(blinkTimer);
    blinkTimer = null;
    if (!state.autoBlink || blinkEvent) return;
    const wait = Math.random() < 0.2 ? randomBetween(850, 1500) : randomBetween(1900, 4600);
    blinkTimer = setTimeout(() => {
      if (!state.autoBlink || blinkEvent) return;
      startBlinkEvent(nextRandomBlinkKind());
    }, wait);
  }

  function startBlinkEvent(kind = "normal", { force = false } = {}) {
    if (!state.autoBlink && !force) return false;
    if (blinkEvent && !force) return false;
    clearTimeout(blinkTimer);
    blinkTimer = null;
    blinkEvent = {
      kind,
      steps: blinkEventSteps(kind),
      stepIndex: 0,
      phase: "closing",
      phaseStartedAt: performance.now(),
    };
    blinkClosed = false;
    return true;
  }

  function finishBlinkEvent() {
    blinkEvent = null;
    blinkClosed = false;
    scheduleNextBlinkEvent();
  }

  function advanceBlinkEvent(nowMs) {
    if (!blinkEvent) {
      blinkClosed = false;
      return;
    }

    const step = blinkEvent.steps[blinkEvent.stepIndex];
    const elapsed = nowMs - blinkEvent.phaseStartedAt;
    if (blinkEvent.phase === "closing") {
      blinkClosed = elapsed >= step.closeMs * 0.45;
      if (elapsed >= step.closeMs) {
        blinkEvent.phase = "closed";
        blinkEvent.phaseStartedAt = nowMs;
        blinkClosed = true;
      }
      return;
    }
    if (blinkEvent.phase === "closed") {
      blinkClosed = true;
      if (elapsed >= step.holdMs) {
        blinkEvent.phase = "opening";
        blinkEvent.phaseStartedAt = nowMs;
      }
      return;
    }
    if (blinkEvent.phase === "opening") {
      blinkClosed = elapsed < step.openMs * 0.42;
      if (elapsed >= step.openMs) {
        blinkClosed = false;
        triggerBlinkBounce();
        if (blinkEvent.stepIndex + 1 < blinkEvent.steps.length) {
          blinkEvent.phase = "gap";
          blinkEvent.phaseStartedAt = nowMs;
        } else {
          finishBlinkEvent();
        }
      }
      return;
    }
    if (blinkEvent.phase === "gap") {
      blinkClosed = false;
      if (elapsed >= step.gapMs) {
        blinkEvent.stepIndex += 1;
        blinkEvent.phase = "closing";
        blinkEvent.phaseStartedAt = nowMs;
      }
    }
  }

  function maybeTriggerTalkStartBlink(nowMs, nextMouth) {
    if (!state.autoBlink || blinkEvent) return;
    if (previousMouthState !== 0 || nextMouth === 0) return;
    if (voiceLevel < 0.12 || nowMs - lastTalkBlinkAt < 4300) return;
    if (startBlinkEvent("talkStart")) lastTalkBlinkAt = nowMs;
  }

  function maybeTriggerPoseSettleBlink(nowMs, delta) {
    const dt = Math.max(0.001, delta);
    const dx = state.angleX - lastBlinkPoseX;
    const dy = state.angleY - lastBlinkPoseY;
    const speed = Math.hypot(dx, dy) / dt;
    const angleAmount = Math.hypot(state.angleX, state.angleY);
    if (speed > 0.62) lastHeadMotionAt = nowMs;
    if (
      state.autoBlink &&
      !blinkEvent &&
      angleAmount > 0.23 &&
      speed < 0.09 &&
      nowMs - lastHeadMotionAt > 150 &&
      nowMs - lastHeadMotionAt < 820 &&
      nowMs - lastPoseBlinkAt > 5200
    ) {
      if (startBlinkEvent("poseSettle")) lastPoseBlinkAt = nowMs;
    }
    lastBlinkPoseX = state.angleX;
    lastBlinkPoseY = state.angleY;
  }

  function resetBlinkEventState({ keepSchedule = false } = {}) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
    blinkEvent = null;
    blinkClosed = false;
    previousMouthState = 0;
    lastBlinkPoseX = state.angleX;
    lastBlinkPoseY = state.angleY;
    if (keepSchedule && state.autoBlink) scheduleNextBlinkEvent();
  }

  function scheduleBlink() {
    resetBlinkEventState({ keepSchedule: true });
  }

  function bindRange(id, key, suffix = "%") {
    const input = document.querySelector(`#${id}`);
    const output = input?.closest(".control-row")?.querySelector("output");
    if (!input) return;
    if (Number.isFinite(Number(state[key]))) {
      input.value = String(state[key]);
    }
    const update = () => {
      state[key] = Number(input.value);
      if (output) output.textContent = `${input.value}${suffix}`;
      updateChangedBadgeForControl(key);
    };
    input.addEventListener("input", update);
    update();
  }

  function setRangeControlValue(id, value, suffix = "%") {
    const input = document.querySelector(`#${id}`);
    const output = input?.closest(".control-row")?.querySelector("output");
    if (input) input.value = String(value);
    if (output) output.textContent = `${value}${suffix}`;
  }

  function syncButtonPressed(button, enabledLabel, disabledLabel, enabled) {
    if (!button) return;
    button.textContent = enabled ? enabledLabel : disabledLabel;
    button.setAttribute("aria-pressed", String(Boolean(enabled)));
  }

  // ---- Phase 6: activeTool統一（最小版） ----
  // 6つの setup ツール（editMode + 5つの別boolean setupMode）の排他制御を一元化する。
  // on/off 文言は現状の各ハンドラ内 syncButtonPressed 呼出の引数と完全一致。
  const SETUP_TOOLS = {
    editMode:        { button: "editModeButton",        on: "編集モード ON",     off: "編集モード OFF",     state: "editMode" },
    eyeSetup:        { button: "eyeSetupButton",        on: "瞳位置編集 ON",     off: "瞳位置編集 OFF",     state: "eyeSetupMode" },
    highlightSetup:  { button: "highlightSetupButton",  on: "ハイライト配置 ON", off: "ハイライト配置 OFF", state: "highlightSetupMode" },
    faceDepthSetup:  { button: "faceDepthSetupButton",  on: "奥行き点編集 ON",   off: "奥行き点編集 OFF",   state: "faceDepthSetupMode" },
    neckPivotSetup:  { button: "neckPivotSetupButton",  on: "首支点編集 ON",     off: "首支点編集 OFF",     state: "neckPivotSetupMode" },
    hairBundleSetup: { button: "hairBundleSetupButton", on: "髪束編集 ON",       off: "髪束編集 OFF",       state: "hairBundleSetupMode" },
  };

  // 6つの drag 変数は IIFE トップレベルのクロージャスコープで宣言されているため一括クリア可能。
  function clearSetupDrags() {
    editDrag = null;
    eyeSetupDrag = null;
    highlightSetupDrag = null;
    faceDepthSetupDrag = null;
    neckPivotSetupDrag = null;
    hairBundleSetupDrag = null;
  }

  // name === null で全 setup ツールを解除。resetPreview:false で setRangePreviewDirection 側からの
  // 再帰呼出を回避する（方向プレビュー開始時に setup 系だけ解除したい場合に使用）。
  function setActiveSetupTool(name, { resetPreview = true } = {}) {
    if (name && characterWizard?.active) {
      setCharacterWizardStatus("新キャラセットアップ中は右パネルの編集ボタンは使えません。完了または中止してから切り替えてください。");
      updateCharacterWizardSetupControls();
      return false;
    }
    clearSetupDrags();
    for (const [k, d] of Object.entries(SETUP_TOOLS)) {
      const isActive = (k === name);
      state[d.state] = isActive;
      const btn = ui[d.button];
      if (btn) syncButtonPressed(btn, d.on, d.off, isActive);
    }
    if (resetPreview) setRangePreviewDirection(null);
    return true;
  }

  function updateSubHighlightControls() {
    if (ui.subHighlightEnabled) ui.subHighlightEnabled.checked = Boolean(state.subHighlightEnabled);
    if (ui.subHighlightControls) ui.subHighlightControls.hidden = !state.subHighlightEnabled;
  }

  // ---- Phase 4: baseline 基準値・変更済み表示 関数群 ----

  function captureBaselineSettings(label = "基準値") {
    // payload全体を入れると buildAllSettingsPayload() 経由で baseline が再帰的に膨らむため、
    // state だけを保持する。includeBaseline:false で再帰を遮断する。
    const payload = buildAllSettingsPayload({ includeItemImages: false, includeBaseline: false });
    baselineSettings = {
      label,
      createdAt: new Date().toISOString(),
      state: { ...payload.state },
    };
  }

  function baselineValueFor(key) {
    return baselineSettings?.state?.[key];
  }

  function isChangedFromBaseline(key) {
    const base = baselineValueFor(key);
    if (base === undefined) return false;
    return state[key] !== base;
  }

  // bindRange 対象外の control-row（color/button 等）。ALL_SETTINGS_* に無いキーもここで badge 対象にする。
  const BASELINE_EXTRA_KEYS = ["bgColor", "hairColor"];

  // 各キーから対応するコントロール要素へのセレクタ。id と一致しないものだけ明示する。
  const BASELINE_CONTROL_MAP = {
    bgColor: "#backgroundColorInput",
    hairColor: "#hairColorInput",
    hairTintEnabled: "#hairColorReset",
    diagonalFaceWarpEnabled: "#diagonalFaceWarpButton",
  };

  function baselineControlRowForKey(key) {
    const selector = BASELINE_CONTROL_MAP[key] || `#${key}`;
    const control = document.querySelector(selector);
    if (!control) return null;
    return control.closest(".control-row, .check-row, .select-row, .simple-grid, .panel");
  }

  function updateChangedBadgeForControl(key) {
    const row = baselineControlRowForKey(key);
    if (!row) return;
    row.classList.toggle("is-changed", isChangedFromBaseline(key));
  }

  function updateAllChangedBadges() {
    for (const key of ALL_SETTINGS_NUMERIC_KEYS) updateChangedBadgeForControl(key);
    for (const key of ALL_SETTINGS_BOOLEAN_KEYS) updateChangedBadgeForControl(key);
    for (const key of BASELINE_EXTRA_KEYS) updateChangedBadgeForControl(key);
  }

  function resetSectionToBaseline(sectionName) {
    const keys = ADJUST_SECTION_KEYS[sectionName] || [];
    const baseState = baselineSettings?.state;
    if (!baseState) {
      setEditStatus("基準値がありません。配信・保存で「現在を基準値として保存」してください。");
      return;
    }
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(baseState, key)) state[key] = baseState[key];
    }
    syncAllSettingControls();
    updateAllChangedBadges();
    setEditStatus(`${sectionName} を基準値へ戻しました。`);
  }

  // Phase 5: A/B スナップショット（最小実装・UI02 L666-702 準拠）
  // payload 全体ではなく state のみを保存/復元することで、PNGアイテム消失を回避する。
  let adjustSnapshotState = null;

  function saveAdjustSnapshot() {
    const payload = buildAllSettingsPayload({ includeItemImages: false, includeBaseline: false });
    adjustSnapshotState = { ...payload.state };
    setEditStatus("現在の状態を調整前として保存しました。");
  }

  function restoreAdjustSnapshot() {
    if (!adjustSnapshotState) {
      setEditStatus("調整前スナップショットがありません。「調整前を保存」で保存してください。");
      return;
    }
    applyAllSettingsState(adjustSnapshotState);
    state.editMode = false;
    state.eyeSetupMode = false;
    state.highlightSetupMode = false;
    state.faceDepthSetupMode = false;
    state.neckPivotSetupMode = false;
    state.hairBundleSetupMode = false;
    state.rangePreviewDirection = null;
    syncAllSettingControls();
    updateAllChangedBadges();
    setPreviewTarget(0, 0);
    setEditStatus("調整前の状態に戻しました。");
  }

  function syncAllSettingControls() {
    ALL_SETTINGS_NUMERIC_KEYS.forEach((key) => {
      if (!document.querySelector(`#${key}`)) return;
      setRangeControlValue(key, state[key], RANGE_CONTROL_SUFFIXES[key] || "%");
    });
    setBackgroundColor(state.bgColor);
    updateHairColorUi();
    if (ui.highlightEnabled) ui.highlightEnabled.checked = Boolean(state.highlightEnabled);
    if (ui.hairVisible) ui.hairVisible.checked = Boolean(state.hairVisible);
    if (ui.frontHairShadowEnabled) ui.frontHairShadowEnabled.checked = Boolean(state.frontHairShadowEnabled);
    updateSubHighlightControls();
    if (ui.tearLensEnabled) ui.tearLensEnabled.checked = Boolean(state.tearLensEnabled);
    if (ui.showMesh) ui.showMesh.checked = Boolean(state.showMesh);
    if (ui.editLayerSelect) ui.editLayerSelect.value = state.editLayer;
    if (ui.editKeySelect) ui.editKeySelect.value = state.editKey;
    if (ui.hairBundleFocusSelect) ui.hairBundleFocusSelect.value = normalizeHairBundleFocus(hairBundleFocus);
    syncButtonPressed(ui.editModeButton, "編集モード ON", "編集モード OFF", state.editMode);
    syncButtonPressed(ui.eyeSetupButton, "瞳位置編集 ON", "瞳位置編集 OFF", state.eyeSetupMode);
    syncButtonPressed(ui.highlightSetupButton, "ハイライト配置 ON", "ハイライト配置 OFF", state.highlightSetupMode);
    syncButtonPressed(ui.faceDepthSetupButton, "奥行き点編集 ON", "奥行き点編集 OFF", state.faceDepthSetupMode);
    syncButtonPressed(ui.neckPivotSetupButton, "首支点編集 ON", "首支点編集 OFF", state.neckPivotSetupMode);
    syncButtonPressed(ui.hairBundleSetupButton, "髪束編集 ON", "髪束編集 OFF", state.hairBundleSetupMode);
    syncButtonPressed(ui.demoTalkButton, "口パクデモ ON", "口パクデモ OFF", state.demoTalk);
    syncButtonPressed(ui.idleMotionButton, "待機モーション ON", "待機モーション OFF", state.idleMotionEnabled);
    syncButtonPressed(ui.diagonalFaceWarpButton, "斜め補正 ON", "斜め補正 OFF", state.diagonalFaceWarpEnabled);
    syncButtonPressed(ui.blinkButton, "まばたき ON", "まばたき OFF", state.autoBlink);
    updateMouseFollowButton();
    updateRangePreviewButtons();
    updateItemLayerUi();
    updateAllChangedBadges();
  }

  function bindRangePreviewControl(id, direction) {
    const input = document.querySelector(`#${id}`);
    if (!input) return;
    const activatePreview = () => setRangePreviewDirection(direction);
    input.addEventListener("pointerdown", activatePreview);
    input.addEventListener("focus", activatePreview);
    input.addEventListener("input", () => refreshRangePreview(direction));
  }

  function resetFrameTimingOnResume() {
    if (document.visibilityState === "visible") {
      lastTimestamp = 0;
      activeAnimationLastFrameAt = 0;
      if (tickTimerId) {
        clearTimeout(tickTimerId);
        tickTimerId = 0;
      }
      requestNextTick();
    }
  }

  function shutdownResources() {
    closeObsEventSource();
    clearTimeout(blinkTimer);
    audioEngine.close().catch(() => {});
    meshRenderer?.dispose?.();
    meshRenderer = null;
    micOn = false;
    micPending = false;
    if (ui.micButton) ui.micButton.disabled = false;
    syncButtonPressed(ui.micButton, "マイク停止", "マイク開始", false);
    if (faceTracker) {
      faceTracker.stop();
      faceTracker = null;
    }
    syncButtonPressed(ui.faceTrackButton, "顔トラッキング停止", "顔トラッキング開始", false);
    setFaceTrackStatus("顔トラッキング: OFF（マウス操作）");
  }

  function restoreResourcesAfterPageShow(event) {
    lastTimestamp = 0;
    if (event.persisted) {
      resetMeshRendererAfterAvatarImageChange();
    }
    if (OBS_MODE) connectObsEventSource();
  }

  function handlePageHide() {
    // pagehideではブラウザが非同期IndexedDB処理を最後まで待つ保証がない。
    // それでも未保存設定を即時flushへ渡し、画像/音声/カメラなどのリソース解放は必ず実行する。
    void flushActiveCharacterAutosave({ reason: "pagehide", forceSettings: true });
    shutdownResources();
  }

  function bindLifecycleEvents() {
    window.addEventListener("resize", () => {
      panelRectCache = null;
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        resizePending = false;
        resizeCanvas();
      });
    });
    document.addEventListener("visibilitychange", resetFrameTimingOnResume);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", restoreResourcesAfterPageShow);
  }

  function isProfileDirtyControl(target) {
    const element = target instanceof Element ? target : null;
    if (!element) return false;
    if (element.closest("#obsPanel")) return false;
    if (element.closest("#characterSwitcher")) return false;
    if (element.closest(".workspace-tabs") || element.closest(".adjust-tabs")) return false;
    if (element.id === "allSettingsFileInput" || element.id === "addCharacterFileInput") return false;
    return Boolean(element.closest(".control-card") || element.closest(".character-wizard-panel"));
  }

  function bindCharacterProfileControls() {
    ui.characterSwitcherButton?.addEventListener("click", () => toggleCharacterSwitcherMenu());
    ui.addCharacterButton?.addEventListener("click", () => {
      if (!canSwitchCharacterNow()) {
        setEditStatus("編集中・設定中はキャラを追加できません。編集を完了または中止してください。");
        return;
      }
      if (ui.addCharacterFileInput) {
        ui.addCharacterFileInput.value = "";
        ui.addCharacterFileInput.click();
      }
    });
    ui.duplicateCharacterButton?.addEventListener("click", () => {
      void duplicateActiveCharacterProfile();
    });
    ui.addCharacterFileInput?.addEventListener("change", async () => {
      const file = ui.addCharacterFileInput.files?.[0];
      await addCharacterProfileFromFile(file);
      ui.addCharacterFileInput.value = "";
    });
    ui.characterList?.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (!button) return;
      if (button.dataset.characterId) {
        void switchCharacterProfile(button.dataset.characterId);
        return;
      }
      if (button.dataset.emptySlot && ui.addCharacterFileInput) {
        ui.addCharacterFileInput.value = "";
        ui.addCharacterFileInput.click();
      }
    });
    document.addEventListener("click", (event) => {
      if (!ui.characterSwitcher || ui.characterSwitcher.contains(event.target)) return;
      closeCharacterSwitcherMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCharacterSwitcherMenu();
    });
    document.addEventListener("input", (event) => {
      if (isProfileDirtyControl(event.target)) markActiveCharacterDirty("settings", "control-input");
    }, true);
    document.addEventListener("change", (event) => {
      if (isProfileDirtyControl(event.target)) markActiveCharacterDirty("settings", "control-change");
    }, true);
  }

  function hasFileDrag(event) {
    return [...(event.dataTransfer?.types || [])].includes("Files");
  }

  function hasPotentialItemFileDrag(event) {
    if (!hasFileDrag(event)) return false;
    const items = [...(event.dataTransfer?.items || [])];
    if (!items.length) return true;
    return items.some((item) => item.kind === "file" && (!item.type || item.type === "image/png"));
  }

  function showItemWorkspaceForDrag(event) {
    if (!hasPotentialItemFileDrag(event)) return false;
    const itemPage = document.querySelector('[data-workspace-page="items"]');
    if (itemPage?.hidden) setWorkspacePage("items");
    return true;
  }

  function handlePageItemDrag(event) {
    if (!showItemWorkspaceForDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    ui.itemDropZone?.classList.add("is-dragover");
  }

  async function handlePageItemDrop(event) {
    if (!hasFileDrag(event) || !event.dataTransfer?.files?.length) return;
    event.preventDefault();
    event.stopPropagation();
    showItemWorkspaceForDrag(event);
    ui.itemDropZone?.classList.remove("is-dragover");
    try {
      await loadItemFiles(event.dataTransfer.files);
    } catch (error) {
      console.warn("PNGアイテムのドロップ処理に失敗しました。", error);
      setItemStatus("PNGアイテムの追加に失敗しました。");
    }
  }

  function bindItemLayerControls() {
    if (!ui.itemLayerList || !ui.itemDropZone || !ui.itemFileInput) return;

    window.addEventListener("dragenter", handlePageItemDrag, true);
    window.addEventListener("dragover", handlePageItemDrag, true);
    window.addEventListener("drop", handlePageItemDrop, true);
    window.addEventListener("dragleave", (event) => {
      if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
        ui.itemDropZone?.classList.remove("is-dragover");
      }
    }, true);

    const openItemFilePicker = () => ui.itemFileInput.click();
    ui.itemDropZone.addEventListener("click", openItemFilePicker);
    ui.itemDropZone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openItemFilePicker();
    });
    ui.itemDropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      ui.itemDropZone.classList.add("is-dragover");
    });
    ui.itemDropZone.addEventListener("dragleave", () => ui.itemDropZone.classList.remove("is-dragover"));
    ui.itemDropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      ui.itemDropZone.classList.remove("is-dragover");
      try {
        await loadItemFiles(event.dataTransfer.files);
      } catch (error) {
        console.warn("PNGアイテムのドロップ処理に失敗しました。", error);
        setItemStatus("PNGアイテムの追加に失敗しました。");
      }
    });
    ui.itemFileInput.addEventListener("change", async () => {
      try {
        await loadItemFiles(ui.itemFileInput.files);
      } catch (error) {
        console.warn("PNGアイテムの追加に失敗しました。", error);
        setItemStatus("PNGアイテムの追加に失敗しました。");
      } finally {
        ui.itemFileInput.value = "";
      }
    });

    ui.itemLayerList.addEventListener("click", (event) => {
      const row = event.target.closest("[data-id]");
      if (!row) return;
      if (blockItemMutationWhileActive()) return;
      const id = Number(row.dataset.id);
      const layer = itemLayers.find((item) => item.id === id);
      if (!layer) return;
      const action = event.target.closest("[data-act]")?.dataset.act || "select";

      if (action === "vis") {
        layer.visible = !layer.visible;
        activeItemLayerId = id;
        itemHandleVisible = false;
        updateItemLayerUi();
        markActiveCharacterDirty("settings", "item-visible");
        return;
      }
      if (action === "lock") {
        layer.locked = !layer.locked;
        activeItemLayerId = id;
        itemHandleVisible = !layer.locked;
        updateItemLayerUi();
        markActiveCharacterDirty("settings", "item-lock");
        return;
      }
      if (action === "dup") return duplicateItemLayer(id);
      if (action === "up") return moveItemLayer("up", id);
      if (action === "down") return moveItemLayer("down", id);
      if (action === "delete") return deleteItemLayer(id);

      activeItemLayerId = id;
      itemHandleVisible = !layer.locked;
      updateItemLayerUi();
    });

    ui.itemSlotSelect?.addEventListener("change", () => {
      if (blockItemMutationWhileActive()) return;
      const layer = activeItemLayer();
      if (!layer || layer.locked) return;
      const hadDeformFollow = Boolean(layer.deformFollowEnabled);
      layer.slot = ITEM_LAYER_SLOTS[ui.itemSlotSelect.value] ? ui.itemSlotSelect.value : ITEM_LAYER_DEFAULTS.slot;
      if (!itemLayerSupportsDeformFollow(layer)) {
        layer.deformFollowEnabled = false;
        if (hadDeformFollow) {
          setItemStatus("この重なり位置は顔・髪の変形連動に対応していないため、変形連動をOFFにしました。");
        }
      }
      itemHandleVisible = true;
      updateItemLayerUi();
      markActiveCharacterDirty("settings", "item-slot");
    });
    ui.itemDeformFollowEnabled?.addEventListener("change", () => {
      if (blockItemMutationWhileActive()) return;
      const layer = activeItemLayer();
      if (!layer || layer.locked || !itemLayerSupportsDeformFollow(layer)) return;
      layer.deformFollowEnabled = ui.itemDeformFollowEnabled.checked;
      itemHandleVisible = true;
      updateItemLayerUi();
      markActiveCharacterDirty("settings", "item-deform-follow");
    });
    ui.itemScale?.addEventListener("input", () => setItemLayerValue("scale", Number(ui.itemScale.value)));
    ui.itemFollowStrength?.addEventListener("input", () => setItemLayerValue("followStrength", Number(ui.itemFollowStrength.value)));
    ui.itemRotation?.addEventListener("input", () => setItemLayerValue("rotation", Number(ui.itemRotation.value)));
    ui.itemX?.addEventListener("input", () => setItemLayerValue("x", Number(ui.itemX.value)));
    ui.itemY?.addEventListener("input", () => setItemLayerValue("y", Number(ui.itemY.value)));
    ui.itemOpacity?.addEventListener("input", () => setItemLayerValue("opacity", Number(ui.itemOpacity.value)));
    ui.itemCenterButton?.addEventListener("click", () => {
      if (blockItemMutationWhileActive()) return;
      const layer = activeItemLayer();
      if (!layer || layer.locked) return;
      layer.x = 0;
      layer.y = 0;
      itemHandleVisible = true;
      updateItemLayerUi({ rebuildList: false });
      markActiveCharacterDirty("settings", "item-center");
    });
    ui.itemDuplicateButton?.addEventListener("click", () => duplicateItemLayer());
    ui.itemDeleteButton?.addEventListener("click", () => deleteItemLayer());
    ui.itemDeleteAllButton?.addEventListener("click", () => deleteAllItemLayers());
    updateItemLayerUi();
  }

  function bindDockControls() {
    ui.dockHideButton?.addEventListener("click", () => setDockHidden(true));
    ui.dockPeekButton?.addEventListener("click", () => setDockHidden(false));
  }

  function bindCharacterWizardControls() {
    ui.characterWizardStartButton?.addEventListener("click", () => startCharacterWizard());
    ui.characterWizardBackButton?.addEventListener("click", () => moveCharacterWizardStep(-1));
    ui.characterWizardRetryButton?.addEventListener("click", () => retryCharacterWizardStep());
    ui.characterWizardSkipButton?.addEventListener("click", () => {
      autoFillCharacterWizardStep();
      completeCharacterWizardStep();
    });
    ui.characterWizardAutoButton?.addEventListener("click", () => autoFillCharacterWizardStep());
    ui.characterWizardOkButton?.addEventListener("click", () => completeCharacterWizardStep());
    ui.characterWizardCancelButton?.addEventListener("click", () => {
      closeCharacterWizard({ restore: true });
      setEditStatus("新キャラセットアップを中止しました。元の点設定に戻しました。");
    });
    ui.characterWizardSizeDownButton?.addEventListener("click", () => {
      setAvatarSize(state.avatarSize - 10);
    });
    ui.characterWizardSizeUpButton?.addEventListener("click", () => {
      setAvatarSize(state.avatarSize + 10);
    });
    ui.characterWizardCenterButton?.addEventListener("click", () => {
      state.avatarX = 0;
      state.avatarY = 0;
    });
    ui.characterWizardMoveLeftButton?.addEventListener("click", () => moveCharacterWizardView(-40, 0));
    ui.characterWizardMoveRightButton?.addEventListener("click", () => moveCharacterWizardView(40, 0));
    ui.characterWizardMoveUpButton?.addEventListener("click", () => moveCharacterWizardView(0, -40));
    ui.characterWizardMoveDownButton?.addEventListener("click", () => moveCharacterWizardView(0, 40));
  }

  function bindAdjustmentRangeControls() {
    bindRange("angleStrength", "angleStrength");
    bindRange("faceWarp", "faceWarp");
    bindRange("angleXDeform", "angleXDeform");
    bindRange("faceTurnDepth", "faceTurnDepth");
    bindRange("faceTurnVertical", "faceTurnVertical");
    bindRange("angleYDeform", "angleYDeform");
    bindRange("hairWarp", "hairWarp");
    bindRange("hairSpring", "hairSpring");
    bindRange("hairBundleStrength", "hairBundleStrength");
    bindRange("frontHairShadowStrength", "frontHairShadowStrength");
    bindRange("frontHairShadowDistance", "frontHairShadowDistance", "px");
    bindRange("followSpeed", "followSpeed");
    bindRange("rangeLeft", "rangeLeft");
    bindRange("rangeRight", "rangeRight");
    bindRange("rangeUp", "rangeUp");
    bindRange("rangeDown", "rangeDown");
    bindRangePreviewControl("rangeLeft", "left");
    bindRangePreviewControl("rangeRight", "right");
    bindRangePreviewControl("rangeUp", "up");
    bindRangePreviewControl("rangeDown", "down");
    bindRange("micGain", "micGain");
    bindRange("mouthHalf", "mouthHalf");
    bindRange("mouthFull", "mouthFull");
    bindRange("mouthRelease", "mouthRelease");
    bindRange("activeAnimationFps", "activeAnimationFps", "fps");
    ui.activeAnimationFps?.addEventListener("input", () => {
      state.activeAnimationFps = activeAnimationFps();
      activeAnimationLastFrameAt = 0;
      if (tickTimerId) {
        clearTimeout(tickTimerId);
        tickTimerId = 0;
      }
      requestNextTick();
    });
    bindRange("avatarSize", "avatarSize");
    bindRange("breathStrength", "breathStrength");
    bindRange("rollStrength", "rollStrength");
    bindRange("pyokoStrength", "pyokoStrength");
    bindRange("highlightStrength", "highlightStrength");
    bindRange("highlightFilmWobble", "highlightFilmWobble");
    bindRange("highlightSize", "highlightSize", "px");
    bindRange("highlightAspect", "highlightAspect");
    bindRange("subHighlightSize", "subHighlightSize", "px");
    bindRange("subHighlightAspect", "subHighlightAspect");
    bindRange("subHighlightFilmWobble", "subHighlightFilmWobble");
    bindRange("hairTintLightness", "hairTintLightness");
    bindRange("tearLensStrength", "tearLensStrength");
    bindRange("tearLensRadiusX", "tearLensRadiusX", "px");
    bindRange("tearLensRadiusY", "tearLensRadiusY", "px");
    bindRange("tearLensRotationLeft", "tearLensRotationLeft", "°");
    bindRange("tearLensRotationRight", "tearLensRotationRight", "°");

  }

  function bindVisualSetupControls() {
    ui.highlightEnabled?.addEventListener("change", () => {
      state.highlightEnabled = ui.highlightEnabled.checked;
      updateChangedBadgeForControl("highlightEnabled");
    });

    ui.hairVisible?.addEventListener("change", () => {
      state.hairVisible = ui.hairVisible.checked;
      updateChangedBadgeForControl("hairVisible");
    });

    ui.frontHairShadowEnabled?.addEventListener("change", () => {
      state.frontHairShadowEnabled = ui.frontHairShadowEnabled.checked;
      updateChangedBadgeForControl("frontHairShadowEnabled");
    });

    ui.subHighlightEnabled?.addEventListener("change", () => {
      state.subHighlightEnabled = ui.subHighlightEnabled.checked;
      updateChangedBadgeForControl("subHighlightEnabled");
      if (state.subHighlightEnabled) {
        ensureSubHighlightPoints();
        setHighlightSetupStatus("サブハイライトをONにしました。ハイライト配置ONでサブ光も移動できます。");
      } else {
        if (highlightSetupDrag?.kind === "sub") highlightSetupDrag = null;
        setHighlightSetupStatus("サブハイライトをOFFにしました。");
      }
      updateSubHighlightControls();
    });

    ui.highlightSetupButton?.addEventListener("click", () => {
      const turningOn = !state.highlightSetupMode;
      if (!setActiveSetupTool(turningOn ? "highlightSetup" : null)) return;
      if (state.highlightSetupMode) {
        ensureEyeCenters();
        ensureHighlightPoints();
        setPreviewTarget(0, 0);
        setHighlightSetupStatus("左右の光マーカーを、白い光を置きたい位置へドラッグしてください。");
      } else {
        setHighlightSetupStatus("ハイライト配置OFF。ズレる時だけ再編集できます。");
      }
    });

    ui.highlightAutoPlaceButton?.addEventListener("click", () => {
      autoPlaceHighlightPoints();
    });

    ui.highlightSetupSaveButton?.addEventListener("click", () => {
      saveHighlightSetup();
    });

    ui.faceDepthSetupButton?.addEventListener("click", () => {
      const turningOn = !state.faceDepthSetupMode;
      if (!setActiveSetupTool(turningOn ? "faceDepthSetup" : null)) return;
      if (state.faceDepthSetupMode) {
        ensureFaceDepthAnchors();
        setPreviewTarget(0, 0);
        setFaceDepthSetupStatus("5つの丸を、左目・右目・鼻・口・顎の中心へドラッグしてください。");
      } else {
        setFaceDepthSetupStatus("奥行き点編集OFF。ズレる時だけ再編集できます。");
      }
    });

    ui.faceDepthAutoButton?.addEventListener("click", () => {
      autoDetectFaceDepthAnchors();
    });

    ui.faceDepthSetupSaveButton?.addEventListener("click", () => {
      saveFaceDepthSetup();
    });

    ui.neckPivotSetupButton?.addEventListener("click", () => {
      const turningOn = !state.neckPivotSetupMode;
      if (!setActiveSetupTool(turningOn ? "neckPivotSetup" : null)) return;
      if (state.neckPivotSetupMode) {
        ensureNeckPivot();
        setPreviewTarget(0, 0);
        setNeckPivotSetupStatus("紫の丸を首の付け根へドラッグしてください。");
      } else {
        setNeckPivotSetupStatus("首支点編集OFF。ズレる時だけ再編集できます。");
      }
    });

    ui.neckPivotAutoButton?.addEventListener("click", () => {
      autoDetectNeckPivot();
    });

    ui.neckPivotSetupSaveButton?.addEventListener("click", () => {
      saveNeckPivotSetup();
    });

    ui.hairBundleFocusSelect?.addEventListener("change", () => {
      hairBundleFocus = normalizeHairBundleFocus(ui.hairBundleFocusSelect.value);
      ui.hairBundleFocusSelect.value = hairBundleFocus;
      hairBundleSetupDrag = null;
      setHairBundleSetupStatus(
        `髪束の表示を「${hairBundleFocusLabel()}」にしました。触れるのは表示中の線だけです。`
      );
    });

    ui.hairBundleSetupButton?.addEventListener("click", () => {
      const turningOn = !state.hairBundleSetupMode;
      if (!setActiveSetupTool(turningOn ? "hairBundleSetup" : null)) return;
      if (state.hairBundleSetupMode) {
        ensureHairBundleRig();
        setPreviewTarget(0, 0);
        setHairBundleSetupStatus(`表示中: ${hairBundleFocusLabel()}。白丸は髪束の上端・頭に入っていくあたり、色丸は大きく揺らしたい毛先に置きます。`);
      } else {
        setHairBundleSetupStatus("髪束編集OFF。ズレる時だけ再編集できます。");
      }
    });

    ui.hairBundleTemplateButton?.addEventListener("click", () => {
      resetHairBundleTemplate();
    });

    ui.hairBundleSetupSaveButton?.addEventListener("click", () => {
      saveHairBundleSetup();
    });

    ui.tearLensEnabled?.addEventListener("change", () => {
      state.tearLensEnabled = ui.tearLensEnabled.checked;
      updateChangedBadgeForControl("tearLensEnabled");
    });

    ui.eyeSetupButton?.addEventListener("click", () => {
      const turningOn = !state.eyeSetupMode;
      if (!setActiveSetupTool(turningOn ? "eyeSetup" : null)) return;
      if (state.eyeSetupMode) {
        ensureEyeCenters();
        setPreviewTarget(0, 0);
        setEyeSetupStatus("左右の丸を黒目や虹彩の中心へドラッグしてください。");
      } else {
        setEyeSetupStatus("瞳位置編集OFF。新キャラ時は推定配置または再編集できます。");
      }
    });

    ui.eyeAutoDetectButton?.addEventListener("click", () => {
      autoDetectEyeCenters();
    });

    ui.eyeSetupSaveButton?.addEventListener("click", () => {
      saveEyeSetup();
    });

    syncRendererModeUi();
    ui.rendererModeSelect?.addEventListener("change", () => setRendererMode(ui.rendererModeSelect.value));

    ui.showMesh?.addEventListener("change", () => {
      state.showMesh = ui.showMesh.checked;
      updateChangedBadgeForControl("showMesh");
    });

    ui.resetPositionButton?.addEventListener("click", () => {
      state.avatarX = 0;
      state.avatarY = 0;
      setAvatarSize(120);
      markActiveCharacterDirty("settings", "reset-position");
    });

    ui.hairColorInput?.addEventListener("input", () => {
      setHairColor(ui.hairColorInput.value);
      updateChangedBadgeForControl("hairColor");
      updateChangedBadgeForControl("hairTintLightness");
    });

    document.querySelector("#hairTintLightness")?.addEventListener("input", () => {
      state.hairTintEnabled = true;
      updateHairColorUi();
      hairTintCache.clear();
      updateChangedBadgeForControl("hairTintEnabled");
      updateChangedBadgeForControl("hairTintLightness");
    });

    ui.hairColorReset?.addEventListener("click", () => {
      state.hairTintEnabled = false;
      state.hairColor = "#2C292C";
      state.hairTintLightness = 0;
      setRangeControlValue("hairTintLightness", state.hairTintLightness);
      updateHairColorUi();
      hairTintCache.clear();
      updateChangedBadgeForControl("hairTintEnabled");
      updateChangedBadgeForControl("hairColor");
      updateChangedBadgeForControl("hairTintLightness");
      markActiveCharacterDirty("settings", "hair-color-reset");
    });

    ui.editModeButton?.addEventListener("click", () => {
      const turningOn = !state.editMode;
      if (!setActiveSetupTool(turningOn ? "editMode" : null)) return;
      if (state.editMode) {
        state.showMesh = true;
        if (ui.showMesh) ui.showMesh.checked = true;
        setEditPreviewFromKey();
        setEditStatus("格子点をドラッグして、選択キーの形を作れます。");
      } else {
        setEditStatus("編集モードOFF。通常のマウス追従に戻りました。");
      }
    });

    ui.editLayerSelect?.addEventListener("change", () => {
      state.editLayer = ui.editLayerSelect.value;
      setEditStatus(`編集レイヤー: ${state.editLayer}`);
    });

    ui.editKeySelect?.addEventListener("change", () => {
      state.editKey = ui.editKeySelect.value;
      if (state.editMode) setEditPreviewFromKey();
      setEditStatus(`編集キー: ${state.editKey}`);
    });

  }

  function bindObsAndFileControls() {
    setObsPreset(loadObsPresetKey(), { announce: false });
    setObsStatus("OBS Browser Sourceには下のURLを貼り付けます。軽量プリセットが一番おすすめです。");
    ui.obsPresetButtons?.forEach((button) => {
      button.addEventListener("click", () => setObsPreset(button.dataset.obsPreset));
    });
    ui.copyObsUrlButton?.addEventListener("click", () => copyObsUrl());
    ui.pushObsSnapshotButton?.addEventListener("click", () => pushObsSnapshot());
    syncObsPublishButton();
    ui.obsPublishButton?.addEventListener("click", () => setObsPublishEnabled(!obsPublishEnabled));
    ui.savePuruPuruButton?.addEventListener("click", () => savePuruPuruPackage());
    ui.loadPuruPuruButton?.addEventListener("click", () => {
      if (characterLibraryReady && activeCharacterId && !window.confirm("選択した .purupuru で現在のキャラを置き換えます。よろしいですか？")) {
        return;
      }
      loadAllSettings();
    });
    ui.allSettingsFileInput?.addEventListener("change", async () => {
      const file = ui.allSettingsFileInput.files?.[0];
      await loadAllSettingsFromFile(file);
      ui.allSettingsFileInput.value = "";
    });
    ui.resetEditKeyButton?.addEventListener("click", () => resetEditKey());
    ui.saveDeformerButton?.addEventListener("click", () => saveDeformers());
    ui.loadDeformerButton?.addEventListener("click", () => loadSavedDeformers());
    ui.resetAllDeformersButton?.addEventListener("click", () => {
      deformers = createDefaultDeformers();
      setEditStatus("全デフォーマを初期化しました。");
    });

  }

  function bindRuntimeControlButtons() {
    ui.centerButton?.addEventListener("click", () => {
      setRangePreviewDirection(null);
      state.targetX = 0;
      state.targetY = 0;
      resetIdleMotionPlan();
      if (isFaceTrackingActive()) faceTracker.requestCalibration();
    });

    ui.mouseFollowButton?.addEventListener("click", () => {
      state.mouseFollowEnabled = !state.mouseFollowEnabled;
      if (!state.mouseFollowEnabled && !isFaceTrackingActive()) {
        state.targetX = 0;
        state.targetY = 0;
      }
      updateMouseFollowButton();
    });

    ui.testLeftButton?.addEventListener("click", () => setRangePreviewDirection("left"));
    ui.testRightButton?.addEventListener("click", () => setRangePreviewDirection("right"));
    ui.testUpButton?.addEventListener("click", () => setRangePreviewDirection("up"));
    ui.testDownButton?.addEventListener("click", () => setRangePreviewDirection("down"));
    ui.testCenterButton?.addEventListener("click", () => setRangePreviewDirection(null));

    ui.demoTalkButton?.addEventListener("click", () => {
      state.demoTalk = !state.demoTalk;
      ui.demoTalkButton.textContent = `口パクデモ ${state.demoTalk ? "ON" : "OFF"}`;
      ui.demoTalkButton.setAttribute("aria-pressed", String(state.demoTalk));
    });

    ui.idleMotionButton?.addEventListener("click", () => {
      state.idleMotionEnabled = !state.idleMotionEnabled;
      if (state.idleMotionEnabled) {
        resetIdleMotionPlan(performance.now(), true);
      }
      else {
        idleMotionPlan = null;
        if (!isFaceTrackingActive()) {
          state.targetX = 0;
          state.targetY = 0;
        }
      }
      syncButtonPressed(ui.idleMotionButton, "待機モーション ON", "待機モーション OFF", state.idleMotionEnabled);
      updateMouseFollowButton();
    });

    ui.diagonalFaceWarpButton?.addEventListener("click", () => {
      state.diagonalFaceWarpEnabled = !state.diagonalFaceWarpEnabled;
      syncButtonPressed(ui.diagonalFaceWarpButton, "斜め補正 ON", "斜め補正 OFF", state.diagonalFaceWarpEnabled);
      updateChangedBadgeForControl("diagonalFaceWarpEnabled");
      markActiveCharacterDirty("settings", "diagonal-face-warp");
    });

    ui.blinkButton?.addEventListener("click", () => {
      state.autoBlink = !state.autoBlink;
      ui.blinkButton.textContent = `まばたき ${state.autoBlink ? "ON" : "OFF"}`;
      ui.blinkButton.setAttribute("aria-pressed", String(state.autoBlink));
      scheduleBlink();
      markActiveCharacterDirty("settings", "auto-blink");
    });

    ui.micButton?.addEventListener("click", async () => {
      if (micPending) return;
      micPending = true;
      ui.micButton.disabled = true;
      setAudioError("");
      try {
        if (micOn) {
          audioEngine.stopMic();
          micOn = false;
          ui.micButton.textContent = "マイク開始";
          ui.micButton.setAttribute("aria-pressed", "false");
          return;
        }
        await audioEngine.startMic();
        micOn = true;
        ui.micButton.textContent = "マイク停止";
        ui.micButton.setAttribute("aria-pressed", "true");
      } catch (error) {
        audioEngine.stopMic();
        micOn = false;
        ui.micButton.textContent = "マイク開始";
        ui.micButton.setAttribute("aria-pressed", "false");
        setAudioError(error instanceof Error ? error.message : String(error));
      } finally {
        ui.micButton.disabled = false;
        micPending = false;
      }
    });

    ui.faceTrackButton?.addEventListener("click", async () => {
      if (!faceTracker) faceTracker = createFaceTracker(applyFaceTrackingPose);
      if (faceTracker.isRunning()) {
        faceTracker.stop();
        ui.faceTrackButton.textContent = "顔トラッキング開始";
        ui.faceTrackButton.setAttribute("aria-pressed", "false");
        setFaceTrackStatus("顔トラッキング: OFF（マウス操作）");
        return;
      }

      setRangePreviewDirection(null);
      ui.faceTrackButton.disabled = true;
      setFaceTrackStatus("顔トラッキング: 起動中...");
      try {
        await faceTracker.start();
        ui.faceTrackButton.textContent = "顔トラッキング停止";
        ui.faceTrackButton.setAttribute("aria-pressed", "true");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setFaceTrackStatus(`顔トラッキング: ${message}`, true);
        ui.faceTrackButton.textContent = "顔トラッキング開始";
        ui.faceTrackButton.setAttribute("aria-pressed", "false");
      } finally {
        ui.faceTrackButton.disabled = false;
      }
    });

    ui.faceCalibrateButton?.addEventListener("click", () => {
      if (!isFaceTrackingActive()) {
        setFaceTrackStatus("顔トラッキング: 開始してからキャリブレーションできます。");
        return;
      }
      faceTracker.requestCalibration();
    });

    ui.bgButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setBackgroundColor(button.dataset.bg || "#FFF8EE");
        updateChangedBadgeForControl("bgColor");
        markActiveCharacterDirty("settings", "background-button");
      });
    });
    ui.backgroundColorInput?.addEventListener("input", () => {
      setBackgroundColor(ui.backgroundColorInput.value);
      updateChangedBadgeForControl("bgColor");
    });
    setBackgroundColor(state.bgColor);
    updateHairColorUi();
    updateSubHighlightControls();

  }

  function bindCanvasInteractionControls() {
    canvas.addEventListener("pointerdown", (event) => {
      if (handleCharacterWizardPointerDown(event)) return;
      if (handleEditPointerDown(event)) return;
      if (handleEyeSetupPointerDown(event)) return;
      if (handleHighlightSetupPointerDown(event)) return;
      if (handleFaceDepthSetupPointerDown(event)) return;
      if (handleNeckPivotSetupPointerDown(event)) return;
      if (handleHairBundleSetupPointerDown(event)) return;
      if (handleItemPointerDown(event)) return;
      if (handleCharacterPointerDown(event)) return;
      if (state.mouseFollowEnabled && !interactionModeActive() && !isFaceTrackingActive()) updatePointerTarget(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (handleEditPointerMove(event)) return;
      if (handleEyeSetupPointerMove(event)) return;
      if (handleHighlightSetupPointerMove(event)) return;
      if (handleFaceDepthSetupPointerMove(event)) return;
      if (handleNeckPivotSetupPointerMove(event)) return;
      if (handleHairBundleSetupPointerMove(event)) return;
      if (handleItemPointerMove(event)) return;
      if (handleCharacterPointerMove(event)) return;
      if (state.mouseFollowEnabled && !interactionModeActive() && !isFaceTrackingActive()) updatePointerTarget(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointerup", (event) => {
      if (handleEyeSetupPointerUp(event)) return;
      if (handleHighlightSetupPointerUp(event)) return;
      if (handleFaceDepthSetupPointerUp(event)) return;
      if (handleNeckPivotSetupPointerUp(event)) return;
      if (handleHairBundleSetupPointerUp(event)) return;
      if (handleItemPointerUp(event)) return;
      if (handleCharacterPointerUp(event)) return;
      handleEditPointerUp(event);
    });
    canvas.addEventListener("pointercancel", (event) => {
      if (handleEyeSetupPointerUp(event)) return;
      if (handleHighlightSetupPointerUp(event)) return;
      if (handleFaceDepthSetupPointerUp(event)) return;
      if (handleNeckPivotSetupPointerUp(event)) return;
      if (handleHairBundleSetupPointerUp(event)) return;
      if (handleItemPointerUp(event)) return;
      if (handleCharacterPointerUp(event)) return;
      handleEditPointerUp(event);
    });
    canvas.addEventListener("wheel", (event) => {
      handleCharacterWheel(event);
    }, { passive: false });
    canvas.addEventListener("pointerleave", () => {
      if (characterDrag) return;
      if (interactionModeActive()) return;
      if (isFaceTrackingActive()) return;
      if (state.idleMotionEnabled) return;
      if (!state.mouseFollowEnabled) return;
      state.targetX = 0;
      state.targetY = 0;
    });
  }

  function bindNavigationAndBaselineControls() {
    updateMouseFollowButton();
    updateRangePreviewButtons();
    bindWorkspaceTabs();
    bindAdjustTabs();

    // Phase 4: baseline 基準値 UI のバインド
    document.querySelectorAll("[data-reset-section]").forEach((button) => {
      button.addEventListener("click", () => {
        resetSectionToBaseline(button.dataset.resetSection);
        markActiveCharacterDirty("settings", "baseline-reset");
      });
    });
    const captureBaselineButton = document.querySelector("#captureBaselineButton");
    captureBaselineButton?.addEventListener("click", () => {
      captureBaselineSettings("手動保存した基準値");
      updateAllChangedBadges();
      setEditStatus("現在の状態を基準値として保存しました。");
      markActiveCharacterDirty("settings", "baseline-capture");
    });

    // Phase 5: A/B スナップショット
    const saveSnapshotButton = document.querySelector("#saveSnapshotButton");
    saveSnapshotButton?.addEventListener("click", () => {
      saveAdjustSnapshot();
    });
    const restoreSnapshotButton = document.querySelector("#restoreSnapshotButton");
    restoreSnapshotButton?.addEventListener("click", () => {
      restoreAdjustSnapshot();
    });
  }

  function bindUi() {
    bindCharacterProfileControls();
    bindDockControls();
    bindCharacterWizardControls();
    bindItemLayerControls();
    bindAdjustmentRangeControls();
    bindVisualSetupControls();
    bindObsAndFileControls();
    bindRuntimeControlButtons();
    bindCanvasInteractionControls();
    bindNavigationAndBaselineControls();
  }
  deformers = createDefaultDeformers();
  // 起動時は同梱 default-settings.json を正とする。
  // 過去のブラウザ内保存を自動読込すると、デフォルト更新後も古いキャラ設定が混ざるため読まない。
  ensureFaceDepthAnchors();
  ensureNeckPivot();
  applyObsModeDefaults();
  bindUi();
  bindLifecycleEvents();
  resetMeshRendererAfterAvatarImageChange();
  scheduleBlink();
  loadAssets()
    .then(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!OBS_MODE) await initializeCharacterLibraryAfterAssetsReady();
      return Promise.all([loadObsSnapshotIfAvailable(), loadObsConfigIfAvailable()]);
    })
    .catch((error) => {
      loadError = error instanceof Error ? error.message : String(error);
      setStatus("error");
      console.error("loadAssets failed", error);
    });
  connectObsEventSource();
  requestNextTick();
})();
