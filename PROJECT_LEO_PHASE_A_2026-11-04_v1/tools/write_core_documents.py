from pathlib import Path
import csv,json,re
from documentation_data import FEATURES,ISSUES,MODULES,PHASES
ROOT=Path('/home/user');OUT=ROOT/'PROJECT_LEO_PHASE_A_2026-11-04_v1'
base=json.loads((OUT/'evidence/BASELINE_DISCOVERY.json').read_text())
content=json.loads((OUT/'evidence/CURRICULUM_CENSUS.json').read_text())
db=json.loads((OUT/'evidence/SQLITE_PRESERVATION.json').read_text())

def put(name,text):
 p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x',encoding='utf-8') as f:f.write(text.strip()+'\n')

def table(headers,rows):
 def clean(v):return str(v).replace('|',' / ').replace('\n',' ')
 return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+'\n'.join('| '+' | '.join(clean(v) for v in row)+' |' for row in rows)+'\n'

common='> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱\n> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.\n'

# Additional migration-history observation from inspected metadata, not a migration attempt.
issues=list(ISSUES)+[('LEO-A-020','HIGH','CONFIRMED_METADATA / migration state unresolved','جدول tracking مهاجرت در کپی SQLite اصلی مشاهده نشد','evidence/SQLITE_PRESERVATION.json; prisma/migrations','C0/L1','پیش از هر تغییر آینده، baseline غیرمخرب بررسی شود؛ تطابق نام جدول‌ها معادل اعمال migration نیست.')]
with (OUT/'inventory/FEATURE_STATUS_MATRIX.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','feature','web_status','web_evidence','native_status','native_evidence','interpretation']);w.writerows(FEATURES)
with (OUT/'inventory/KNOWN_ISSUES.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','severity','evidence_class','finding','source','target_phase','acceptance']);w.writerows(issues)

