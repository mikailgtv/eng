from pathlib import Path
import csv,json
from documentation_data import MODULES
OUT=Path('/home/user/PROJECT_LEO_PHASE_A_2026-11-04_v1')
HEADER='> Project Leo · Phase A · 2026-11-04 · v1\n> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.\n\n'
def put(name,title,body):
 p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x',encoding='utf-8') as f:f.write('# '+title+'\n\n'+HEADER+body.strip()+'\n')

docs={
'00_EXECUTIVE_OVERVIEW.md':('نمای اجرایی', '''
## تصمیم فعلی
فقط A: حفاظت، موجودی، معماری و نقشهٔ تحویل. گام بعد B پس از پذیرش؛ نه بازنویسی و نه تولید تبلیغاتی یک demo دیگر.

دو implementation مستقل وجود دارد: Next.js LMS با ۱۱۱ page، ۲۰۹ handler و ۲۱۳ مدل Prisma؛ و prototype Native با محتوای ۲۵درسی و قابلیت‌های ناقص. کپی Windows اصلاح‌شده در این محیط موجود نیست. ۳۳۵ سند تاریخی شاخص‌گذاری شده و هیچ PASS قدیمی به عنوان تست امروز بازنشر نشده است.

منابع ارزشمند: محتوای Pre-A1 یکسان در TS/JSON، ۱۰۰ واژه، ۸ صوت یکتا، منطق assessment/practice/review وب، لایه‌های مدرس/سازمان و سابقهٔ تست. gap اصلی: Native featureها، persist/restore/versioning، هویت بصری واحد، QA محتوا و ادعاهای simulated.

محصول نهاییِ هدف: تجربهٔ Android local-first با تدریس، تمرین واقعی، صوت/ضبط صادقانه، انگیزش داده‌محور، بستهٔ محتوا و سپس workspace سازمانی و Windows. هنوز ساخته یا پذیرفته نشده است.

[موجودی کامل](../PROJECT_MASTER_INVENTORY.md) · [۱۲ ماژول و اتصالشان](../PROJECT_MASTER_ARCHITECTURE.md) · [فازها](../MASTER_PHASE_ROADMAP.md) · [تصمیم‌ها](../PROJECT_DECISION_LOG.md)
'''),
'01_PRODUCT_REQUIREMENTS.md':('نیازمندی‌های محصول', '''
## P0 — صداقت و هسته
- core packaged learning بدون اینترنت و بدون ثبت‌نام اجباری؛ صفحه/جدول به‌تنهایی feature نیست.
- پاسخ، نتیجه، review، XP و progress با موفقیت واقعی ثبت و پس از restart/reboot بازیابی شوند.
- audio playback و recording واقعی با consent/permission؛ نمرهٔ تلفظ فقط با موتور معتبر.
- schema/content version، stable ID، backup/restore و مهاجرت بدون reset.
- توضیح فارسی مناسب مبتدی و محتوای انگلیسی LTR؛ دسترس‌پذیری و reduced motion.

## P1 — رشد قابل کنترل
تمام ۲۳ exercise type با قرارداد مشترک اما انتشار تک‌به‌تک؛ CEFR از Pre-A1 تا C2 به عنوان نقشه، نه certification؛ authoring/QA/package validation بدون نیاز به تغییر سورس برای هر درس؛ هیچ سقف خودسرانهٔ کل محتوا و هیچ وعدهٔ ذخیرهٔ نامحدود.

## P2 — سازمان و پلتفرم بعدی
مدرس، نقش‌ها، department/team/class، assignment و گزارش با permission و tenant scope؛ sync اختیاری و trust جدا؛ Windows پس از Android. «بعداً» بودن، مجوز fake button نیست: entry planned در محصول منتشرشده یا غایب است یا صریح unavailable، نه success نمایشی.

traceability همهٔ بندهای دستور در [ماتریس نیازمندی](../planning/REQUIREMENTS_TRACEABILITY.csv). hardware کاربر محدود است؛ اندازه‌گیری performance و ظرفیت QA، تعیین‌کنندهٔ release batch هستند، نه کوچک‌کردن کیفیت هدف.
'''),
'02_MASTER_ARCHITECTURE.md':('معماری و مرزها', '''
مرجع اصلی [PROJECT_MASTER_ARCHITECTURE](../PROJECT_MASTER_ARCHITECTURE.md) است. ۱۲ گروه محصول تمام ۲۰ مسئولیت منطقی دستور را پوشش می‌دهند.

## قواعد وابستگی
UI → use case/domain → repository/port. domain بدون React DOM، Next، Prisma، browser storage یا SDK صوتی نوشته می‌شود. platform adapter به domain interface وابسته است، نه برعکس. E2E dependency روی server برای core مجاز نیست.

M03/M04/M05 از package نسخه‌دار می‌خوانند؛ M05 پاسخ را validate/grade می‌کند؛ M08 transaction را commit می‌کند؛ M07 فقط event ذخیره‌شده را می‌بیند. M06 state واقعی media می‌دهد. M02 همهٔ دادهٔ محلی را profile-scoped می‌کند. M12 جدا و خاموش به صورت پیش‌فرض؛ M10/M11 به سرور و permission معتبر نیاز دارند.

## کنترل تغییر
نقض boundary، dependency جدید، تغییر engine/provider، schema و sync protocol به ADR/backup/test در فاز مجاز نیاز دارد. صرف انتقال تابع Prisma به یک package، آن را offline نمی‌کند. قاعدهٔ قابل استخراج باید قرارداد و parity fixture داشته باشد؛ در A هیچ extraction اجرا نشده است.
'''),
'03_DESIGN_SYSTEM.md':('چارچوب سیستم طراحی — ورودی B/C', '''
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
'''),
'04_CHARACTER_BIBLE.md':('چارچوب شخصیت لئو', '''
مرجع اصلی این مرحله [design/LEO_CHARACTER_BIBLE.md](../design/LEO_CHARACTER_BIBLE.md) است.

هویت هدف: پلنگ دوستانه با uniform آتش‌نشان‌الهام، مناسب بزرگسال و مبتدی، بدون تحقیر در اشتباه. دو دارایی موجود را یک rig یا شخصیت کاملاً ثابت فرض نمی‌کنیم: سبک، چشم، بافت و پس‌زمینه متفاوت‌اند.

B باید proportions، turnaround، face/eyes، الگوی ثابت خال، uniform و نشان غیرسازمانی، palette/material/light، silhouette و pose consistency را تصویب کند. D دارایی‌های لایه‌دار و stateهای واقعی می‌سازد. منبع RGB موجود transparency ندارد؛ ماسک/alpha باید از منبع مناسب تولید و بازبینی شود.

هیچ pose یا expression جدید در A تولید نشد. رضایت/حقوق منبع و نسخهٔ مشتق باید در asset manifest باشد؛ «AI-generated» به‌تنهایی سند حقوق یا consistency نیست.
'''),
'05_ANIMATION_SYSTEM.md':('سیستم حرکت', '''
مرجع [ANIMATION_ROADMAP](../ANIMATION_ROADMAP.md) trigger و fallbackها را تعیین می‌کند؛ پیاده‌سازی متعلق به D است.

هر motion definition: `motionId / version / state / trigger / cancellation / replay-policy / duration-token / tier / accessibility-text / assetRefs`. renderer باید meaning را بدون حرکت هم منتقل کند. موفقیت پاسخ و پاداش فقط پس از event معتبر/commit؛ animation event منبع score یا timer آموزشی نیست.

Standard، Reduced و Low-performance سه mode مستقل‌اند. background و off-screen loop متوقف؛ reduced از تنظیم سیستم و پروفایل تغذیه می‌شود. خطای asset به حالت ثابت و پیام مناسب می‌رود؛ touch/focus مختل نمی‌شود.

Reanimated گزینهٔ interaction بومی است؛ Rive/rig سبک برای شخصیت نیازمند compatibility/licensing spike است. تصویر ثابت، fake mic meter، shake بی‌هدف یا screenshotِ interface انیمیشن محسوب نمی‌شود. معیارهای عددی اولیه در [بودجهٔ عملکرد](19_PERFORMANCE_BUDGET.md) hypothesis هستند، نه اندازه‌گیری انجام‌شده.
'''),
'06_PEDAGOGY_FRAMEWORK.md':('چارچوب آموزشی', '''
## توالی الزامیِ قابل توجیه
۱ هدف measurable؛ ۲ context؛ ۳ توضیح تصویری؛ ۴ واژه؛ ۵ pronunciation guidance؛ ۶ مثال؛ ۷ گرامر مرتبط؛ ۸ guided practice؛ ۹ independent practice؛ ۱۰ شنیدن/گفتن مرتبط؛ ۱۱ comprehension check؛ ۱۲ explanation خطا؛ ۱۳ summary؛ ۱۴ scheduled review. omission هر بخش نامرتبط دلیل ثبت‌شده می‌خواهد.

## زبان و سنجش
توضیح فارسی ساده برای مبتدی، نمونهٔ طبیعی انگلیسی و افزایش تدریجی English-only؛ ترجمهٔ تحت‌اللفظی یا قانون گرامری بدون ذکر استثنای مرتبط کافی نیست. هر exercise به یک یا چند objective ID و معیار پذیرش پیوند می‌خورد. هدف با شرایط/رفتار/معیار تعریف می‌شود، نه احساس رضایت.

نمونهٔ طراحیِ هنوز تأییدنشده: «در موقعیت صبح، عبارت سلام مناسب را از میان گزینه‌های authored انتخاب کند و دلیل انتخاب را بفهمد». حدنصاب نهایی و distractorها با reviewer مشخص می‌شوند، نه برای سبزشدن تست.

خوداظهاریِ flashcard/record-and-compare با دانستن واقعی یا نمرهٔ رسمی یکی نیست. مرور باید هدف و دلیل را نشان دهد؛ سرعت پاسخ، لهجه و مدت بازبودن صفحه به‌تنهایی mastery نیستند.

۵۶ عبارت هدف موجود نیاز به بازنگری دارند. محتوای تازه و بررسی teacher/SME در A انجام نشده است. مرجع [curriculum map](../CURRICULUM_MASTER_MAP.md) و [QA](21_CONTENT_QA.md).
'''),
'07_CURRICULUM_MAP.md':('نقشهٔ curriculum و نگاشت legacy', '''
[نقشهٔ کامل](../CURRICULUM_MASTER_MAP.md) و [فهرست ۲۵ درس](../inventory/LESSON_INVENTORY.csv) مرجع هستند.

امروز: Pre-A1 یک دوره/۶ فصل/۲۵ درس؛ ۱۰۰ واژه/۲۵ پرسش/۶ گرامر/۸ فایل صوت. کاتالوگ seed هفت level دارد و فقط PRE_A1 ACTIVE است؛ «سطوح تعریف شده» را با «دورهٔ آمادهٔ A1–C2» جمع نکنید.

تبدیل آینده: module→chapter با mapping explicit؛ Unit author‌شده نه ساخت خودکار از index؛ lesson/exercise/vocab/objective ID پایدار، contentVersion جدا، legacy position ID به عنوان alias نگهداری شود. هیچ پیشرفت کاربر بر اساس عنوان جدید یا ترتیب تازه منتقل نشود.

SQLite اصلی دادهٔ آموزشی بیشتری دارد، اما ممکن است demo/fixture/private باشد؛ provenance و کیفیت قبل از import طبقه‌بندی شود. سناریوی محل کار و آتش‌نشانی track تخصصی موازی با prerequisite عمومی و expert review است؛ SOP واقعی به عنوان دستور عملیاتی app تلقی نشود.
'''),
'08_CONTENT_SCHEMA.md':('قرارداد طراحی محتوا', '''
**Design contract، نه schema validator پیاده‌شده.** قالب JSON قابل حمل با schemaVersion مستقل از contentVersion و appVersion پیشنهاد می‌شود. قرارداد semantic و validation در E/H ساخته خواهد شد.

| موجودیت | فیلدهای لازم پیشنهادی |
|---|---|
| PackageManifest | packageId، schemaVersion، contentVersion، supportedAppCapabilities، localeها، dependencyRefs، totalBytes/entryBytes، hashes، publisher/rights، review summary |
| Course/Chapter/Unit | stable ID، level/topic، titleهای locale، objective/prerequisite refs، order و release status |
| Lesson | stable ID، hierarchy refs، topic، objective refs، prerequisites، estimatedDuration، teachingBlocks، vocabulary/grammar/example/exercise/audio refs، assessmentCriteria، reviewItems، contentVersion، source/review |
| TeachingBlock | blockId/type/version، locale، content، mediaRefs، alt/transcript، requirement capability، fallback pedagogical |
| Exercise | exerciseId/type/version، objectiveRefs، prompt/context، answer schema، accepted answers یا rubric، explanation/distractors، score policy و accessible interaction |
| Vocabulary/Grammar | stable ID، زبان، معنی/IPA/examples، exceptions/notes، audio refs و review data |
| Media | assetId/hash، MIME، codec/dimensions/duration واقعی، size، variants، local relative path، alt/transcript، rights/provenance |
| ReviewRecord | contentVersion، reviewType، reviewer reference، timestamp، decision، corrections و evidence |

Validation: type و required fields؛ ID یکتا؛ refs موجود؛ graph بدون چرخهٔ نامجاز؛ known exercise capability؛ جواب و rubric معتبر؛ تطابق local paths/hash/size/MIME؛ rights/review معتبر؛ language tags؛ منع URI راه دور در packaged core. ورودی unknown/newer schema صریح reject شود، نه نمایش JSON خام یا حذف خاموش.

خود محتوا با executable code وارد نمی‌شود؛ HTML/script arbitrary مجاز نیست. import باید chunked و با کنترل فضای staging/rollback باشد. سقف تعداد کل درس/واژه نداریم؛ guardهای resource و archive expansion با ظرفیت واقعی و توضیح کاربر اعمال می‌شوند.

نمونه‌های آینده باید namespace آموزشی مشخص داشته باشند؛ هیچ reference ساختگی به مقاله، معلم، سازمان یا approval به عنوان واقعیت ثبت نمی‌شود.
'''),
'10_AUDIO_SPEECH.md':('معماری صوت و گفتار', '''
مرجع [audio architecture](../audio/AUDIO_SPEECH_ARCHITECTURE.md). امروز وب player و MediaRecorder دارد، ولی Native فقط Alert و فایل‌های جدا دارد. این تفاوت در migration حفظ شود، نه اینکه قابلیت وب به Native نسبت داده شود.

## قرارداد هدف
asset ID → local asset resolver → prepare → play/pause/replay/seek؛ progress از callback واقعی؛ speed فقط اگر platform adapter پشتیبانی و آزمون شود. هسته streaming نمی‌خواهد. missing/corrupt media، interruption، audio focus و headphone route خطاهای تعریف‌شده‌اند.

Recording: معرفی هدف/حریم خصوصی → consent → permission → recorder ready → recording واقعی → stop/finalize → local file metadata → replay/delete. permission granted با recording success یکسان نیست. قطع کار/فضای کم/میکروفون مشغول/deny باید recovery امن و پیام واضح بدهد. هیچ indicator جعلی یا ضبط پنهان.

Offline default: listen-and-repeat و record/self-comparison. browser SpeechRecognition یا وجود API key به معنی ASR آفلاین نیست. scoring خودکار unavailable تا موتور واقعی، زبان/مدل/دستگاه مرجع، rubric و accuracy evidence معلوم شود؛ transcription match امتیاز تلفظ نیست.

Recording upload خاموش و رضایت جدا می‌خواهد. فایل صوت خارج SQLite، metadata profile-scoped و حذف قابل اثبات است. پیش‌نمایش مرورگر قبلی و fake device آزمون فیزیکی میکروفون Android نیستند.
'''),
'11_OFFLINE_DATABASE.md':('دادهٔ آفلاین، مهاجرت و بازیابی', '''
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
'''),
'12_GAMIFICATION.md':('انگیزش مبتنی بر دادهٔ واقعی', '''
## مبنا
وب XP ledger، streak و badge rules دارد؛ Native عدد ثابت نمایش می‌دهد. قواعد وب candidate بازاستفاده‌اند و نیاز به parity/semantics review دارند. «زمان برآوردی تمرین» نباید زمان میکروفون یا یادگیری اندازه‌گیری‌شده نامیده شود.

## قرارداد هدف
XP transaction و achievement از learning event معتبر، profile-scoped و idempotent. sum ledger قابل بازسازی و cached totals قابل reconcile. UI فقط بعد از commit پاداش نشان می‌دهد؛ replay animation پاداش جدید نمی‌سازد. profile تازه باید صفر واقعی داشته باشد.

روز یادگیری با timezone/profile policy نسخه‌دار؛ تغییر منطقهٔ زمانی، DST، ساعت اشتباه، offline clock و event دیررس سناریوی تست‌اند. grace day یا freeze اگر انتخاب شود صریح باشد؛ با «روزهای متوالی» مبهم نمایش داده نشود.

daily goal اختیاری/قابل تغییر؛ mastery با آزمون/مرور و شواهد تعریف شود، نه صرفاً XP. self-rating و آزمون رسمی جدا؛ opening screen یا اجرای demo موفقیت آموزشی نیست.

تشویق محترمانه، بدون تحقیر/از دست‌دادن افراطی/اعلان اجباری. leagues فقط opt-in و بعد از privacy/enterprise review؛ رقابت سازمانی پیش‌فرض نیست. [طرح](../product/GAMIFICATION_SPEC.md)
'''),
'13_TEACHER_WORKSPACE.md':('فضای مدرس', '''
## قابل بازاستفاده
کد teacher صفحات، teaching service/access، session/recurrence، assignment/submission/review، attendance، note، plan و reports موجود است. وجود state و guards در کد قابل ثبت است؛ acceptance end-to-end جدید انجام نشده.

## مرز هدف
Teacher profile → assigned classes → learners → path/lesson/homework → assessment/review → feedback/progress/report. هر read/write نیاز به session معتبر + org/class/resource scope دارد. فایل/گزارش و pagination نیز همین scope را حفظ می‌کنند. هیچ private learner record داخل محتوای demo نیست.

قواعد: assignment به content version متصل؛ حذف/retire محتوا سابقهٔ تکلیف را نابود نکند؛ grade correction همراه دلیل و audit؛ feedback از AI احتمالی با برچسب و اختیار انسانی، نه official score خودکار. attendance از فعالیت app حدس زده نشود.

Native learner گزارش محلی غیررسمی دارد؛ teacher workspace آنلاین/سازمانی جداست. قابلیت instructor-only روی دستگاه شخصی، امنیت multi-user enterprise نمی‌سازد. K تا UI/logic/persistence/error/a11y/permission evidence کامل نشده، feature «complete» نمی‌شود.
'''),
'14_ENTERPRISE_ARCHITECTURE.md':('معماری سازمانی', '''
[Enterprise feature map](../ENTERPRISE_FEATURE_MAP.md) مرجع تفصیلی است.

Organization → Department → Team → Class → Learner هدف است. current LearningGroup فاقد teamId مستقیم است؛ existing catalog هشت access role روی سه base role دارد. organization administrator، training manager و platform administrator باید اختیار متفاوت و صریح داشته باشند.

## مرز اعتماد
local profile و client-sent role/score غیرقابل اتکا برای authorization/official assessment. server actor/tenant از session و data معتبر، target scope از رکورد واقعی. null legacy mapping با بررسی، نه backfill اولین org در محیط چندمشتری. cache، storage، export و webhook هم scope-aware.

## guardهای پذیرش
ماتریس role × tenant × class × resource؛ IDOR منفی، revocation، read/write/export/delete، pagination، bulk import، cross-tenant admin و audit failures. دو tenant synthetic فقط در محیط disposable مجاز؛ در این فاز ساخته نشدند.

Providerهای mock فعلی و ACK ناقص sync نباید به عنوان enterprise integration واقعی منتشر شوند. retention/deletion/backup policy با مشتری و الزامات قانونی تعیین شود؛ نه claim انطباق قانونی بدون ارزیابی. sync و server deployment نیازمند تصمیم/مجوز بعدی‌اند.
'''),
'15_ANDROID_BUILD.md':('طرح محصول‌سازی Android — نه دستور اجرای این فاز', '''
## امروز
APK/AAB در workspace یا archiveهای بررسی‌شده یافت نشد. EAS linking و Expo Doctor 17/17 در Windows گزارش شده‌اند؛ build log، artifact و device run ارائه نشده است. native lockfile اصلاح‌شدهٔ Windows در این محیط موجود نیست.

Sandbox: Node20.20.2، حدود1983MiB RAM، Java11؛ Gradle، Android SDK manager، adb و emulator یافت نشدند. build در A نه اجرا شده و نه موفق ادعا می‌شود. نسخهٔ JDK/SDK آینده باید با baseline انتخاب‌شده هم‌خوان باشد، نه صرفاً «Java نصب است».

## gate پیش از ساخت واقعی M
۱ reconciliation سورس/config/lock واقعی؛ ۲ runtime سازگار و dependency review؛ ۳ persistence/renderer/exercise/audio واقعی؛ ۴ assets و حقوق/manifest؛ ۵ identity/signing با مالکیت روشن؛ ۶ پشتیبان معتبر؛ ۷ محیط build مناسب و اجازهٔ هزینه/سرویس در صورت cloud.

APK برای نصب مستقیم با AAB فرق دارد. profile `android.buildType: apk` در config موجود است، اما config مدرک artifact نیست. پس از ساخت واقعی، نام/version/hash/تاریخ/محیط/log و signed status ثبت شود؛ keystore و رمز هرگز در chat/docs/repo قرار نگیرند.

## آزمون پذیرش
نصب تازه، cold start حالت هواپیما، تمام فایل‌های core، ثبت و restart/reboot، permission deny/allow، ضبط و replay واقعی، low-storage/import/restore، upgrade با دادهٔ قبلی، portrait/tablet/RTL/font scaling/reduced motion. debug با Metro جای release offline را نمی‌گیرد.

منبع رسمی: [Expo APK](https://docs.expo.dev/build-reference/apk/). هیچ build command برای اجرا در Phase A صادر نشده است.
'''),
'16_WINDOWS_ROADMAP.md':('نقشهٔ Windows', '''
Windows بعد از پذیرش Android و با ADR جدا. هیچ installer ساخته نشده است و فرمان‌های قدیمی Expo/EAS Windows راهنمای معتبر این پروژه نیستند.

| گزینه | اشتراک قابل انتظار | هزینهٔ پلتفرمی |
|---|---|---|
| React Native Windows | TS domain/content و بخشی از component concepts | native Windows project، toolchain، compatibility هر ماژول صوت/DB/motion؛ Expo pluginها خودکار پشتیبانی نمی‌شوند |
| Tauri + UI وب | domain/content و بخشی از UI وب | Rust، C++ Build Tools و WebView2؛ adapterهای filesystem/SQLite/audio و بسته‌بندی/updates جدا |
| Electron | TS و UI وب | همراه‌کردن Chromium/Node، اندازه/حافظه بیشتر؛ security sandbox/IPC جدا |

گام N: baseline feature contract → spike کوچک با source جدا → تست SQLite/audio/RTL/accessibility در release → اندازه‌گیری نصب/RAM/startup روی Windows واقعی → انتخاب → signing/installer → نصب/upgrade/uninstall با حفظ انتخابی داده.

CPU/GPU کاربر به معنی ظرفیت نامحدود نیست؛ RAM8GB را با build و emulator همزمان اشباع نکنیم. adapter مشترک interface دارد، نه فرض API یکسان در Android/Windows. server LMS یا static HTML را به نام installer معرفی نمی‌کنیم.

[RN Windows](https://microsoft.github.io/react-native-windows/docs/getting-started/) · [Tauri requirements](https://v2.tauri.app/start/prerequisites/)
'''),
'17_ACCESSIBILITY.md':('دسترس‌پذیری و متن دوطرفه', '''
این‌ها معیار طراحی/آزمون آینده‌اند، نه PASS فعلی.

- Persian navigation RTL؛ جمله و IPA انگلیسی LTR با language context. اعداد/زمان/علائم فنی به‌صورت کور mirror نشوند. متن مختلط و line-wrap با رشتهٔ واقعی طولانی بررسی شود.
- target حداقل48dp Android؛ font scaling سیستم و zoom، contrast هدف4.5:1 متن عادی/3:1 عناصر؛ تنها رنگ یا صوت برای correct/incorrect کافی نیست.
- label/state/hint و ترتیب خواندن TalkBack؛ heading معنادار، focus قابل مشاهده و بازگشت focus dialog، اعلان غیرمزاحم نتیجه.
- matching/drag با جایگزین tap یا keyboard، sentence-order با move-up/down، time limit با accommodation قابل بررسی.
- player با transcript/caption و کنترل قابل دسترس؛ recording indicator هم بصری هم متنی؛ mic غیرقابل استفاده نباید کاربر را مجبور به ارسال صوت کند.
- reduced motion و low tier معنی آموزشی را حفظ کنند؛ flash خطرناک و celebration مسدودکننده ممنوع.
- screen acceptance: phone portrait، tablet مرتبط، متن فارسی/انگلیسی، empty/loading/error/success/permission denied و کمبود فضا. گزارش هر مورد شامل device/OS/app version و روش واقعی است، نه screenshot حدسی.
'''),
'18_SECURITY_PRIVACY.md':('امنیت و حریم خصوصی', '''
## واقعیت و محدودیت
گزارش npm کاربر برای نصب Native Windows: **۴۹ مورد، شامل ۱ CRITICAL، ۲۲ HIGH، ۲۳ MODERATE و ۳ LOW**. این audit در فاز A بازاجرا نشد و به پروژهٔ وب تعمیم داده نمی‌شود. exploitability در APK یا محیط build جدا بررسی می‌شود؛ شدت به دلیل دشواری اصلاح یا toolchain بودن کم نمی‌شود. `--force` و downgrade/upgrade بی‌بررسی راه‌حل نیستند.

## تهدیدها و قرارداد هدف
- device lost/shared: profile separation، screen lock/PIN با محدودیت روشن؛ SecureStore کل DB را خودکار رمزگذاری نمی‌کند. encryption و portable backup با key management واقعی طراحی شوند.
- import مخرب: path canonicalization، منع symlink/Zip Slip، bounds منابع و manifest validation؛ hash اصالت ناشر نیست و trust signature جداست.
- tenant/IDOR: server-derived scope، deny-by-default، teacher assignment و آزمایش منفی؛ hidden URL یا filename تصادفی authorization نیست.
- content/audio privacy: mic permission و consent، recording محلی پیش‌فرض، upload جدا، retention/deletion قابل فهم؛ دادهٔ واقعی learner در demo ممنوع.
- supply chain: lock واقعی، provenance/SBOM و review vulnerability در copy؛ secrets در native binary/config/docs/repo ممنوع؛ TLS verification تضعیف نشود.
- exports: scope دقیق، جلوگیری از CSV formula injection، کمینه‌سازی داده، عدم افزودن secret/PII به logs.

Providerهای integration که موفقیت ساختگی می‌دهند و مسیر sync ناقص یافتهٔ HIGH ثبت‌شده‌اند. پوشش tenant فعلی به عنوان امن تأیید نشده؛ نشت تازه‌ای نیز بدون runtime evidence ادعا نشده است.

هیچ credential در A درخواست نشد. فایل‌های حساس از bundle حذف‌اند؛ DB backup خصوصی است. عدم یافتن الگوهای secret در خروجی محدود، گواهی ممیزی جامع امنیت نیست.
'''),
'19_PERFORMANCE_BUDGET.md':('بودجهٔ عملکرد و منابع', '''
## مبنای محیط
رایانهٔ گزارش‌شدهٔ کاربر: i5 نسل13، RTX3060 6GB، RAM8GB، SSD512GB. این benchmark نیست. sandbox مشاهده‌شده حدود1983MiB RAM و فاقد زنجیرهٔ Android است. دستگاه مرجع Android و فضای آزاد واقعی هنوز تصمیم بازند.

| حوزه | هدف اولیهٔ قابل ارزیابی، نه نتیجهٔ فعلی |
|---|---|
| تعامل Standard | هدف60fps؛ بودجهٔ frame حدود16.7ms؛ اندازه‌گیری missed frames |
| Low tier | کاهش layer/loop و decode، حفظ پاسخ‌گویی و منطق صحیح |
| شروع | cold/warm startup اندازه‌گیری شود؛ هدف اولیهٔ cold حدود3s روی دستگاه مرجع پس از انتخاب |
| حافظه | soft target اولیهٔ PSS حدود256MiB برای سفر core، قابل بازنگری با سنجش device؛ نه ضمانت فعلی |
| فهرست محتوا | virtualization/paging؛ همهٔ curriculum و تصویرها همزمان decode نشوند |
| رسانه | derivative مناسب viewport، lazy decode، audio preload محدود، pause off-screen |
| DB | index و query plan روی دادهٔ حجیم disposable؛ write transaction کوتاه؛ نه SQL روی UI thread |
| import | streaming/chunking و progress/cancel امن؛ staging و reserve براساس bytes واقعی |
| build Windows | incremental، اجرای سری jobهای سنگین، emulator/device متناسب باRAM؛ cloud با مجوز جدا |

بودجهٔ runtime/batch به معنی سقف total lesson/word/asset نیست. کتابخانهٔ بزرگ روی storage رشد می‌کند و فقط working set در RAM بار می‌شود. storage نامحدود وعده داده نمی‌شود؛ فضای اشغال و فضای لازم برای نصب/backup/rollback به کاربر نشان داده می‌شود. تمام اعداد provisional هستند و تنها بعد از اندازه‌گیری تصویب می‌شوند.
'''),
'20_RELEASE_MANAGEMENT.md':('مدیریت انتشار', '''
سه version مستقل: application، database schema و content package. release manifest باید source revision/hash، lock hash، runtime/build toolchain، artifact hash، content versions، permission changes، migrations و known limitations را پیوند دهد.

## gate
تست pure/domain، repository، UI واقعی، accessibility/RTL، audio/physical mic، airplane mode، restart/reboot، migration/restore، dependency/security review و حقوق محتوا جدا گزارش شوند. «doctor پاس شد»، «تنظیمات موجود است» یا «mock موفق شد» release gate نیست.

Source و reports قدیمی حفظ؛ نسخهٔ جدید در working copy و با backup قابل تأیید. Git بدون مجوز initialize نشود. CI file با اجرای CI یکی نیست. token/keystore/DB connection value در اسناد و source قرار نگیرد.

Artifact archive فقط artifact واقعی: APK/AAB/installer به‌همراه checksum/log/instructions و rollback/upgrade notes. تا build و نصب واقعی انجام نشده، فایلی با پسوند جعلی ساخته یا readiness اعلام نشود. محتوای retired برای تفسیر attempt تاریخی بر اساس policy نگهداری شود.

فاز A فقط ZIP مستندات و شواهد read-only می‌دهد؛ نه release نسخهٔ برنامه.
'''),
'21_CONTENT_QA.md':('کیفیت و چرخهٔ انتشار محتوا', '''
Draft → Linguistic review → Pedagogical review → Audio review → Expert review برای safety-critical → Approved → Published → Retired.

هر review نسخه‌دار، با actor معتبر، تاریخ، نوع review، نتیجه و اصلاحات است. AI نویسنده/کمک‌نویس احتمالی است، نه معلم تأییدکنندهٔ خودکار. source comment «original» یا «legally owned» به‌تنهایی پروندهٔ حقوق نیست.

## چک‌های پذیرش
- هدف قابل اندازه‌گیری، prerequisite روشن و تمرین مرتبط؛ پاسخ/دلیل/exception صحیح؛ جواب جایگزین و ابهام زبانی بررسی‌شده.
- ترجمهٔ طبیعی فارسی برای مبتدی؛ مثال متناسب با سطح و سن؛ ادعای C2 معادل native یا official certification ممنوع.
- audio transcript مطابق فایل، تلفظ/سرعت/نویز/مجوز/گوینده بررسی شود؛ نام فایل یا decoder success جای شنیدن انسانی نیست.
- تصویر با alt، حقوق، context و شخصیت ثابت؛ safety depiction با SME.
- refs/ID/version/hash و capability موتور معتبر؛ تمرین planned در package published قرار نگیرد.
- دادهٔ خصوصی و نام/اطلاعات واقعی learner در demo یا export content نباشد.

موجودی فعلی legacy draft است؛ ۲۵ درس به صرف حضور در source Approved نشده‌اند. خود آرشیو تاریخچهٔ reviewer و مدرک بررسی حرفه‌ای در این فاز ارائه نشد.
'''),
'22_ASSET_MANIFEST.md':('فهرست دارایی‌ها و provenance', '''
[ASSET_REGISTER.csv](../inventory/ASSET_REGISTER.csv) فهرست موجود و [نسخهٔ manifest](../assets/manifests/ASSET_MANIFEST.csv) برای مسیر knowledge base است.

۲۴۱ فایل media/image در scope: ۲۱۸ screenshot/evidence تاریخی، ۲۳ candidate برنامه. ۱۶ MP3 روی دیسک فقط ۸ فایل یکتا هستند؛ duplicateها با SHA برابر تأیید شدند. ۲ تصویر متفاوت لئو و derivative آیکون مربع موجودند؛ همان تصویر Native در icon/mascot تکرار شده است. PNGهای فعلی RGB و فاقد alpha‌اند.

manifest آینده: assetId/stable source reference، variantOf، content/character version، MIME/codec، ابعاد/مدت/byte size واقعی، checksum، layer/rig، locale، alt/transcript، تولیدکننده/منبع، license/consent، review statuses، platform variants و usage refs. هیچ license یا reviewer جعلی پر نشود.

source اصلی و derivativeها جدا نگهداری شوند؛ نبود فایل لایه‌دار با «source editable» پنهان نشود. screenshotها محصول illustration library نیستند. پشتیبان‌های صوت شخصی و uploads خصوصی داخل این manifest عمومی وارد نشده‌اند.

نقشهٔ تولید: [ASSET_PRODUCTION_PLAN](../planning/ASSET_PRODUCTION_PLAN.md). در A هیچ تصویر/صدا/animation تازه تولید نشده است.
'''),
'23_KNOWN_LIMITATIONS.md':('محدودیت‌ها و وضعیت صادقانه', '''
مرجع دقیق [KNOWN_ISSUES.csv](../inventory/KNOWN_ISSUES.csv) با ID، severity، evidence class و معیار رفع است.

- Native: پخش/ضبط Alert-only؛ پاسخ بدون persist؛ استریک/نشان ثابت؛ settings تنها state؛ renderer مثال/هشدار و grammar ناقص؛ stable IDs، migration، restore، multiple profiles و موتور exercise کامل غایب.
- وب: هسته‌های واقعی فراوان، اما integration providerهای شبیه‌سازی‌شده و ACK ناقص sync وجود دارند؛ امنیت multi-tenant کامل در A تأیید نشد.
- کپی اصلاح‌شدهٔ Windows و native lock در workspace نیست؛ ZIP قبلی native snapshot قدیمی است.
- audit کاربر شامل CRITICAL/HIGH حل‌نشده؛ این اسناد آن‌ها را رفع نکرده‌اند.
- بازبینی معلم/SME/حقوق asset، طراحی نهایی، animation rig، corpus A1–C2، installer/Android device verification موجود یا تأیید نشده.
- metadata/schema نام‌جدول برابر است، ولی migration tracking و schema/constraint equivalence کامل تأیید نشده.

درخواست «هر feature کامل» با تعداد جدول، route یا screenshot پاسخ داده نمی‌شود. FULLY_IMPLEMENTED تحت gate جدید فقط با مجموعهٔ شواهد UI/logic/data/error/a11y/docs/runtime مجاز است؛ این فاز چنین عنوان تازه‌ای به featureها نمی‌دهد.
'''),
'24_PHASE_ROADMAP.md':('نقشهٔ اجرایی و نگهداری مستندات', '''
[MASTER_PHASE_ROADMAP](../MASTER_PHASE_ROADMAP.md) جدول A–O و gate هر فاز را دارد. پس از A توقف؛ گام بعد B. زیرساخت L1 prerequisite C/E/F/G است و L2 پیش از M سخت‌سازی می‌شود؛ این تغییر وابستگی به‌صراحت ثبت شده، نه اجرای زودهنگام L.

| فاز | فصل‌های knowledge base که باید به‌روزرسانی نسخه‌دار شوند |
|---|---|
| B | 01،03،04،05،17،22،25 و design/ |
| C/C0 | 02،03،11،15،17،18،19،25 |
| D | 04،05،17،19،22 |
| E/F | 06،08،09،11،17،21 |
| G | 10،11،17،18،19،21،22 |
| H/J | 06،07،08،21،22،23 |
| I | 11،12،17،19 |
| K | 13،14،18،20،25 |
| L | 08،11،18،19،20 |
| M/N/O | 15،16،18،19،20،23 و تصمیم‌ها |

هر خروجی نسخه و evidence دارد؛ گزارش تاریخی overwrite نشود. دلیل NOT_TESTED و یافته‌های شدید در summary باقی بماند. قابلیت جدید planned تا آزمون لازم پذیرفته نشده به complete تبدیل نشود.
'''),
'25_DECISION_LOG.md':('دفتر تصمیم و تغییر', '''
مرجع canonical [PROJECT_DECISION_LOG](../PROJECT_DECISION_LOG.md) شامل ADR-A01 تا ADR-A20 است؛ وضعیت accepted scope/policy با implementation انجام‌شده فرق دارد.

## قالب تصمیم بعدی
شناسه، تاریخ/فاز، وضعیت، مسئله و شواهد، گزینه‌ها، trade-off، تصمیم‌گیر/تأیید واقعی، اثر source/dependency/data/privacy، مسیر migration/rollback، tests لازم و نتیجهٔ اجرا. فیلد تأیید reviewer یا stakeholder بدون رأی/مدرک واقعی پر نشود.

Openهای مهم: نسخهٔ واقعی Windows/lock، SDK baseline، انتخاب canonical art، ابزار motion، فونت و مجوزها، دستگاه مرجع Android، reviewer آموزشی/ایمنی، policy نقش/retention، flavor اینترنت/sync و پلتفرم Windows. هیچ‌کدام در A با تغییر بی‌اجازهٔ سورس حل نشده‌اند.

اگر سند قدیمی ادعای نادرست دارد، اصلاحیهٔ dated و ارجاع به اصل ثبت شود؛ تاریخچه پاک یا PASS قبلی به نتیجهٔ تازه تبدیل نشود.
'''),
}

