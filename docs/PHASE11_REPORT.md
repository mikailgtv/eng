# Phase 11 report — Certificates, graduation, and official training records

## PHASE 11 STATUS

Complete. Phases 1–10 were not rebuilt. Phase 12 was not started.

Certificates are official records. Practice, XP, badges, streaks, personal speaking, personal listening, and AI tutor activity do not grant eligibility. Attendance uses class attendance records, not login time. A certificate is not issued if the eligibility, template, signatory, numbering, PDF, or QR check fails.

The app is running at http://localhost:3000.

## Completed features

- Configurable completion rule per course. There is no single hardcoded formula. A course with no saved rule is not eligible.
- Statuses: Not Started, In Progress, Requirements Pending, Eligible, Completed, Certificate Issued, Expired, Revoked, Archived. Each one is defined in the product and below.
- `CourseCompletionEngine` returns `eligible` plus `requirements[]`. Each requirement has the requirement, status, evidence, and the missing action. The student page shows exactly what is still needed.
- Official exams, attendance, assignments, teacher approvals, and course completion stay separate from AI Tutor, AI Practice, personal exercises, XP, badges, streaks, and unofficial speaking.
- Certificate IDs are unique, immutable, searchable, and audited. They are not database primary keys. Example shape: `CERT-2026-000184`. Numbering is configurable and allocated inside a transaction.
- Server-side PDF only. Preview is watermarked, does not reserve an ID, and does not create a certificate.
- Public check at `/verify/certificate/{id}` and a QR code on the issued PDF.
- Revocation keeps the row and the reason. A correction creates a new ID and does not overwrite the original snapshot. Recertification is a new linked record.
- Students see their own certificates, downloads, and training record. Teachers see assigned groups only, with no rankings. Administrators manage templates, rules, numbering, signatories, expiration, revocation, verification, and transcripts.
- Reports: certificate, completion, hours, attendance, eligibility, expired, and revoked, in PDF, XLSX, and CSV.
- Notifications follow the student's saved choices. Overrides and issuance require confirmation, a reason, an actor, and a timestamp, and they stay in the audit log.
- Automatic issuance is an administrator setting, off by default, and audited when it runs.

## Completion engine

The engine reads the saved course rule and official records only.

| Status | Meaning |
| --- | --- |
| Not Started | No official lesson, assignment, exam, attendance, speaking, or listening record exists for this course. |
| In Progress | Official work has started, but no completion rule is saved, so eligibility cannot be decided. |
| Requirements Pending | A rule exists and at least one official requirement is missing. |
| Eligible | Every configured requirement is met or has a visible audited waiver. No certificate has been issued. |
| Completed | An administrator recorded completion after eligibility. A certificate has not been issued. |
| Certificate Issued | An active certificate exists. Later rule changes do not rewrite it. |
| Expired | The certificate is past its expiration date. The row is kept. |
| Revoked | The certificate was revoked. The row and the reason are kept. |
| Archived | The completion record was archived. Archiving does not delete an active certificate. |

A requirement is Met, Missing, Not required, or Overridden. An override does not change the exam attempt, attendance mark, or assignment score. The waiver stays visible with the actor, reason, and time.

What can count, only when that course rule enables it:

- Published lesson completion.
- Official assignments for the student's group. Practice-type teacher tasks count only if the rule explicitly includes them.
- Official exams. The latest graded attempt is compared with the current rule or with that exam's stored passing score. Earlier attempts are not rewritten. A score meets the threshold only at or above it.
- Quizzes, only if the rule says quizzes are official.
- Attendance on completed classes. Present and late count. Excused classes are not counted against the student. Unmarked classes are not treated as present. Login time is never used.
- Official speaking assignments linked to the course. Personal or AI speaking does not count.
- Official listening assignments. Personal listening attempts do not count.
- A teacher approval for speaking, writing, or project. This is not an AI grade.
- Planned hours, labeled as configured and not attendance, or attendance hours from marked classes. If no attendance record exists, hours are not claimed.

An empty rule cannot make anyone eligible. Practice, XP, badges, streaks, and AI tutor keys are rejected if someone tries to save them as requirements.

