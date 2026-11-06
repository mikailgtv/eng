# PROJECT DECISION LOG
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

## قرارداد ثبت تصمیم
ACCEPTED در این سند برای scope/policy مجاز فاز A است، نه نشانهٔ پیاده‌شدن. PROPOSED نیازمند پذیرش/آزمایش بعدی است؛ OPEN/DEFERRED نباید در کد به‌صورت تصمیم پنهان اعمال شود. هر تغییر بعدی با تصمیم تازه، rationale، گزینه‌های ردشده، اثر داده و شواهد ثبت شود.

| ID | وضعیت | تصمیم | دلیل/پیامد |
|---|---|---|---|
| ADR-A01 | ACCEPTED_SCOPE | فقط A و خروجی مستندات | عدم تغییر source/dependency/schema/data؛ next phase نیازمند مجوز. |
| ADR-A02 | ACCEPTED_PRESERVATION | LMS، Native و preview مستقل بمانند | ریشهٔ وب و Native ادغام یا جابه‌جا نمی‌شوند؛ HTML اجرای اپ نیست. |
| ADR-A03 | PROPOSED_TECH_DIRECTION | React Native/Expo برای Android؛ baseline دقیق باز | کمترین از دست‌دادن TS/محتوا؛ SDK51 تأیید امنیت ندارد و ارتقای اجباری ممنوع. |
| ADR-A04 | PROPOSED_BOUNDARY | modular monolith و ۱۲ گروه/۲۰ مسئولیت | packageهای مستقل و port، نه microservices و Prisma در کلاینت. |
| ADR-A05 | ACCEPTED_DATA_POLICY | محتوا، دادهٔ یادگیرنده و cache جدا | app/schema/content version جدا؛ migration بدون destructive reset. |
| ADR-A06 | ACCEPTED_TRUST_POLICY | پروفایل محلی ≠ هویت سازمانی | سیاست role/tenant server-authoritative؛ نمرهٔ رسمی از self-report ساخته نمی‌شود. |
| ADR-A07 | PROPOSED_CONTENT | stable IDs و بستهٔ JSON validated | نگاشت IDs اندیسی قدیمی قبل از جابه‌جایی؛ hash اصالت ناشر نیست. |
| ADR-A08 | ACCEPTED_EVIDENCE | هیچ fake success یا آمار ثابت | real/simulated/mock/NOT_TESTED مستقل؛ گزارش‌های قدیمی حفظ و اصلاحیه افزوده شود. |
| ADR-A09 | PROPOSED_VISUAL | 2D لایه‌دار، هویت اصیل واحد | ارجح برای منابع فعلی؛ انتخاب canonical art و ابزار در B/D باز است. |
| ADR-A10 | ACCEPTED_AUDIO_POLICY | listen-repeat-record/self-compare پیش از ASR | ارزیابی تلفظ فقط با موتور واقعی و شواهد؛ permission/consent و حذف محلی لازم. |
| ADR-A11 | ACCEPTED_CURRICULUM_POLICY | CEFR مرجع، نه certification | legacy draft تا QA؛ محتوای ایمنی review تخصصی و هشدار دارد. |
| ADR-A12 | ACCEPTED_SCALE_POLICY | بدون سقف خودسرانهٔ کل محتوا | حد منابع واقعی و batch/DoS guards مستند، نه برش خاموش یا unlimited storage. |
| ADR-A13 | PROPOSED_PHASE_DEPENDENCY | L1 زودتر از E/F/G؛ L2 پیش M | پایداری داده prerequisite است، نه تزئین انتهای پروژه. |
| ADR-A14 | DEFERRED_PLATFORM | Windows پس از Android | RN Windows/Tauri/Electron باید جدا benchmark شوند؛ EAS Windows فرض نشود. |
| ADR-A15 | OPEN_BLOCKER | کپی اصلاح‌شدهٔ Windows و native lock موجود نیست | فقط فایل‌های غیرحساس لازم دریافت شود؛ حساب، token و keystore درخواست نشود. |
| ADR-A16 | OPEN_SECURITY | یافته‌های audit و tenant/provider gaps | severity پایین آورده نمی‌شود؛ triage و اصلاح در فاز مجاز/کپی جدا، نه این فاز. |
| ADR-A17 | OPEN_PERMISSION | شبکه برای sync آینده | offline build فعلی INTERNET را blocked کرده؛ تغییر flavor/permission نیازمند ADR و آزمون جدا. |
| ADR-A18 | OPEN_ASSET_RIGHTS | مجوز و source layer/گوینده نامشخص | هیچ asset بدون provenance و review برای انتشار تجاری approved نمی‌شود. |
| ADR-A19 | ACCEPTED_BACKUP_LIMIT | backup DB معتبر، نه drill کامل محصول | فقط decompression/hash/integrity روی copy اجرا شد؛ source snapshot کامل/Windows inaccessible است. |
| ADR-A20 | OPEN_PRODUCT | کشور/مقررات، دستگاه مرجع Android و نقش سازمان اول | قبل از دادهٔ واقعی سازمان، retention/privacy و مدل اختیار تصمیم‌گیری شود. |