exercise_rows=[
('۱','Multiple choice','رجیستری/ChoiceActivity/validator وب','شناسهٔ گزینه معتبر، feedback و commit واقعی'),
('۲','Image → word matching','matching متنی؛ نوع تصویری کامل تأیید نشده','image refs + alt، انتخاب/tap/keyboard و تطبیق روشن'),
('۳','Word → image matching','matching متنی؛ variant تصویری PLANNED','image key معتبر و feedback بدون وابستگی صرف به رنگ'),
('۴','Listening comprehension','LISTEN_AND_CHOOSE / assessment LISTENING','صوت واقعی، transcript accommodation و سؤال مرتبط'),
('۵','Audio → text matching','listen/type پایه؛ matching تخصصی PARTIAL','نگاشت asset/text pair و کنترل replay واقعی'),
('۶','Sentence ordering','WORD_ORDER','token IDs، ترتیب/تکرار واژه و جایگزین drag'),
('۷','Word arrangement','همان WORD_ORDER؛ دو engine مستقل شمرده نشود','گزینه‌های جابه‌جایی دسترس‌پذیر و validation توکن'),
('۸','Fill blanks','FILL_BLANK','accepted answers authored، normalization و دلیل'),
('۹','Translation','بلوک متن translation؛ exercise کامل تأیید نشده','چند پاسخ درست/rubric؛ exact-match کور کافی نیست'),
('۱۰','Error correction','corrector قاعده‌ای؛ exercise کامل PLANNED','خطای هدف و پاسخ/دلیل authored؛ بدون ادعای AI جعلی'),
('۱۱','True/false','TRUE_FALSE','boolean معتبر و توضیح پاسخ'),
('۱۲','Dialogue completion','بلوک DIALOGUE؛ تمرین اختصاصی PLANNED','context، turn، accepted choices/rubric'),
('۱۳','Conversation branching','قواعد tutor موجود؛ graph آموزشی PLANNED','graph بدون بن‌بست نامجاز و outcome قابل توضیح'),
('۱۴','Reading comprehension','READING display؛ assessment manual/choice ترکیبی','متن مرجع و پرسش مرتبط، مرز manual/auto روشن'),
('۱۵','Grammar transformation','grammar content؛ type اختصاصی PLANNED','constraint زبانی، پاسخ‌های معتبر و exception'),
('۱۶','Vocabulary recall','recognition/flashcard؛ recall آزاد PARTIAL','یادآوری از شناخت گزینه و confidence جدا'),
('۱۷','Flashcards','FLASHCARD وب','self-rating بدون نمرهٔ رسمی + persist review item'),
('۱۸','Spaced repetition','adaptive/review قواعد وب','policy نسخه‌دار و due-date پایدار؛ نه ادعای اثربخشی اثبات‌شده'),
('۱۹','Dictation','LISTEN_AND_TYPE','audio playback + accepted transcription authored'),
('۲۰','Pronunciation practice','SPEAKING_PROMPT/browser/external؛ scoring null','record/self-compare؛ no phonetic score تا موتور معتبر'),
('۲۱','Workplace scenarios','topic/tag و مثال محدود؛ دورهٔ حرفه‌ای کامل غایب','scenario/rubric + SME review برای ایمنی'),
('۲۲','Timed challenges','challenge/time-window زیرساخت؛ UI/type کامل تأیید نشده','monotonic timer، pause policy، accommodation و persistence'),
('۲۳','Mixed review','runner ترکیبی و mistake review؛ policy PARTIAL','انتخاب هدفمند نسخه‌دار، dedupe و توضیح دلیل مرور'),
]
exercise_table='| # | نوع | شاهد فعلی وب، نه ادعای قبول‌شدن | قرارداد هدف |\n|---|---|---|---|\n'+'\n'.join('| '+' | '.join(row)+' |' for row in exercise_rows)
docs['09_EXERCISE_ENGINE.md']=('موتور تمرین و سنجش', '''
در Native هیچ‌یک از ۲۳ نوع زیر به عنوان engine کامل تأیید نشده‌اند؛ QUESTION reveal آن‌ها را جایگزین نمی‌کند. در وب ۱۰ نوع activity ثبت‌شده و چند grader/renderer واقعی وجود دارد، اما فاز A runtime آن‌ها را بازاجرا نکرده است.

'''+exercise_table+'''

قرارداد مشترک هر نوع: actual interaction، answer schema/validation، feedback و explanation، score handling با `null` برای self/manual، state/persistence، error و accessibility. Unsupported type حق تولید score/progress/XP ندارد و باید در authoring/publication gate رد یا صریح planned باشد.

Practice، quiz و official assessment سه مقصد متفاوت‌اند. Offline بستهٔ جواب می‌تواند قابل مشاهده باشد؛ anti-cheat یا اعتبار رسمی از local score نتیجه‌گیری نمی‌شود. بهتر است grading قابل استخراج pure باشد و ذخیره از طریق M08؛ React DOM، Prisma و browser API به Native کپی مستقیم نشوند.

این جدول پوشش مطلوب و فاصلهٔ موجود است، نه ۲۳ feature پیاده‌شده.
''')

