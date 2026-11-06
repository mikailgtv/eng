# نگاشت پایگاه دانش A به خروجی B

> Project Leo · Phase B · 2026-11-04 · Design delivery v1
> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**
> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.

ساختار و فایل‌های A حفظ شده‌اند. B سند جدید و نسخه‌دار است؛ نه overwrite فصل‌های قبلی.

| مرجع A | سند جدید B |
|---|---|
|03 Design System|PHASE_B_DESIGN_SYSTEM و COLOR_TYPOGRAPHY_TOKENS |
|04 Character Bible|PHASE_B_LEO_CHARACTER_BIBLE و sourceهای SVG/PNG |
|05 Animation System|PHASE_B_ANIMATION_STORYBOARD |
|06/07 Pedagogy/Curriculum|PHASE_B_UX_FLOWS و قراردادهای نمونه؛ source curriculum عوض نشده |
|17 Accessibility|PHASE_B_ACCESSIBILITY_REVIEW |
|19 Performance|محدودیت‌ها در QA؛ هیچ native benchmark انجام نشده |
|22 Assets|PHASE_B_ASSET_MANIFEST |
|23 Limitations|PHASE_B_DESIGN_QA_REPORT و FINAL_REPORT |
|25 Decisions|PHASE_B_DECISION_LOG؛ Openهای A حفظ شده |

اصل ZIP A استخراج/تطبیق داده شد؛ نسخهٔ استخراج‌شده فقط reference داخل workspace است و برای کاهش تکرار به ZIP فعال B افزوده نمی‌شود. hash ورودی در evidence باقی می‌ماند.
