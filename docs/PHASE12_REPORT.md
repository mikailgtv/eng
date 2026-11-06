# Phase 12 report — Communication, notification, and engagement hub

## PHASE 12 STATUS

Complete. Phases 1–11 were not rebuilt. Phase 13 was not started.

In-app notices are the primary channel. Email, push, and SMS are optional abstractions and are not configured in this deployment. A notice is not described as delivered to an inbox, device, or phone unless a provider confirms that, and none of the current providers confirm it.

The app is running at http://localhost:3000.

## completed features

- One notification center for students, teachers, and administrators. Each item has a title, message, category, priority, source, related object, action, UTC timestamp, and a text state: Unread, Read, or Archived.
- Categories: academic, assignment, exam, schedule, attendance, speaking, listening, AI, adaptive learning, gamification, certificate, admin, system, and message.
- Priorities: low, normal, high, and urgent. Only an administrator can mark a notice urgent.
- Students can mark one notice read, mark all read, and archive. Official exam, certificate, and admin notices stay in the app even if that category is turned off. They are not auto-deleted.
- Similar unread notices with the same group key are combined. A non-critical hourly cap and a dedupe key stop the same reminder from being sent again on the next sweep.
- Teacher-to-student messages, including a group send that becomes a separate conversation for each student. Students message their assigned teacher. Student-to-student messages are off unless an administrator turns them on.
- Announcements for information, reminder, schedule change, course update, exam notice, training, and system maintenance. They can be scheduled, expired, targeted, and can require acknowledgement.
- Targeting: all students and teachers, one group, one shift, one course, or one student. A class reminder goes only to the group on that class.
- Real message attachments for PDF, DOCX, XLSX, image, and audio. Executables and mismatched file contents are rejected. Download checks participation.
- Search of authorized messages by keyword, sender, recipient, date, and message category.
- Preferences, quiet hours, templates with version history, and configurable rules. The AI notice rule is off and is not called from the tutor.
- Reminders for a class that is starting, an assignment that is due or overdue, an exam window, a certificate that is near its expiration date, and grouped vocabulary review. Gamification notices use the gamification category and can be turned off.
- Cancelling a class notifies the students in that group. No reason is inferred.
- Counts only. No rankings.

## notification architecture

Existing Phase 5–11 callers still use `notifyUsers` and `notifyGroupStudents`. Those helpers now publish through the hub and log a failure instead of undoing the academic action.

The hub writes the in-app row first. It then records an external attempt only when that channel is enabled, the person opted in, and the notice is not blocked by quiet hours. Quiet hours do not hide the in-app row. Critical override for quiet hours is off unless an administrator turns that setting on.

Times are stored in UTC. The display uses the person's saved timezone, otherwise `ORG_TIMEZONE`, otherwise UTC. The zone name is shown with the time.

A notification can require acknowledgement. Opening it, or marking it read, does not set that acknowledgement.

## messaging architecture

Conversations are direct. A group send loops through the students in an authorized group and creates or reuses a private conversation with each one. Students do not see each other's replies.

A message stores the sender, plain-text body, created time, edited time, and soft-delete time. An edit within the configured window keeps the previous text and a timestamp. Soft delete hides the body and keeps the row.

Read receipts are off by default. Opening a conversation updates the reader's own marker, but the other person is not shown that marker unless an administrator enables receipts.

Attachments are written under `storage/messages` after an extension check, a size check, and a magic-byte check. The download route checks that the caller is a participant.

## announcement system

An announcement has a type, priority, publish time, optional end time, optional link, and one or more targets. A future publish time stays hidden. An expired announcement is hidden. Schedule changes and system maintenance require acknowledgement.

The first delivery is recorded with a dedupe key, so a later reminder sweep does not send the same announcement again. Acknowledgement is a separate confirmed action. An unrelated student receives a not-found response rather than another group's announcement.

Teachers can announce only to assigned groups or shifts. Organization-wide and urgent notices are administrator actions.

## delivery channels

| Channel | This deployment | Status recorded |
| --- | --- | --- |
| In-app | Always on. This is the record the person sees. | Delivered when stored. Read is a separate timestamp. |
| Email | Off. `EmailProvider` can be `none`, `log`, or `webhook` through environment variables. No vendor is hard-coded. | Failed, or Submitted if a configured provider accepts it. Submitted is not Delivered. |
| Push | Off. A device endpoint can be stored. The private key is not returned to the browser. | Failed when no device is registered or the provider is missing. |
| SMS | Off. Not used for routine messages. No phone number is stored, so SMS is not sent even if an administrator enables the switch. | Failed, with the reason. No placeholder number is called. |