for name,(title,body) in sorted(docs.items()):put('docs/'+name,title,body)
assert len(docs)==26

expressions=['Neutral','Happy','Excited','Thinking','Confused','Teaching','Listening','Speaking','Celebrating','Encouraging','Sad after a mistake — no humiliation','Sleeping','Running','Jumping','Winning','Explaining a concept']
pose_table='| حالت | asset/runtime فعلی | تصمیم بعدی |\n|---|---|---|\n'+'\n'.join('| '+x+' | مجموعهٔ قابل اتکای مستقل یافت نشد؛ PLANNED | طراحی B، تولید/اتصال D با fallback |' for x in expressions)
put('design/LEO_CHARACTER_BIBLE.md','Leo Character Bible — Phase-A brief','''
این فایل brief و فهرست تصمیم‌های B است، نه character bible نهایی یا دارایی تولیدشده.

| محور | واقعیت موجود / قاعدهٔ طراحی بعدی |
|---|---|
| گونه/شخصیت | پلنگ دوستانه، firefighter-inspired؛ اصیل و محترمانه برای بزرگسال |
| تناسب بدن | دو rendering متفاوت؛ نسبت‌های عددی بعد از canonical turnaround تصویب شوند |
| صورت/چشم | وب چشم قهوه‌ای و بافت سه‌بعدی‌نما؛ Native چشم آبی و تخت؛ یکی باید canonical شود |
| خال خز | pattern ثابت، map لایه‌ها و استثنای زاویه‌ها در B تعریف شود |
| لباس | uniform قرمز/نوار روشن مرجع موجود؛ نشان واقعی سازمان بدون مجوز ممنوع |
| رنگ | palette/semantic و سایه‌ها نسخه‌دار؛ key colors هنوز تصمیم نهایی نیستند |
| مواد/نور | 2D layered گزینهٔ ترجیحی برای بررسی؛ یک سبک نور/بافت ثابت، نه fake 3D |
| حالت‌ها/pose | silhouette، دست/پا، گوش، tail و orientation در model sheet؛ لغزش identity ممنوع |
| animation | rig/layers/origin/bounds، نام‌گذاری state، event trigger و reduced pose |
| سازگاری | reference واحد، asset version، review checklist و approval واقعی قبل از derivative |

'''+pose_table+'''

دارایی فعلی flattened RGB است؛ alpha/PSD/rig وجود ندارد. source vector/layer واقعی و derivatives compressed باید در D تحویل شوند، نه یک تصویر بزرگ کشیده یا تکرار emoji. تصویرسازی تجهیزات/محیط خطر آموزش عملیاتی نیست و در context ایمنی به SME review نیاز دارد.
''')
put('design/DESIGN_SYSTEM.md','Design System — Phase-A contract','''
مرجع تفصیلی [docs/03_DESIGN_SYSTEM.md](../docs/03_DESIGN_SYSTEM.md) و [DESIGN_DIRECTION](../DESIGN_DIRECTION.md) است. رنگ/فونت/grid/radius/shadow/components/navigation/feedback/accessibility/motion/responsive در آن‌ها تعیین تکلیف اولیه شده‌اند.

در B خروجی مصوب tokens و screen states تولید خواهد شد؛ در C components واقعی ساخته می‌شوند. در A هیچ token اجرایی، stylesheet برنامه، فونت یا UI مشترک تازه وارد پروژه نشده است. نمونه‌های رنگ موجود صرفاً reference هستند؛ بازبینی contrast/RTL/screen-reader هنوز NOT TESTED است.
''')
put('design/ANIMATION_SPECIFICATION.md','Animation Specification — Phase-A contract','''
مرجع [ANIMATION_ROADMAP](../ANIMATION_ROADMAP.md) و [docs/05](../docs/05_ANIMATION_SYSTEM.md). هر motion: trigger، state diagram، input data، duration/easing token، interrupt/cancel، replay/dedupe، reduced/low fallback، screen-reader message و measurement plan.

تعامل و آموزش با disable animation نیز قابل انجام باشد. نتیجهٔ نمره/ذخیره ورودی animation است؛ motion نمی‌تواند موفقیت تولید کند. playback/recording gesture فقط پس از رویداد واقعی؛ نبود rig/asset به pose ثابت و پیام صادقانه منجر شود. این قرارداد پیاده‌سازی نشده است.
''')
put('design/references/README.md','مراجع بصری موجود','''
فقط مراجع داخل workspace: تصویر ماسکات وب، تصویر Native، آیکون مربع repair و brand markهای SVG. مشخصات و hash در [asset register](../../inventory/ASSET_REGISTER.csv) است. sourceها جابه‌جا یا overwrite نشدند و اینجا دوباره کپی نشده‌اند.

مقایسهٔ دو سبک در [DESIGN_DIRECTION](../../DESIGN_DIRECTION.md). هیچ stock، تصویر Duolingo یا asset جدید وارد نشده؛ انتخاب سبک و تولید reference مصوب متعلق به B است. screenshotهای تاریخی شاهد محدود اجرای گذشته‌اند، نه طرح مصوب محصول جدید.
''')
put('curriculum/PEDAGOGY_FRAMEWORK.md','Pedagogy Framework','''
مرجع canonical [docs/06](../docs/06_PEDAGOGY_FRAMEWORK.md). ۱۴ مرحلهٔ تدریس تا مرور، measurable objective، explanation فارسی برای beginner، نمونهٔ انگلیسی طبیعی و تفاوت rule/exception الزامی‌اند.

کد source دورهٔ فعلی نمی‌تواند به‌جای validation آموزشیِ reviewer استفاده شود. هر exercise باید objectiveRefs و نوع سنجش real/self/manual داشته باشد. ایمنی و workplace review جدا نیاز دارند. در A درس تازه، ترجمهٔ اصلاحی مصوب یا teacher approval ساخته نشده است.
''')
put('curriculum/CURRICULUM_MASTER_MAP.md','Curriculum Master Map — canonical pointer','''
نقشهٔ canonical در [CURRICULUM_MASTER_MAP.md](../CURRICULUM_MASTER_MAP.md) است. فهرست تک‌تک ۲۵ درس و دادهٔ موجود در [LESSON_INVENTORY.csv](../inventory/LESSON_INVENTORY.csv) و equality census در [CURRICULUM_CENSUS](../evidence/CURRICULUM_CENSUS.json).

Pre-A1 source فعلی حفظ می‌شود؛ A1–C2 و professional tracks PLANNED هستند. متادیتای reviewer، license و stable IDs نباید با مقدار فرضیِ Approved پر شوند. این پوشه برای قرارداد و طرح تولید محتواست، نه نسخهٔ جدید curriculum منتشرشده.
''')
put('audio/AUDIO_SPEECH_ARCHITECTURE.md','Audio and Speech Architecture','''
[docs/10_AUDIO_SPEECH.md](../docs/10_AUDIO_SPEECH.md) مرجع قرارداد است.

State machine پیشنهادی playback: IDLE → PREPARING → READY → PLAYING/PAUSED → ENDED؛ ERROR جدا. recorder: CONSENT_NEEDED → PERMISSION_REQUESTED → READY → RECORDING → FINALIZING → SAVED؛ deny/interrupted/full مستقل. انتقال به success فقط از promise/event واقعی و بررسی فایل خروجی؛ پیام Alert هیچ state را اثبات نمی‌کند.

Port شامل loadLocalAsset، play، pause، seek، replay، setRateIfSupported، requestPermission، beginRecording، stopRecording، replayLocalRecording و deleteRecording است. format/path/space/interrupt باید توسط adapter واقعی و تست device کنترل شود. config permission یا header MP3 معادل شنیدن موفق نیست.

Offline ASR/scoring فعلاً unavailable؛ خودارزیابی به‌وضوح برچسب بخورد. گوینده و حقوق ۸ فایل موجود باید پیش از انتشار review شوند. در A صوت جدید، voice audition، transcription یا اتصال provider انجام نشده است.
''')
put('product/GAMIFICATION_SPEC.md','Gamification Specification','''
مرجع [docs/12](../docs/12_GAMIFICATION.md). XP، badge، streak، هدف، record و review از learning event ذخیره‌شده و policy version مشتق می‌شوند؛ initial state صفر واقعی است. profile totals cache هستند، ledger حقیقت است.

برای هر reward: qualifyingEvent، idempotencyKey، مقدار/قاعدهٔ نسخه‌دار، proof source، scope profile، timestamp و reversal policy. timezone/grace-day و clock-skew آشکار؛ official grade از self-report/XP جدا.

آنچه در Native امروز دیده می‌شود (۳روز/۲نشان) واقعی نیست و feature کامل شمرده نمی‌شود. engine جدید در I پس از persistence واقعی F/L ساخته و آزمون می‌شود. اعلان و league اختیاری و غیرتنبیهی‌اند.
''')
put('assets/README.md','دارایی‌ها — موجودی و برنامه، نه تولید تازه','''
`manifests/ASSET_MANIFEST.csv` کپی متادیتای ثبت‌شدهٔ دارایی‌های موجود است؛ sourceهای اصلی، private uploads، screenshotها یا binaryهای جدید در این بسته دوباره توزیع نشده‌اند.

Production plan در [planning/ASSET_PRODUCTION_PLAN.md](../planning/ASSET_PRODUCTION_PLAN.md). assetId/version/variant/hash/rights/review و تمایز source/derivative لازم است. در A هیچ تصویر، صدا، انیمیشن، فونت یا شخصیت تازه تولید نشده است.
''')
source=OUT/'inventory/ASSET_REGISTER.csv'
with (OUT/'assets/manifests/ASSET_MANIFEST.csv').open('xb') as f:f.write(source.read_bytes())

