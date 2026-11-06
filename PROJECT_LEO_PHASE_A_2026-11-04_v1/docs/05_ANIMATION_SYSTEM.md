# سیستم حرکت

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

مرجع [ANIMATION_ROADMAP](../ANIMATION_ROADMAP.md) trigger و fallbackها را تعیین می‌کند؛ پیاده‌سازی متعلق به D است.

هر motion definition: `motionId / version / state / trigger / cancellation / replay-policy / duration-token / tier / accessibility-text / assetRefs`. renderer باید meaning را بدون حرکت هم منتقل کند. موفقیت پاسخ و پاداش فقط پس از event معتبر/commit؛ animation event منبع score یا timer آموزشی نیست.

Standard، Reduced و Low-performance سه mode مستقل‌اند. background و off-screen loop متوقف؛ reduced از تنظیم سیستم و پروفایل تغذیه می‌شود. خطای asset به حالت ثابت و پیام مناسب می‌رود؛ touch/focus مختل نمی‌شود.

Reanimated گزینهٔ interaction بومی است؛ Rive/rig سبک برای شخصیت نیازمند compatibility/licensing spike است. تصویر ثابت، fake mic meter، shake بی‌هدف یا screenshotِ interface انیمیشن محسوب نمی‌شود. معیارهای عددی اولیه در [بودجهٔ عملکرد](19_PERFORMANCE_BUDGET.md) hypothesis هستند، نه اندازه‌گیری انجام‌شده.