inventory=f'''# PROJECT MASTER INVENTORY
{common}
## ۱. حکم اجرایی و روش بررسی

سه چیز را از هم جدا نگه می‌داریم: **آنچه در کد نوشته شده، آنچه زمانی گزارش شده، و آنچه اکنون واقعاً اجرا و تأیید شده است**. صرف وجود جدول، route، dependency یا دکمه، feature کامل محسوب نشده است.

- ۱٬۴۱۹ فایل در دامنهٔ غیرمسیرهای محرمانه، با اندازه و SHA-256 ثبت شد؛ این اصطلاح به معنی مجوز انتشار عمومی فایل‌ها نیست.
- ۷۶۸ فایل source/config با خواندن متن و استخراج ساختار بررسی شد. `src/` در مجموع ۶۲۰ فایل دارد؛ همه وارد فهرست فایل شده‌اند.
- تمام ۳۳۵ سند Markdown موجود در دامنه، خوانده و عنوان/سرفصل/نشانه‌های نتیجه‌شان ثبت شد. گزارش‌های منتخب و مسیرهای کلیدی جداگانه بازبینی شدند. این **بازاجرای ۳۳۵ گزارش یا ممیزی رفتاری کامل ۶۲۰ فایل نیست**.
- ۱۱۱ صفحه و ۲۰۹ route handler در Next.js شناسایی شد. ۳ handler مربوط به health/readiness‌اند؛ تعداد endpoint، تعداد feature تأییدشده نیست.
- ۲۴۱ فایل رسانه‌ای/تصویری: ۲۱۸ screenshot/evidence تاریخی و ۲۳ candidate دارایی برنامه. screenshotها تصویر محصول جدید یا مجموعهٔ تصویرسازی درس نیستند.
- ۵ ZIP بدون extraction بررسی شدند؛ CRC معتبر بودن با secret-free یا release-ready بودن یکسان نیست.
- فایل‌های حساس، تنظیمات حساب، کلیدها و محتوای خصوصی uploads/backups/e2e در خروجی عمومی بازنشر نشدند. کدهای آزمون e2e جدا از payloadهای داده بررسی شدند. dependency/cache/build directories و symlinkها از دامنهٔ کپی/خواندن خارج شدند.

جزئیات: [فهرست فایل‌ها](inventory/FILE_INVENTORY.csv)، [source](inventory/SOURCE_INDEX.csv)، [routes](inventory/ROUTE_INVENTORY.csv)، [گزارش‌ها](inventory/REPORT_REGISTER.csv)، [دارایی‌ها](inventory/ASSET_REGISTER.csv).

## ۲. پیاده‌سازی‌های مستقل موجود

| مجموعه | محل اصلی | واقعیت مشاهده‌شده | تصمیم حفاظت/بازاستفاده |
|---|---|---|---|
| LMS اصلی | `src/`, `prisma/`, `public/`, root manifests | Next.js App Router، React DOM، Prisma، UI و سرویس‌های گستردهٔ یادگیری/مدرس/سازمان | دست‌نخورده؛ مرجع منطق قابل استخراج و workspace وب آینده |
| نمونهٔ Android | `EnglishLearning-Offline/` | Expo/React Native، ۶ صفحهٔ اصلی + layout، SQLite کوچک و محتوای بسته‌بندی‌شده | prototype، نه محصول کامل؛ برنامهٔ رفع gap بدون بازنویسی فوری |
| اصلاح محلی Android | `EnglishLearning-Offline-Doctor-Fix-v1/` و ZIP متناظر | آیکون مربع و helper پشتیبان‌گیری/تغییر مسیر آیکون؛ نه نسخهٔ کامل اپ | نگهداری جدا؛ با سورس اصلی ادغام خودکار نشود |
| نسخهٔ اصلاح‌شده روی Windows کاربر | خارج از workspace | کاربر ورود/اتصال EAS، اصلاح config، نصب peerها، TS و Expo Doctor 17/17 را گزارش کرده | فایل‌های فعلی و lock در این محیط در دسترس نیستند؛ evidence نوع USER_REPORTED |
| مرورگرِ نمایش محتوا | `EnglishLearning-Features-Preview-v1.html` و پوشهٔ همراه | HTML جدا با محتوای واقعی و شرح نواقص؛ نه اجرای Native | فقط راهنمای محتوا؛ معیار پذیرش APK نیست |
| previewهای قدیمی | `preview/`, `netlify-demo/`, HTMLهای root، `phase66-gallery/` | نمونهٔ HTML، demo، gallery یا شواهد محدود | جدا از implementation محصول؛ حفظ برای تاریخچه |
| داده/آزمون/آرشیو | `backups/`, `e2e/`, `evidence/`, `prisma/` | SQLite و dumpهای تاریخی، fixture و screenshot | خصوصی/کنترل‌شده؛ نه محتوای عمومی یا دادهٔ demo مشتری |

**هیچ شاهدی مبنی بر یکپارچه‌شدن کامل LMS و Native وجود ندارد.** اشتراک محتوا و شباهت نام‌ها یکپارچگی هویت، permission، attempt، storage یا synchronization ایجاد نمی‌کند.

## ۳. A — منبع برنامه و نسخه‌ها

### LMS وب

- نام package: `englishbridge-lms`، نسخهٔ برنامه `0.1.0`.
- در lock موجود: Next **15.5.27**، React/React DOM **18.3.1**، Prisma/client **5.22.0**، TypeScript **5.9.3**، Tailwind **4.3.3**، ESLint **10.12.0**، PostCSS **8.5.29**، jose **5.10.0** و Zod **3.25.76**.
- `.nvmrc` برابر **22.23.3** و engines برابر `>=22.13.0 <23.0.0` است. Node فعال sandbox **20.20.2** است؛ به عنوان runtime مطابق معرفی نمی‌شود. Node 24 گزارش‌شدهٔ Windows هم با pin پروژهٔ وب یکی نیست.
- entry points: `src/app/layout.tsx`, `src/app/page.tsx`, `src/middleware.ts`, `src/instrumentation.ts`؛ layoutهای role-based و routeهای App Router.
- صفحات: ۴۲ teacher، ۳۴ admin، ۲۷ student و ۸ صفحهٔ مشترک/عمومی. state از React hooks و server/Prisma آمده؛ state موبایل به آن متصل نیست.
- سرویس‌های موجود: activities، assessment، adaptive، teaching، content، books، identity، communication، certificates، gamification، voice، ai، integrations، workflows، storage و backup.
- احراز هویت: JWT امضاشده در cookie httpOnly و بازاعتبارسنجی DB؛ نقش پایهٔ فعلی فقط `STUDENT / TEACHER / ADMIN` است. نقش‌های گسترده‌تر در access-role catalog تعریف شده‌اند.
- API wrapper، schema validation، guards و audit source دارند؛ پوشش واقعی سرتاسری امنیت در فاز A اجرا نشده است.
- `public/sw.js` عمدتاً app-shell/static cache و fallback دارد؛ LMS سرورمحور، محصول fully-offline محسوب نمی‌شود.
- migration scripts و scriptهای خطرناک قدیمی در package وجود دارند؛ هیچ‌یک اجرا نشده و `db:push/reset` برای دیتابیس مشترک مجاز نیست.
- workflow در `.github/workflows/` وجود دارد؛ فایل workflow اثبات اجرای CI یا دسترسی به runner/حساب نیست. Git repository محلی در root یافت نشد و ایجاد نشد.

### نمونهٔ Native موجود در workspace

- `expo ~51.0.28`, `expo-router ~3.5.23`, React **18.2.0**، React Native **0.74.5**، `expo-sqlite ~14.0.5` و `expo-av ~14.0.6` در manifest قدیمی.
- entry: `expo-router/entry`؛ `_layout.tsx` و صفحه‌های خانه، دوره‌ها، درس، نشانک‌ها، پیشرفت و تنظیمات.
- SQLite از طریق `lib/db.ts`؛ جدول‌های lesson_progress، vocab_bookmarks، quiz_attempts، exam_results، daily_goals و user_settings. داشتن شش جدول، شش جریان کامل نیست.
- `zustand` و `react-native-reanimated` در dependencies هستند؛ صرف declaration شاهد store یا animation engine واقعی نیست.
- `app.json` و `eas.json` برای Android/preview APK وجود دارند؛ permission میکروفون و مسدودسازی اینترنت در config قدیمی است. permission به معنی استفادهٔ واقعی از میکروفون یا اثبات offline نیست.
- نسخهٔ workspace هنوز config/آیکون/peerهای قبل از اصلاح Windows را دارد و **package-lock بومی در آن موجود نیست**. Source ZIP هم همین snapshot قدیمی است.
- تغییرات گزارش‌شدهٔ Windows: حذف project ID نمونه و plugin نامعتبر SQLite، اتصال EAS، آیکون مربع، افزودن expo-linking/expo-status-bar/expo-font، TS ~5.3.3؛ فایل‌های نهایی آن دستگاه تحویل نشده‌اند. هیچ شناسه یا اطلاعات حساب در این اسناد کپی نشده است.

## ۴. B — موجودی آموزشی و تفاوت منابع

| منبع | شمارش واقعی | تفسیر |
|---|---|---|
| seed TypeScript و JSON Native | ۱ دوره، ۶ فصل، ۲۵ درس | درخت داده با parser داده‌ای، بدون اجرای TypeScript، **برابر** تشخیص داده شد |
| واژه‌ها | ۱۰۰ واژهٔ یکتا | همگی translation، phonetic و exampleSentence دارند |
| گرامر | ۶ یادداشت | عمدتاً انگلیسی، همراه برخی معادل‌های فارسی؛ مرور تخصصی تأیید نشده |
| پرسش | ۲۵ بلوک QUESTION | پاسخ آماده؛ بانک آزمون نمره‌دار Native نیست |
| مثال | ۳۵ بلوک EXAMPLE / ۱۳۷ مثال | جدا از ۱۰۰ مثال واژگان؛ نباید دوباره به‌عنوان درس شمرده شوند |
| بلوک‌های دیگر | ۲۹ heading، ۱۸ text، ۱۵ tip، ۳ warning | نمایش همهٔ انواع در Native کامل نیست |
| هدف آموزشی | ۵۶ عبارت هدف | همه measurable نیستند؛ مثلاً احساس آمادگی، معیار ارزیابی مستقل ندارد |
| بستهٔ صوت | ۸ فایل MP3 یکتا، در دو محل کپی شده | ۱۶ فایل روی دیسک به معنی ۱۶ فایل آموزشی مستقل نیست |
| سطح‌ها در seed | Pre-A1 تا C2 تعریف شده | تنها Pre-A1 ACTIVE؛ تعریف کاتالوگ برابر ساخت دوره‌های A1–C2 نیست |
| SQLite اصلی، فقط aggregate | ۷ level، ۴ course، ۹ module، ۳۹ lesson، ۱۱۸ vocabulary، ۷۱ activity، ۵۷ question، ۴ assessment، ۱ unit | مجموعه‌ای بزرگ‌تر و متفاوت از JSON؛ ممکن است legacy/test/private داشته باشد. بدون provenance و review وارد بستهٔ تجاری نمی‌شود |

جزئیات هر درس در [LESSON_INVENTORY.csv](inventory/LESSON_INVENTORY.csv) و نتیجهٔ برابری در [CURRICULUM_CENSUS.json](evidence/CURRICULUM_CENSUS.json).

در ۲۵ درس JSON، هیچ `id` پایدار صریح و هیچ فیلد `audio` وجود ندارد. ID فعلی از course و اندیس‌ها ساخته می‌شود. مسیر `Level→Course→Chapter→Unit→Lesson` هدف آینده است؛ module قدیمی عمدتاً به chapter نگاشت می‌شود، اما unit و prerequisiteها باید صریح authored شوند، نه از ترتیب آرایه حدس زده شوند.

ویدئو یا مجموعهٔ تولیدی illustration/animation/font bundled در دامنهٔ بررسی یافت نشد. نمونه‌های انگلیسی آتش‌نشانی و topic tag موجودند؛ مسیر تخصصی تأییدشدهٔ ایمنی یافت نشد.

## ۵. C — دارایی‌های بصری و رسانه‌ای

- وب: `public/images/englishbridge-firefighter-mascot.png`، **1376×768، RGB**؛ تصویر سه‌بعدی‌نما با چشم قهوه‌ای و پس‌زمینه، نه مدل سه‌بعدی یا rig.
- Native: `assets/mascot.png` و `assets/icon.png`، **1408×768، RGB** و hash یکسان؛ تصویرسازی تخت با چشم آبی و لباس قرمز. تصویر icon اولیه مربع نیست.
- repair: `icon-square-v1.png`، **1024×1024، RGB**؛ derivative همان شخصیت، نه منبع لایه‌دار جدید.
- این سه PNG هیچ‌کدام alpha واقعی ندارند. PNG بودن به‌تنهایی transparency نیست.
- سه SVG icon در برنامه/preview و brand mark در کد موجود است؛ خانوادهٔ کامل icon/illustration نیست.
- PSD/AI/Blend/GLB/GLTF/Rive/Lottie، فونت bundled و video در دامنهٔ قابل بررسی یافت نشد.
- ۲۱۸ screenshot تاریخی را نباید illustration، حالت شخصیت یا تأیید بصری محصول جدید شمرد.
- حقوق انتشار تجاری، سوابق تولید، گوینده/رضایت و بازبینی صوت/ترجمه مستقل تأیید نشده‌اند؛ provenance در manifest باید تکمیل شود.

## ۶. D و E — وضعیت قابلیت‌ها

واژگان وضعیت: `CODE` یعنی مسیرهای واقعی کد دیده شده؛ `PARTIAL` یعنی قرارداد کامل نیست؛ `VISUAL_ONLY` یعنی نمایش بدون منطق واقعی؛ `PLACEHOLDER/SIMULATED` یعنی رفتار نمونه؛ `MISSING` یعنی در مجموعهٔ مورد بررسی یافت نشد؛ `SERVICE_DEPENDENT` یعنی به سرویس/قابلیت خارجی وابسته؛ `NOT_TESTED/NOT_REVALIDATED` یعنی در این فاز اجرا نشده است.

**هیچ feature را صرفاً با این بررسی static، تحت quality gate جدید FULLY_IMPLEMENTED اعلام نمی‌کنیم.** دارایی موجود، code-complete candidate و نتیجهٔ runtime جدا هستند.

{table(['ID','قابلیت','وضعیت وب','وضعیت Native'],[(f[0],f[1],f[2],f[4]) for f in FEATURES])}

مسیرهای شواهد و توضیح تک‌تک موارد: [FEATURE_STATUS_MATRIX.csv](inventory/FEATURE_STATUS_MATRIX.csv). رجیستری وب ۱۰ activity type دارد؛ speaking/flashcard خودارزیابی‌اند. assessment وب ۶ نوع auto-grade و چند نوع دستی دارد. این قابلیت‌های وب به Native منتقل نشده‌اند.

## ۷. اشکال‌های مهم و وضعیت رفع

{table(['شناسه','شدت','نوع شواهد','یافته','فاز هدف'],[(i[0],i[1],i[2],i[3],i[5]) for i in issues])}

همهٔ موارد این فهرست در فاز A **صرفاً ثبت** شده‌اند؛ رفع انجام نشده است. یافتهٔ امنیتی مربوط به audit کاربر، وضعیت همان نصب Windows است، نه audit تازهٔ LMS یا اثبات exploitable بودن APK. موارد conditional/unverified با confirmed source defects مخلوط نشده‌اند.

## ۸. حفاظت و دیتابیس

- SHA-256 فایل اصلی پیش و پس از کپی: `{db['source_sha256_before']}`.
- یک نسخهٔ فشردهٔ خصوصی ایجاد شد؛ بازکردن آن با byte hash برابر بود. روی کپی جدا `integrity_check=ok` و تعداد نقض foreign key برابر صفر بود.
- ۲۱۳ جدول در کپی دیده شد؛ ۲۱۳ مدل در هر سه schema Prisma موجودند. تطابق نام جدول‌ها برقرار است، **نه اثبات کامل تطابق ستون/ایندکس/constraint**.
- جدول `_prisma_migrations` در این کپی دیده نشد؛ داشتن SQL history روی دیسک، اعمال آن روی این DB را ثابت نمی‌کند.
- هیچ دادهٔ کاربر، account row، credential، متن ضبط‌شده یا backup خصوصی در ZIP مستندات قرار ندارد.
- SQLite/PostgreSQL histories، lockfile و Node pin فقط خوانده شدند؛ provider تغییر نکرد. PostgreSQL راه‌اندازی/مهاجرت/restore نشد.
- این اعتبارسنجی backup، drill کامل recovery برنامه یا restart/reboot آزمون Native نیست.
- کل workspace کپی مجدد نشد؛ فایل‌های فعلی حفظ و fingerprint شدند. archiveهای قبلی نگه داشته شدند و جایگزین snapshot فعلی/کپی Windows معرفی نمی‌شوند.

## ۹. آرشیو، تاریخچه و تناقض‌های مستند

335 سند تاریخی شاخص‌گذاری شده‌اند؛ PASSهای محدود فازهای قدیمی، failed/blockedها، mock device و simulatorها در register از اجرای واقعی امروز جدا هستند. مثلاً گزارش‌های ۴۸/۴۹/۵۰ روش‌های provider-disabled، simulated device و mocked API را جدا ذکر می‌کنند؛ این‌ها اثبات microphone فیزیکی امروز نیستند. گزارش‌های ۶۲ تا ۶۴ به کمبود منابع و release gates محدود اشاره دارند.

گزارش قدیمی Native ادعای «۱۵ بخش کامل» و فرمان مستقیم Windows داشت؛ سورس فعلی آن ادعاها را پشتیبانی نمی‌کند. آن گزارش **حفظ** شده و سند حاضر اصلاحیهٔ جداگانه است. `eas build --platform windows` یا `expo run:windows` مسیر ساخت این پروژه نیست؛ Windows تصمیم جدا دارد.

نام‌هایی مانند uploads/backups در مسیر source API باعث positive کاذب اسکن اسامی archive شده‌اند؛ عدد `protected_members` در register، heuristic است نه اثبات افشای داده. نتیجهٔ بازبینی در [ARCHIVE_TRIAGE.json](evidence/ARCHIVE_TRIAGE.json) آمده است. هیچ archive قدیمی به عنوان secret-audited تضمین نشده است.

## ۱۰. موارد در دسترس نیست / تأیید نشده

کپی فعلی Windows و lock Native، APK/AAB یا installer Windows، emulator/device run، build log موفق Native، پروژهٔ لایه‌دار شخصیت، motion rig، glyph/font package، مجوزها و سوابق reviewer معتبر، corpus کامل A1–C2، اتصال واقعی providerهای خارجی، staging/production زنده و تست کامل چندسازمانی در فاز A در دسترس یا تأیید نیستند. برای آن‌ها داده/مدرک ساخته نشده است.

گام بعد: [نقشهٔ فازها](MASTER_PHASE_ROADMAP.md) و **فاز B فقط پس از پذیرش این موجودی**. تغییر فنی بعدی ابتدا C0 و نسخهٔ isolated خواهد بود.
'''
put('PROJECT_MASTER_INVENTORY.md',inventory)

