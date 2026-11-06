# دسترس‌پذیری و متن دوطرفه

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

این‌ها معیار طراحی/آزمون آینده‌اند، نه PASS فعلی.

- Persian navigation RTL؛ جمله و IPA انگلیسی LTR با language context. اعداد/زمان/علائم فنی به‌صورت کور mirror نشوند. متن مختلط و line-wrap با رشتهٔ واقعی طولانی بررسی شود.
- target حداقل48dp Android؛ font scaling سیستم و zoom، contrast هدف4.5:1 متن عادی/3:1 عناصر؛ تنها رنگ یا صوت برای correct/incorrect کافی نیست.
- label/state/hint و ترتیب خواندن TalkBack؛ heading معنادار، focus قابل مشاهده و بازگشت focus dialog، اعلان غیرمزاحم نتیجه.
- matching/drag با جایگزین tap یا keyboard، sentence-order با move-up/down، time limit با accommodation قابل بررسی.
- player با transcript/caption و کنترل قابل دسترس؛ recording indicator هم بصری هم متنی؛ mic غیرقابل استفاده نباید کاربر را مجبور به ارسال صوت کند.
- reduced motion و low tier معنی آموزشی را حفظ کنند؛ flash خطرناک و celebration مسدودکننده ممنوع.
- screen acceptance: phone portrait، tablet مرتبط، متن فارسی/انگلیسی، empty/loading/error/success/permission denied و کمبود فضا. گزارش هر مورد شامل device/OS/app version و روش واقعی است، نه screenshot حدسی.
