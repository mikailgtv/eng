# طرح محصول‌سازی Android — نه دستور اجرای این فاز

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

## امروز
APK/AAB در workspace یا archiveهای بررسی‌شده یافت نشد. EAS linking و Expo Doctor 17/17 در Windows گزارش شده‌اند؛ build log، artifact و device run ارائه نشده است. native lockfile اصلاح‌شدهٔ Windows در این محیط موجود نیست.

Sandbox: Node20.20.2، حدود1983MiB RAM، Java11؛ Gradle، Android SDK manager، adb و emulator یافت نشدند. build در A نه اجرا شده و نه موفق ادعا می‌شود. نسخهٔ JDK/SDK آینده باید با baseline انتخاب‌شده هم‌خوان باشد، نه صرفاً «Java نصب است».

## gate پیش از ساخت واقعی M
۱ reconciliation سورس/config/lock واقعی؛ ۲ runtime سازگار و dependency review؛ ۳ persistence/renderer/exercise/audio واقعی؛ ۴ assets و حقوق/manifest؛ ۵ identity/signing با مالکیت روشن؛ ۶ پشتیبان معتبر؛ ۷ محیط build مناسب و اجازهٔ هزینه/سرویس در صورت cloud.

APK برای نصب مستقیم با AAB فرق دارد. profile `android.buildType: apk` در config موجود است، اما config مدرک artifact نیست. پس از ساخت واقعی، نام/version/hash/تاریخ/محیط/log و signed status ثبت شود؛ keystore و رمز هرگز در chat/docs/repo قرار نگیرند.

## آزمون پذیرش
نصب تازه، cold start حالت هواپیما، تمام فایل‌های core، ثبت و restart/reboot، permission deny/allow، ضبط و replay واقعی، low-storage/import/restore، upgrade با دادهٔ قبلی، portrait/tablet/RTL/font scaling/reduced motion. debug با Metro جای release offline را نمی‌گیرد.

منبع رسمی: [Expo APK](https://docs.expo.dev/build-reference/apk/). هیچ build command برای اجرا در Phase A صادر نشده است.
