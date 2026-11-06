# PROJECT MASTER INVENTORY
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

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

| ID | قابلیت | وضعیت وب | وضعیت Native |
|---|---|---|---|
| F01 | پوسته و ناوبری | CODE / NOT_REVALIDATED | PARTIAL |
| F02 | ورود و نشست | CODE / NOT_REVALIDATED | MISSING / intentionally local-only |
| F03 | RBAC و tenant | PARTIAL / COVERAGE_NOT_REVALIDATED | MISSING |
| F04 | سازمان، بخش و تیم | CODE / NOT_REVALIDATED | MISSING |
| F05 | نقش مدیر آموزش | PARTIAL | MISSING |
| F06 | کلاس و برنامهٔ جلسات | CODE / NOT_REVALIDATED | MISSING |
| F07 | تکلیف، تحویل و بازخورد | CODE / NOT_REVALIDATED | MISSING |
| F08 | حضور و غیاب | CODE / NOT_REVALIDATED | MISSING |
| F09 | دوره و درس | CODE / NOT_REVALIDATED | PARTIAL |
| F10 | واژگان و گرامر | CODE / NOT_REVALIDATED | PARTIAL |
| F11 | تمرین‌های تعاملی | CODE / NOT_REVALIDATED | PLACEHOLDER |
| F12 | آزمون و نمره‌دهی | CODE+PARTIAL / NOT_REVALIDATED | MISSING |
| F13 | مرور غلط‌ها | CODE / NOT_REVALIDATED | MISSING |
| F14 | فلش‌کارت و مرور فاصله‌دار | CODE / NOT_REVALIDATED | MISSING |
| F15 | پخش صوت | CODE / NOT_REVALIDATED | PLACEHOLDER |
| F16 | ضبط و بازپخش | CODE / NOT_REVALIDATED | PLACEHOLDER |
| F17 | شناخت گفتار و تلفظ | SERVICE_DEPENDENT / PARTIAL | MISSING |
| F18 | دستیار آموزشی | RULE_BASED+SERVICE_DEPENDENT | MISSING |
| F19 | XP، استریک و نشان | CODE / NOT_REVALIDATED | VISUAL_ONLY |
| F20 | پیشرفت درس | CODE / NOT_REVALIDATED | CODE / NOT_TESTED |
| F21 | نشانک واژه | CODE / NOT_REVALIDATED | CODE / NOT_TESTED |
| F22 | تنظیمات پایدار و چند پروفایل | PARTIAL | VISUAL_ONLY / MISSING |
| F23 | خروجی و بازیابی | CODE / NOT_REVALIDATED | PARTIAL |
| F24 | نویسندگی، نسخه و تأیید محتوا | CODE / NOT_REVALIDATED | MISSING |
| F25 | واردکردن کتاب و محتوا | CODE / NOT_REVALIDATED | MISSING |
| F26 | گزارش و گواهی | CODE / NOT_REVALIDATED | MISSING |
| F27 | پیام‌ها و اعلان‌ها | CODE / NOT_REVALIDATED | MISSING |
| F28 | اتصال ایمیل/SMS/تقویم/Push/LRS | PLACEHOLDER / SIMULATED | MISSING |
| F29 | گردش‌کار سازمانی | CODE+PARTIAL / NOT_REVALIDATED | MISSING |
| F30 | ذخیرهٔ فایل سازمانی | CODE / NOT_REVALIDATED | MISSING |
| F31 | همگام‌سازی | PARTIAL / UNSAFE_TO_ADOPT_AS_COMPLETE | MISSING |
| F32 | عملکرد کامل آفلاین | PARTIAL / shell fallback | PARTIAL / NOT_TESTED |
| F33 | هویت بصری لئو | PARTIAL | PARTIAL |
| F34 | انیمیشن آموزشی و شخصیت | PARTIAL / limited UI motion | MISSING |
| F35 | فارسی/RTL و دسترس‌پذیری | PARTIAL / NOT_REVALIDATED | PARTIAL / NOT_TESTED |
| F36 | بستهٔ اجرایی Android و Windows | MISSING | MISSING |


مسیرهای شواهد و توضیح تک‌تک موارد: [FEATURE_STATUS_MATRIX.csv](inventory/FEATURE_STATUS_MATRIX.csv). رجیستری وب ۱۰ activity type دارد؛ speaking/flashcard خودارزیابی‌اند. assessment وب ۶ نوع auto-grade و چند نوع دستی دارد. این قابلیت‌های وب به Native منتقل نشده‌اند.