## Certificate system

Issuance is administrator-only, except when automatic issuance is explicitly on. The server checks eligibility, an active template, an active signatory when signatures are required, a valid numbering pattern, a PDF that starts with `%PDF` and contains the certificate ID and student name, and an embedded QR code. If any check fails, nothing is issued.

The public ID is allocated by incrementing a year counter inside the same database transaction as the certificate row. The number used is the value returned after the increment, so two issuances do not receive the same ID. The download key is a random 64-character token, not the certificate number.

The issued snapshot is not edited. A correction copies the needed facts into a new certificate, marks the original superseded, and leaves the original snapshot unchanged. Recertification requires the current rule to be met and stores a link to the earlier certificate. The earlier certificate is not silently rewritten.

Preview opens a watermarked PDF that says it is not a certificate. It does not reserve `CERT-2026-000184` or any other number.

Batch issuance checks every student in the group. Deactivated accounts and ineligible students are listed with a reason. They do not receive a certificate.

Automatic issuance is off. Turning it on is audited. A failed integrity check still blocks the certificate. The student's notification choice is respected.

There is no logo file upload and no signature image upload. The organization name, signatory name, and signatory title are printed. Students cannot save a signatory.

## Verification

`/verify/certificate/{id}` and `GET /api/verify/certificate/{id}` do not require a sign-in.

| Result | Meaning |
| --- | --- |
| VALID | An issued certificate matches that ID. |
| REVOKED | The certificate was revoked. The record remains. |
| EXPIRED | The expiration date has passed. The record remains. |
| NOT FOUND | No certificate uses that ID. |
| SUPERSEDED | The certificate was replaced. It is not described as valid or missing. |
| NOT VALID | The stored record failed an integrity check and is not shown as valid. |

The public page shows the certificate ID, name, course, issue time, and expiration. It does not show an employee code, email, group, private notes, or grades. An official exam result appears on the public page only if an administrator explicitly turns that on for the template. The default is off.

Each check is stored as a verification row with the result and time. The page does not show the checker's address.

## Training records

`/student/training-record` is built from official course assignment, lesson, assignment, exam, and attendance records. It shows status, the first official date when one exists, attendance from attendance records, planned hours and attendance hours as separate facts, and certificate IDs. It does not include XP, badges, streaks, or AI tutor activity.

A PDF transcript can be downloaded by the student, by a teacher for an assigned student, or by an administrator. The generated snapshot is stored. It is not updated later with practice or XP.

Hours are blank, not zero, when no official attendance time exists. The label says login time is not used.

## Database

`prisma db push` added these tables without `--accept-data-loss`:

- `course_completion_rules`
- `course_completion_records`
- `certificate_templates`
- `certificate_signatories`
- `certificate_sequences`
- `certificates`
- `certificate_versions`
- `certificate_revocations`
- `certificate_verifications`
- `requirement_overrides`
- `teacher_approvals`
- `certification_settings`
- `certificate_preferences`
- `transcripts`

Existing exam attempts, attendance rows, assignments, and lesson progress were not rewritten. The PDF is stored on the certificate row and checked against its SHA-256 hash before download.

## API

Authorization is on the server. A student cannot send another student's ID and receive that student's record.

- `GET /api/certificates` — signed-in student, or a teacher/admin view
- `GET /api/certificates?courseId=` — eligibility for the signed-in student; a student query ID is ignored
- `POST /api/certificates/preview` — PDF preview, no certificate row
- `POST /api/certificates/issue` — admin, confirmation and reason required
- `POST /api/certificates/revoke` — admin
- `POST /api/certificates/correct` — admin, new ID
- `POST /api/certificates/recertify` — admin, current eligibility required
- `POST /api/certificates/rules` — admin
- `POST /api/certificates/overrides` — admin waiver, visible and audited
- `POST /api/certificates/approvals` — teacher for an assigned student, or admin
- `POST /api/certificates/batch` — admin, reports every skip reason
- `POST /api/certificates/settings` — numbering, organization name, automatic issuance
- `POST /api/certificates/templates` — admin
- `POST /api/certificates/signatories` — admin
- `POST /api/certificates/preferences` — the signed-in user
- `POST /api/certificates/complete` — admin records completion without issuing
- `POST /api/certificates/archive` — admin, refused while an active certificate exists
- `GET /api/certificates/download/{token}` — session plus unguessable token
- `GET /api/certificates/reports` — PDF, XLSX, or CSV
- `GET /api/certificates/transcript` — official training-record PDF
- `GET /api/verify/certificate/{id}` — public, minimized