put('planning/IMPLEMENTATION_STRUCTURE.md','طرح ساختار آینده','''
این tree فقط طراحی آینده است؛ جابه‌جایی فایل یا ساخت اپ تازه انجام نشده.

```text
apps/android                  # UI و composition بومی
apps/teacher-web              # workspace وب، در ابتدا حفظ LMS فعلی
apps/windows                  # آینده، پس از Android
packages/domain               # IDها، value objects، events و use cases
packages/content-contracts    # schema/version/validation قرارداد
packages/exercises            # validation/grading مستقل از platform
packages/review               # review و mastery policy
packages/design-tokens        # بعد از تصویب B/C
packages/ports                # DB/audio/files/clock/sync interface
adapters/android              # SQLite/audio/permissions/files
adapters/windows              # آینده و مستقل
content/packages              # source و releases با QA
assets/source / assets/derived
releases/manifests / docs / tests/isolated-fixtures
```

اصل: کمترین coupling؛ server Prisma/auth در Android import نشود؛ تمام pure-rule extractionها با parity test و preservation map. انتخاب monorepo tooling/package manager هنوز OPEN است؛ برای نام فولدرها وابستگی تازه نصب نشده و lock قدیمی بازتولید نشده است.
''')

screen_rows=[
('شروع/پروفایل','ساخت/انتخاب profile محلی بدون login اجباری','new/existing/locked/error'),
('خانه/امروز','یک اقدام اصلی و هدف واقعی','zero/loading/available/save-error'),
('مسیر/فصل/واحد','پیش‌نیاز و وضعیت content version','locked/unlocked/retired/missing'),
('کتابخانهٔ بسته‌ها','دیدن اندازه/نصب/حذف امن محتوا','not-installed/installing/space-full/corrupt'),
('lesson','آموزش ۱۴مرحله‌ای متناسب با درس','text/bidi/media-missing/unsupported'),
('vocabulary','معنی، IPA، مثال و audio واقعی','new/bookmarked/audio-error'),
('grammar','rule/example/exception در سطح مناسب','available/not-applicable/invalid'),
('exercise','تعامل واقعی هر type supported','selected/submitting/feedback/commit-failed'),
('lesson summary','پیشرفت/score واقعی و next/review','graded/self-rated/partial/save-failed'),
('review','دلایل مرور و برنامهٔ قابل‌فهم','empty/due/in-progress/error'),
('listening','پخش/seek/replay/speed feasible','loading/playing/paused/interrupted/error'),
('speaking','consent/record/replay/delete','denied/ready/recording/finalizing/saved/full'),
('progress','خلاصهٔ یادگیری و محدودیت شاخص','zero/data/estimated/not-enough-data'),
('achievements','ledger-backed reward','locked/earned/no-duplicate'),
('settings','زبان/theme/text/motion/sound پایدار','saved/saving/storage-error'),
('backup/import','انتخاب scope، validation و restore امن','preflight/staging/verified/conflict/failure'),
('teacher class/session','scope کلاس و حضور','empty/assigned/denied/stale'),
('teacher assignment/review','تکلیف نسخه‌دار و feedback','draft/published/submitted/reviewed/error'),
('organization reports','داده در scope با provenance','empty/permission-denied/export-error'),
('organization admin','org/dept/team/class/role/audit','empty/denied/pending/audit-failed'),
]
body='این نقشهٔ وظایف برای B است؛ wireframe یا screen نهایی پذیرفته‌شده نیست. هر ردیف باید در phone و tablet مرتبط، RTL/LTR، scaling و reduced motion بازبینی شود.\n\n| صفحه | هدف | stateهای لازم |\n|---|---|---|\n'+'\n'.join('| '+' | '.join(row)+' |' for row in screen_rows)
put('planning/SCREEN_PLAN.md','نقشهٔ صفحه‌به‌صفحهٔ پیشنهادی',body)

