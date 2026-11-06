# موتور تمرین و سنجش

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

در Native هیچ‌یک از ۲۳ نوع زیر به عنوان engine کامل تأیید نشده‌اند؛ QUESTION reveal آن‌ها را جایگزین نمی‌کند. در وب ۱۰ نوع activity ثبت‌شده و چند grader/renderer واقعی وجود دارد، اما فاز A runtime آن‌ها را بازاجرا نکرده است.

| # | نوع | شاهد فعلی وب، نه ادعای قبول‌شدن | قرارداد هدف |
|---|---|---|---|
| ۱ | Multiple choice | رجیستری/ChoiceActivity/validator وب | شناسهٔ گزینه معتبر، feedback و commit واقعی |
| ۲ | Image → word matching | matching متنی؛ نوع تصویری کامل تأیید نشده | image refs + alt، انتخاب/tap/keyboard و تطبیق روشن |
| ۳ | Word → image matching | matching متنی؛ variant تصویری PLANNED | image key معتبر و feedback بدون وابستگی صرف به رنگ |
| ۴ | Listening comprehension | LISTEN_AND_CHOOSE / assessment LISTENING | صوت واقعی، transcript accommodation و سؤال مرتبط |
| ۵ | Audio → text matching | listen/type پایه؛ matching تخصصی PARTIAL | نگاشت asset/text pair و کنترل replay واقعی |
| ۶ | Sentence ordering | WORD_ORDER | token IDs، ترتیب/تکرار واژه و جایگزین drag |
| ۷ | Word arrangement | همان WORD_ORDER؛ دو engine مستقل شمرده نشود | گزینه‌های جابه‌جایی دسترس‌پذیر و validation توکن |
| ۸ | Fill blanks | FILL_BLANK | accepted answers authored، normalization و دلیل |
| ۹ | Translation | بلوک متن translation؛ exercise کامل تأیید نشده | چند پاسخ درست/rubric؛ exact-match کور کافی نیست |
| ۱۰ | Error correction | corrector قاعده‌ای؛ exercise کامل PLANNED | خطای هدف و پاسخ/دلیل authored؛ بدون ادعای AI جعلی |
| ۱۱ | True/false | TRUE_FALSE | boolean معتبر و توضیح پاسخ |
| ۱۲ | Dialogue completion | بلوک DIALOGUE؛ تمرین اختصاصی PLANNED | context، turn، accepted choices/rubric |
| ۱۳ | Conversation branching | قواعد tutor موجود؛ graph آموزشی PLANNED | graph بدون بن‌بست نامجاز و outcome قابل توضیح |
| ۱۴ | Reading comprehension | READING display؛ assessment manual/choice ترکیبی | متن مرجع و پرسش مرتبط، مرز manual/auto روشن |
| ۱۵ | Grammar transformation | grammar content؛ type اختصاصی PLANNED | constraint زبانی، پاسخ‌های معتبر و exception |
| ۱۶ | Vocabulary recall | recognition/flashcard؛ recall آزاد PARTIAL | یادآوری از شناخت گزینه و confidence جدا |
| ۱۷ | Flashcards | FLASHCARD وب | self-rating بدون نمرهٔ رسمی + persist review item |
| ۱۸ | Spaced repetition | adaptive/review قواعد وب | policy نسخه‌دار و due-date پایدار؛ نه ادعای اثربخشی اثبات‌شده |
| ۱۹ | Dictation | LISTEN_AND_TYPE | audio playback + accepted transcription authored |
| ۲۰ | Pronunciation practice | SPEAKING_PROMPT/browser/external؛ scoring null | record/self-compare؛ no phonetic score تا موتور معتبر |
| ۲۱ | Workplace scenarios | topic/tag و مثال محدود؛ دورهٔ حرفه‌ای کامل غایب | scenario/rubric + SME review برای ایمنی |
| ۲۲ | Timed challenges | challenge/time-window زیرساخت؛ UI/type کامل تأیید نشده | monotonic timer، pause policy، accommodation و persistence |
| ۲۳ | Mixed review | runner ترکیبی و mistake review؛ policy PARTIAL | انتخاب هدفمند نسخه‌دار، dedupe و توضیح دلیل مرور |

قرارداد مشترک هر نوع: actual interaction، answer schema/validation، feedback و explanation، score handling با `null` برای self/manual، state/persistence، error و accessibility. Unsupported type حق تولید score/progress/XP ندارد و باید در authoring/publication gate رد یا صریح planned باشد.

Practice، quiz و official assessment سه مقصد متفاوت‌اند. Offline بستهٔ جواب می‌تواند قابل مشاهده باشد؛ anti-cheat یا اعتبار رسمی از local score نتیجه‌گیری نمی‌شود. بهتر است grading قابل استخراج pure باشد و ذخیره از طریق M08؛ React DOM، Prisma و browser API به Native کپی مستقیم نشوند.

این جدول پوشش مطلوب و فاصلهٔ موجود است، نه ۲۳ feature پیاده‌شده.