If email or push fails, the in-app notice remains. Retry applies to a failed email only when an email provider is actually configured. It does not retry forever.

## database changes

The existing `notifications` table was extended in place. New columns include category, priority, source, related object, action label, group key, event count, critical, acknowledgement, archive time, and expiration. Existing rows remain.

New tables: conversation, conversation participant, message, message revision, message attachment, announcement, announcement target, announcement acknowledgement, notification preference, communication preference, notification rule, notification template, template version, notification delivery, scheduled notice, push subscription, and communication setting.

`npx prisma db push` was not used. The local Prisma 5 client was generated and `prisma db push` ran without `--accept-data-loss`.

## API changes

Session-checked routes, all rejected without a login:

- `GET /api/communication/notifications` and `POST /api/communication/read`
- `GET/POST /api/communication/preferences`
- `GET/POST /api/communication/announcements` and `POST /api/communication/announcements/acknowledge`
- `GET/POST /api/communication/settings`, `/templates`, and `/rules` for administrators
- `POST /api/communication/reminders` for an administrator to run the due sweep
- `GET/POST /api/communication/devices` stores a push endpoint and does not return a private key
- `GET/POST /api/messages`, `POST /api/messages/edit`, `GET /api/messages/search`
- `POST /api/messages/attachments` and `GET /api/messages/attachments/{id}`

The older `GET /api/notifications` bell feed still returns `{ items, unread }` and now hides archived and expired rows.

Pages: `/student/notifications`, `/student/messages`, `/student/announcements`, `/student/notifications/preferences`, `/teacher/notifications`, `/teacher/messages`, `/teacher/announcements`, `/admin/notifications`, `/admin/messages`, `/admin/announcements`, and `/notifications` as a role redirect.

## teacher controls

- Inbox and notification list, with read and archive.
- Message assigned students, or send one confirmed message to a whole assigned group. That group send is not a shared room.
- Announcements to an assigned group or shift, with a publish time and optional acknowledgement.
- Cannot message or announce to an unassigned shift.
- Cannot mark a notice urgent or change organization rules, channels, or templates.

## admin controls

- Organization announcements, including all students and teachers, a shift, a course, or one student.
- Templates: create, preview, save inactive, activate, and keep the previous version.
- Rules, including the disabled AI notice rule.
- Channel switches, student-to-student messages, and read receipts. Each change requires confirmation and is audited.
- Delivery counts: stored, read, provider-accepted, failed, and acknowledged. These are counts, not rankings.
- A manual reminder sweep. There is no separate always-on scheduler.

## security changes

- Every communication and message route checks the server session. The client does not choose another person's id for a read, search, download, or acknowledgement.
- A teacher is limited to assigned groups. A student sees only conversations they belong to.
- Message and announcement text is stored as plain text. HTML tags are removed. Links must be a site path or `http`/`https`.
- Uploads reject executables and files whose contents do not match the extension. Downloads are private and not cached.
- Urgent priority, organization targeting, rules, templates, and channel settings are administrator-only.
- Announcement, message, template, rule, setting, attachment, and acknowledgement changes are audited. Audit rows are not deleted by the test cleanup.
- Provider secrets are not written to the database or returned by the device endpoint.

## tests completed

`scripts/testing/verify-phase12.ts`: 66 passed, 0 failed.

Covered: creation, grouping, preferences, quiet hours, provider abstractions, permissions, attachments, search, scheduling, announcements, acknowledgements, receipts, delivery failure, retry policy, rate limit, duplicates, timezone display, XSS stripping, mobile-width student page, text labels for unread, migration columns, and page loads for notifications, messages, certificates, achievements, exams, and schedule.

`tsc --noEmit` passed after the Phase 12 changes. Phase 11 was not re-run. Its last result remains 57 passed, 0 failed.

Probe messages, announcements, and the temporary class used by the script were removed. Official audit rows were left in place.

## known limitations

- Email, push, and SMS have no vendor connected. Do not treat the hub as an email or SMS system.
- Accounts have no phone-number field, so SMS cannot be addressed.
- Push can store an endpoint, but the app does not register a service worker, so a browser push is not delivered.
- Reminders run when the notification hub, rules page, or administrator sweep is used. They do not run from a separate clock process.
- The simple announcement form sends one target at a time. The API accepts a target list.
- Message search covers messages. Notification category filters are on the notification center, not inside a message body.
- Retention archives old non-critical notices. It does not hard-delete certificate, exam, or admin notices.

## known issues

None found by the Phase 12 script or type check.

The first reminder sweep can add real due notices, such as an exam window that has ended with no submission. Those are stored events, not sample data, and the same key is not sent again.
