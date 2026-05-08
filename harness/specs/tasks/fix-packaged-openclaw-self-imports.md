---
id: fix-packaged-openclaw-self-imports
title: Fix packaged OpenClaw self-import resolution
scenario: gateway-backend-communication
taskType: runtime-bridge
intent: Ensure the packaged OpenClaw runtime can load built-in provider extensions before chat sends reach configured model providers.
touchedAreas:
  - scripts/bundle-openclaw.mjs
  - scripts/openclaw-self-import-patch.mjs
  - tests/unit/openclaw-self-import-patch.test.ts
expectedUserBehavior:
  - Packaged Gateway model catalog startup does not fail on OpenClaw plugin-sdk self-imports.
  - Chat sends with configured OpenAI-compatible providers reach provider execution instead of failing before reply with a module resolution error.
requiredProfiles:
  - fast
  - comms
requiredTests:
  - tests/unit/openclaw-self-import-patch.test.ts
acceptance:
  - Bundled extension files no longer contain unresolved openclaw/plugin-sdk package specifiers.
  - Importing the bundled Codex prompt overlay does not throw ERR_MODULE_NOT_FOUND for package openclaw.
  - Comms replay and compare pass.
docs:
  required: false
---

Packaged ClawX copies OpenClaw into `resources/openclaw` as a standalone runtime directory. Built-in OpenClaw extensions must therefore resolve OpenClaw plugin SDK imports from bundled relative files rather than from a missing `node_modules/openclaw` package self-reference.