architecture=f'''# PROJECT MASTER ARCHITECTURE
{common}
## ۱. تصمیم کلان

معماری پیشنهادی **modular monolith در کلاینت + لایهٔ اختیاری وب/سازمان** است، نه microserviceهای زودهنگام. Android اولویت است. Next.js LMS حفظ می‌شود و کاندیدای workspace مدرس/سازمان است؛ تبدیل آن به یک WebView ساده، قابلیت‌های بومی و دادهٔ آفلاین را خودبه‌خود ایجاد نمی‌کند.

برای Android، ادامهٔ مسیر React Native/Expo **پس از انتخاب baseline نگهداری‌شده و سازگار** کم‌هزینه‌تر از بازنویسی فوری Kotlin/Flutter است: TypeScript، محتوای مشترک و تجربهٔ موجود قابل حفظ‌اند. این انتخاب به معنی تأیید امنیت SDK 51 نیست. نسخهٔ دقیق آینده، dependency tree، native audio، SQLite و ابزار motion باید در C0 با کپی و lock واقعی بررسی شوند. هیچ نسخه یا dependency در فاز A عوض نشده است.

### گزینه‌ها و trade-off

| گزینه | سود | هزینه/ریسک | تصمیم A |
|---|---|---|---|
| React Native + Expo سازگار | Android native، TS مشترک، مسیر asset و SQLite | ارتقای SDK و سازگاری native modules؛ Windows مستقیم نیست | ترجیح معماری؛ baseline دقیق باز |
| Next.js/PWA یا Capacitor | استفاده از بخشی از UI وب | server dependence، تفاوت فایل/DB/صوت، offline نبودن خودکار | LMS حفظ؛ جانشین بی‌بررسی اپ نیست |
| Kotlin native | کنترل کامل پلتفرم | بازنویسی UI/منطق، هزینهٔ تیم/دوپلتفرمی | فعلاً رد؛ فقط با شواهد نیاز جدی |
| Flutter | UI چندپلتفرمی | بازنویسی Dart و آزمون مجدد همهٔ منطق | فعلاً رد؛ سود فعلی کافی نیست |
| RN Windows / Tauri / Electron | مسیرهای واقعی desktop | adapter و toolchain و رفتار مجزا | ADR در فاز N، نه تأخیر Android |

## ۲. دوازده ماژول اصلی و نگاشت ۲۰ زیرسامانهٔ درخواست

دوازده مورد زیر «گروه محصول» هستند؛ بیست مسئولیت منطقی کاربر حذف نشده‌اند و می‌توانند packageهای کوچک مستقل داشته باشند.

{table(['گروه','نام','زیرسامانه‌ها','شمارهٔ فهرست ۲۰گانه','مرز مسئولیت'],MODULES)}

## ۳. جریان اتصال

```text
M09 Authoring / QA / Asset Manifest
              |
              v
M03 Versioned Curriculum & Learning Path
              |
              v
M04 Teaching / Vocabulary / Grammar <----> M06 Local Audio / Recording
              |
              v
M05 Exercise / Assessment
              |
              v
M08 Atomic local commit: attempt + progress + review + XP event + optional outbox
        |                       |
        v                       v
M07 Motivation / Review      M12 Optional Sync <--> M10 Teacher <--> M11 Organization / Reports

M01 Shell + Design + Motion surrounds the learner journey.
M02 Local profile scopes every learner read/write; server roles stay server-authoritative.
```

M01 فقط intent و view model دارد؛ SQL یا provider secret در component مجاز نیست. M03/M04/M05/M07 قوانین دامنهٔ مستقل از React/Next دارند. M06/M08 پشت portهای platform-specific هستند. M10/M11 server-side باقی می‌مانند؛ نبود شبکه نباید درس یا ذخیرهٔ محلی را از کار بیندازد.

## ۴. قراردادهای اصلی پیشنهادی — هنوز پیاده نشده

| قرارداد | ورودی/خروجی | invariant |
|---|---|---|
| ContentRepository | stable content ID + version → immutable teaching/exercise data | index آرایه ID نیست؛ unknown schema صریح reject شود |
| GradeExercise | exercise definition + validated answer → feedback/result | خودارزیابی `score=null`؛ پیش‌نویس یا نوع پشتیبانی‌نشده امتیاز نمی‌گیرد |
| CommitAttempt | attempt ID + profile ID + content version + result | dedupe و atomicity؛ UI فقط پس از commit موفقیت نشان می‌دهد |
| ProgressProjection | event ledger → progress/mastery summary | تغییر نمایش یا animation نباید data source حقیقت باشد |
| ReviewScheduler | objective/item ID + واقعی/خوداظهاری بودن پاسخ + policy version | تاریخ محلی/UTC و قواعد مرور نسخه‌دار؛ ادعای الگوریتم علمی تأییدنشده نکن |
| AudioPort | asset ID / consent → prepare/play/pause/seek/record/stop | وضعیت از event واقعی؛ محرومیت permission با success اشتباه نشود |
| ProfileRepository | local profile → settings/bookmarks/progress scope | جداسازی پروفایل در تمام queryها و حذف انتخابی |
| BackupPort | consistent snapshot + manifest → export/validate/restore | اعتبارسنجی پیش از activation؛ خطای import دادهٔ فعلی را پاک نمی‌کند |
| SyncPort | committed outbox + base revision → explicit ack/conflict | ACK تنها بعد از ذخیرهٔ پایدار؛ replay بدون duplicate score |
| AccessPolicy | authenticated actor + target tenant/group/resource → decision | مجوز با دانستن URL یا client role ساخته نمی‌شود |

دامنهٔ خطاها حداقل `ValidationError / UnsupportedVersion / PermissionDenied / MissingAsset / StorageFull / CorruptPackage / Conflict / ProviderUnavailable` است. پیام واضح و retry امن لازم است؛ خطای DB/auth را به‌طور عمومی به 404 تبدیل نمی‌کنیم.

## ۵. مرز داده و تراکنش

سه حوزه جدا: **محتوای نسخه‌دار و عمدتاً immutable**، **دادهٔ mutable یادگیرنده**، **cache/temporary media**. نسخهٔ app، schema DB و content package سه عدد متفاوت‌اند. آداپترهای Android/Windows هرکدام capability و migration tests خود را دارند.

هدف جدول‌های محلی: profiles، settings، installed_packages، content_index، attempts، answers، lesson_progress، bookmarks، review_schedule، learning_events، xp_ledger، achievements، daily_goals، recordings_metadata، migration_history و outbox اختیاری. این نام‌ها طراحی‌اند؛ فایل migration یا schema اجرایی تازه ایجاد نشده است.

مسیر ثبت پاسخ: validate → grade → begin transaction → insert attempt با unique id → answers/result → events → projection/review/XP → outbox در صورت فعال‌بودن → commit → feedback/motion. fail قبل از commit نباید نمره، نشان، تکمیل یا پیام «ذخیره شد» تولید کند. فایل ضبط بیرون DB و metadata داخل DB است؛ عملیات فایل با staging/commit و cleanup قابل بازیابی هماهنگ می‌شود.

هیچ record محلیِ learner-controlled به‌تنهایی نمرهٔ رسمی سازمان نیست. تمرین offline می‌تواند محتوای پاسخ را در بسته داشته باشد؛ ضدتقلب/گواهی رسمی نیاز به trust model و ارزیابی جدا دارد.

## ۶. بستهٔ محتوا و import

بسته شامل manifest، نسخهٔ schema/محتوا، حداقل app capability، لیست dependencyها، content JSON، media index، hash/size/license/review data و در انتشار رسمی امضای ناشر معتبر است. **hash تنها اصالت ناشر را ثابت نمی‌کند**. همهٔ pathها نسبی و canonical؛ path traversal، symlink و archive bomb رد شوند.

روند: preflight فضا → staging → validation ارجاع/چرخه/نسخه/hash/review → import تراکنشی → activate pointer → نگهداری نسخهٔ لازم برای attemptهای قبلی. تعداد درس/واژه/فایل محدودیت قراردادی ثابت ندارد؛ import batch و RAM budget محدود و قابل‌تنظیم است. اگر فضا کم باشد، خطا و انتخاب کاربر؛ نه reset یا overwrite خاموش.

## ۷. پروفایل، teacher و tenant

- پروفایل تک‌دستگاهی، account چندکاربرهٔ سازمانی نیست و login server را شبیه‌سازی نمی‌کند.
- مدل فعلی وب: Organization با org referenceهای nullable/legacy؛ helper در وضعیت تک‌سازمانی برای target نامعلوم استثنا دارد؛ SUPER_ADMIN برای برخی cross-tenant accessها مسیر audit دارد. در کپی اصلی یک سازمان شمرده شد. این، آزمون multi-tenant نیست.
- هدف server: organizationId اجباری در aggregateهای tenant-owned؛ workspace و query و cache و file permission همگی scope-aware. legacy null باید quarantine/explicit mapping شود، نه انتساب به اولین سازمان.
- Organization admin با platform administrator برابر نیست. teacher فقط کلاس/دانش‌آموز assigned؛ training manager فقط دامنهٔ آموزشیِ داده‌شده. roleهای client یا UUID/URL قابل حدس مرجع اعتماد نیستند.
- backend helpers فعلی از نظر پوشش callerها و default grants باید در کپی disposable بازبینی شوند؛ mapping نقش‌های قدیمی نباید اختیار بیشتری بدهد.

## ۸. Sync — اختیاری و جدا

| نوع داده | سیاست پیشنهادی |
|---|---|
| package محتوا | ناشر authoritative؛ نسخهٔ جدید immutable، نه merge متن تصادفی |
| attempts/events | append-only با idempotency key، origin/device و content version |
| نمرهٔ رسمی / role / assignment | server-authoritative؛ دادهٔ offline self-report با provenance جدا |
| settings/bookmark | base revision و conflict قابل‌نمایش؛ clock دستگاه به‌تنهایی داور نیست |
| progress/XP | projection رویدادهای معتبر؛ جمع‌کردن totals دو دستگاه ممنوع |
| حذف | tombstone/retention policy؛ جلوگیری از زنده‌شدن دوبارهٔ داده در reconnect |
| recording | پیش‌فرض محلی؛ ارسال تنها با رضایت جدا، سیاست نگهداری و مقصد روشن |

endpoint قدیمی `/api/sync` جای این قرارداد کامل نیست. منطق fake-success مورد LISTENING_ATTEMPT باید قبل از adoption رفع شود. ممنوعیت فعلی INTERNET در manifest Native نیز با sync آینده ناسازگار است؛ flavor/permission/opt-in باید ADR جدا داشته باشد، نه حذف خاموش permission policy فعلی.

## ۹. مرزهای بازاستفاده

**Extract candidate:** schemas و grading/rules خالص، normalization، event semantics، review policy، curriculum و assetهای دارای provenance. **Adapt:** React DOM components، audio browser، storage provider، teacher routes. **Preserve but do not port directly:** Prisma client، server credentials، auth cookies، organization DB، browser speech APIs. **Do not promote:** Alert-only buttons، providerهای simulated، success بدون commit، HTML preview به عنوان اپ.

ساختار پیشنهادی آینده، فقط blueprint:

```text
apps/android/        apps/teacher-web/        apps/windows/  [future]
packages/domain/     packages/content-contracts/  packages/exercises/
packages/learning/   packages/review/             packages/design-tokens/
packages/ports/      adapters/android/            adapters/windows/
content/packages/    content/review/              assets/source-and-derived/
docs/                tests/isolated-fixtures/     releases/manifests/
```

فولدرهای اجرایی فوق در این فاز ایجاد یا پر نشده‌اند. source اصلی جابه‌جا نشد. قبل از extraction باید API parity، دادهٔ مرجع، تست منفی و نقشهٔ migration ثبت شوند.

## ۱۰. دروازهٔ فنی پیش از C

C0: فایل‌های واقعی و غیرحساس Windows و lock آن دریافت/تطبیق؛ runtime مناسب هر پروژه بدون دستکاری engines/.nvmrc قدیمی؛ triage وابستگی‌ها در کپی؛ انتخاب SDK/SQLite/audio/motion سازگار؛ حفظ نسخهٔ اصلی و migration histories؛ no force/no reset. Android release تنها پس از نصب و سناریوی airplane/restart/reboot/permission/low-storage واقعی قابل ادعاست.

مراجع: [Expo APK](https://docs.expo.dev/build-reference/apk/)، [Expo upgrades](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)، [RN Windows](https://microsoft.github.io/react-native-windows/docs/getting-started/)، [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). مراجعهٔ مستندات، اجرای build یا انتخاب قطعی dependency نیست.
'''
put('PROJECT_MASTER_ARCHITECTURE.md',architecture)

