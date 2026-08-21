# ATLAS Studio Autopilot

ATLAS Studio Autopilot is a first-party local video analysis and multi-variant production surface. It extends Creator Director and Native Studio without using an external creative SaaS provider.

## Route

- UI: `/studio/autopilot`
- capabilities: `/api/studio/autopilot/capabilities`
- health: `/api/studio/autopilot/health`

## Pipeline

1. Open a local source video with a browser object URL.
2. Import the Creator Director recipe from browser storage when one exists.
3. Decode audio locally with Web Audio and calculate RMS energy windows.
4. Decode sampled frames locally and calculate luminance motion deltas.
5. Normalize motion and audio series and score candidate windows with user-controlled weights.
6. Select multiple strong windows while suppressing heavy overlap.
7. When the browser exposes `FaceDetector`, sample the selected windows and record horizontal subject centers. Otherwise use deterministic center framing.
8. Build timed captions from the Creator Director script.
9. Burn hook, caption and CTA overlays into the output canvas.
10. Process voice audio through a local high-pass filter and dynamics compressor when cleanup is enabled.
11. Render each selected window with Canvas CaptureStream and MediaRecorder.
12. Provide local downloadable variants.

## Truthful capability boundaries

Subject tracking is marked `browser-conditional`. Browsers without the Shape Detection FaceDetector API use center framing and the UI reports that fallback. Autopilot does not claim neural face tracking.

The current energy selector scores motion and audio intensity. It does not claim semantic understanding of speech, emotion, persuasion, or viewer engagement.

The output renderer uses browser-supported MediaRecorder formats. The UI does not promise MP4 when the browser only supports WebM.

## Privacy

Source media stays on the device by default. Analysis uses local browser APIs and decoded source data. The Worker exposes only application code, capability metadata and health responses. The production contract reports `externalProviders: []`.

## Creator relationship

Creator Director owns the creative brief and storyboard. Studio Autopilot owns automatic moment selection, subject-aware framing when available, overlays and batch variants. Native Studio remains the detailed manual production workbench.

`IDEA -> CREATOR DIRECTOR -> STUDIO AUTOPILOT -> NATIVE STUDIO -> CREATOR RELEASE`

## Verification

Run:

```bash
npm run check:studio-autopilot
npx wrangler deploy --dry-run
```

Production CI also checks the Autopilot health and capabilities endpoints and rejects a deployment if any external creative provider appears in the runtime contract.
