# جریان‌های UX و تجربهٔ آموزشی

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

## سفر اصلی قابل مشاهده
| گام | صفحه | عمل و بازخورد | مرز صداقت |
|---|---|---|---|
|۱|A02–A08|آشنایی، زبان/alias/هدف/دسترس‌پذیری اختیاری؛ skip وجود دارد|حساب اینترنتی ایجاد نمی‌شود؛ alias در حافظه است |
|۲|B01|یک CTA روشن برای مسیر؛ دادهٔ تازه بدون XP/streak جعلی|progress از events همین فایل یا — |
|۳|C01|شش فصل واقعی source|prerequisite حدسی ساخته نمی‌شود |
|۴|C02|انتخاب Hello and Goodbye از فصل اول|عنوان/زمان واقعی metadata؛ curriculum legacy review-unverified |
|۵|D01|هدف روشن: انتخاب سلام مخصوص صبح|هدف جدیدِ تبدیل‌شده به طراحی، approved معلم نیست |
|۶|D02|واژه، معنی، IPA و جملهٔ واقعی|صوت برای هر واژه جعلی attach نشده |
|۷|D04|مثال + guided selection با راهنمای morning|بدون attempt/score/completion |
|۸|E01|تمرین مستقل؛ Good night بازخورد دلیل‌دار، Good morning پاسخ مناسب|اعتبارسنجی فقط نمونهٔ موقت HTML، نه موتور اپ |
|۹|D07|جمع‌بندی پس از موفقیت ثبت شبیه‌سازی‌شدهٔ همان سفر|forced Success در inspector lesson را complete نمی‌کند |
|۱۰|F03/F04|progress و history از رویدادهای همین نمونه|با refresh پاک می‌شود؛ دادهٔ واقعی اپ خوانده نشده |

## تدریس تطبیقی، نه قالب خشک
مراحل ۱۴گانهٔ A و ۱۲گانهٔ B به صورت objective/context → vocabulary/visual/examples → guidance → independent practice → explanation → summary/review طراحی شده‌اند. گرامر در درس Hello and Goodbye فیلد مستقل ندارد؛ نمونهٔ واقعی My Name Is با label منبع در D03 قابل مشاهده است. audio برای نمونه موجود است ولی alignment نیاز به QA دارد؛ سکوت یا نبود فایل با ادعای «پخش شد» پر نمی‌شود.

## خطای ثبت با پاسخ درست فرق دارد
در inspector «خطای ثبت بعدی» را فعال کن، در E01 پاسخ مناسب را انتخاب و بررسی کن. نتیجهٔ آموزشی معلوم می‌شود، اما attempt/progress در حافظهٔ نمونه هم تا retry اضافه نمی‌شود. انتخاب حفظ و retry ارائه می‌شود. در محصول واقعی این مرز باید transaction/operation ID معتبر داشته باشد؛ آن زیرساخت در B ساخته نشده.

## مراجعات و حالت‌های دیگر
- F01 بدون schedule واقعی، due count نمی‌سازد. F02 فقط خطاهای همین جلسه را نشان می‌دهد؛ تمرین دوباره تاریخچهٔ قبلی را حذف نمی‌کند.
- G03/G04 میکروفون درخواست نمی‌کنند. timer فقط مدت simulation است؛ G05 recording ندارد و فایل آموزشی را به‌جای صدای کاربر معرفی نمی‌کند.
- H07–H10 فایل/backup/restore واقعی اجرا نمی‌کنند. در محصول preflight/validation/staging/atomic activation لازم است؛ low-storage پیشرفت را پاک نمی‌کند.
- I01–I06 آیندهٔ سازمانی‌اند؛ بدون اتصال، table با — یا Empty، نه نام و نمره و permission فرضی.
- interruption در محصول باید draft/checkpoint را حفظ کند؛ prototype storage ندارد و برخی draftها هنگام خروج از نمای exercise reset می‌شوند. این محدودیت نمونه است، نه قرارداد مطلوب C.

## walkthrough دستی که هنوز انجام نشده
با مرورگر واقعی در 390px و tablet، یک بار پاسخ غلط، یک بار درست، یک بار save-failed، keyboard-only، reduced OS و large text را بررسی کنید. TalkBack، focus پس از navigation، nested scroll و audio events جدا ثبت شوند. دستورهای تست app یا ساخت APK در این سند اجرا نشده‌اند.