put('PRODUCT_VISION.md',f'''# PRODUCT VISION — Project Leo
{common}
## وعدهٔ محصول
یک محیط آموزش انگلیسی با هویت مستقل لئو که **ابتدا آموزش می‌دهد، سپس تمرین و ارزیابی می‌کند**؛ برای فارسی‌زبان مبتدی قابل‌فهم، برای بزرگسال محترمانه و برای کار حرفه‌ای مسئولانه است. Android با محتوای نصب‌شده و پیشرفت محلی بدون شبکه کار می‌کند؛ قابلیت‌های مدرس/سازمان و sync لایهٔ جدا هستند.

## مخاطبان و کار واقعی
| مخاطب | کار اصلی | معیار پذیرش پیشنهادی |
|---|---|---|
| مبتدی مطلق | فهمیدن هدف، شنیدن/دیدن مثال و ساخت پاسخ ساده | می‌تواند بدون راهنمای بیرونی اولین درس را با توضیح فارسی تمام کند |
| بزرگسال | تمرین کوتاه بدون تنبیه یا رابط کودکانه | هدف قابل تنظیم، مرور روشن و متن خوانا؛ زمان برآوردی از زمان واقعی متمایز |
| کارکنان | فهمیدن و به‌کاربردن عبارت‌های محیط کار | سناریو و rubric مطابق نیاز واقعی، نه صرفاً حفظ واژه |
| آتش‌نشان/صنعت | فهم زبان تجهیزات، گزارش و ارتباط | بازبینی SME و هشدار روشن عدم جایگزینی SOP/آموزش رسمی |
| مدرس | assignment و feedback قابل اتکا | state پایدار، scope کلاس و گزارش با provenance |
| مدیر آموزش/سازمان | مشاهدهٔ روند و مشکلات آموزش | جداسازی سازمان، کنترل retention و گزارش قابل توضیح |

## مرز انتشار
1. Android core: درس، تمرین‌های واقعاً تکمیل‌شده، صوت محلی، ضبط با رضایت، profile، پیشرفت، review و backup/restore.
2. Content releases: ابتدا اصلاح ۲۵ درس موجود؛ سپس بسته‌های سطحی/موضوعی با QA. A1–C2 نقشهٔ هدف‌اند، نه موجودی حاضر.
3. Enterprise: حفظ و تکامل web LMS با role/tenant gates؛ کاربر offline با حساب سازمانی یکسان فرض نمی‌شود.
4. Windows: بعد از کیفیت Android؛ business logic و content مشترک، adapters و installer جدا.

## کیفیت به جای نمایش
- هیچ success بدون عمل واقعی؛ هیچ progress/XP/streak ثابت؛ هیچ سخنگوی هوشمند یا نمرهٔ تلفظ ساختگی.
- تعامل آموزشی باید objective، validation، explanation، persistence، error و accessibility داشته باشد.
- آفلاین بودن با cold launch در حالت هواپیما، restart/reboot و صحت داده ثابت می‌شود، نه فقط با config.
- نام CEFR مرجع طراحی است؛ ادعای certification، «معادل native» یا صلاحیت عملیاتی نداریم.
- هیچ سقف خودسرانهٔ total lessons/words/assets و هیچ وعدهٔ storage نامحدود نداریم؛ فضا/حافظه با اندازه‌گیری و انتخاب کاربر مدیریت می‌شود.

## شاخص‌های پیشنهادی، نه دادهٔ فعلی
موفقیت اولین سفر مبتدی، خطای قابل‌فهم، یادآوری تأخیری نسبت به هدف، نرخ تکمیل با یادگیری واقعی، پایداری ثبت داده، دسترس‌پذیری و اعتماد. زمان app-open معیار یادگیری نیست؛ self-assessment با official assessment ترکیب نمی‌شود. شاخص انگیزشی صرفاً جایگزین اثر آموزشی نیست.

## خارج از ادعای فعلی
اپ premium آماده، انیمیشن‌های جدید، curriculum کامل، بازیابی آزموده، سازمان چندمشتری امن، installer و APK ساخته‌شده نداریم. آنچه در فاز A تحویل می‌شود، مبنای مشترک و قابل بررسی برای ساخت محصول است، نه یک demo دیگر با برچسب production.

تصمیم‌های باز در [PROJECT_DECISION_LOG.md](PROJECT_DECISION_LOG.md) و خروجی بعدی در [MASTER_PHASE_ROADMAP.md](MASTER_PHASE_ROADMAP.md).
''')

