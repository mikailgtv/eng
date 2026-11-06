# PROJECT MASTER ARCHITECTURE
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

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

| گروه | نام | زیرسامانه‌ها | شمارهٔ فهرست ۲۰گانه | مرز مسئولیت |
|---|---|---|---|---|
| M01 | پوسته، طراحی و حرکت | Application Shell + Design System + Animation Engine | 1,2,3 | ناوبری، RTL/LTR، دسترس‌پذیری و نمایش؛ بدون SQL مستقیم |
| M02 | هویت و پروفایل | User Profile Engine | 14 | پروفایل محلی و تنظیمات؛ حساب/مجوز سازمانی فقط از سرویس معتبر |
| M03 | برنامهٔ درسی و مسیر | Learning Path + Curriculum Engine | 4,5 | محتوای نسخه‌دار، پیش‌نیازها، اهداف و انتخاب درس |
| M04 | آموزش، واژه و گرامر | Lesson Rendering + Vocabulary + Grammar | 6,9,10 | آموزش و نمایش بلوک‌ها؛ تولید intent برای تمرین و صوت |
| M05 | تمرین و سنجش | Exercise + Assessment Engine | 7,8 | اعتبارسنجی پاسخ، بازخورد، score nullable و تفکیک تمرین/آزمون رسمی |
| M06 | صوت و گفتار | Audio and Speech Engine | 11 | asset محلی، پخش/ضبط/رضایت/پاک‌کردن؛ نبود امتیاز تلفظ بدون موتور معتبر |
| M07 | انگیزش و مرور | Gamification Engine | 12 | XP/نشان/هدف/استریک از رویدادهای commit‌شده؛ برنامهٔ مرور با M05/M03 |
| M08 | دادهٔ آفلاین و حفاظت | Offline Data + Backup/Import/Export | 13,19 | تراکنش، schema version، مهاجرت، integrity، backup و restore |
| M09 | کارخانهٔ محتوا و دارایی | Content Authoring Engine | 18 | ویرایش، QA، حقوق، بستهٔ محتوا و manifest؛ بدون نیاز به تغییر سورس برای درس جدید |
| M10 | فضای مدرس | Teacher Workspace | 15 | کلاس، تکلیف، بازخورد و ارزیابی در scope مجاز |
| M11 | سازمان و گزارش | Organization Workspace + Reporting Engine | 16,17 | ساختار سازمانی، RBAC/tenant، گزارش و audit؛ مسئولیت server-side |
| M12 | همگام‌سازی اختیاری | Optional Synchronization Layer | 20 | outbox، idempotency، conflict و مرز اعتماد؛ نبود آن هستهٔ آفلاین را متوقف نمی‌کند |


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