art=['Main mascot','Supporting characters','Classroom scenes','Workplace scenes','Fire station scenes','Industrial workplace scenes','City environments','Everyday conversation environments','Vocabulary illustrations','Grammar concept illustrations','Achievement artwork','Lesson backgrounds','Chapter completion artwork']
put('planning/ASSET_PRODUCTION_PLAN.md','طرح تولید دارایی‌ها', '''
در A هیچ art production انجام نشده است. اولویت کیفیت/consistency است، نه تولید یک‌بارهٔ تعداد زیاد تصویر. انتخاب count و release batches به نیاز آموزشی و ظرفیت QA وابسته است و سقف کل محتوا نیست.

| دسته | وضعیت فعلی | کار بعدی |
|---|---|---|
'''+ '\n'.join('| '+item+' | '+('دو rendering متفاوت ثابت؛ نه مجموعهٔ مصوب' if item=='Main mascot' else 'مجموعهٔ تولیدی مصوب یافت نشد')+' | brief B → حقوق/منبع → source لایه‌دار D/H → derivatives → review |' for item in art)+'''

فرایند: canonical reference و bible → sketch/turnaround → approval واقعی → layered master → pose/rig/state → optimized derivatives → transparency/size/contrast/accessibility check → manifest/rights/version. هیچ دارایی proprietary Duolingo یا stock نامشخص وارد نشود؛ output ابزار تصویر باید provenance و review داشته باشد. 3D فقط با توجیه و rig واقعی؛ اگر نه، 2D باکیفیت و motion لایه‌دار.

صدای آموزشی، sound effect، فونت و video نیز دارایی با حقوق/نسخه‌اند. screenshot تاریخی، emoji یا duplicate فایل به عنوان تولید هنری مستقل شمارش نشود.
''')
put('planning/VALIDATION_PLAN.md','طرح اعتبارسنجی آینده','''
این سند برنامهٔ تست است؛ اجرای تست برنامه در A نیست.

| لایه | شاهد لازم |
|---|---|
| domain/grade | ورودی معتبر/نامعتبر، چند پاسخ صحیح، null self/manual، deterministic result و parity قواعد بازاستفاده‌شده |
| repository | transaction rollback، dedupe، profile separation، migration از snapshot معتبر، corrupt/space-full |
| content | graph/ref/schema/rights/review validation، unknown/newer version، large batches و zip traversal/bomb |
| learner journey | درس→تمرین→feedback→progress→review، بازگشت/restart/reboot/airplane mode با data واقعی تست |
| audio | local file decode/play واقعی، pause/seek، deny/interruption/record/replay/delete؛ physical mic از fake device جدا |
| UI/a11y | phone/tablet RTL/LTR، TalkBack، text scaling، keyboard/dnd alternative، reduced/low tier |
| enterprise | roles/tenant/class scope، revoked session، cross-tenant IDOR، CSV/PDF permissions، audit failure |
| sync | duplicate/reorder/retry، conflict، clock skew، tombstones، no ACK before durable commit |
| release | artifact واقعی، install/upgrade، signing ownership، permission diff و offline launch بدون Metro |

همهٔ state-changing tests روی کپی/fixture دورریختنی با backup معتبر؛ DB اصلی read-only. هیچ تست از ضعف environment یا configuration به PASS تبدیل نشود. mock/simulated/real و NOT_TESTED با دلیل ثبت شوند؛ نتایج flaky تکرار تا سبز نشوند و assertions برای عبور تغییر نکنند.
''')
put('planning/UNAVAILABLE_ARTIFACTS.md','موارد غایب یا خارج از دسترس','''
- **کپی فعلی Windows**: package.json/package-lock.json/app.json و assetهای اصلاح‌شده در این محیط دریافت نشده‌اند. فایل قدیمی workspace/ZIP جایگزین آن فرض نشود.
- **APK/AAB/Windows installer**: هیچ artifact اجرایی در دامنهٔ بررسی یافت نشد؛ EAS linking/doctor به معنی build نیست.
- **device evidence**: Android emulator، adb و SDK/Gradle موجود نیست؛ physical microphone و حالت هواپیما/reboot اجرا نشدند.
- **canonical editable art**: layer/rig/turnaround و ۱۶ expression، font/video/animation package پیدا نشد؛ PNG RGB منبع شفاف/3D نیست.
- **review/legal records**: معلم/SME/گوینده/حقوق asset/approval معتبر در دسترس یا تأیید نیست؛ هیچ تأیید فرضی صادر نشده.
- **full CEFR content**: کاتالوگ A1–C2 وجود دارد، نه corpus کامل published آن سطح‌ها.
- **live infrastructure**: provider availability، CI execution، server/staging/production credentials و multi-org deployment بررسی نشده؛ هیچ host/credential/organization ساخته نشد.
- **source backups**: اصل فایل‌ها حفظ و hash شده و DB backup فشردهٔ جدا معتبر است؛ snapshot کاملِ restorable کل workspace یا سیستم Windows ساخته نشده. Snapshot پلتفرم محدود و best-effort است؛ برای تحول عمدهٔ آینده backup مستقل خارج از sandbox لازم است.

این‌ها نبودِ شواهد/دسترسی را بیان می‌کنند، نه مجوز حدس‌زدن محتوای artifactها.
''')
put('planning/REFERENCES.md','مراجع و نوع شواهد','''
منبع اول: فایل‌های واقعی workspace با hash در BASELINE_DISCOVERY، source index، schema metadata روی copy، curriculum census و report register. گزارش‌های قدیمی evidence تاریخی‌اند؛ پیام کاربر دربارهٔ Windows نوع USER_REPORTED است.

مراجع عمومی خوانده‌شده در ۲۰۲۶-۱۱-۰۴:
- [Expo APK](https://docs.expo.dev/build-reference/apk/) — فرق APK/AAB و وجود تنظیمات ساخت؛ نه شاهد artifact این پروژه.
- [Expo SDK upgrades](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) — ارتقای کنترل‌شده/مرحله‌ای؛ نه مجوز اجرای --force.
- [React Native Windows](https://microsoft.github.io/react-native-windows/docs/getting-started/) — پروژه/toolchain/module compatibility جدا برای Windows.
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) — Rust/C++ Build Tools/WebView2 برای مسیر Windows؛ هیچ‌کدام نصب نشده‌اند.
- [Council of Europe CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions) — چارچوب can-do و سطح‌ها؛ نه تأیید یا گواهی این curriculum.

منابع عمومی substitute آزمون code، review آموزشی یا موافقت حقوقی نیستند. هیچ reference ساختگی، منبع ثالث نامعلوم یا مشخصات credential در مستندات استفاده نشده است.
''')

