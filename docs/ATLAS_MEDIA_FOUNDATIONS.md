# ATLAS Media Foundations

ATLAS Studio now owns three additional local-first media engines.

## Look Engine v2

Route: `/studio/look`

- local histogram and luminance analysis
- auto-exposure recommendation
- gray-world white-balance estimate
- deterministic exposure, contrast, saturation, warmth, highlight, shadow and vignette controls
- first-party presets: Natural, Presenter, Corporate, Beauty Natural, Cinematic, Luxury and Social
- identity-safe policy: no facial geometry mutation
- look recipe handoff through local storage

Neural changes to hair, wardrobe, face or environment remain `model-not-trained` until ATLAS owns a trained restyle artifact.

## Subject Engine

Route: `/studio/subject`

- browser-native `FaceDetector` when the runtime supports it
- ATLAS motion-centroid fallback when it does not
- temporal smoothing for subject lock
- crop keyframe generation
- 9:16, 1:1 and 16:9 reframe planning
- local crop-plan handoff to Studio Autopilot

The engine changes framing only. It does not mutate identity.

## Speech Engine

Route: `/studio/speech`

- local audio decoding with Web Audio
- deterministic voice-activity detection
- RMS, peak and noise-floor analysis
- silence map and edit decision list
- supplied-script timing across detected speech regions
- SRT export from the supplied script

Automatic speech-to-text and voice synthesis remain `model-not-trained`. Script timing is explicitly not represented as transcription.

## Ownership contract

All three services expose `externalProviders: []`, `externalProviderRequired: false`, `mediaLeavesDeviceByDefault: false`, and `localProcessing: true`.

These engines are foundations for the later ATLAS-owned neural restyle, speech recognition, voice synthesis, lip-sync and super-resolution models.
