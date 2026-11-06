# Leo — بستهٔ طراحی فاز B

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

**ابتدا [DESIGN PROTOTYPE](prototype/LEO_DESIGN_PROTOTYPE_FINAL.html) را باز کن.** این HTML مستقل است؛ app Android یا APK نیست، دادهٔ اصلی را نمی‌خواند و چیزی در app ذخیره نمی‌کند.

## راه سریع بازدید
۱ Welcome و شروع؛ ۲ Home با یک CTA؛ ۳ مسیر و فصل اول؛ ۴ Hello and Goodbye؛ ۵ Vocabulary و Example/Guided؛ ۶ E01 با جواب غلط و درست؛ ۷ summary و progress موقت. برای خطای ثبت، دکمهٔ «خطای ثبت بعدی» را روشن کن. Forced Success در inspector، progress نمی‌سازد.

تب‌های بالای prototype: دو مسیر بصری، ۱۶ حالت Leo، مرجع اجزا و storyboardها. selector طراح همهٔ ۶۷ ID و ۱۴ state را ارائه می‌کند؛ N/A با دلیل روشن است. Teacher/enterprise فقط FUTURE design هستند.

## مدارک الزامی
- [Product decisions](PHASE_B_PRODUCT_DECISIONS.md)
- [Character Bible](PHASE_B_LEO_CHARACTER_BIBLE.md)
- [Design System](PHASE_B_DESIGN_SYSTEM.md)
- [Color/Typography tokens](PHASE_B_COLOR_TYPOGRAPHY_TOKENS.md)
- [Screen map](PHASE_B_SCREEN_MAP.md)
- [Screen/state specifications](PHASE_B_SCREEN_SPECIFICATIONS.md)
- [UX flows](PHASE_B_UX_FLOWS.md)
- [Animation storyboard](PHASE_B_ANIMATION_STORYBOARD.md)
- [Accessibility review](PHASE_B_ACCESSIBILITY_REVIEW.md)
- [Asset manifest](PHASE_B_ASSET_MANIFEST.csv)
- [Design QA](PHASE_B_DESIGN_QA_REPORT.md)
- [Decision log](PHASE_B_DECISION_LOG.md)
- [گزارش فارسی](PHASE_B_FINAL_REPORT_FA.md)

## فایل‌های تصویری و source
`assets/leo/svg` و PNGهای فعال: دارایی‌های design candidate، نه rig تولیدی. `design/LEO_CHARACTER_REFERENCE_v2.png` و `LEO_EXPRESSION_SHEET.png`: مرجع. `mockups/` و `storyboards/`: artboardهای طراحی، نه عکس اجرای app. `assets/fonts/`: font/license/notice. trialهای ردشده و نسخه‌های draft در manifest تحویل فعال نیستند.

## وضعیت پذیرش
**PARTIAL — ورود به C تأیید نشده.** رنگ/glyph/هندسه/logic محدود بررسی شده؛ browser/TalkBack/native/performance و پژوهش کاربر NOT TESTED هستند. refinement نماهای غیرجلو و تایید بصری/محتوایی باز است. هیچ وابستگی نصب و هیچ فایل app/DB/lockfile تغییر نکرده؛ فاز A و گزارش‌های قبلی دست‌نخورده‌اند.