put('DESIGN_DIRECTION.md',f'''# DESIGN DIRECTION — ورودی فاز B
{common}
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
''')

chapters=[]
legacy=json.loads((ROOT/'EnglishLearning-Offline/assets/curriculum.json').read_text())
for m in legacy[0]['modules']:
 chapters.append((m['title'],len(m['lessons']),sum(len(l.get('vocabulary',[])) for l in m['lessons']),'; '.join(l['title'] for l in m['lessons'])))
put('CURRICULUM_MASTER_MAP.md',f'''# CURRICULUM MASTER MAP
{common}
## ۱. موجودی مرجع و منشأ
Seed TypeScript در `prisma/curriculum/` و `EnglishLearning-Offline/assets/curriculum.json` با parser literal غیر اجرایی، از نظر داده برابرند: ۱ دوره، ۶ module، ۲۵ درس، ۱۰۰ واژه، ۲۵ پرسش، ۶ گرامر، ۱۳۷ مثال داخل ۳۵ بلوک و ۸ فایل صوت جدا. این محتوا **LEGACY_DRAFT / review-unverified** است؛ وجود آن، تأیید معلم یا تایید رسمی CEFR نیست.

{table(['فصل قدیمی','درس','واژه','عنوان درس‌ها'],chapters)}

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
''')

put('ANIMATION_ROADMAP.md',f'''# ANIMATION ROADMAP
{common}
## وضعیت امروز
تصویر ثابت و چند transition رابط/قواعد mascot reaction در وب وجود دارد. dependency Reanimated در Native declaration است؛ نه مجموعهٔ motion آماده. هیچ rig، فایل Rive/Lottie/3D یا مجموعهٔ expression سازگار یافت نشد. screenshot جای انیمیشن نیست.

## جهت فنی پیشنهادی
Reanimated برای interaction/navigation بومی، در baseline سازگار آینده کاندید است. برای شخصیت 2D لایه‌دار، Rive یا rig سبک پس از spike مقایسه می‌شوند؛ licensing/runtime/toolchain پیش از adoption. اگر ابزار جدید توجیه نشود، asset لایه‌دار و component محدود به جای fake-3D. engine در UI است و حقیقت نمره/ذخیره را تعیین نمی‌کند.

| گروه | trigger واقعی | حرکت Standard پیشنهادی | fallback Reduced / Low |
|---|---|---|---|
| Idle / blink | صفحه visible و دستگاه idle | حرکت کوتاه و کم‌تکرار؛ توقف در background | pose ثابت / حذف loop |
| انتخاب جواب | تغییر انتخاب کاربر | state transition کوتاه و واضح | border/text فوری |
| درست/نادرست | نتیجهٔ معتبر و commit موفق | reaction هماهنگ، نه قبل از ذخیره | icon+متن توضیح؛ بدون تکان شدید |
| واژه/فلش‌کارت | reveal با عمل کاربر | flip محدود با امکان کنترل | crossfade یا تعویض فوری |
| matching / ترتیب | drop یا tap معتبر | snap و highlight قابل فهم | جابه‌جایی فوری + اعلام screen reader |
| گفتن/شنیدن | event واقعی player/recorder | حالت listening/speaking، نه ادعای lip-sync علمی | آیکون وضعیت و متن |
| پایان درس | LessonCompleted commit‌شده | celebration یک‌بار با event ID | پیام خلاصه و نشان ثابت |
| XP/نشان | ledger/reward جدید | نمایش کوتاه بدون شمارش دوباره | عدد واقعی و اعلان متنی |
| جابه‌جایی | route confirmed | transition متناسب با RTL | بدون حرکت؛ حفظ focus |
| تدریس | teaching-step واضح | timeline/sequence/grammar emphasis | مراحل ثابت همراه توضیح کامل |

هیچ success در صورت save-failed، permission-denied یا unavailable asset انیمیت نشود. کاربر می‌تواند بدون انتظار برای جشن ادامه دهد. animation event replay، XP دوباره ایجاد نمی‌کند.

## ۱۶ حالت شخصیت برای فاز D — همگی PLANNED
Neutral، Happy، Excited، Thinking، Confused، Teaching، Listening، Speaking، Celebrating، Encouraging، Sad-after-mistake بدون تحقیر، Sleeping، Running، Jumping، Winning و Explaining-a-concept. فایل/pose فعلی واحد نباید این ۱۶ حالت شمرده شود. pose matrix و identity lock در [design/LEO_CHARACTER_BIBLE.md](design/LEO_CHARACTER_BIBLE.md).

## سه tier و بودجهٔ پیشنهادی
- Standard: هدف تعامل روان 60fps در دستگاه مرجع؛ 16.7ms بودجهٔ هر frame یک هدف اندازه‌گیری است، نه نتیجهٔ فعلی.
- Reduced motion: preference سیستم یا داخل برنامه؛ حذف loop/مسیرهای بزرگ/flash، حفظ کامل معنی آموزشی.
- Low-performance: کاهش پیچیدگی vector/layer، توقف off-screen، decode تنبل، کیفیت asset مناسب؛ correctness و accessibility ثابت می‌ماند.

UI کوتاه معمولاً 120–240ms، feedback 180–350ms و جشن کوتاه قابل ردشدن تا حدود 1s به عنوان hypothesis طراحی؛ تثبیت بعد از تست خوانایی و performance. هیچ flashing خطرناک، motion اجباری یا GPU loop بی‌هدف.

## تحویل مرحله‌ای
B: storyboard و trigger/fallback state map؛ C: motion tokens و reduced setting پایدار؛ D: asset/rig/componentهای واقعی و bench دستگاه؛ E/F/G: اتصال به state واقعی یادگیری/صوت؛ I: اتصال reward به ledger؛ M: مرور همهٔ stateها در phone/tablet و airplane mode. در این فاز تنها roadmap تدوین شد؛ هیچ animation جدید پیاده نشد.
''')