## ۷. اشکال‌های مهم و وضعیت رفع

| شناسه | شدت | نوع شواهد | یافته | فاز هدف |
|---|---|---|---|---|
| LEO-A-001 | HIGH | CONFIRMED_STATIC | پخش صوت بومی فقط Alert است | G |
| LEO-A-002 | HIGH | CONFIRMED_STATIC | ضبط میکروفون بومی فقط Alert است | G |
| LEO-A-003 | HIGH | CONFIRMED_STATIC | پیام ذخیرهٔ پاسخ بدون نوشتن در دیتابیس | F/L1 |
| LEO-A-004 | MEDIUM | CONFIRMED_STATIC | استریک و نشان‌های بومی ثابت | I |
| LEO-A-005 | MEDIUM | CONFIRMED_STATIC | تنظیمات بومی به رفتار و ذخیره وصل نیست | C/L1 |
| LEO-A-006 | HIGH | CONFIRMED_STATIC | مثال/هشدار به صورت JSON و عدم نمایش grammar مستقل | E/H |
| LEO-A-007 | HIGH | DESIGN_RISK_NOT_REPRODUCED | شناسهٔ درس از موقعیت آرایه مشتق می‌شود | E/L1/H |
| LEO-A-008 | HIGH | MISSING_CAPABILITY | نبود migration/restore/profile واقعی در نسخه بومی | L1/L2 |
| LEO-A-009 | CRITICAL | USER_REPORTED_NOT_RERUN | npm audit نسخه Windows: tar در سطح CRITICAL | C0/M gate |
| LEO-A-010 | HIGH | CONFIRMED_STATIC | providerهای سازمانی موفقیت اتصال/تحویل را شبیه‌سازی می‌کنند | K |
| LEO-A-011 | HIGH | CONFIRMED_STATIC | ACK موفق LISTENING_ATTEMPT بدون ذخیره در endpoint وب | K/L2 sync gate |
| LEO-A-012 | HIGH | UNVERIFIED_RISK | پوشش کامل جداسازی سازمان‌ها و scopeهای قدیمی اثبات نشده | K |
| LEO-A-013 | HIGH | CONFIRMED_AVAILABILITY_GAP | کپی Windows اصلاح‌شده با سورس موجود در workspace متفاوت است | C0 |
| LEO-A-014 | MEDIUM | CONFIRMED_DOCUMENTATION_ERROR | ادعای ۱۵ بخش کامل و فرمان‌های مستقیم Windows در گزارش قدیمی معتبر نیست | B/C0/M/N |
| LEO-A-015 | MEDIUM | CONFIRMED_ASSET_GAP | هویت تصویری ناهمگون و نبود منابع لایه‌دار/حالت‌های لئو | B/D |
| LEO-A-016 | MEDIUM | REVIEW_EVIDENCE_MISSING | تأیید زبانی/تربیتی/صوتی و SME ایمنی موجود نیست | H/J |
| LEO-A-017 | HIGH | BUILD_EVIDENCE_MISSING | محیط محلی فاقد SDK/Gradle/emulator؛ runtime وب با pin هم‌خوان نیست | C0/M |
| LEO-A-018 | MEDIUM | CONFIRMED_POLICY_DEBT | محدودیت‌های سخت قدیمی محتوا نباید بی‌دلیل منتقل شوند | E/F/H |
| LEO-A-019 | INFO | HISTORICAL_EVIDENCE_ONLY | گزارش‌های PASS تاریخی جایگزین بررسی نسخه جاری نیستند | All phases |
| LEO-A-020 | HIGH | CONFIRMED_METADATA / migration state unresolved | جدول tracking مهاجرت در کپی SQLite اصلی مشاهده نشد | C0/L1 |


همهٔ موارد این فهرست در فاز A **صرفاً ثبت** شده‌اند؛ رفع انجام نشده است. یافتهٔ امنیتی مربوط به audit کاربر، وضعیت همان نصب Windows است، نه audit تازهٔ LMS یا اثبات exploitable بودن APK. موارد conditional/unverified با confirmed source defects مخلوط نشده‌اند.

## ۸. حفاظت و دیتابیس

- SHA-256 فایل اصلی پیش و پس از کپی: `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813`.
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
