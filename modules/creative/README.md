# ATLAS Creative Studio

Original ATLAS implementation of an all-in-one generative media workspace. It is designed to reach feature parity with the workflow category popularized by products such as OpenArt without copying proprietary source code, branding, protected assets, or private implementation details.

## Capability map

- Image generation — implemented through provider adapter.
- Video generation — implemented as asynchronous provider jobs with polling and content proxy.
- Reusable character library — foundation implemented.
- Image editing, inpainting, outpainting, background replacement, relighting, VFX and upscale — planned adapters.
- Storyboard / Director / one-click story workflows — planned orchestration layer.
- Motion control and lip sync — planned video post-processing layer.
- Voice, music and sound generation — planned audio layer.
- Persistent 3D worlds — planned world layer.
- Multi-model registry — foundation represented by provider/model fields; additional providers remain isolated behind adapters.

## Current API

- `GET /api/creative/capabilities`
- `GET /api/creative/jobs`
- `GET /api/creative/jobs/:id`
- `POST /api/creative/images/generate`
- `POST /api/creative/videos/generate`
- `GET /api/creative/videos/:id`
- `GET /api/creative/videos/:id/content`
- `GET /api/creative/characters`
- `POST /api/creative/characters`

All routes inherit ATLAS organization/DBA scoping, session authorization and audit logging.

## Provider configuration

The first live adapter reuses `OPENAI_API_KEY` already supported by ATLAS Intelligence.

Optional environment variables:

- `ATLAS_IMAGE_MODEL` — defaults to `gpt-image-1`.
- `ATLAS_VIDEO_MODEL` — defaults to `sora-2`.

Provider secrets must remain in environment/secret storage and must never be committed.

## Operational status

This module is **not marked operational** until its migration is applied, provider credentials are configured in the deployment environment, and deployed end-to-end generation tests pass.