## اصلاح ادعاهای گذشته، بدون بازنویسی آن‌ها
- «۱۵ بخش کامل آفلاین» با سورس Native مطابقت ندارد: audio/recording Alert-only، پاسخ فقط state، استریک/نشان ثابت، renderer ناقص، restore/migration غایب.
- «پخش شد» و «میکروفون روشن شد» در Alert شاهد playback/capture نیست؛ «پاسخ ذخیره شد» بدون write معتبر نیست.
- «Expo Doctor 17/17» گزارش کاربر و بررسی سازگاری است؛ build/device/security gate نیست.
- «audit هشدار طبیعی و بی‌اهمیت است» مردود؛ گزارش کاربر شامل CRITICAL/HIGH حل‌نشده است. دسترسی‌پذیری در runtime و ابزار ساخت باید تفکیک شود، نه شدت پنهان گردد.
- تصویر اصلی RGB شفاف نیست؛ تصویر سه‌بعدی‌نما rig/مدل نیست. screenshotهای قدیمی asset universe جدید محسوب نمی‌شوند.
- فرمان‌های قبلی مبنی بر ساخت مستقیم Windows با Expo/EAS برای این پروژه راهنمای معتبر نیستند؛ RN Windows و Tauri toolchain و integration جدا دارند.
- نتیجهٔ static scan اسم archive، افشای secret را ثابت نمی‌کند؛ flagهای uploads/backups در source routes به صورت مستقل triage شدند.
- وضعیت migration اصلی از وجود فایل‌های SQL نتیجه‌گیری نمی‌شود؛ metadata copy، جدول tracking را نشان نداد.

## ورودی‌های مورد نیاز پیش از تصمیم اجرایی
نسخهٔ فعلی package.json/package-lock.json/app.json و assetهای غیرحساس Windows، دستگاه مرجع Android و حداقل پشتیبانی OS، اولویت نخست مخاطب، reviewer زبانی/آموزشی/SME، حقوق دارایی‌ها و مالک signing، سیاست retention و مقصد/قالب backup. نبود این ورودی‌ها مجوز ساختن شناسه/مدرک/credential فرضی نیست.

## ثبت شواهد این فاز
[BASELINE_DISCOVERY](evidence/BASELINE_DISCOVERY.json)، [SQLITE_PRESERVATION](evidence/SQLITE_PRESERVATION.json)، [CURRICULUM_CENSUS](evidence/CURRICULUM_CENSUS.json)، [SCHEMA_TABLE_COMPARISON](evidence/SCHEMA_TABLE_COMPARISON.json)، [KNOWN_ISSUES](inventory/KNOWN_ISSUES.csv). هیچ تست Android، browser journey، migration اجرایی، provider probe یا deployment انجام نشده است.