## Teacher controls

`/teacher/certificates` lists students in assigned groups in alphabetical order. The page says this is not a ranking. It shows status, eligibility, and the missing official action. Teachers can record a speaking, writing, or project approval. They cannot issue, revoke, correct, change an exam score, or open another group's report.

## Admin controls

`/admin/certificates` manages the template, signatory, numbering pattern, automatic issuance, course rule, one-student issuance, batch issuance, visible waivers, revocation, correction, and recertification. Reports are linked from that page and from `/admin/reports`.

Other organization-wide charts that were still placeholders are not claimed as finished. Certificate reports are the reports this phase adds.

## Security

- Session identity is read on the server. Client student IDs, scores, and passed flags are not trusted.
- Students cannot issue, waive requirements, or save signatories.
- Teachers cannot reach students outside assigned groups. Those requests return not found.
- Download URLs are not the sequential certificate number. A guessed number returns not found. Another student cannot download the file.
- The stored PDF hash is checked before download. A mismatch stops the download and is audited.
- Public verification does not return employee code, email, or private notes.
- Audit rows record issuance, automatic issuance, revocation, correction, recertification, rule changes, waivers, approvals, settings, downloads, and blocked downloads. Passwords and download tokens are not written to the audit metadata.
- Official dates use the server time and `ORG_TIMEZONE` when it is set, otherwise UTC, with the zone name shown.

## Tests

`scripts/testing/verify-phase11.ts` — 57 passed, 0 failed.

`tsc --noEmit` passed. `prisma db push` completed without `--accept-data-loss`.

Covered: threshold at 70 passes and 69 fails; ID format; practice and XP do not count; all nine statuses; student cannot issue or save a signatory; a practice key cannot be saved as a rule; a student query ID is ignored; incomplete lessons are not eligible; preview does not create a row; ineligible issuance is refused; confirmation is required; numbering is unique; duplicate active issuance is refused; PDF download works for the owner only; the certificate number is not a download key; public check hides employee code and email; unknown IDs are not found; correction supersedes without overwrite; expiration and revocation keep the row; a teacher cannot export another group's report; CSV, XLSX, and PDF reports generate; batch reports ineligible reasons; exam attempts are unchanged; issuance is audited; automatic issuance respects notification preferences and is turned off again.

## Known limitations

- Logo and signature images are not uploaded. The certificate prints the organization name and the signatory name and title. The app still has no general file-upload store for this.
- The PDF font is Helvetica. A name or course title that cannot be printed in that font stops issuance instead of substituting a different name.
- Issuance requires the course to be assigned to the student's current group.
- Public verification of a known certificate ID shows the student's name and course. That is required for a public check. It does not show the employee code.
- Preview does not show a reserved certificate ID, because reserving one would either consume a number or display an ID that was not issued.
- Replaced certificates use the status SUPERSEDED, and a damaged record uses NOT VALID. Those are extra results so a replaced certificate is not called valid or missing.
- Attendance hours cannot be calculated for a class with no usable start and end time. That class is omitted and named in the evidence.
- Non-certificate organization charts are still not built. Certificate reports are available.

## Known issues

The verifier left official test records. They are real rows, not display placeholders:

- `CERT-2026-000006` superseded, James Carter
- `CERT-2026-000007` expired, James Carter
- `CERT-2026-000008` revoked, James Carter
- `CERT-2026-000009` issued, James Carter
- `CERT-2026-000010` issued automatically, Lena Torres

The starter course rule used by that run was removed afterward, so the course again has no completion formula until an administrator saves one. The active template is named "Phase 11" and the active signatory is "Training Office, Registrar". Replace both before real issuance. Automatic issuance is off.

No Phase 12 work was started.
