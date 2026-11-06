# ابزارهای مستندسازی فاز A

این فایل‌ها برای بازتولید موجودی و اسناد همین تحویل‌اند؛ **بخشی از runtime محصول نیستند**. اجرای آن‌ها برای خواندن مستندات لازم نیست و هیچ دستور build/نصب برنامه در این پوشه توصیه نمی‌شود.

- `discover_workspace.py`: اسکن read-only، hash و metadata؛ credential/private payloadها مستثنا هستند. flagهای lexical صرفاً سرنخ‌اند.
- `curriculum_census.py`: parser محدودِ literal data؛ TypeScript اجرا نمی‌شود و محتوای جدید تولید نمی‌کند.
- `read_source_safely.py`: excerpt محدود source با redaction؛ ابزار جامع DLP یا ممیزی امنیت نیست.
- `documentation_data.py`: facts/status/proposals برای ساخت جداول اسناد، نه model اجرایی app.
- `write_core_documents.py` و `write_knowledge_base.py`: تولید اسناد در پوشهٔ جدید؛ برای جلوگیری از جایگزینی فایل موجود، نوشتن اولیه exclusive است.

مسیر workspace در ابزارها مخصوص محیط بررسی است. اگر پژوهشگر آینده آن‌ها را در محیط دیگری لازم داشت، باید مقصد تازه و scope/read-permissions را صریح تنظیم کند. فایل‌های خروجی فعلی و گزارش‌های قدیمی نباید برای rerun حذف یا overwrite شوند. dependencyهای runtime برنامه نصب نشده‌اند؛ برای metadata تصویر از Pillow موجود در محیط استفاده شد.

نسخه‌های موقت ابزارها و فایل‌های قبل از اصلاح parser در workspace برای traceability حفظ شده‌اند، اما برای جلوگیری از سردرگمی وارد ZIP تحویل اصلی نمی‌شوند. نتیجهٔ کنترل نهایی در `evidence/PHASE_A_VALIDATION.json` ثبت می‌شود. این کنترل، آزمون کاربردی یا امنیتی اپ نیست.
