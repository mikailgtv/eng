# انگیزش مبتنی بر دادهٔ واقعی

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

## مبنا
وب XP ledger، streak و badge rules دارد؛ Native عدد ثابت نمایش می‌دهد. قواعد وب candidate بازاستفاده‌اند و نیاز به parity/semantics review دارند. «زمان برآوردی تمرین» نباید زمان میکروفون یا یادگیری اندازه‌گیری‌شده نامیده شود.

## قرارداد هدف
XP transaction و achievement از learning event معتبر، profile-scoped و idempotent. sum ledger قابل بازسازی و cached totals قابل reconcile. UI فقط بعد از commit پاداش نشان می‌دهد؛ replay animation پاداش جدید نمی‌سازد. profile تازه باید صفر واقعی داشته باشد.

روز یادگیری با timezone/profile policy نسخه‌دار؛ تغییر منطقهٔ زمانی، DST، ساعت اشتباه، offline clock و event دیررس سناریوی تست‌اند. grace day یا freeze اگر انتخاب شود صریح باشد؛ با «روزهای متوالی» مبهم نمایش داده نشود.

daily goal اختیاری/قابل تغییر؛ mastery با آزمون/مرور و شواهد تعریف شود، نه صرفاً XP. self-rating و آزمون رسمی جدا؛ opening screen یا اجرای demo موفقیت آموزشی نیست.

تشویق محترمانه، بدون تحقیر/از دست‌دادن افراطی/اعلان اجباری. leagues فقط opt-in و بعد از privacy/enterprise review؛ رقابت سازمانی پیش‌فرض نیست. [طرح](../product/GAMIFICATION_SPEC.md)
