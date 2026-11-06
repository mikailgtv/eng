# قرارداد طراحی محتوا

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

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
