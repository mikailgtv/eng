# Design QA Report

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

## Verdict: PARTIAL
خروجی طراحی و prototype تحویل شده، اما **PASS کلی و مجوز ورود C صادر نمی‌شود**. محدودیت ابزار بهانهٔ تبدیل NOT TESTED به PASS نیست.

## آنچه واقعاً اجرا شد
- استخراج امن ZIP A و بررسی CRC/hashهای manifest؛ مطالعهٔ اسناد مقرر.
- contrast ریاضی ۳۲ pair، font glyph coverage و equality در TTF/WOFF.
- export SVG/PNG، alpha واقعی و بازبینی بصری نمونه‌ها/شیت‌ها؛ خطاهای export ثبت و نسخهٔ جدید تولید شد.
- ۶۷ artboard phone، ۴۰ نمونهٔ state/feedback، ۳ tablet composition و reference/motion sheets. این‌ها **artboard** هستند، نه screenshot از مرورگر یا اپ.
- اندازه‌گیری target/text در مختصات logical artboard، نه device dp/sp.
- اجرای render paths و ۹۳۸ state mapping در VM با DOM شبیه‌سازی‌شده؛ Golden journey logic، جواب غلط/درست، save failure، retry، عدم duplicate completion و عدم اثر forced Success بر progress.
- static markup/resource/API inspection؛ نه browser accessibility یا security audit جامع.

| ID | شدت | وضعیت | یافته | رسیدگی/محدودیت |
|---|---|---|---|---|
| B-Q01 | MEDIUM | RESOLVED IN NEW ASSET | Vazirmatn برای IPA کافی نبود؛ subset اول theta را نداشت | Font مکمل OFL و subset v2 با بررسی cmap؛ v1 به عنوان rejected trial نگهداری/آرشیو می‌شود. |
| B-Q02 | HIGH | REJECTED / CORRECTED EXPORT | ImageMagick SVG export بعضی stroke/transformها را حذف کرد | PNGهای اولیه رد شدند؛ authoring renderer موجود بدون dependency جدید به raster-v3 رسید. |
| B-Q03 | MEDIUM | CORRECTED EXPORT | در raster-v2 درزهای stroke ضخیم دیده شد | Union قلم و شکل‌های گرد در v3؛ SVG source اصلی دست‌نخورده ماند. |
| B-Q04 | MEDIUM | CORRECTED DESIGN | Home دو CTA تکراری و برخی icon-only buttonها name نداشتند | یک primary در Home؛ aria-label متناسب با target اضافه شد؛ markup test محدود انجام شد. |
| B-Q05 | HIGH | CORRECTED DESIGN SIMULATION | Loading/Missing/Empty می‌توانست با available content متناقض دیده شود | Composition state اصلاح شد؛ write gate و loading/denied/missing primary guard اضافه شد. تست simulated-DOM، نه native. |
| B-Q06 | MEDIUM | CORRECTED ARTBOARD | CTA در نمونهٔ Save Failed به بررسی پاسخ اشاره می‌کرد | artboardهای جدید retry ثبت را نشان می‌دهند؛ prototype retry نیز primary شد. |
| B-Q07 | MEDIUM | CORRECTED SHEET LAYOUT | چهار نمای sheet اولیه از cell بیرون می‌رفتند | Reference v2 با aspect-preserving fit و label construction draft؛ تصاویر منفرد crop نشده بودند. |
| B-Q08 | MEDIUM | OPEN ART REVIEW | دقت سه‌رخ/نیم‌رخ/پشت و پشت دست/لباس نیازمند refinement است | Human character review و تایید مالک قبل از پذیرش canonical production؛ این نماها final rig نیستند. |
| B-Q09 | HIGH | NOT TESTED / GATE BLOCKER | مرورگر، focus واقعی، TalkBack و native typography اجرا نشده | هیچ browser/dependency برای دورزدن قید نصب نشد؛ gate C پذیرفته نشده است. |
| B-Q10 | MEDIUM | OPEN CONTENT REVIEW | تبدیل exercise، توضیح فارسی و audio/transcript alignment review نشده | DRAFT؛ E05 release-blocked و E08 بدون automatic pronunciation scoring. |
| B-Q11 | MEDIUM | PARTIAL LOCALIZATION | English interface کامل نیست | عنوان/جهت نمونه، نه localization کامل؛ primary فارسی است. |
| B-Q12 | HIGH | C0 OPEN, OUT OF B SCOPE | کپی واقعی Windows/lock و ریسک‌های audit/SDK قدیمی بازند | هیچ remediation یا app rewrite در B انجام نشد؛ severityهای A حفظ می‌شوند. |

## بازبینی بصری انجام‌شده
Reference چهار نما، expression sheet، دو مسیر بصری، Home phone، Vocabulary phone/tablet، Save Failed و guided-example artboard مشاهده شدند. typography فارسی در خروجی RAQM خوانا و English/IPA مستقل است. این review نماینده است؛ بررسی چشمی تک‌تک ۱۲۷ artboard یا رفتار واقعی همهٔ viewportها ادعا نمی‌شود.

## موارد NOT TESTED
Browser render/navigation/keyboard/focus، native screen reader/TalkBack، microphone و audio audible playback، Android portrait/tablet واقعی، FPS/GPU/RAM/PSS، permission/filesystem/DB، restart/reboot، source app build و artifact installer. مناسب‌بودن برای بزرگسال/مبتدی hypothesis طراحی است تا user study واقعی انجام شود.

## acceptance items
هویت فعال در UI از یک family می‌آید؛ غیرجلو construction draft است. همهٔ گروه‌های صفحه و state contract پوشش دارند؛ این پوشش برابر تایید رفتار نیست. tokens، provenance و reduced/low fallback مستند/اندازه‌گیری محدود دارند. عکس/HTML/جدول به feature operational ارتقا داده نشده است. موارد باز، مانع PASS کلی باقی می‌مانند.
