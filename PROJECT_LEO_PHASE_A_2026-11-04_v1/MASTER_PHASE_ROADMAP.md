# MASTER PHASE ROADMAP
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

## حکم اجرا
این تحویل در **A متوقف می‌شود**. نام فازهای A–O از شماره‌های تاریخی Phase 1–67 مستقل است. وجود گزارش تاریخی برای هیچ فاز جدید، پذیرش یا اجرای خودکار ایجاد نمی‌کند.

| فاز | هدف | پیش‌نیاز | دروازهٔ خروج | وضعیت |
|---|---|---|---|---|
| A | کشف، حفاظت و معماری | همین بسته و شواهد read-only | موجودی، صداقت وضعیت، baseline و اسناد قابل بازبینی | انجام‌شده در محدودهٔ مستندات؛ بدون پیاده‌سازی |
| B | جهت محصول و بصری | تأیید اسناد A و تصمیم‌های باز | مرجع واحد لئو، طرح صفحه‌به‌صفحه، tokens پیشنهادی، تأیید هویت مستقل | شروع نشده |
| C | بنیاد طراحی و پوسته | B + C0 تطبیق سورس Windows/SDK/runtime + L1 پایه | کامپوننت واقعی، RTL/LTR، تنظیمات پایدار، ناوبری، accessibility | شروع نشده |
| D | شخصیت و حرکت | B/C و ابزار انیمیشن تأییدشده | حالت‌های واقعی، سه tier حرکت و بودجهٔ قابل‌اندازه‌گیری | شروع نشده |
| E | موتور آموزش | C + L1 + قرارداد محتوا | نمایش همهٔ بلوک‌ها، اهداف و گرامر؛ بدون JSON خام و بدون محدودیت خودسرانه | شروع نشده |
| F | تمرین و سنجش | E + L1 و قرارداد grading | هر نوع فقط با تعامل/validation/feedback/score/persistence/error/a11y منتشر شود | شروع نشده |
| G | صوت و گفتار | C/E + L1 + آداپتر صوت سازگار | پخش فایل بسته‌بندی، ضبط واقعی، permission/consent/replay/delete؛ آزمون دستگاه | شروع نشده |
| H | اصلاح و گسترش محتوا | E/F/G، قرارداد بسته و QA | بچ نخست اصلاح محتوای ۲۵درس؛ ادامهٔ سطح‌ها با مرور مستقل، نه وعدهٔ تعداد ثابت | شروع نشده |
| I | انگیزش واقعی | F + رویدادهای پایدار M08 | XP، مرور، هدف و نشان از داده؛ تست تکرار event و زمان/منطقه زمانی | شروع نشده |
| J | انگلیسی حرفه‌ای | H + F/G + دسترسی به SME | سناریوهای محل کار/آتش‌نشانی با مرور فنی؛ نه راهنمای عملیات اضطراری | شروع نشده |
| K | مدرس و سازمان | هستهٔ Android پایدار + قرارداد role/tenant | web workspace بازاستفاده‌شده با تست scope؛ اجزای server و local جدا | شروع نشده |
| L | پایداری آفلاین و backup | L1 زودهنگام پیش از E/F/G؛ L2 پس از بلوغ جریان‌ها | restore، migration، low-storage، kill/reboot و import مخرب با دادهٔ دورریختنی | شروع نشده |
| M | محصول‌سازی Android | دروازه‌های آموزش/داده/صوت/امنیت/حقوق | APK واقعی + hash/build log + نصب واقعی + سفر آفلاین + known limitations | شروع نشده |
| N | محصول‌سازی Windows | پذیرش Android و ADR جدا | انتخاب RN Windows/Tauri/Electron با آزمایش adapter و installer واقعی | شروع نشده |
| O | انتشار و نگهداری | release gate برای هر پلتفرم | آرشیو artifact، changelog، update/rollback، پشتیبانی و cadence QA | شروع نشده |


