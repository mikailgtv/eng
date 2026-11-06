# PHASE 16 STATUS

Same web app, same URLs, same backend and database. No Electron, Tauri, Windows installer, APK, native app, or second mobile codebase. A phone uses the existing pages. From `lg` up, the desktop sidebar is unchanged.

## Mobile Responsive

Breakpoints stay the existing Tailwind steps: default under 640px, `sm` 640, `md` 768, `lg` 1024, and the content column caps at 1152px so 1440px does not stretch into an empty rail. The viewport meta is `width=device-width` with `viewport-fit=cover`. Page overflow is clipped. Safe-area padding is applied to the body and the bottom bar. Primary controls use at least a 44px target. Forms stay one column on a phone. Dialogs open as a bottom sheet under `sm` and centered from `sm` up. The bottom bar hides while a text field is focused so the keyboard does not cover Send.

## Student Mobile

Login through certificate uses the same student account. Home shows shortcuts for continue lesson, review, AI, speaking, listening, assignments, exams, and certificates. The bottom bar is Home, Learn, Practice, AI, and More. More opens the full existing menu, including messages, notifications, plan, achievements, profile, and security. Vocabulary is one card at a time with previous, next, and swipe. Grammar stays stacked. Nothing from the desktop path was removed.

## Teacher Mobile

Home shortcuts cover classes, attendance, students, content, assignments, exams, messages, and reports. Attendance status controls are 44px. Student lists and result lists are cards under `md` and tables from `md` up. The teacher still only sees assigned groups. The desktop sidebar returns at `lg`.

## Admin Mobile

Home shortcuts cover users, organization, groups, content, reports, certificates, security, and roles. Users, roles, certificates, and curriculum lessons use cards on a phone and the existing tables from `md` up. Wide tables are not the only phone view. Authorization is unchanged.

## AI Mobile

The tutor is the same Phase 7 chat. The composer stays above the bottom bar, uses a 16px input so iOS does not zoom, and has Send. The Voice button does not invent a transcript. It says voice recognition is unavailable and the student types instead. No extra user data is added to the AI payload.

## Speaking

The microphone is optional. Permission, denied, and unsupported states stay visible. Type instead opens a sentence box and does not create a pronunciation score. Practice can still be marked without a recording. No right or wrong claim was added.

## Listening

Play, pause, replay, and slow are on the listening lab. Slow uses rate 0.75 at the moment of playback. Transcript and translation stay behind explicit buttons. If speech output is missing, the transcript is shown and the page says audio is unavailable. Playback is cancelled when the page unmounts. The lesson audio player also has slow, does not autoplay, and pauses on unmount. No fake audio file was added.

## Exams

The exam runner keeps the server timer and question navigator. Question buttons are 44px. Word-order answers stay tappable. Answers still save to the server. Leaving an unfinished attempt raises the browser `beforeunload` warning. A failed save still shows retry. Official scores are not changed by the phone layout.

## Reports

Report pages load for teacher and admin. Charts and tables sit in the page column. Result and certificate lists use cards on a phone. No ranking, best, or worst label was added.

## Content Builder

The builder remains one editor. On a phone the block list, editor, and actions stack. Move buttons work without drag. The same draft, preview, and publish rules apply. A failed save still warns before unload. No second builder was created.

## Performance

No new dependency and no second client bundle. The added client code is the bottom bar, offline banner, vocabulary deck, and a service worker registration. The service worker caches only the offline fallback page. Navigations still go to the network first. Images and video are constrained to the viewport. Vocabulary audio uses `preload="none"`.

## Browsers Tested

No Chrome, Chromium, or Firefox binary is installed here, so 320×568 through 1440×900 was not measured with screenshots. Checks that did run:

- TypeScript `tsc --noEmit` passed.
- `verify-phase16.ts`: manifest, offline page, viewport meta, and 41 student, teacher, and admin routes returned 200 with the mobile navigation marker. Requests used an Android Chrome user agent.
- `verify-phase5.ts`: 43 passed.
- `verify-phase14.ts`: 42 passed.
- `verify-phase15.ts`: all checks passed.

## Known Issues

- Pixel overflow at 320, 375, 768, 1024, and 1440 was not proven in a real browser.
- Tutor voice and speech-to-text stay unavailable unless the existing transcribe route is configured. The UI does not fake a transcript.
- Listening without a stored audio file uses the device speech engine. That engine is not a substitute for a real recording.
- Add to Home Screen is a browser PWA shell. It is not an offline course player and not a native app.
- The bottom bar is hidden while an input is focused. After blur it returns.
- Exam leave protection is the browser warning. The saved attempt is still the server record.

## Completion

88%. The phone layout, navigation, role paths, practice controls, and route checks are in place on the existing app. The missing part is a real-browser pass at each requested viewport.
