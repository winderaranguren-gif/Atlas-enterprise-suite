# ATLAS Native Studio

ATLAS Native Studio is the first-party media production path for ATLAS. Its purpose is to keep the core video workflow inside ATLAS instead of depending on external creative SaaS applications.

## First-party execution policy

The production route is local-first and declares zero external creative providers. Source media is opened with browser object URLs and remains on the user's device by default. The Worker does not claim a neural capability is available unless an ATLAS-owned model artifact exists.

## Working capabilities

- local video ingest and metadata
- motion-scored Smart Cut
- timeline in/out trim controls
- 9:16, 16:9 and 1:1 output framing
- crop, contain and blurred-background layouts
- ATLAS look presets and deterministic color treatment
- Original / ATLAS Enhanced split comparison
- SRT import
- manual captions
- script-to-timed-caption distribution
- caption burn-in
- Web Audio voice cleanup with high-pass, low-pass and dynamics compression
- Canvas CaptureStream + MediaRecorder render and download
- reference-frame export

These functions execute in browser-native APIs and ATLAS JavaScript. They do not require Adobe, Descript, HeyGen, Magnific or another creative SaaS provider.

## Neural model boundary

The following capabilities require dedicated machine-learning models to reach production quality:

- speech-to-text transcription
- digital-twin synthesis
- phoneme-aware lip sync
- super-resolution
- identity-preserving neural video restyle

ATLAS does not route these features to a third-party provider. Their first-party slots are registered in `atlas/native-media-engine.mjs` and remain `model-not-trained` until an ATLAS-owned model artifact is present.

Expected artifact locations:

- `models/native/speech-to-text.atlasmodel`
- `models/native/digital-twin.atlasmodel`
- `models/native/phoneme-lipsync.atlasmodel`
- `models/native/super-resolution.atlasmodel`
- `models/native/video-restyle.atlasmodel`

Model artifacts must not be committed blindly to the application repository. They should be versioned, checksummed, signed, licensed for ATLAS use and distributed through controlled first-party storage.

## Routes

- `/studio/production` — canonical native production UI
- `/studio/native` — explicit native alias
- `/studio/production/native` — explicit production alias
- `/api/studio/production/health`
- `/api/studio/production/capabilities`
- `/api/studio/production/runtime-status`
- `/api/studio/native/status`

The native handler is evaluated before the older Studio Production handler. This preserves the previous code as a fallback while making the first-party engine canonical.

## CLI

```bash
npm run atlas:native-media -- status
npm run atlas:native-media -- verify
npm run atlas:native-media -- init --apply
npm run check:native-studio
```

`verify` fails if the first-party manifest declares external inference or an external creative SaaS provider.

## Identity and voice safeguards

Current identity-safe restyling changes color, composition and presentation only. It does not deform facial geometry or claim to generate a new identity. Digital-twin and cloned-voice features must remain disabled until ATLAS has a first-party model, explicit user consent, tenant isolation, retention controls, revocation and audit logging.

## Production definition

A capability is considered production-ready only when its actual output can be generated, downloaded or otherwise verified. A configured button, endpoint slot or UI state is not sufficient evidence.