## ترتیب وابستگی که نباید پنهان بماند
فهرست کاربر L را نزدیک productization آورده، اما E/F/G بدون persistence امن قابل پذیرش نیستند. بنابراین **L1 (حداقل زیرساخت داده/نسخه/backup)** باید پیش از ذخیرهٔ واقعی پاسخ و پیشرفت در C/E/F آماده شود؛ **L2** آزمون سخت بازیابی، low-storage و upgrade را پیش از M تکمیل می‌کند. نام فاز حفظ شده و اجرای L در این تحویل شروع نشده است.

C0 یک gate داخل C است: همسان‌سازی نسخهٔ Windows با workspace، انتخاب runtime/SDK، review dependencies و حفظ original. `npm audit fix --force`، تغییر engines برای عبور از gate، حذف lockfile یا reset DB راه‌حل قابل قبول نیست.

## گام بعد دقیق: B، نه بازنویسی
ورودی: این ۹ سند، feature/issue/asset registers، محتوای موجود و قیود دستگاه. خروجی لازم B:
- تصویب positioning بزرگسال/مبتدی و use caseهای اول Android؛
- انتخاب یک هویت واحد لئو و character bible، بدون asset دارای حقوق نامعلوم؛
- طرح اطلاعات و screen-by-screen با محتوای واقعی و stateهای empty/loading/success/error؛
- design tokens، Persian/English typography، RTL/LTR، accessibility و reduced motion؛
- تصمیم دربارهٔ ابزار تصویرسازی/animation و بودجهٔ asset، بدون انتخاب شتاب‌زدهٔ 3D؛
- بستهٔ طراحی با برچسب design، نه نسخهٔ اجرایی محصول.

پیاده‌سازی بعدی C تنها پس از پذیرش B و بسته‌شدن gateهای C0/L1 مجاز است. Android کارآمد قبل از Windows؛ استاد/سازمان در وب حفظ شود تا بازاستفاده مرحله‌ای ممکن بماند.

## معیار Definition of Done برای هر feature
UI واقعی + منطق واقعی + داده/مدل لازم + persistence لازم + خطا/empty/loading + accessibility + مستندات + شواهد روش/نسخه/محیط. اگر یکی از شروط لازم غایب باشد، PARTIAL/PLANNED/NOT_TESTED ثبت شود. دکمهٔ Alert-only، score ثابت، mock provider و screenshot، اجرای feature محسوب نمی‌شوند.

## بستهٔ تحویل هر فاز
نسخهٔ source/candidate جدا، change log، ADRهای تغییرکرده، migrations بدون تخریب، manifest محتوا/دارایی و حقوق، tests دقیق با تفکیک real/simulated/mock، یافته‌ها با CRITICAL/HIGH/MEDIUM/LOW/INFO، known limitations، و artifact تنها اگر واقعاً ساخته شده باشد. تمام فایل‌های docs مرتبط در همان فاز به‌روزرسانی نسخه‌دار شوند؛ گزارش قدیمی بازنویسی نشود.

## دروازهٔ بصری و دستگاه
Phone portrait و tablet مرتبط؛ RTL و English، font scaling، focus/screen reader، حالت‌های اصلی، consistency شخصیت، کیفیت motion و reduced/low tier. چشمگیر بودن یک تصویر یا HTML، مدرک این gate نیست.

## روش کار با منابع محدود
Windows کاربر: i5 نسل ۱۳، RTX3060/6GB، RAM8GB و SSD512GB؛ این مشخصات گزارش کاربر است و benchmark نیست. یک build/emulator در زمان مناسب، assets مشتق فشرده، streaming/chunked imports و lazy loading. GPU مجوز 3D سنگین یا حافظهٔ بی‌نهایت نیست. Sandbox حدود 1983MiB RAM و ابزار Android ناقص دارد؛ اجرای build سنگین در Phase A موضوعیت ندارد.

## وقفه و پذیرش
بعد از هر فاز، ابتدا شواهد و gapها بررسی شوند. هزینه/زمان بدون تخمین بر مبنای spike و ظرفیت تیم تضمین نمی‌شود. تولید همهٔ سطوح، ۲۳ نوع تمرین، ۱۶ حالت شخصیت و enterprise در یک پاس ممنوع. فازهای B تا O در این بسته **شروع نشده‌اند**.
