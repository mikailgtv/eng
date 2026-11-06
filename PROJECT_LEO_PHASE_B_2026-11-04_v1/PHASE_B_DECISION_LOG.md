# Decision Log فاز B

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

| ID | Status | Decision | Rationale / scope |
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

## حفظ تصمیم‌های باز فاز A
ADR-A03 runtime/SDK، A14 Windows، A15 فایل‌های فعلی Windows، A16 امنیت، A17 permission/sync و بخش‌های حقوق/مقررات/دستگاه A18/A20 همچنان باز یا deferred هستند. انتخاب palette و font طراحی به معنی حل آن‌ها نیست.

## تعارض‌های ثبت‌شده
[INITIAL_CONFLICT_LOG](design/INITIAL_CONFLICT_LOG.md) شامل تفکیک asset ثابت B از rig D، metric حافظه‌ای از دادهٔ واقعی، نگاشت نامعلوم audio/unit، محدودیت ابزار و تفکیک correct از save-success است.

## تاییدهای لازم
۱ انتخاب بصری/شخصیت توسط مالک؛ ۲ artist refinement و تایید turnaround؛ ۳ user walkthrough بزرگسال مبتدی؛ ۴ browser/assistive validation؛ ۵ content-copy/audio QA؛ ۶ source/runtime/security C0 و data foundation L1 در مجوز جدا. هیچ نام reviewer، approval یا credential فرضی ساخته نشده است.

هیچ یک از C تا O آغاز نشده و هیچ file اصلی/گزارش تاریخی overwrite نشده است. sourceهای draft همین طراحی نسخه‌دارند و trialهای ردشده در بستهٔ تحویل فعال جایگزین فایل معتبر نمی‌شوند.
