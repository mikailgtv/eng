# چارچوب سیستم طراحی — ورودی B/C

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

وضعیت: requirements و hypothesis، نه tokenهای نهایی یا componentهای پیاده‌شده.

| موضوع | قرارداد پیشنهادی برای طراحی بعدی |
|---|---|
| Brand | هویت اصیل لئو؛ cream/navy/amber/red موجود فقط reference؛ palette نهایی با contrast review |
| Semantic | success/error/warning/info از برند تفکیک؛ متن/آیکون همراه رنگ |
| Typography | فونت فارسی دارای مجوز روشن و glyph کامل + فونت لاتین/IPA هماهنگ؛ بسته‌بندی محلی، نه فونت CDN |
| Scale | body اولیه 16sp و پشتیبانی font scaling؛ اندازهٔ حیاتی ریز ممنوع |
| RTL/LTR | navigation فارسی RTL، جمله/IPA/کد انگلیسی LTR؛ bidi isolation و ترتیب focus معنادار |
| Spacing/grid | base پیشنهادی 4dp، فاصله‌های 8/12/16/24/32؛ hierarchy به جای card مشابه برای همه |
| Radius/shadow | ۲–۳ سطح کنترل‌شده؛ shadow سبک، سطح‌های واضح، بدون gradient ارزان |
| Buttons/inputs | یک primary action، focus/loading/disabled/error واقعی؛ target حداقل 48dp Android |
| Progress | مقدار persisted یا loading/unknown؛ درصد ثابت به‌عنوان progress ممنوع |
| Dialog | focus trap/return، لغو روشن، destructive confirmation با دامنهٔ داده |
| Navigation | task-first، back قابل پیش‌بینی و حفظ state؛ layout مستقل phone/tablet/desktop |
| Breakpoint | hypothesis اولیه: phone <600، tablet 600–1023، desktop ≥1024؛ با محتوای واقعی تثبیت شود |
| Accessibility | هدف contrast 4.5:1 متن و 3:1 نشانه؛ TalkBack/keyboard و عدم تکیه بر رنگ |
| Motion | [سیستم حرکت](05_ANIMATION_SYSTEM.md)، reduced و low tier، بدون تغییر منطق یادگیری |

[جهت طراحی](../DESIGN_DIRECTION.md) و [screen plan](../planning/SCREEN_PLAN.md). هیچ screen visual gate در این فاز اجرا نشده است.
