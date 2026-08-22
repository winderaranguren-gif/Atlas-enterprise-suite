# ATLAS Creator Studio — TikTok Studio public-feature benchmark

Reviewed: 2026-08-22

## Scope

This is a clean-room capability benchmark. ATLAS does not copy TikTok source code, proprietary models, visual assets, private APIs, or branding. Publicly documented creator workflows are translated into ATLAS-owned implementations that reuse existing ATLAS architecture.

Primary public references:

- TikTok Help Center — Creator tools / TikTok Studio
- TikTok Help Center — TikTok Studio features
- TikTok Newsroom — Helping Creators Bring Their Creativity to Life with TikTok Studio
- TikTok Newsroom — New AI-powered tools to make it easier to create and share on TikTok
- TikTok Newsroom — New tools to protect and support TikTok creators

## Capability matrix

| Publicly documented pattern | ATLAS implementation | Runtime truth |
| --- | --- | --- |
| Trending by region/topic | Home > Trending research topic | No ranking shown until a real trend source exists |
| Inspiration feed | Local Inspiration board | User-created ideas only until a source is connected |
| Upload media | Browser-local file picker | Working |
| Film/record | MediaDevices + MediaRecorder | Working when browser permission/device is available |
| Edit video | ATLAS Native Studio handoff | Working at `/studio/production` |
| Photo editor | Canvas brightness/contrast/saturation + PNG export | Working |
| Autocut | ATLAS Native Studio Smart Cut | Working through existing first-party editor |
| Auto captions | Native caption tooling plus first-party STT slot | Manual/SRT/burn-in working; automatic STT waits for ATLAS-owned model artifact |
| Post title/caption/cover | Publish package | Working locally |
| Privacy audience | Public/followers/private local package | Working locally |
| Allow comments/remix/stitch/stickers/story reuse | Interaction-control package | Working locally; external enforcement requires connector |
| Copyright check | Rights declaration + dependency boundary | No fake fingerprint result; true match scan requires licensed reference/fingerprint service |
| Drafts | Local post store | Working |
| Scheduled posts | Local scheduler record | Working locally; external scheduling requires connector |
| Manage posts | Search/filter/sort/delete/export | Working |
| Manage comments | JSON import/search/filter/moderation/reply-state | Working on imported/connected records |
| Creator Care mode pattern | Local blocked-term filter | Working rules-based baseline; does not claim TikTok proprietary AI behavior |
| Analytics overview/content/viewers/followers | Import/connector-backed analytics views | Empty until real data exists |
| Monetization rewards/balance/programs | Import/connector-backed monetization view | Empty until real data exists |
| Inbox / notifications | Creator/account notices + preferences | Working local notification state; direct messages are not represented as a Studio feature |
| Smart Split | Duration-based clip planner + Native Studio render handoff | Working clip plan; actual render handled by Native Studio; automatic transcription/reframe models remain first-party dependency |
| AI Outline | Six-part local Outline Builder | Working deterministic baseline; does not falsely claim a neural model |
| Content Check Lite pattern | Content Preflight | Working rules-based checks; explicitly does not predict For You/recommendation eligibility |
| Feedback | Structured local feedback queue | Working locally; server delivery requires authenticated backend endpoint |

## Existing ATLAS capabilities preserved

The prior Creator Studio also exposed capabilities beyond TikTok Studio. They are retained as **ATLAS extensions**, not mislabeled as TikTok features:

- LIVE Control Room
- Creator Academy
- Team & Roles
- Settings & Integrations

ATLAS Native Studio remains the first-party production engine, so this change does not create a parallel editor.

## Data and truth policy

1. No invented views, followers, engagement, revenue, balances, rankings, or eligibility scores.
2. A disconnected source renders an empty/configuration state.
3. External publish buttons remain disabled until an authorized connector is present.
4. Platform recommendation eligibility is never claimed by local rules.
5. Copyright declarations are not represented as fingerprint matches.
6. Neural features are not represented as active unless an ATLAS-owned model artifact is present.

## Routes

- `/studio` — ATLAS Creator Studio
- `/studio/creator` — creator-specific alias
- `/studio/production` — existing ATLAS Native Studio production editor
- `/api/studio/health`
- `/api/studio/capabilities`
- `/api/studio/benchmark`

## Validation

Run:

```bash
node scripts/validate-creator-studio.mjs
```

The validation checks required creator surfaces, truthful empty states, disabled external publishing, API metadata, and absence of the previous synthetic demo metrics.