put('ENTERPRISE_FEATURE_MAP.md',f'''# ENTERPRISE FEATURE MAP
{common}
## ۱. دو دنیای متفاوت
LMS وب فعلی امکانات سازمانی قابل‌توجهی در source دارد؛ نمونهٔ Native آن‌ها را ندارد. یک دیتابیس محلیِ چندپروفایلی، multi-tenant server با authentication، enrollment و sync امن نیست. هستهٔ فردی بدون سرویس باقی می‌ماند و ادغام سازمانی بعداً با قراردادهای versioned انجام می‌شود.

## ۲. ساختار و نقش
هدف: Organization → Department → Team → Class → Learner. امروز Organization/Department/Team و LearningGroup/ClassSession و membershipها در schema هستند؛ `LearningGroup` دارای organization/department/parent و teacher/manager است اما `teamId` مستقیم ندارد. رابطهٔ Team→Class نباید موجود فرض شود.

| نقش هدف | نزدیک‌ترین مفهوم قدیمی | حد اختیار هدف |
|---|---|---|
| Platform administrator | SUPER_ADMIN با base ADMIN | عملیات platform با step-up/audit؛ دسترسی cross-tenant صریح و قابل ردیابی |
| Organization administrator | ORGANIZATION_ADMIN | فقط tenant خود؛ بدون تبدیل خودکار به platform admin |
| Training manager | TRAINING_ADMIN با base ADMIN | آموزش/گزارش در scope، نه مجوز مدیریت امنیت یا همهٔ tenantها |
| Teacher | TEACHER / ASSISTANT_TEACHER / REVIEWER | assigned classes/learners و اختیارهای مجزا برای review/publish |
| Learner | STUDENT | فقط دادهٔ خود و enrollment معتبر |

نقش‌های قدیمی و هدف mapping پیشنهادی دارند؛ هیچ role یا داده‌ای در این فاز migrate نشد. base ADMIN قدیمی نباید در آینده معادل اجازهٔ جهانی سازمانی تلقی شود.

## ۳. ماتریس قابلیت و مسیر بازاستفاده
| قابلیت | شواهد وب | وضعیت Native / هدف |
|---|---|---|
| حساب/نشست/دعوت/MFA | identity/auth و models مرتبط | core offline بدون login اجباری؛ اتصال سازمانی PLANNED |
| کلاس/معلم/جلسه | teaching service/access و ۴۲ صفحهٔ teacher | K: web reuse با scope tests؛ Native companion بعداً |
| enrollment/assignment | CourseAssignment، StudentCourseAssignment، membershipها | assignment package نسخه‌دار؛ عضویت authoritative سرور |
| تکلیف/بازخورد/حضور | submit/review/saveAttendance و فرم‌ها | انتقال state مجاز و قابل ردیابی؛ حضور از app-open حدس زده نشود |
| assessment و rubric | assessment engine/intelligence/review | self-practice از official grade جدا؛ transcript امتیاز تلفظ نیست |
| content authoring | content/books/version/review sources | M09 content package و QA جدید، نه کپی بی‌قاعدهٔ DB |
| گزارش/گواهی/CSV/PDF | report/certificate routes و pdf-lib | حقوق دسترسی، provenance و accessibility؛ نه certification CEFR |
| audit/retention/deletion | AuditLog و identity/privacy و services | policy واحد، حذف scope-aware و chain ثبت عملیات لازم |
| communication | conversations/messages/announcements | داخلی از delivery خارجی جدا |
| external integrations | providers در source | **چند provider SIMULATED/PLACEHOLDER هستند؛ آماده محسوب نمی‌شوند** |
| workflows | definitions/version/run/approval/queue | local simulation از اکشن خارجی واقعی جدا و برچسب‌دار |
| synchronization | endpoint محدود موجود | قرارداد multi-device/tenant کامل وجود ندارد؛ ACK بدون ذخیره اصلاح لازم دارد |

جزئیات سطح feature: [FEATURE_STATUS_MATRIX.csv](inventory/FEATURE_STATUS_MATRIX.csv).

## ۴. مدل tenant امروز و محدودیت شواهد
در SQLite اصلیِ کپی‌شده، یک سازمان وجود دارد. helper tenant با target org برابر allow می‌کند، برای target legacy نامعلوم در حالت single-org استثنا دارد و برای SUPER_ADMIN مسیر cross-tenant با audit تعریف کرده است. scope helper برای GROUP/STUDENT به کنترل service-layer هم وابسته است. **وجود guard و یک سازمان، اثبات عدم IDOR در دو سازمان نیست**. مسیرهای معلم/ادمین با helperهای قدیمی باید call-site به call-site تأیید شوند؛ در Phase A تست منفی اجرا نشده و نشت جدیدی ادعا نشده است.

## ۵. قواعد هدف server
1. actor از session معتبر؛ tenant مقصد از رکورد واقعی و relation معتبر، نه فقط body/request header.
2. org-owned queries، joins، cache keys، exportها و فایل‌ها همگی tenant scoped.
3. user، teacher و manager نباید با دستکاری ID از scope عبور کنند؛ pagination/search هم از scope خارج نشود.
4. role changes و publish/export/sensitive deletion دارای audit پایدار؛ موفقیت عملیات امنیتی با audit گم‌شده پنهان نشود.
5. offline score غیرقابل‌اعتماد برای مدرک رسمی؛ server validation یا teacher review با provenance لازم.
6. null legacy tenant با mapping تأییدشده حل شود، نه انتقال خاموش به اولین org.
7. retention برای learner record، recording، audit و backup مستقل؛ حذف و حق دسترسی با نیاز قانونی واقعی مشتری بررسی شود. compliance قانونی خودکار ادعا نمی‌شود.

## ۶. مرحله‌بندی K
K0: طبقه‌بندی دادهٔ legacy و role mapping؛ K1: تست isolated کلاس/assignment/گزارش در tenantهای synthetic مشخص؛ K2: authoring و content distribution؛ K3: adapterهای واقعیِ اختیاری با authorization و consent؛ K4: synchronization contract و conflict tests. استقرار remote، ساخت org واقعی، اتصال provider و دریافت credential نیازمند مجوز جدا هستند.

## ۷. پذیرش سازمانی
تست مثبت و منفی نقش×tenant×class×resource، revocation، session expiry، جلوگیری از client-score escalation، replay/double-submit، export permissions، audit failure، deletion/retention و restore. fixtureها دورریختنی و از کاربران واقعی جدا باشند. تا این شواهد و کیفیت UI/accessibility کامل نیست، برچسب enterprise-ready ممنوع است.
''')

