# ENTERPRISE FEATURE MAP
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

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
