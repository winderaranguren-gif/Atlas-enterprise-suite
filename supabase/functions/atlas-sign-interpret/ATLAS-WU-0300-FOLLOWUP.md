# ATLAS-WU-0300 — Accessibility follow-up

This file tracks the post-merge hardening work for ATLAS Access / ATLAS Sign after PR #27.

Required fixes from the final Codex review:

1. Serialize pending camera permission/start requests and immediately stop any stream granted after the accessibility panel has closed. Sign interpretation must not capture or upload frames after close/navigation.
2. Scope persistent-history consent to the authenticated account, or reset `saveHistory` to false on logout, so a second account on the same browser never inherits consent.
3. Apply high-contrast mode to the host ATLAS application, not only the accessibility panel.
4. Keep opted-in persistent history across ordinary page navigation/reload. `pagehide` must stop media/requests only; persistent deletion is logout-only.
5. Make ATLAS Access available on standalone linked ATLAS module pages through a shared, non-destructive integration that preserves current GPS, Governance, Cars, Support, Fleet, Calendar, Health and other work units.

Constraints:
- Owned paths: `atlas-accessibility.js`, `atlas-accessibility.css`, `supabase/functions/atlas-sign-interpret/`.
- Shared paths must be fetched from current main immediately before editing and changed minimally.
- Do not weaken production or constitutional release gates.
- Camera and microphone remain opt-in and stop on close/hidden navigation.
- No continuous frame upload; sign frames are sent only for an explicit interpretation action.
- JWT verification remains enabled for the Edge Function.
