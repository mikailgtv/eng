# معماری صوت و گفتار

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

مرجع [audio architecture](../audio/AUDIO_SPEECH_ARCHITECTURE.md). امروز وب player و MediaRecorder دارد، ولی Native فقط Alert و فایل‌های جدا دارد. این تفاوت در migration حفظ شود، نه اینکه قابلیت وب به Native نسبت داده شود.

## قرارداد هدف
asset ID → local asset resolver → prepare → play/pause/replay/seek؛ progress از callback واقعی؛ speed فقط اگر platform adapter پشتیبانی و آزمون شود. هسته streaming نمی‌خواهد. missing/corrupt media، interruption، audio focus و headphone route خطاهای تعریف‌شده‌اند.

Recording: معرفی هدف/حریم خصوصی → consent → permission → recorder ready → recording واقعی → stop/finalize → local file metadata → replay/delete. permission granted با recording success یکسان نیست. قطع کار/فضای کم/میکروفون مشغول/deny باید recovery امن و پیام واضح بدهد. هیچ indicator جعلی یا ضبط پنهان.

Offline default: listen-and-repeat و record/self-comparison. browser SpeechRecognition یا وجود API key به معنی ASR آفلاین نیست. scoring خودکار unavailable تا موتور واقعی، زبان/مدل/دستگاه مرجع، rubric و accuracy evidence معلوم شود؛ transcription match امتیاز تلفظ نیست.

Recording upload خاموش و رضایت جدا می‌خواهد. فایل صوت خارج SQLite، metadata profile-scoped و حذف قابل اثبات است. پیش‌نمایش مرورگر قبلی و fake device آزمون فیزیکی میکروفون Android نیستند.
