# ATLAS Voice & Audio — Clean-Room Functional Parity Plan

Date: 2026-08-10

## Objective
Build an ATLAS-owned voice/audio stack that can cover the same classes of user workflows as leading commercial voice platforms without copying proprietary source code, private model weights, trade secrets, branding, protected datasets or non-public implementation details.

ATLAS must prefer local/self-hosted execution when practical, expose optional same-origin model adapters for heavier inference, and never report an advanced capability as operational unless a real adapter passes a health check.

## Capability matrix

| Capability | ATLAS surface | Current implementation | Next implementation boundary |
|---|---|---|---|
| Text to speech | Voice Studio | ACTIVE — browser-native TTS with voice/language/rate/pitch selection | ATLAS high-fidelity multilingual neural TTS adapter |
| Speech to text | Voice Studio | ACTIVE where browser SpeechRecognition is available | Dedicated streaming STT model with timestamps, diarization and entity controls |
| Microphone recording | Voice Studio | ACTIVE — local MediaRecorder capture/export | Waveform editor, denoise and project timeline |
| Voice library | Voice Studio | ACTIVE — installed system voices + authorized session profiles | ATLAS-owned reusable model profiles and organization library |
| Voice cloning | Voice Core | CONSENT-GATED adapter contract | Self-hosted high-fidelity clone model and enrollment pipeline |
| Voice design | Voice Core | Adapter contract | Prompt-to-voice model with reproducible voice descriptors |
| Speech-to-speech / voice changer | Voice Core | CONSENT-GATED adapter contract | Streaming voice conversion preserving timing/prosody |
| Voice isolation / cleanup | Voice Core | Adapter contract | Denoise, dereverb, source separation and speech enhancement |
| Dubbing / localization | Voice Core | CONSENT-GATED adapter contract | STT → translation → speaker mapping → timing → synthesis → mixdown |
| Dialogue / multi-speaker generation | Voice Core | Architecture ready | Speaker-aware script parser and neural dialogue synthesis |
| Sound effects | Voice Core | Adapter contract | Prompt-to-SFX model + searchable ATLAS SFX library |
| Music generation | ATLAS Music + Voice Core | ATLAS Music originals ACTIVE; generative adapter contract ready | Prompt-to-music model with rights/provenance controls |
| Audiobooks / podcasts / voiceover projects | Voice Studio | Foundation ACTIVE | Timeline editor, chapters, takes, pronunciations and batch rendering |
| Pronunciation control | Voice Core | Language/voice selection ACTIVE | Dictionaries, phonemes, aliases and organization lexicons |
| Emotion / delivery control | Voice Studio | Browser pitch/rate ACTIVE | Neural style, emotion, pacing, emphasis and non-verbal controls |
| Streaming speech | Voice Core | Browser speech playback ACTIVE | Server WebSocket streaming inference |
| Conversational voice agents | Voice Core + Agent Fabric | CONSENT-GATED adapter contract; Agent Fabric already exists | Full duplex STT/LLM/TTS loop, barge-in, tools, memory and verification |
| Phone agents / receptionist | Agent Fabric | Architecture ready | Telephony adapter, call routing, scheduling and verified business actions |
| Omnichannel voice/chat | Connect + Agent Fabric | Architecture ready | Phone, web voice, chat, email and messaging channel adapters |
| Developer API | ATLAS runtime | JavaScript runtime API ACTIVE | Same-origin REST + WebSocket API and SDKs |
| Usage / audit / evidence | Event Fabric + Work Graph | Existing ATLAS architecture | Durable per-generation evidence, consent lineage, cost and model provenance |

## Mandatory safety and rights controls

1. Voice cloning, voice conversion and dubbing must require verified authorization from the voice owner or another lawful basis approved by ATLAS policy.
2. Voice profiles must retain consent/provenance metadata and support revocation.
3. The browser must not contain server credentials or model-provider secrets.
4. Advanced model adapters must implement `health()` and `run(input)` and are accepted only after a successful health check.
5. ATLAS must fail closed when a model adapter is missing, unhealthy or unauthorized.
6. Generated assets should carry internal provenance metadata so ATLAS can distinguish original recordings, authorized synthetic voices and transformed media.
7. High-risk external actions initiated by a conversational agent remain subject to ATLAS Identity, permissions, approval gates and post-action verification.

## Execution architecture

```text
Mic / file / text / script
        ↓
ATLAS Voice Studio
        ↓
Consent + Identity + Policy Gate
        ↓
Native runtime OR same-origin model adapter
        ↓
TTS / STT / clone / conversion / isolation / dubbing / SFX / music / agent
        ↓
Verification + provenance + Work Graph evidence
        ↓
Playback / export / project / API / agent channel
```

## Definition of complete parity

ATLAS Voice is not considered feature-complete merely because a button or placeholder exists. A capability graduates to ACTIVE only when the underlying path executes end-to-end, produces a verifiable output, enforces its rights/security controls, survives validation, and has a usable Web/App surface.