# دادهٔ آفلاین، مهاجرت و بازیابی

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

## وضع فعلی
Native شش جدول با CREATE IF NOT EXISTS دارد؛ profile/schema version/migration history/restore ندارد. export همهٔ settings/goals/attemptها را پوشش نمی‌دهد. وب ۲۱۳ مدل دارد و به server DB متکی است؛ انتقال آن schema بزرگ به موبایل تصمیم پذیرفته‌شده‌ای نیست.

## هدف منطقی
Content catalog و package versions جدا از learner DB؛ profile-scoped attempts/answers/progress/bookmarks/settings/review/XP/achievements/goals/recording metadata. migration_history و optional outbox برای وضعیت قابل بازیابی. یک transaction برای attempt و event و projectionهای ضروری؛ unique attempt/event IDs جلوگیری از دوباره‌نویسی و پاداش دوباره.

## upgrade امن
شناخت نسخه → backup معتبر/قابل بازیابی → preflight فضا → migration ترتیبی/آزموده در transaction → integrity/FK check → تغییر version. قطع شدن نباید reset ایجاد کند. legacy progress با mapping مستند به profile/content IDs؛ دادهٔ مبهم در quarantine، نه نسبت‌دادن تصادفی. history SQLite/PostgreSQL موجود دست‌نخورده بماند.

## backup/restore هدف
snapshot سازگار SQLite؛ اگر WAL فعال است از روش backup صحیح استفاده شود، نه کپی یک فایل بدون WAL. manifest نسخه و hash؛ انتخاب scope و recordingها توسط کاربر؛ export حساس با رمزگذاری استاندارد/قابل حمل، نه فقط کلید device که روی دستگاه دیگر قابل بازیابی نیست. import در staging و با اعتبارسنجی کامل؛ merge/replace انتخاب صریح و backup قبل از replace.

فضای کم: اندازهٔ واقعی بسته + temporary space + reserve داده قبل از کار بررسی شود؛ بستهٔ اختیاری قابل حذف با انتخاب کاربر، progress هرگز قربانی آزادکردن فضا نشود. idle retry و crash recovery tests در L1/L2، نه این فاز.

## شواهد A
backup فشردهٔ خصوصی shared DB ایجاد و decompress/hash/integrity/FK روی copy بررسی شد؛ original تغییر نکرد. ۲۱۳ نام جدول با models منطبق است، اما migration tracking table دیده نشد و تطابق کامل schema/اجرای migration ثابت نشده است. [شواهد](../evidence/SQLITE_PRESERVATION.json)
