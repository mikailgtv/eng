# ANIMATION ROADMAP
> Project Leo · فاز A فقط · ۲۰۲۶-۱۱-۰۴ · نسخهٔ ۱
> این سند، موجودی یا طرح آینده است؛ تأیید آماده‌بودن محصول، آزمون Android یا اجرای فازهای B تا O نیست.

## وضعیت امروز
تصویر ثابت و چند transition رابط/قواعد mascot reaction در وب وجود دارد. dependency Reanimated در Native declaration است؛ نه مجموعهٔ motion آماده. هیچ rig، فایل Rive/Lottie/3D یا مجموعهٔ expression سازگار یافت نشد. screenshot جای انیمیشن نیست.

## جهت فنی پیشنهادی
Reanimated برای interaction/navigation بومی، در baseline سازگار آینده کاندید است. برای شخصیت 2D لایه‌دار، Rive یا rig سبک پس از spike مقایسه می‌شوند؛ licensing/runtime/toolchain پیش از adoption. اگر ابزار جدید توجیه نشود، asset لایه‌دار و component محدود به جای fake-3D. engine در UI است و حقیقت نمره/ذخیره را تعیین نمی‌کند.

| گروه | trigger واقعی | حرکت Standard پیشنهادی | fallback Reduced / Low |
|---|---|---|---|
| Idle / blink | صفحه visible و دستگاه idle | حرکت کوتاه و کم‌تکرار؛ توقف در background | pose ثابت / حذف loop |
| انتخاب جواب | تغییر انتخاب کاربر | state transition کوتاه و واضح | border/text فوری |
| درست/نادرست | نتیجهٔ معتبر و commit موفق | reaction هماهنگ، نه قبل از ذخیره | icon+متن توضیح؛ بدون تکان شدید |
| واژه/فلش‌کارت | reveal با عمل کاربر | flip محدود با امکان کنترل | crossfade یا تعویض فوری |
| matching / ترتیب | drop یا tap معتبر | snap و highlight قابل فهم | جابه‌جایی فوری + اعلام screen reader |
| گفتن/شنیدن | event واقعی player/recorder | حالت listening/speaking، نه ادعای lip-sync علمی | آیکون وضعیت و متن |
| پایان درس | LessonCompleted commit‌شده | celebration یک‌بار با event ID | پیام خلاصه و نشان ثابت |
| XP/نشان | ledger/reward جدید | نمایش کوتاه بدون شمارش دوباره | عدد واقعی و اعلان متنی |
| جابه‌جایی | route confirmed | transition متناسب با RTL | بدون حرکت؛ حفظ focus |
| تدریس | teaching-step واضح | timeline/sequence/grammar emphasis | مراحل ثابت همراه توضیح کامل |

هیچ success در صورت save-failed، permission-denied یا unavailable asset انیمیت نشود. کاربر می‌تواند بدون انتظار برای جشن ادامه دهد. animation event replay، XP دوباره ایجاد نمی‌کند.

## ۱۶ حالت شخصیت برای فاز D — همگی PLANNED
Neutral، Happy، Excited، Thinking، Confused، Teaching، Listening، Speaking، Celebrating، Encouraging، Sad-after-mistake بدون تحقیر، Sleeping، Running، Jumping، Winning و Explaining-a-concept. فایل/pose فعلی واحد نباید این ۱۶ حالت شمرده شود. pose matrix و identity lock در [design/LEO_CHARACTER_BIBLE.md](design/LEO_CHARACTER_BIBLE.md).

## سه tier و بودجهٔ پیشنهادی
- Standard: هدف تعامل روان 60fps در دستگاه مرجع؛ 16.7ms بودجهٔ هر frame یک هدف اندازه‌گیری است، نه نتیجهٔ فعلی.
- Reduced motion: preference سیستم یا داخل برنامه؛ حذف loop/مسیرهای بزرگ/flash، حفظ کامل معنی آموزشی.
- Low-performance: کاهش پیچیدگی vector/layer، توقف off-screen، decode تنبل، کیفیت asset مناسب؛ correctness و accessibility ثابت می‌ماند.

UI کوتاه معمولاً 120–240ms، feedback 180–350ms و جشن کوتاه قابل ردشدن تا حدود 1s به عنوان hypothesis طراحی؛ تثبیت بعد از تست خوانایی و performance. هیچ flashing خطرناک، motion اجباری یا GPU loop بی‌هدف.

## تحویل مرحله‌ای
B: storyboard و trigger/fallback state map؛ C: motion tokens و reduced setting پایدار؛ D: asset/rig/componentهای واقعی و bench دستگاه؛ E/F/G: اتصال به state واقعی یادگیری/صوت؛ I: اتصال reward به ledger؛ M: مرور همهٔ stateها در phone/tablet و airplane mode. در این فاز تنها roadmap تدوین شد؛ هیچ animation جدید پیاده نشد.
