# ATLAS Media

ATLAS Media is the shared creative-production module for original music, voice/audio, video, images, teleprompter workflows, publishing and media processing.

## Generation API

- `GET /api/media/capabilities`
- `POST /api/media/generate`
- Supported generation kinds: `music`, `audio`, `video`
- Generation is delegated through the `MEDIA_GENERATOR` service binding so ATLAS can swap providers without rewriting the public API.

## Security and privacy invariants

- Organization and DBA scope are required.
- Generation requires an authenticated ATLAS session and write-capable role.
- User prompts are forwarded to the configured generator but are not persisted by this module.
- Audit records store the media kind, duration and prompt length, not the prompt contents.
- Provider credentials must remain outside source control.

## Provider contract

The configured `MEDIA_GENERATOR` service receives a `POST` request at `/generate` with the normalized generation request and ATLAS scope headers. It should return JSON describing the provider job or completed media asset.

This module intentionally does not hard-code a vendor. Music, audio and video providers can be routed independently behind the service binding.
