# Phase 28.3 — Workflow Validation

**Result:** PASS for the exercised workflow API paths on disposable `phase28_3_repeat`.

- Synthetic draft workflow with malformed definition: publish request rejected **422**.
- After repairing only the synthetic repeat-target fixture with a valid manual `WAIT` workflow: publish **200**.
- Authorized manual run: **202**; one matching synthetic manual-trigger event was queued.
- Student and teacher workflow-manage attempts: **403** each.
- Student workflow-execute attempt: **403**.

No source workflow records were present in the clean import (workflow tables were empty at import time). Workflow fixtures/events were created only in the repeat target. This is API smoke validation, not proof of a continuously running workflow worker or external notification delivery.
