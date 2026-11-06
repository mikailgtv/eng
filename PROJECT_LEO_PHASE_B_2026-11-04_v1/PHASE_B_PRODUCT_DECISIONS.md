# تصمیم‌های محصول فاز B

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

## نتیجهٔ مطالعهٔ ورودی
ZIP فاز A در مسیر جدا استخراج، CRC و hash manifest بررسی شد. هر ۱۷ سند خواسته‌شده کامل خوانده شد و ارجاع تفصیلی design system نیز بررسی شد. اصل فایل‌ها و اسناد A حفظ شدند. تعارض‌های اولیه در [INITIAL_CONFLICT_LOG](design/INITIAL_CONFLICT_LOG.md) ثبت شدند.

## تعریف محصول
Leo همراه آموزشی انگلیسی برای مبتدی فارسی‌زبان و بزرگسال است. تجربهٔ محلی فردی مقدم بر پیچیدگی سازمانی است. firefighter-inspired هویت بصری به معنی آموزش عملیات اضطراری یا تأیید PPE نیست. Next.js LMS و prototype Native مستقل باقی ماندند.

## دو جهت بصری
[مقایسهٔ تصویری](design/VISUAL_DIRECTION_STUDY.png)

| معیار | A: دفتر یادگیری | B: آزمایشگاه زبان | شواهد/نوع داوری |
|---|---|---|---|
| خوانایی | متن تیره روی کاغذ روشن، primary سبز عمیق | متن تیره/indigo روی سطح سرد | ۱۶ جفت رنگ هر مسیر واقعاً محاسبه شد؛ هر دو از آستانه گذشتند |
| تمایز برند | evergreen/copper و شخصیت 2D اصیل، بدون lime/دارایی رقبا | indigo/cyan فنی‌تر؛ هویت UI همچنان مستقل | داوری طراحی، نه trademark clearance |
| بزرگسال/مبتدی | آرام، گرم، یک CTA در Home و hierarchy واضح | رسمی‌تر و نزدیک‌تر به ابزار فنی | hypothesis؛ usability واقعی هنوز NOT TESTED |
| هزینهٔ اجرا | tokens ساده، بدون effect سنگین | از نظر CSS/رسانه مشابه | ادعای کاهش هزینهٔ عددی یا benchmark نداریم |

**A برای prototype انتخاب شد**؛ B برای مطالعه حفظ و در تب مقایسه قابل دیدن است. انتخاب قبلی cream/navy/amber/red بدون بررسی تکرار نشد. نه شخصیت، نه layout اختصاصی و نه asset متعلق به Duolingo/Babbel/Busuu کپی نشده است.

| ID | وضعیت | تصمیم | دلیل و مرز |
|---|---|---|---|
| BD-01 | ACCEPTED_SCOPE | اجازهٔ جدید B فقط طراحی را فعال می‌کند | ADR-A01 توقف A با دستور فعلی فقط برای B توسعه یافته؛ هیچ merge/rewrite/dependency/migration/build مجاز نیست. |
| BD-02 | SELECTED_FOR_DESIGN | مبتدی فارسی‌زبانِ بزرگسال، Android-first | محتوا/اقدام اصلی اول؛ پنل مدرس/سازمان از ناوبری اصلی مبتدی جدا. هیچ پژوهش انجام‌شده با کاربر ادعا نشده. |
| BD-03 | SELECTED_FOR_B_PROTOTYPE | مسیر A: Field Notes / دفتر یادگیری | هر دو مسیر contrast کافی دارند؛ A با لئوی evergreen/copper هماهنگ‌تر و برای مطالعهٔ آرام ترجیح طراحی است. این انتخاب نظر مستدل طراح است، نه رأی آزمایش‌شدهٔ مخاطب. |
| BD-04 | DESIGN_CANONICAL; OWNER_REVIEW_OPEN | لئوی 2D برداری، چشم قهوه‌ای و لباس ثابت | ADR-A09 پیشنهادی به canonical design این تحویل محدود شد؛ source برنامه/تصاویر قدیمی عوض نشدند. سه‌رخ/نیم‌رخ/پشت طرح ساختاری و نیازمند بازبینی هنری‌اند. |
| BD-05 | DESIGN_SELECTED | Vazirmatn فارسی + Leo Reading Sans برای English/IPA | اسکن glyph کمبود IPA در فونت فارسی را نشان داد. subset دوم با theta اصلاح و فایل جدید ساخته شد؛ هر دو خانواده OFL و بدون نصب system dependency هستند. |
| BD-06 | ACCEPTED_HONESTY | event موقت prototype جدا از دادهٔ واقعی | عدد محتوا از source؛ progress/attempt نمونه فقط از تعامل حافظهٔ همین HTML. XP/streak/ظرفیت/دادهٔ سازمانی unknown و —؛ native persistence ادعا نمی‌شود. |
| BD-07 | DESIGN_CONTRACT_DEFINED | آموزش → guided بدون نمره → independent نمونه | الگوی ۱۴ مرحلهٔ A و ۱۲ مرحلهٔ B برحسب موضوع ادغام می‌شود؛ grammar/audio نامرتبط اجباری نیست. هدف مستقل انتخاب سلام صبح است؛ دیدن توضیح، اثبات توانایی توضیح‌دادن محسوب نمی‌شود. |
| BD-08 | DRAFT_CONTENT | نمونهٔ واقعی حفظ؛ copy و تبدیل exercise جدا | ۲۵ درس/۱۰۰ واژه/۲۵ سؤال/۶ گرامر/۸ صوت عین منبع؛ توضیح فارسی تازه، گزینه‌های MC و اصلاح good afternoon پیشنهادی و review-unverified هستند. |
| BD-09 | BLOCKED_FOR_RELEASE | E05 listening و E08 speaking محدودیت صریح دارند | E05 تا audio/transcript/objective review آماده نیست؛ E08 automatic correct/incorrect و phonetic score ندارد. خودارزیابی score=null است. |
| BD-10 | PROPOSED_FOR_C_D; NOT_INSTALLED | Reanimated برای UI، rig شخصیت بعد از spike | HTML/CSS فقط نمایش طراحی B است. Rive گزینهٔ stateful character، Lottie گزینهٔ timeline کوتاه، SVG/PNG منبع و fallback. runtime/SDK/license دقیق پیش از C/D بررسی شود. |
| BD-11 | PARTIAL_VALIDATION | اندازه‌گیری واقعی محدود، نه PASS کلی | contrast، glyph، alpha، هندسهٔ artboard و simulated-DOM اجرا شد؛ browser/TalkBack/native/performance و user research انجام نشده‌اند. |
| BD-12 | OPEN | English interface کامل نشده | رابط اصلی فارسی است؛ گزینهٔ English بررسی جهت و titleهاست. English learning content/IPA LTR مستقل است، نه ادعای localization کامل UI. |
| BD-13 | OPEN; C_NOT_AUTHORIZED | گیت ورود C پذیرفته نشده | تکمیل/تأیید turnaround، بازبینی بصری مالک، مرورگر/assistive technology، copy review و C0ِ منبع Windows/SDK/security هنوز بازند. |

## پژوهش و ابهام‌ها
این فاز requirements-driven design و heuristic review است، نه پژوهش با شرکت‌کننده. personaها فرضِ مخاطب‌اند، نه افراد واقعیِ مصاحبه‌شده. مناسب‌بودن برای بزرگسال/مبتدی نیاز به مشاهدهٔ سفر واقعی توسط مخاطب و بازبینی copy دارد؛ هیچ آمار رضایت، موفقیت یا مدت یادگیری ساخته نشده است.