put('MASTER_PHASE_ROADMAP.md',f'''# MASTER PHASE ROADMAP
{common}
## حکم اجرا
این تحویل در **A متوقف می‌شود**. نام فازهای A–O از شماره‌های تاریخی Phase 1–67 مستقل است. وجود گزارش تاریخی برای هیچ فاز جدید، پذیرش یا اجرای خودکار ایجاد نمی‌کند.

{table(['فاز','هدف','پیش‌نیاز','دروازهٔ خروج','وضعیت'],PHASES)}

## ترتیب وابستگی که نباید پنهان بماند
فهرست کاربر L را نزدیک productization آورده، اما E/F/G بدون persistence امن قابل پذیرش نیستند. بنابراین **L1 (حداقل زیرساخت داده/نسخه/backup)** باید پیش از ذخیرهٔ واقعی پاسخ و پیشرفت در C/E/F آماده شود؛ **L2** آزمون سخت بازیابی، low-storage و upgrade را پیش از M تکمیل می‌کند. نام فاز حفظ شده و اجرای L در این تحویل شروع نشده است.

C0 یک gate داخل C است: همسان‌سازی نسخهٔ Windows با workspace، انتخاب runtime/SDK، review dependencies و حفظ original. `npm audit fix --force`، تغییر engines برای عبور از gate، حذف lockfile یا reset DB راه‌حل قابل قبول نیست.

## گام بعد دقیق: B، نه بازنویسی
ورودی: این ۹ سند، feature/issue/asset registers، محتوای موجود و قیود دستگاه. خروجی لازم B:
- تصویب positioning بزرگسال/مبتدی و use caseهای اول Android؛
- انتخاب یک هویت واحد لئو و character bible، بدون asset دارای حقوق نامعلوم؛
- طرح اطلاعات و screen-by-screen با محتوای واقعی و stateهای empty/loading/success/error؛
- design tokens، Persian/English typography، RTL/LTR، accessibility و reduced motion؛
- تصمیم دربارهٔ ابزار تصویرسازی/animation و بودجهٔ asset، بدون انتخاب شتاب‌زدهٔ 3D؛
- بستهٔ طراحی با برچسب design، نه نسخهٔ اجرایی محصول.

پیاده‌سازی بعدی C تنها پس از پذیرش B و بسته‌شدن gateهای C0/L1 مجاز است. Android کارآمد قبل از Windows؛ استاد/سازمان در وب حفظ شود تا بازاستفاده مرحله‌ای ممکن بماند.

## معیار Definition of Done برای هر feature
UI واقعی + منطق واقعی + داده/مدل لازم + persistence لازم + خطا/empty/loading + accessibility + مستندات + شواهد روش/نسخه/محیط. اگر یکی از شروط لازم غایب باشد، PARTIAL/PLANNED/NOT_TESTED ثبت شود. دکمهٔ Alert-only، score ثابت، mock provider و screenshot، اجرای feature محسوب نمی‌شوند.

## بستهٔ تحویل هر فاز
نسخهٔ source/candidate جدا، change log، ADRهای تغییرکرده، migrations بدون تخریب، manifest محتوا/دارایی و حقوق، tests دقیق با تفکیک real/simulated/mock، یافته‌ها با CRITICAL/HIGH/MEDIUM/LOW/INFO، known limitations، و artifact تنها اگر واقعاً ساخته شده باشد. تمام فایل‌های docs مرتبط در همان فاز به‌روزرسانی نسخه‌دار شوند؛ گزارش قدیمی بازنویسی نشود.

## دروازهٔ بصری و دستگاه
Phone portrait و tablet مرتبط؛ RTL و English، font scaling، focus/screen reader، حالت‌های اصلی، consistency شخصیت، کیفیت motion و reduced/low tier. چشمگیر بودن یک تصویر یا HTML، مدرک این gate نیست.

## روش کار با منابع محدود
Windows کاربر: i5 نسل ۱۳، RTX3060/6GB، RAM8GB و SSD512GB؛ این مشخصات گزارش کاربر است و benchmark نیست. یک build/emulator در زمان مناسب، assets مشتق فشرده، streaming/chunked imports و lazy loading. GPU مجوز 3D سنگین یا حافظهٔ بی‌نهایت نیست. Sandbox حدود 1983MiB RAM و ابزار Android ناقص دارد؛ اجرای build سنگین در Phase A موضوعیت ندارد.

## وقفه و پذیرش
بعد از هر فاز، ابتدا شواهد و gapها بررسی شوند. هزینه/زمان بدون تخمین بر مبنای spike و ظرفیت تیم تضمین نمی‌شود. تولید همهٔ سطوح، ۲۳ نوع تمرین، ۱۶ حالت شخصیت و enterprise در یک پاس ممنوع. فازهای B تا O در این بسته **شروع نشده‌اند**.
''')

