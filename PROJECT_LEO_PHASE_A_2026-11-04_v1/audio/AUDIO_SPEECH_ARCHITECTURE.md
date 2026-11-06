# Audio and Speech Architecture

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

[docs/10_AUDIO_SPEECH.md](../docs/10_AUDIO_SPEECH.md) مرجع قرارداد است.

State machine پیشنهادی playback: IDLE → PREPARING → READY → PLAYING/PAUSED → ENDED؛ ERROR جدا. recorder: CONSENT_NEEDED → PERMISSION_REQUESTED → READY → RECORDING → FINALIZING → SAVED؛ deny/interrupted/full مستقل. انتقال به success فقط از promise/event واقعی و بررسی فایل خروجی؛ پیام Alert هیچ state را اثبات نمی‌کند.

Port شامل loadLocalAsset، play، pause، seek، replay، setRateIfSupported، requestPermission، beginRecording، stopRecording، replayLocalRecording و deleteRecording است. format/path/space/interrupt باید توسط adapter واقعی و تست device کنترل شود. config permission یا header MP3 معادل شنیدن موفق نیست.

Offline ASR/scoring فعلاً unavailable؛ خودارزیابی به‌وضوح برچسب بخورد. گوینده و حقوق ۸ فایل موجود باید پیش از انتشار review شوند. در A صوت جدید، voice audition، transcription یا اتصال provider انجام نشده است.
