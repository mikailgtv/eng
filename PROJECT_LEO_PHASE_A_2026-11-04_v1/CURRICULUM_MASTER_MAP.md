# CURRICULUM MASTER MAP
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

## ۱. موجودی مرجع و منشأ
Seed TypeScript در `prisma/curriculum/` و `EnglishLearning-Offline/assets/curriculum.json` با parser literal غیر اجرایی، از نظر داده برابرند: ۱ دوره، ۶ module، ۲۵ درس، ۱۰۰ واژه، ۲۵ پرسش، ۶ گرامر، ۱۳۷ مثال داخل ۳۵ بلوک و ۸ فایل صوت جدا. این محتوا **LEGACY_DRAFT / review-unverified** است؛ وجود آن، تأیید معلم یا تایید رسمی CEFR نیست.

| فصل قدیمی | درس | واژه | عنوان درس‌ها |
|---|---|---|---|
| Getting Started | 4 | 17 | What is English?; Hello and Goodbye; My Name Is...; Basic Classroom English |
| Alphabet & Sounds | 4 | 6 | The English Alphabet; Letter Names; Basic English Sounds; Spelling Simple Words |
| Basic Words | 4 | 32 | People; Family; Common Objects; Colors |
| Basic Sentences | 4 | 5 | I, You, He, She; The verb “to be”; This and That; Simple Questions |
| Numbers & Time | 5 | 15 | Numbers 1–20; Numbers 20–100; Days of the Week; Months; What Time Is It? |
| Everyday English | 4 | 25 | Food and Drinks; Workplace Words; Simple Requests; My Daily Routine |


۴ course و ۳۹ lesson موجود در DB اصلی با بستهٔ ۲۵درسی یکی نیستند. ردیف‌های اضافه باید از نظر test/private/teacher-authored و مجوز طبقه‌بندی شوند؛ به صورت خودکار curriculum تجاری محسوب نشدند.

## ۲. ساختار مقصد
`Level → Course → Chapter → Unit → Lesson → Teaching Blocks + Vocabulary/Grammar/Exercise/Audio References + Assessment + Review Items`

module فعلی با mapping صریح به chapter می‌رود. واحدها، prerequisiteها و stable IDs نباید از عنوان/اندیس قابل تغییر حدس زده شوند. course/lesson/content version از app/schema version جداست. هیچ سقف ثابت total courses/lessons/words/media مقرر نشده است.

## ۳. نقشهٔ سطحی هدف — هنوز نوشته یا تأیید نشده
| سطح | کارکرد زبانی پیشنهادی | نمونهٔ خروجی قابل‌اندازه‌گیری برای طراحی | وضعیت محتوا |
|---|---|---|---|
| Pre-A1 | صدا/الفبا، سلام، معرفی، اعداد و واژه‌های ملموس | انتخاب سلام مناسب یک موقعیت و معرفی کوتاه با مدل | legacy draft موجود؛ نیازمند اصلاح فارسی و تمرین |
| A1 | اطلاعات شخصی، زمان، خرید، مسیر و کارهای ساده | کامل‌کردن گفت‌وگوی کوتاه و فهم دستور زبانی ساده | PLANNED |
| A2 | رویدادهای گذشته/آینده و تبادل اطلاعات کاری روزمره | نوشتن پیام کوتاه و فهم خلاصهٔ مکالمهٔ آشنا | PLANNED |
| B1 | توضیح تجربه، روایت حادثه و همکاری در کار | گزارش منسجم ساده با ترتیب زمانی و درخواست روشن‌سازی | PLANNED |
| B2 | بحث، گزارش دقیق‌تر و ارتباط حرفه‌ای | مقایسهٔ گزینه‌ها و توضیح دلیل در سناریوی مشخص | PLANNED |
| C1 | زبان پیچیده، لحن، استدلال و متن تخصصی | بازنویسی/خلاصه‌سازی متناسب با مخاطب با rubric | PLANNED |
| C2 | دقت، ظرافت، register و درک متن/گفتار پیچیده | تحلیل و تولید متن بسیار دقیق و مناسب با context | PLANNED؛ ادعای native یا certification نداریم |

