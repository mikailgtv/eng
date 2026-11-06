# ابزارهای authoring و بررسی طراحی B

این پوشه سورس طراحی/تولید دارایی و شواهد را نگه می‌دارد؛ **کامپوننت اجرایی اپ یا installer نیست**. برای دیدن HTML هیچ‌کدام را اجرا نکن و هیچ dependency نصب نکن.

منابع فعال و مرجع:
- `design/screens-v3.json`, `screen-states-v2.json`, `SCREEN_STATE_MATRIX_v2.csv`, `tokens-v2.json` و `motions.json` قراردادهای فعال‌اند. فایل‌های اولیهٔ design_data.py ورودی اولیه‌اند، نه آخرین source-of-truth همهٔ اصلاحات.
- `assets/leo/svg/` منابع برداری ویرایش‌پذیرند؛ PNGهای فعال در `design/ACTIVE_LEO_ASSETS.json` معرفی شده‌اند. exporter فعال `rasterize_design_svg_v3.py` است؛ خروجی MSVG اولیه رد شده بود.
- `prototype/prototype-v8.js` و `prototype/prototype-v3.css` sourceهای فعالِ HTML مستقل‌اند؛ `build_prototype_final.py` بسته‌بندی طراحی را انجام داده است.
- `render_design_boards_v4.py` منبع authoring artboard است؛ نسخه‌های اصلاح‌شده و مرجع چهار نما در گزارش geometry تحویل مشخص‌اند. Artboard با screenshot مرورگر یکی نیست.
- `test_design_prototype_delivery.cjs` فقط Node VM/DOM شبیه‌سازی‌شده را بررسی می‌کند. `check_design_markup_delivery.py` بررسی static است، نه browser/axe/TalkBack.
- `write_phase_b_documents.py` و `create_asset_manifest.py` مستندات را از metadata و فایل‌های فعال ساخته‌اند.

ابزارها از Python/Pillow/fontTools/ImageMagick/Node موجود استفاده کردند؛ نصب package جدید انجام نشد. ImageMagick در صادرات اولیهٔ SVG نتیجهٔ نامعتبر داد؛ به عنوان failure ثبت شد، نه PASS. sourceها با هدف بازتولید در محیط بررسی نگه داشته شده‌اند و بعضی مسیرها مخصوص workspace هستند؛ برای اجرای بعدی، مقصد تازه و مسیر ورودی باید آگاهانه تنظیم شود. فایل‌های app اصلی/گزارش تاریخی هرگز مقصد این ابزارها نباشند.

Trialهای تولیدشده در همین فاز که فعال نیستند، با index/hash در آرشیو جدا حفظ می‌شوند و وارد ZIP اصلیِ تحویل نمی‌شوند. این فرایند به هیچ فایل قدیمی یا دیتابیس/گزارش فاز A دست نمی‌زند. برای بازدید از طراحی، فقط `prototype/LEO_DESIGN_PROTOTYPE_FINAL.html` را باز کنید.