decisions=[
('ADR-A01','ACCEPTED_SCOPE','فقط A و خروجی مستندات','عدم تغییر source/dependency/schema/data؛ next phase نیازمند مجوز.'),
('ADR-A02','ACCEPTED_PRESERVATION','LMS، Native و preview مستقل بمانند','ریشهٔ وب و Native ادغام یا جابه‌جا نمی‌شوند؛ HTML اجرای اپ نیست.'),
('ADR-A03','PROPOSED_TECH_DIRECTION','React Native/Expo برای Android؛ baseline دقیق باز','کمترین از دست‌دادن TS/محتوا؛ SDK51 تأیید امنیت ندارد و ارتقای اجباری ممنوع.'),
('ADR-A04','PROPOSED_BOUNDARY','modular monolith و ۱۲ گروه/۲۰ مسئولیت','packageهای مستقل و port، نه microservices و Prisma در کلاینت.'),
('ADR-A05','ACCEPTED_DATA_POLICY','محتوا، دادهٔ یادگیرنده و cache جدا','app/schema/content version جدا؛ migration بدون destructive reset.'),
('ADR-A06','ACCEPTED_TRUST_POLICY','پروفایل محلی ≠ هویت سازمانی','سیاست role/tenant server-authoritative؛ نمرهٔ رسمی از self-report ساخته نمی‌شود.'),
('ADR-A07','PROPOSED_CONTENT','stable IDs و بستهٔ JSON validated','نگاشت IDs اندیسی قدیمی قبل از جابه‌جایی؛ hash اصالت ناشر نیست.'),
('ADR-A08','ACCEPTED_EVIDENCE','هیچ fake success یا آمار ثابت','real/simulated/mock/NOT_TESTED مستقل؛ گزارش‌های قدیمی حفظ و اصلاحیه افزوده شود.'),
('ADR-A09','PROPOSED_VISUAL','2D لایه‌دار، هویت اصیل واحد','ارجح برای منابع فعلی؛ انتخاب canonical art و ابزار در B/D باز است.'),
('ADR-A10','ACCEPTED_AUDIO_POLICY','listen-repeat-record/self-compare پیش از ASR','ارزیابی تلفظ فقط با موتور واقعی و شواهد؛ permission/consent و حذف محلی لازم.'),
('ADR-A11','ACCEPTED_CURRICULUM_POLICY','CEFR مرجع، نه certification','legacy draft تا QA؛ محتوای ایمنی review تخصصی و هشدار دارد.'),
('ADR-A12','ACCEPTED_SCALE_POLICY','بدون سقف خودسرانهٔ کل محتوا','حد منابع واقعی و batch/DoS guards مستند، نه برش خاموش یا unlimited storage.'),
('ADR-A13','PROPOSED_PHASE_DEPENDENCY','L1 زودتر از E/F/G؛ L2 پیش M','پایداری داده prerequisite است، نه تزئین انتهای پروژه.'),
('ADR-A14','DEFERRED_PLATFORM','Windows پس از Android','RN Windows/Tauri/Electron باید جدا benchmark شوند؛ EAS Windows فرض نشود.'),
('ADR-A15','OPEN_BLOCKER','کپی اصلاح‌شدهٔ Windows و native lock موجود نیست','فقط فایل‌های غیرحساس لازم دریافت شود؛ حساب، token و keystore درخواست نشود.'),
('ADR-A16','OPEN_SECURITY','یافته‌های audit و tenant/provider gaps','severity پایین آورده نمی‌شود؛ triage و اصلاح در فاز مجاز/کپی جدا، نه این فاز.'),
('ADR-A17','OPEN_PERMISSION','شبکه برای sync آینده','offline build فعلی INTERNET را blocked کرده؛ تغییر flavor/permission نیازمند ADR و آزمون جدا.'),
('ADR-A18','OPEN_ASSET_RIGHTS','مجوز و source layer/گوینده نامشخص','هیچ asset بدون provenance و review برای انتشار تجاری approved نمی‌شود.'),
('ADR-A19','ACCEPTED_BACKUP_LIMIT','backup DB معتبر، نه drill کامل محصول','فقط decompression/hash/integrity روی copy اجرا شد؛ source snapshot کامل/Windows inaccessible است.'),
('ADR-A20','OPEN_PRODUCT','کشور/مقررات، دستگاه مرجع Android و نقش سازمان اول','قبل از دادهٔ واقعی سازمان، retention/privacy و مدل اختیار تصمیم‌گیری شود.'),
]
put('PROJECT_DECISION_LOG.md',f'''# PROJECT DECISION LOG
{common}
## قرارداد ثبت تصمیم
ACCEPTED در این سند برای scope/policy مجاز فاز A است، نه نشانهٔ پیاده‌شدن. PROPOSED نیازمند پذیرش/آزمایش بعدی است؛ OPEN/DEFERRED نباید در کد به‌صورت تصمیم پنهان اعمال شود. هر تغییر بعدی با تصمیم تازه، rationale، گزینه‌های ردشده، اثر داده و شواهد ثبت شود.

{table(['ID','وضعیت','تصمیم','دلیل/پیامد'],decisions)}

## اصلاح ادعاهای گذشته، بدون بازنویسی آن‌ها
- «۱۵ بخش کامل آفلاین» با سورس Native مطابقت ندارد: audio/recording Alert-only، پاسخ فقط state، استریک/نشان ثابت، renderer ناقص، restore/migration غایب.
- «پخش شد» و «میکروفون روشن شد» در Alert شاهد playback/capture نیست؛ «پاسخ ذخیره شد» بدون write معتبر نیست.
- «Expo Doctor 17/17» گزارش کاربر و بررسی سازگاری است؛ build/device/security gate نیست.
- «audit هشدار طبیعی و بی‌اهمیت است» مردود؛ گزارش کاربر شامل CRITICAL/HIGH حل‌نشده است. دسترسی‌پذیری در runtime و ابزار ساخت باید تفکیک شود، نه شدت پنهان گردد.
- تصویر اصلی RGB شفاف نیست؛ تصویر سه‌بعدی‌نما rig/مدل نیست. screenshotهای قدیمی asset universe جدید محسوب نمی‌شوند.
- فرمان‌های قبلی مبنی بر ساخت مستقیم Windows با Expo/EAS برای این پروژه راهنمای معتبر نیستند؛ RN Windows و Tauri toolchain و integration جدا دارند.
- نتیجهٔ static scan اسم archive، افشای secret را ثابت نمی‌کند؛ flagهای uploads/backups در source routes به صورت مستقل triage شدند.
- وضعیت migration اصلی از وجود فایل‌های SQL نتیجه‌گیری نمی‌شود؛ metadata copy، جدول tracking را نشان نداد.

## ورودی‌های مورد نیاز پیش از تصمیم اجرایی
نسخهٔ فعلی package.json/package-lock.json/app.json و assetهای غیرحساس Windows، دستگاه مرجع Android و حداقل پشتیبانی OS، اولویت نخست مخاطب، reviewer زبانی/آموزشی/SME، حقوق دارایی‌ها و مالک signing، سیاست retention و مقصد/قالب backup. نبود این ورودی‌ها مجوز ساختن شناسه/مدرک/credential فرضی نیست.

## ثبت شواهد این فاز
[BASELINE_DISCOVERY](evidence/BASELINE_DISCOVERY.json)، [SQLITE_PRESERVATION](evidence/SQLITE_PRESERVATION.json)، [CURRICULUM_CENSUS](evidence/CURRICULUM_CENSUS.json)، [SCHEMA_TABLE_COMPARISON](evidence/SCHEMA_TABLE_COMPARISON.json)، [KNOWN_ISSUES](inventory/KNOWN_ISSUES.csv). هیچ تست Android، browser journey، migration اجرایی، provider probe یا deployment انجام نشده است.
''')

put('README_FA.md',f'''# Project Leo — بستهٔ فاز A

**تاریخ:** ۲۰۲۶-۱۱-۰۴ · **وضعیت:** مستندات کشف/حفاظت/معماری؛ نه محصول اجرایی جدید.

این بسته دو پیاده‌سازی اصلی را جدا نگه می‌دارد: LMS وب گسترده و نمونهٔ Expo آفلاین کوچک‌تر. فایل اصلی، داده‌ها، dependencyها و گزارش‌های قبلی تغییر نکرده‌اند. پشتیبان DB خصوصی است و در این بسته نیست.

## از اینجا بخوانید
۱. [موجودی اصلی](PROJECT_MASTER_INVENTORY.md) — چه داریم، چه نداریم و چه چیزی فقط نمایشی است.
۲. [معماری اصلی](PROJECT_MASTER_ARCHITECTURE.md) — ۱۲ ماژول محصول، نگاشت ۲۰ زیرسامانه و مرزهای آفلاین/سازمان.
۳. [چشم‌انداز](PRODUCT_VISION.md) — مخاطب، وعده و مرز ادعا.
۴. [جهت طراحی](DESIGN_DIRECTION.md) — ورودی فاز B، نه redesign اجراشده.
۵. [نقشهٔ curriculum](CURRICULUM_MASTER_MAP.md) — دادهٔ موجود و مسیر Pre-A1 تا C2.
۶. [نقشهٔ animation](ANIMATION_ROADMAP.md) — trigger، fallback و tierهای آینده.
۷. [نقشهٔ enterprise](ENTERPRISE_FEATURE_MAP.md) — ظرفیت فعلی وب و شکاف Native/tenant/sync.
۸. [فازهای A تا O](MASTER_PHASE_ROADMAP.md) — پذیرش مستقل و اولویت Android.
۹. [دفتر تصمیم‌ها](PROJECT_DECISION_LOG.md) — تصمیم قطعی scope، پیشنهادها، موارد باز و اصلاح ادعاهای قبلی.

## جزئیات و مسیر نگهداری
- `docs/00_…25_…`: ۲۶ فصل پایگاه دانش دائمی؛ همگی با وضعیت مشاهده/طرح/آینده مشخص.
- `inventory/`: ۱۴۱۹ فایل در scope، ۳۳۵ سند تاریخی، ۳۲۰ مسیر وب، ۲۴۱ asset/evidence، ۲۵ درس، feature/issue registers و schema/archive metadata.
- `design/`, `curriculum/`, `audio/`, `product/`: briefهای معماری و ورودی فازهای آینده؛ نه asset/engine پیاده‌شده.
- `planning/`: طرح ساختار آینده، شواهد و قرارداد تحویل فازها.
- `evidence/`: hash، census، backup-copy integrity و کنترل نهایی مستندات.
- `tools/`: ابزارهای خواندن/ثبت موجودی و تولید همین اسناد؛ هیچ‌کدام بخشی از runtime محصول نیستند.

## مهم
هیچ APK یا installer Windows، طراحی نهایی، انیمیشن تازه، سطوح جدید، سرویس سازمانی یا اصلاح امنیتی در این فاز ساخته نشده است. گزارش Native قدیمیِ «۱۵ بخش کامل» اصلاحیهٔ روشن دارد؛ صرف وجود جدول/دکمه ملاک کامل‌بودن نیست. بعد از پذیرش این بسته، گام بعد **فاز B** است. C و همهٔ اجراهای بعدی هنوز شروع نشده‌اند.

تمام مسیرهای source در اسناد نسبت به workspace اولیه‌اند؛ سورس/دیتابیس/credentials داخل ZIP مستندات کپی نشده‌اند. برای حفظ تاریخچه، فایل‌های قدیمی به جای overwrite با سند جدید ارجاع داده شده‌اند.
''')
print('Nine required master documents, README, feature matrix and issue register created without replacing existing files.')