trace=[
('0','ماموریت و مرز فاز','PRODUCT_VISION.md','A policy; product planned'),('1','حفاظت و موجودی','PROJECT_MASTER_INVENTORY.md','A discovery done'),('2','معماری ۲۰ مسئولیت / ۱۲ گروه','PROJECT_MASTER_ARCHITECTURE.md','A proposed architecture'),('3','هویت و art categories','design/LEO_CHARACTER_BIBLE.md','B/D planned'),('4','Design system','docs/03_DESIGN_SYSTEM.md','B/C planned'),('5','Animation engine','ANIMATION_ROADMAP.md','D planned'),('6','Pedagogy','docs/06_PEDAGOGY_FRAMEWORK.md','E/H planned'),('7','Curriculum/content factory','CURRICULUM_MASTER_MAP.md','Legacy inventory; H planned'),('8','۲۳ نوع تمرین','docs/09_EXERCISE_ENGINE.md','F planned; legacy mapping only'),('9','صوت/گفتار','audio/AUDIO_SPEECH_ARCHITECTURE.md','G planned'),('10','Gamification','product/GAMIFICATION_SPEC.md','I planned'),('11','حرفه‌ای/آتش‌نشانی','CURRICULUM_MASTER_MAP.md','J and expert review planned'),('12','مدرس','docs/13_TEACHER_WORKSPACE.md','Legacy web inventory; K planned'),('13','Enterprise','ENTERPRISE_FEATURE_MAP.md','K planned, tenant verification required'),('14','Offline/data/backup','docs/11_OFFLINE_DATABASE.md','Architecture only; L1/L2 planned'),('15','Windows','docs/16_WINDOWS_ROADMAP.md','N deferred after Android'),('16','Authoring/admin','docs/08_CONTENT_SCHEMA.md','M09 contract; implementation planned'),('17','پایگاه دانش ۲۶ فصل','README_FA.md','A documentation created'),('18','فازهای A–O','MASTER_PHASE_ROADMAP.md','A only, dependency gates documented'),('19','Definition of Done','docs/01_PRODUCT_REQUIREMENTS.md','Policy; no new complete feature claim'),('20','Visual gate','docs/17_ACCESSIBILITY.md','Plan, not tested'),('21','منابع/کارایی','docs/19_PERFORMANCE_BUDGET.md','Observed environment + provisional budgets'),('22','امنیت/حریم خصوصی','docs/18_SECURITY_PRIVACY.md','Inventory/planning; no remediation'),('23','۹ خروجی Phase A و توقف','README_FA.md','A deliverable scope'),('24','گزارش فارسی/تحویل فایل','docs/00_EXECUTIVE_OVERVIEW.md','A report/package')]
with (OUT/'planning/REQUIREMENTS_TRACEABILITY.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['directive_section','requirement','document','phase_status']);w.writerows(trace)
print('26 knowledge-base chapters and design/curriculum/audio/product/planning briefs created.')
