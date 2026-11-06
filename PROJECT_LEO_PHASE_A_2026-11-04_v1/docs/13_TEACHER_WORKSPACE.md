# فضای مدرس

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

## قابل بازاستفاده
کد teacher صفحات، teaching service/access، session/recurrence، assignment/submission/review، attendance، note، plan و reports موجود است. وجود state و guards در کد قابل ثبت است؛ acceptance end-to-end جدید انجام نشده.

## مرز هدف
Teacher profile → assigned classes → learners → path/lesson/homework → assessment/review → feedback/progress/report. هر read/write نیاز به session معتبر + org/class/resource scope دارد. فایل/گزارش و pagination نیز همین scope را حفظ می‌کنند. هیچ private learner record داخل محتوای demo نیست.

قواعد: assignment به content version متصل؛ حذف/retire محتوا سابقهٔ تکلیف را نابود نکند؛ grade correction همراه دلیل و audit؛ feedback از AI احتمالی با برچسب و اختیار انسانی، نه official score خودکار. attendance از فعالیت app حدس زده نشود.

Native learner گزارش محلی غیررسمی دارد؛ teacher workspace آنلاین/سازمانی جداست. قابلیت instructor-only روی دستگاه شخصی، امنیت multi-user enterprise نمی‌سازد. K تا UI/logic/persistence/error/a11y/permission evidence کامل نشده، feature «complete» نمی‌شود.
