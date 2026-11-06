# DESIGN DIRECTION — ورودی فاز B
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

## مشاهدهٔ موجود
دو زبان بصری جدا دیده شد: ماسکات وبِ سه‌بعدی‌نما با چشم قهوه‌ای/پس‌زمینه و ماسکات Native تخت با چشم آبی/زمینه سفید. هر دو firefighter-inspired هستند اما source layer/rig/turnaround ندارند و PNGهای RGB شفاف نیستند. آیکون اولیه landscape و derivative اصلاحی مربع است. UIها هنوز یک design system تجاری مشترک ندارند.

## جهت پیشنهادی، نه طراحی نهایی
**لئو: همراه توانمند، گرم و محترم**؛ پلنگ اصیل با لباس الهام‌گرفته از آتش‌نشانی، نه تقلید شخصیت/رنگ‌آمیزی/چیدمان Duolingo و نه نشان رسمی یک سازمان بدون مجوز. برای بودجهٔ فعلی، تصویرسازی 2D لایه‌دار با motion محدود گزینهٔ اول بررسی است. تصویر سه‌بعدی‌نما، مدل 3D قابل انیمیشن محسوب نمی‌شود.

در B باید یک مرجع واحد و قواعد بدن/چشم/الگوی خال/لباس انتخاب شود. رنگ‌های موجود cream/navy/amber و red فقط reference هستند؛ palette نهایی، contrast و حالات semantic پس از review تعیین می‌شوند. red خطای آموزشی به معنی خطر عملیاتی نیست؛ feedback باید با متن/آیکون هم قابل فهم باشد.

## پنج اصل صفحه
۱. یک هدف آموزشی یا وظیفهٔ اصلی در هر صفحه؛ ۲. سلسله‌مراتب واضح به جای انبوه card مشابه؛ ۳. متن واقعی فارسی/انگلیسی در طرح؛ ۴. شخصیت در خدمت آموزش، نه پوشاندن محتوا؛ ۵. هیچ screenshot یا mockup به عنوان feature عملیاتی معرفی نشود.

## نقشهٔ اولیهٔ صفحه‌ها برای طراحی آینده
| گروه | صفحه‌های هدف | خروجی B و حالت‌های لازم |
|---|---|---|
| شروع | انتخاب profile، تنظیم دسترس‌پذیری، معرفی کوتاه | empty/new/existing، بدون ثبت‌نام اجباری برای core |
| مسیر یادگیری | امروز، فصل/واحد، کتابخانهٔ نصب‌شده | locked/unlocked، package unavailable، کمبود فضا |
| آموزش | lesson، vocabulary، grammar، dialogue | متن مختلط، image alt، صوت غایب، unsupported block |
| تمرین | choice/matching/order/fill/listening و دیگر انواع پذیرفته‌شده | idle/selected/submitting/correct/incorrect/save-failed |
| پایان و مرور | summary، mistake explanation، review queue | score واقعی/خوداظهاری، صف خالی، بازگشت به هدف |
| صوت | player، permission، record/replay/delete | deny/interrupted/recording/saved/storage-full |
| پیشرفت | هدف، استریک، نشان، history | صفر واقعی، دادهٔ محدود، محاسبه/بارگیری/خطا |
| مدیریت محلی | settings، profiles، packages، backup/restore | confirmation، import invalid، migration interrupted |
| مدرس | class/session/assignment/feedback/report | scope denied، بدون فراگیر، pending review |
| سازمان | departments/teams/classes/roles/report/audit | cross-tenant deny، empty، export pending/error |

## RTL/LTR و accessibility
Navigation فارسی RTL؛ جمله/IPA/کد انگلیسی LTR به‌صورت spanهای مستقل، نه وارونه‌سازی متن. آیکون‌های جهت‌دار navigation با semantic RTL؛ waveform، ترتیب اعداد انگلیسی و نمادهای فنی بی‌دلیل mirror نمی‌شوند. متن فارسی و انگلیسی scale با سیستم، ترتیب focus معنادار و label برای screen reader.

حداقل هدف طراحی touch برابر 48dp Android؛ body اولیه حدود 16sp با font scaling و تست خوانایی، نه متن ریز ۱۰–۱۲ برای اطلاعات حیاتی. contrast متن عادی هدف 4.5:1 و نشانهٔ غیرمتنی 3:1؛ هدف استاندارد است و اندازه‌گیری/قبولی هنوز انجام نشده. حرکت قابل کاهش، feedback نه صرفاً رنگ/صدا، drag همراه جایگزین keyboard/tap.

## خروجی مجاز B بعدی
Character bible واقعی، reference board اصیل با manifest حقوق، tokens و type scale، طرح screen-by-screen با stateها در phone/tablet، prototype طراحی **با برچسب طراحی** و معیار پذیرش. در فاز A نه تصویر تازه ساخته شد، نه انتخاب artist/tool نهایی شد و نه redesign در سورس اعمال شد.

جزئیات چارچوب: [docs/03_DESIGN_SYSTEM.md](docs/03_DESIGN_SYSTEM.md)، [design/LEO_CHARACTER_BIBLE.md](design/LEO_CHARACTER_BIBLE.md)، [docs/17_ACCESSIBILITY.md](docs/17_ACCESSIBILITY.md).
