# حدود prototype و تفاوت آن با محصول

- این HTML یک DESIGN PROTOTYPE مستقل است، نه frontend متصل به LMS یا Expo. قالب قابل مشاهده و کنترل‌های حافظه‌ای دارد؛ DB، profile واقعی، permissions، file import/restore یا backend سازمانی اجرا نمی‌شوند.
- مسیر عمیقِ نمونه، Hello and Goodbye است. دادهٔ بقیهٔ ۲۵ درس قابل مرور و هر ۶۷ نمای طراحی از selector قابل مشاهده است؛ همهٔ lessonها به exercise engine تولیدی تبدیل نشده‌اند.
- Guided انتخاب بدون نمره است. Independent sample و progress آن فقط از eventهای همین صفحه محاسبه می‌شوند. refresh آن‌ها را پاک می‌کند؛ بعضی draftها با خروج از نمای exercise reset می‌شوند. persistence و recovery مطلوبِ محصول فقط قرارداد طراحی‌اند.
- state inspector و feedback-layout selector حالت بصری را نمایش می‌دهند. Forced Success یا نمایش پاسخ صحیح، attempt، completion یا reward ایجاد نمی‌کند.
- E05 به audio/transcript review نیاز دارد. E08 automatic correct/incorrect/phonetic score ندارد. Timer ضبط در G04 زمان simulation است؛ میکروفون فعال نمی‌شود و recorded file وجود ندارد.
- کنترل‌های Phone/Tablet/Desktop عرض قاب و قواعد CSS نمونه را تغییر می‌دهند. ترکیب دوپنلیِ tablet در artboardهای جدا طراحی شده؛ تمام جزییات آن در HTML برای همهٔ نماها عیناً پیاده نشده‌اند. هیچ reflow واقعی مرورگر یا native layout تأیید نشده است.
- interface انگلیسی کامل نیست؛ primary فارسی است و English در mode مربوط بیشتر برای عنوان/جهت بررسی می‌شود. English learning content و IPA جهت و فونت مستقل دارند.
- تمام poseهای فعال از یک خانوادهٔ SVG هستند؛ نماهای غیرجلو construction draft و نیازمند artist refinement‌اند. هیچ rig، production animation یا viseme علمی ساخته نشده است.
- actual browser navigation/focus، TalkBack، physical touch، native typography، GPU/FPS/RAM و audible playback در این محیط اجرا نشده‌اند. static/VM/raster checks جای این‌ها نیستند.

به همین دلیل Design Gate برای C برابر PARTIAL است و C در این تحویل مجاز یا شروع‌شده نیست.
