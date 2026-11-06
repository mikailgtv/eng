# تعارض‌ها و حدود تصمیم — Phase B

اسناد تعیین‌شدهٔ فاز A از ZIP استخراج و hashهای manifest کنترل شدند؛ مطالعهٔ ۱۷ سندِ تعیین‌شده و ارجاع design-system انجام شد. این یادداشت مبنای Decision Log نهایی B است، نه تغییر اسناد A.

| ID | تعارض/ابهام | حل در محدودهٔ طراحی B |
|---|---|---|
| B-C01 | A تولید rig/runtime را برای D گذاشته، ولی دستور B دارایی و ۱۶ حالت ثابت می‌خواهد | SVGهای لایه‌دار و PNG ثابت، reference و storyboard در B مجازند؛ rig تولیدی/Rive/native animation engine همچنان D و انجام‌نشده است. |
| B-C02 | ماسکات وب سه‌بعدی‌نما/چشم قهوه‌ای و Native تخت/چشم آبی | برای canonical design این فاز، بردار 2D با چشم قهوه‌ای، پالت ثابت، لباس evergreen و helmet مسی انتخاب طراحی می‌شود؛ تأیید نهایی مالک/artist هنوز لازم است. تصاویر قبلی تغییر نمی‌کنند. |
| B-C03 | شاخص باید از دادهٔ واقعی باشد، اما B اجازهٔ ذخیره یا منطق اپ اصلی نمی‌دهد | صفحه‌های طراحی صفر/unknown معتبر دارند؛ prototype فقط eventهای تعامل همین صفحه را در حافظه محاسبه و صریحاً برچسب می‌زند. XP/streak/ظرفیت دستگاه یا تعداد فراگیر جعلی نداریم. |
| B-C04 | Legacy هیچ lesson.audio ref پایدار یا واحد/prerequisite مصوب ندارد | ساختار و نگاشت پیشنهادی با DRAFT مشخص می‌شود؛ صدای موجود به عنوان transcript تأییدشده یا listening assessment آماده منتشر نمی‌شود. |
| B-C05 | Full UX باید سنجیده شود ولی browser/device در محیط موجود نیست و نصب dependency ممنوع است | اندازه‌گیری واقعی contrast، glyph coverage، هندسهٔ mockup و تست منطق prototype بدون dependency؛ browser/TalkBack/native tests برابر NOT TESTED. Gate کلی حداکثر PARTIAL تا شواهد تکمیل شود. |
| B-C06 | طرح‌های دو مسیر بصری و canonical واحد | دو مسیر UI در study جدا بررسی می‌شوند؛ فقط یک palette/asset family در prototype فعال است. تصویر تولیدشدهٔ exploratory canonical asset محسوب نمی‌شود. |
| B-C07 | فونت فارسی به‌تنهایی IPA را پوشش نمی‌دهد | glyph scan کمبود را نشان داد؛ فونت لاتین/IPA دارای OFL از منبع رسمی با Git blob verification اضافه شد. subset اول theta نداشت؛ نسخهٔ v2 مستقل ساخته و پوشش همهٔ IPAهای موجود دوباره اندازه‌گیری شد. |
| B-C08 | export SVG با ImageMagick ناقص بود | PNGهای اولیه رد شدند؛ فایل SVG اصلی حفظ و raster-v3 با ابزار authoring و Pillow موجود ساخته شد. این renderer بخشی از اپ نیست و dependency نصب نشد. |
| B-C09 | ثبت «Success» با «Correct answer» یکی نیست | دو state مستقل تعریف می‌شوند: نتیجهٔ آموزشی و وضعیت commit. Save Failed می‌تواند پس از جواب درست باشد و نباید reward/completion بسازد. در prototype commit فقط simulation برچسب‌دار است. |

ADR-A03 (SDK/runtime)، A14 (Windows)، A15 (کپی Windows)، A16 (امنیت)، A17 (مجوز شبکه/sync) و بخش‌های حقوق/سیاست سازمانی A18/A20 همچنان OPEN/DEFERRED می‌مانند. این فاز مجوز تغییر آن‌ها نیست.
