# ATLAS-WU-0300 — Open Design contract

## Purpose
ATLAS Access is not a separate disability portal. It is the universal communication layer of ATLAS. The same person should be able to move between sign language, captions, text, speech and visual alerts without leaving the current module.

## Desktop-first composition
On desktop, ATLAS Access uses a horizontal workspace rather than a narrow mobile drawer. The primary sign-language surface occupies the larger left column. Captions, text-to-speech, reading controls and privacy/history occupy the right column. Header, context line and system status span the full workspace.

On mobile/tablet, the same components collapse into a single vertical flow without losing features or changing terminology.

## Interaction hierarchy
1. Communication intent first: Sign, Listen/Captions, Speak for me, Read/See alerts.
2. Live state is always visible: camera off/pending/on, captions off/on, interpretation running, confidence/clarification.
3. Privacy controls are explicit and never inherited between accounts.
4. Closing/hiding ATLAS Access stops active media immediately.
5. Navigation or reload preserves only data the authenticated user explicitly opted to keep.

## Visual principles
- ATLAS navy/black base with cyan/teal accents.
- High contrast must alter the host ATLAS surface, not only the Access panel.
- Reduced-motion mode eliminates decorative motion while preserving state feedback.
- Primary actions use one consistent accent treatment; destructive/privacy actions remain visually distinct.
- Status is conveyed by text plus shape/border/state, never color alone.
- Keyboard focus must remain visible at all times.

## Component ownership
ATLAS-WU-0300 owns:
- `atlas-accessibility.js`
- `atlas-accessibility.css`
- `supabase/functions/atlas-sign-interpret/`

Universal page availability is integrated once at build time. Individual module pages must not carry copied accessibility implementations.

## Product rule
A new ATLAS module is considered accessible only when the universal build includes ATLAS Access automatically; module teams do not reimplement sign, caption, speech, privacy or visual-alert logic.
