# Design System فاز B

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

مرجع tokens: [tokens-v2.json](design/tokens-v2.json)؛ مرجع اجزا: [Component Sheet](design/COMPONENT_REFERENCE_SHEET.png). این‌ها قرارداد طراحی‌اند، نه component library Native.

## زبان بصری و سلسله‌مراتب
مسیر منتخب Field Notes: کاغذ روشن، متن تیره، evergreen برای اقدام، copper/ochre برای accent محدود. یک focus card در Home و یک اقدام اصلی؛ هدف و progress بخش‌های ساده‌اند، نه کارت‌های تکراری. illustration در خدمت زمینه/feedback، نه پوشاندن متن یا فشار احساسی. teacher/enterprise در catalog طراحی جداست.

| بخش | قرارداد |
|---|---|
| Color | همهٔ semantic pairs از tokens؛ raw contrast و نقش هر جفت ثبت شده. رنگ تزیینی مجوز متن کم‌کنتراست نیست. |
| Typography | Vazirmatn برای فارسی، Leo Reading Sans برای English/IPA؛ body16، caption14، heading28، word36 و line-height مشخص. |
| Spacing/grid | 4/8/12/16/24/32/40/48/64؛ phone margin24 (در عرض کوچک16–20)، tablet reflow دوپنلی؛ spacing از هدف صفحه می‌آید. |
| Radius/elevation | control12، surface18، hero26؛ یک shadow سبک برای قاب prototype. shadow مفهوم permission/selection را منتقل نمی‌کند. |
| Iconography | ۳۲ shape خطی اصیل، viewBox24، stroke2؛ آیکون کوچک داخل target حداقل48، نه خودِ 24px به‌عنوان hit area. |
| Button | primary/secondary/text/icon؛ حداقل48 منطقی، loading و disabled با دلیل؛ دکمه فقط با نتیجهٔ معتبر success می‌دهد. |
| Card | focus lesson، vocabulary و message؛ rowهای تنظیمات/history با divider به جای card بی‌هدف. |
| Input | label پایدار، placeholder کمکی، error مرتبط و حفظ مقدار؛ نام مستعار اختیاری، بدون password/credential واقعی در prototype. |
| Selection | border + متن/icon، نه رنگ تنها؛ radio keyboard/tap و matching بدون drag اجباری. |
| Progress | numerator/denominator و provenance؛ unknown با —، هرگز fake percentage. وضعیت pending از committed جدا. |
| Navigation | Home/Path/Review/Settings؛ مسیرهای آینده خارج از bottom nav. back و active state روشن، focus پس از transition نیاز به browser verification دارد. |
| Dialog | نام/دامنهٔ عمل، لغو واضح، focus trap/return در نمونه؛ آزمون واقعی keyboard و screen reader انجام نشده. |
| Toast/feedback | inline و role=status در prototype؛ اطلاعات حیاتی فقط toast گذرا نیست. Correct و Save success دو state مستقل‌اند. |
| Empty | علت نداشتن داده و راه شروع؛ آمار یا کاربر فرضی برای پرکردن صفحه نداریم. |
| Loading | skeleton ثابت و متن، بدون درصد جعلی؛ shimmer اجباری نیست. |
| Error/recovery | علت قابل‌فهم، نگه‌داشتن انتخاب، retry امن و مسیر جایگزین؛ در prototype simulation برچسب‌دار است. |
| Disabled | کنترل غیرفعال با توضیح readable؛ متن مهم با opacity کم پنهان نمی‌شود. |

## RTL/LTR
رابط اصلی فارسی RTL، مثال/IPA/کد با `dir=ltr` و language context جدا. nav جهت‌دار semantic است؛ waveform، timeline صوت و glyphهای فنی کورکورانه mirror نمی‌شوند. تصویر Leo هم به خاطر RTL flip نمی‌شود. English interface کامل هنوز تحویل نشده؛ mode انگلیسی prototype بررسی عنوان/جهت است و توضیح فارسی جدا می‌ماند.

## Responsive و accessibility
Phone اولویت؛ breakpointهای طراحی phone<600، tablet600–1023 و desktop≥1024. سه tablet artboard مستقل موجود است، اما breakpoint CSS در مرورگر اجرا نشده. target48dp در محصول، معادل‌سازی با 48 logical px در طرح فقط فرض طراحی است؛ native measurement هنوز لازم است.

برای large text، صفحه scroll می‌شود و bottom nav در نمونه می‌تواند دو ردیفی شود؛ متن کوچک نمی‌شود تا به زور جا بگیرد. reflow واقعی در 150/200٪، TalkBack و حالت device low-performance هنوز NOT TESTED هستند؛ حداقل‌های source به تنهایی PASS نیستند.
