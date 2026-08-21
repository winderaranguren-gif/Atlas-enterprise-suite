# ATLAS Media QC

ATLAS Media QC is a first-party technical quality-control surface for local video before release.

## Routes

- `/studio/qc`
- `/api/studio/qc/capabilities`
- `/api/studio/qc/health`

## What it measures

Video samples are decoded in the browser and scored for average luminance, luminance contrast, an edge-gradient sharpness proxy, recurring black frames, highlight clipping and source resolution.

Audio is decoded locally through Web Audio and measured for RMS level, peak level, sampled clipping ratio and near-silence ratio.

The report produces pass, review and fail gates and stores the latest report in browser storage under `atlas.media.qc` for later release integration.

## Boundaries

The score is technical QC, not an artistic-quality score. It does not claim to understand performance, persuasion, emotion, story quality or brand fit.

No media is uploaded by the Worker. The runtime contract declares `externalProviders: []` and `mediaLeavesDeviceByDefault: false`.

## Workflow

`CREATOR DIRECTOR -> STUDIO AUTOPILOT -> NATIVE STUDIO -> MEDIA QC -> CREATOR RELEASE`

## Validation

```bash
npm run check:media-qc
npx wrangler deploy --dry-run
```
