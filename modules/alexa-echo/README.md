# ATLAS Echo Mode

ATLAS Echo Mode is the supported integration layer for Amazon Echo Show devices. It does **not** replace or flash Amazon firmware. Instead, it runs ATLAS as an Alexa custom skill with a branded APL touch/voice interface.

## Target device

- Echo Show 5 (3rd Gen)
- Invocation: `Alexa, open Atlas`
- Voice + touch UI through Alexa Presentation Language (APL)

## What this module contains

- `lambda/` — Alexa Skills Kit Node.js handler.
- `apl/atlas-home.json` — ATLAS home screen optimized for small Echo Show displays.
- `interaction-model/` — English (US) and Spanish (US) interaction models.

## Deployment status

The code package is repository-ready. Final activation requires an Amazon Developer account and linking the custom skill to the Echo Show. Amazon does not expose a supported remote factory-reset API to this repository, so the physical device reset/setup step must be completed on the Echo Show itself.

## Recommended reset/setup sequence

1. Factory-reset the Echo Show from its on-device settings.
2. Reconnect it to Wi-Fi and the Amazon account that will own the developer skill.
3. Create a Custom Alexa Skill named **ATLAS**.
4. Enable the **Alexa Presentation Language (APL)** interface.
5. Deploy `lambda/` to an Alexa-hosted skill or AWS Lambda.
6. Import the interaction model for the preferred locale.
7. Add `apl/atlas-home.json` as the visual document.
8. Enable the development skill on the Echo Show.
9. Say: **“Alexa, open Atlas.”**

## Security

Do not place ATLAS API keys or long-lived credentials in the skill source. Use environment variables / secret storage and short-lived tokens for any ATLAS backend calls.
