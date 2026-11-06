# Accessibility Review — محدودهٔ واقعی شواهد

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

## حکم
**PARTIAL**؛ نه WCAG certification و نه PASS کلی اپ/مرورگر/Android. اندازه‌گیری و آزمون محدود واقعی انجام شده، اما فاصلهٔ آن با دسترس‌پذیری محصول پنهان نمی‌شود.

| موضوع | روش و نتیجه | محدودیت |
|---|---|---|
| Contrast متن | ۳۲ جفت برای دو مسیر؛ همه از threshold ثبت‌شده گذشتند. A min=4.961:1 | فقط ترکیبات تعریف‌شده؛ controls بومی browser/OS و تمام حالت‌های dynamic در مرورگر سنجیده نشد |
| Non-text ضروری | A min=3.566:1 در pairs تعریف‌شده | خط تزیینی exempt، نه هر control کم‌کنتراست |
| Glyph | تمام IPAهای ۱۰۰ واژه و حروف نمونهٔ فارسی/English بررسی شدند؛ کمبودها با font مکمل رفع شد | coverage تمام جهان/کیفیت native shaping ادعا نمی‌شود |
| Typography/raster | Pillow RAQM با فونت‌های ارائه‌شده؛ فارسی و انگلیسی/IPA جدا؛ measured text widths در evidence | این rasterِ طراحی است، نه computed browser CSS یا native sp |
| Targetها | rectangles منطقی artboard اندازه‌گیری شدند و همگی ≥48 بودند؛ CSS icon/control minimum نیز تعریف شده | native dp، physical touch و computed DOM bounding boxes تست نشده |
| Label/role markup | بررسی static خروجی ۶۷ screen در simulated DOM؛ unnamed button/unlabeled input/duplicate attr/radio parent کنترل شد | axe/TalkBack/screen-reader و رفتار واقعی keyboard اجرا نشده |
| RTL/LTR | mark-up direction و rasterهای منتخب Phone/Tablet/mixed text بازبینی شدند | مرورگر واقعی، selection/caret، mirrored nav و همهٔ reflowها NOT TESTED |
| Reduced motion | OS preference در logic بر manual default مقدم است؛ CSS media rule و finite animation declaration موجود است | زمان‌بندی/تاثیر واقعی frameها و GPU/FPS اندازه‌گیری نشده |
| Drag alternative | matching با tap و ordering با افزودن/برداشتن token؛ drag اجباری نیست | accessibility عملی آن با TalkBack هنوز تست نشده |
| Large text | modes 150/200٪ و reflow پیشنهادی موجود | viewport واقعی، focus و عدم قطع محتوا در مرورگر/Native NOT TESTED |

## روش تست لازم پیش از قبول C
Keyboard-only و focus restoration، TalkBack با language switching، 320/390/600/840/desktop widths، 150/200٪ متن، reduced OS، low tier، permission/storage error، portrait/tablet و audio controls واقعی. تست باید artifact/version/device/method/result داشته باشد؛ static source به PASS واقعی تبدیل نشود.

[contrast evidence](evidence/CONTRAST_MEASUREMENTS.csv) · [glyph proof](evidence/LATIN_IPA_FONT_PROVENANCE.json) · [raster geometry](evidence/MOCKUP_GEOMETRY_MEASUREMENTS_DELIVERY.json) · [static markup](evidence/STATIC_MARKUP_REVIEW_DELIVERY.json) · [prototype logic](evidence/PROTOTYPE_LOGIC_TESTS_DELIVERY.json)
