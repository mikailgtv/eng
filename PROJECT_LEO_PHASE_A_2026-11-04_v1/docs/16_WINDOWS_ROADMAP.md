# نقشهٔ Windows

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

Windows بعد از پذیرش Android و با ADR جدا. هیچ installer ساخته نشده است و فرمان‌های قدیمی Expo/EAS Windows راهنمای معتبر این پروژه نیستند.

| گزینه | اشتراک قابل انتظار | هزینهٔ پلتفرمی |
|---|---|---|
| React Native Windows | TS domain/content و بخشی از component concepts | native Windows project، toolchain، compatibility هر ماژول صوت/DB/motion؛ Expo pluginها خودکار پشتیبانی نمی‌شوند |
| Tauri + UI وب | domain/content و بخشی از UI وب | Rust، C++ Build Tools و WebView2؛ adapterهای filesystem/SQLite/audio و بسته‌بندی/updates جدا |
| Electron | TS و UI وب | همراه‌کردن Chromium/Node، اندازه/حافظه بیشتر؛ security sandbox/IPC جدا |

گام N: baseline feature contract → spike کوچک با source جدا → تست SQLite/audio/RTL/accessibility در release → اندازه‌گیری نصب/RAM/startup روی Windows واقعی → انتخاب → signing/installer → نصب/upgrade/uninstall با حفظ انتخابی داده.

CPU/GPU کاربر به معنی ظرفیت نامحدود نیست؛ RAM8GB را با build و emulator همزمان اشباع نکنیم. adapter مشترک interface دارد، نه فرض API یکسان در Android/Windows. server LMS یا static HTML را به نام installer معرفی نمی‌کنیم.

[RN Windows](https://microsoft.github.io/react-native-windows/docs/getting-started/) · [Tauri requirements](https://v2.tauri.app/start/prerequisites/)
