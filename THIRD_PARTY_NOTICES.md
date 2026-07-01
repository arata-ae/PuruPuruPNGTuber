# Third-Party Notices

PuruPuru PNGTuber is intentionally lightweight and does not vendor JavaScript packages in this repository.

## Runtime-loaded services and libraries

### MediaPipe Tasks Vision

- Project: MediaPipe Tasks Vision / Face Landmarker
- Provider: Google
- Version referenced by the app: `@mediapipe/tasks-vision@0.10.35`
- Runtime module URL: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs`
- Runtime model URL: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`
- License: Apache License 2.0

MediaPipe assets are loaded at runtime for camera-based face tracking. If face tracking is not used, the core PNG avatar rendering can still run without loading MediaPipe.

## Browser and platform APIs

The app uses standard browser APIs including Canvas 2D, WebGL, MediaDevices, Web Audio, FileReader, localStorage, EventSource, and fetch.
