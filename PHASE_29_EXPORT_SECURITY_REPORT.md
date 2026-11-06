# Phase 29 — Report / Export Security Report

**CSV/XLSX/PDF/export authorization tests:** NOT TESTED.

Static positive controls: certificate transcript scope checks student-self and teacher-assigned group in `transcriptPdf`; content/integration/export routes have varying role/permission helper checks. No systematic route-level authorization for every export could be established by source pattern alone. Organization admin/report service methods include global lists without clear organization filtering; evaluate in tandem with critical tenant findings. CSV formula injection, spreadsheet cell escaping, PDF data minimization and bulk resource-by-resource authorization were not tested.
