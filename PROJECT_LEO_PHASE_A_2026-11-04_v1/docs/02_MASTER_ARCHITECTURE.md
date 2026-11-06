# معماری و مرزها

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

مرجع اصلی [PROJECT_MASTER_ARCHITECTURE](../PROJECT_MASTER_ARCHITECTURE.md) است. ۱۲ گروه محصول تمام ۲۰ مسئولیت منطقی دستور را پوشش می‌دهند.

## قواعد وابستگی
UI → use case/domain → repository/port. domain بدون React DOM، Next، Prisma، browser storage یا SDK صوتی نوشته می‌شود. platform adapter به domain interface وابسته است، نه برعکس. E2E dependency روی server برای core مجاز نیست.

M03/M04/M05 از package نسخه‌دار می‌خوانند؛ M05 پاسخ را validate/grade می‌کند؛ M08 transaction را commit می‌کند؛ M07 فقط event ذخیره‌شده را می‌بیند. M06 state واقعی media می‌دهد. M02 همهٔ دادهٔ محلی را profile-scoped می‌کند. M12 جدا و خاموش به صورت پیش‌فرض؛ M10/M11 به سرور و permission معتبر نیاز دارند.

## کنترل تغییر
نقض boundary، dependency جدید، تغییر engine/provider، schema و sync protocol به ADR/backup/test در فاز مجاز نیاز دارد. صرف انتقال تابع Prisma به یک package، آن را offline نمی‌کند. قاعدهٔ قابل استخراج باید قرارداد و parity fixture داشته باشد؛ در A هیچ extraction اجرا نشده است.
