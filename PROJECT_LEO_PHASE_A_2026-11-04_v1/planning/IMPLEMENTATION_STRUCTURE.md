# طرح ساختار آینده

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

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