این‌ها اهداف طراحی‌اند، نه descriptor رسمی نقل‌شده یا مدرک صلاحیت. مرجع ساختاری: [Council of Europe CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions). Pre-A1 به عنوان مسیر آغازین پروژه استفاده می‌شود؛ official certification ادعا نمی‌شود.

## ۴. توالی آموزشی هر درس آینده
هدف measurable → context فارسی مناسب مبتدی → توضیح تصویری → واژه → راهنمای تلفظ → مثال → گرامر مرتبط → تمرین هدایت‌شده → تمرین مستقل → شنیدن/گفتن در صورت ارتباط → comprehension check → توضیح خطا → summary → زمان‌بندی مرور. حذف مرحلهٔ نامرتبط نیازمند دلیل در metadata است، نه پرکردن صوری همهٔ فیلدها.

هر exercise به objective ID پیوند می‌خورد. «احساس آمادگی» به‌تنهایی معیار سنجش نیست. نمونهٔ objective اصلاحی باید شرایط/رفتار/معیار داشته باشد؛ امتیاز و threshold صرفاً برای رضایت QA انتخاب نمی‌شوند و قبل از انتشار باید توسط متخصص آموزشی تعیین شوند.

## ۵. مسیر حرفه‌ای موازی
Track عمومی prerequisite سناریوی حرفه‌ای است. بسته‌های هدف: ارتباط ایستگاه، تجهیزات/PPE، زبان پیام اضطراری، رادیو، گزارش حادثه، safety briefing، اصطلاحات کمک‌های اولیه، تخلیه، تشخیص واژگان خطر، محیط صنعتی، گفت‌وگوی کار، تحویل شیفت، گزارش به سرپرست. همهٔ محتوای safety-critical دارای `requiresExpertReview=true`، reviewer ثبت‌شده و warning است. آموزشی بودن زبان، صلاحیت عملیات واقعی ایجاد نمی‌کند.

## ۶. کارخانه و انتشار تدریجی
- H0: حفظ raw source و IDs قدیمی؛ برچسب‌گذاری provenance/test/private؛ رفع gap نمایش در E.
- H1: بازنگری ۲۵ درس فعلی، توضیح فارسی، اهداف measurable، تمرین‌های واقعاً supported و نگاشت صوت بررسی‌شده.
- H2+: بسته‌های کوچکِ قابل بازبینی بر حسب توان QA و نیاز کاربر؛ هیچ محدودیت نهایی بر تعداد بسته‌ها نیست.
- Draft → Linguistic review → Pedagogical review → Audio review → Expert review برای ایمنی → Approved → Published → Retired. سوابق reviewer/تاریخ/نسخه اجباری؛ AI یا تولید خودکار هرگز به‌جای تأیید معلم ثبت نمی‌شود.
- وضعیت `not_applicable` برای review صوت فقط با نبود صوت و دلیل؛ status «Approved» پیش‌فرض ممنوع.

## ۷. قرارداد lesson هدف
stable ID، level/course/chapter/unit IDs، topic، objective IDs، prerequisites، زمان تخمینی، locale/توضیح فارسی، teaching blocks نوع‌دار، references واژه/گرامر/مثال/تمرین/صوت، assessment criteria، review items، contentVersion، provenance، rights و review status. معیار دقیق در [docs/08_CONTENT_SCHEMA.md](docs/08_CONTENT_SCHEMA.md) آمده؛ schema اجرایی/importer ساخته نشده است.

Quality gate: dependency بدون مرجع، audio بدون transcript/rights، پاسخ مبهم بدون rubric، ترجمهٔ ماشینی بازبینی‌نشده و label غیرواقعی رد می‌شوند. تفاوت self-rating، deterministic grading و teacher/manual assessment در داده حفظ می‌شود.
