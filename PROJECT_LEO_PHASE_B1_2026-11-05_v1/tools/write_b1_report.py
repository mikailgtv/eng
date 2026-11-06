from pathlib import Path
from collections import Counter
import json,csv
O=Path('/home/user/PROJECT_LEO_PHASE_B1_2026-11-05_v1')
def j(name):return json.loads((O/name).read_text())
def rows(name):return list(csv.DictReader((O/name).open(encoding='utf-8-sig')))
def table(headers,items):
 def e(v):return str(v).replace('|',' / ').replace('\n',' ')
 return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+'\n'.join('| '+' | '.join(e(v) for v in row)+' |' for row in items)+'\n'
s=j('evidence/STRUCTURAL_SUMMARY.json');d=j('evidence/DESIGN_COPY_SUMMARY.json');pres=j('evidence/PRESERVATION_AFTER_REVIEW.json')
tests=rows('registers/TEST_REGISTER_FINAL.csv');issues=rows('registers/OPEN_ISSUES.csv');counts=Counter(x['status'] for x in tests)

text=f'''# PHASE B.1 — Design Validation & Development Readiness Gate

**Project Leo · ۲۰۲۶-۱۱-۰۵ · نسخهٔ گزارش ۱**  
**نوع کار:** اعتبارسنجیِ محدودِ شواهد قابل‌دسترسی؛ بدون اصلاح یا توسعهٔ محصول.  
**تصمیم:** **PARTIAL — MORE VALIDATION REQUIRED**  
**مجوز ورود به C:** صادر نشد. هیچ‌کدام از فازهای C تا O شروع نشده‌اند.

## 1. Executive Summary

این مرحله به تولید تأییدنامهٔ صوری ختم نشد: فایل‌های موجود واقعاً با hash مقایسه شدند، داده/قراردادهای طراحی کنترل شدند، تصویرهای قابل‌دسترسی decode و بازبینی شدند، و چند اشکال مشخص در متن و source پیدا شد. اما **آمادگی برای C اثبات نشد**.

### محدودیت ورودی که قبل از بررسی ثبت شد

ZIP اصلی `PROJECT_LEO_PHASE_B_2026-11-04_v1.zip`، HTML نهایی prototype و بخش بزرگی از دارایی‌ها در workspace فعلی در دسترس نیستند. فقط رسید قبلی و بخشی از فایل‌ها باقی مانده‌اند. پس از اطلاع‌رسانی و واگذاری انتخاب روش از سوی کاربر، مسیر **بررسی محدودِ واقعی** انتخاب شد.

**این فقدان فعلی اثبات خرابی یا ناقص‌بودن ZIP تحویلی قبلی نیست.** علت از شواهد حاضر معلوم نیست. رسید CRC قدیمی به عنوان تست امروز شمرده نشده و ZIP یا HTML تازه‌ای به جای اصل ساخته نشده است.

### نتیجه‌های مهم

- هر **۱۳ فایل الزامی** در نسخهٔ باقی‌مانده وجود دارد و hash آن با declaration تطبیق دارد.
- **۷۴ از ۳۰۸ entry** فهرست تحویل اکنون قابل دسترسی‌اند؛ همین ۷۴ مورد mismatch ندارند. **۲۳۴ مورد** فعلاً غایب‌اند.
- از **۲۴۹ دارایی**، فقط **۱۸ فایل مستقیم** موجود است؛ بایت **۱۴ مورد دیگر** از منابع صریحِ جاسازی‌شده/منبع اصلی همسان بررسی شد. مجموع **۳۲ payload** تطبیق داده شد؛ این به معنی وجود ۳۲ فایل در ZIP اصلیِ غایب نیست.
- **۲۳ تصویر** از منابع قابل‌دسترسی decode شد و ابعاد/alpha با declaration هم‌خوان بود؛ بررسی کامل **۲۱ جفت SVG/PNG مسدود** است.
- تعریف **۶۷ نما، ۹۳۸ state و ۲۴۸ N/A** از نظر ساختار/مطابقت داده کنترل شد؛ N/Aها همچنان N/A هستند، نه PASS رفتاری.
- چند یافتهٔ source/content شامل مسیر نادرست B02، validation ناکافی هدف، binding نامرتبط D03، IPA اشتباه helmet و راهنمای نادرست /æ/ ثبت شد. **هیچ اصلاحی اعمال نشد**.
- مرورگر واقعی: **BLOCKED**. دستگاه/TalkBack: **NOT TESTED**. هیچ DOM شبیه‌سازی‌شده‌ای در B1 جایگزین آن‌ها نشد.

### شمارش معیارهای بررسی، نه شمارش تست‌های مرورگر

{table(['Status','تعداد معیار گروهی'],[(k,counts[k]) for k in ['PASS','FAIL','BLOCKED','NOT TESTED','NEEDS REVIEW']])}

این {len(tests)} ردیف، معیارهای بسته/متن/source/محدودیت اجرا هستند؛ ۳۵ سفر کاربر یا ۹۳۸ تست runtime نیستند. [فهرست کامل تست‌ها](registers/TEST_REGISTER_FINAL.csv)

## 2. Package Integrity

### حفاظت

پیش از بررسی عمیق، hash فایل‌های موجود ثبت شد. در پایان **{pres['available_files_checked']} فایل حفاظت‌شده** دوباره مقایسه شد: **۰ تغییر و ۰ فقدان تازه** نسبت به baseline همین فاز. کدهای LMS/Native، دیتابیس اصلی، dependency/lockfile و اسناد قبلی تغییر نکردند. اصل SQLite فقط برای hash به‌صورت bytes خوانده شد؛ اتصال دیتابیس، migration یا API ساخته نشد.

[Baseline فعلی](evidence/PROTECTED_BASELINE_CURRENT.json) · [کنترل پایان](evidence/PRESERVATION_AFTER_REVIEW.json)

### وضعیت اصل بسته

| بررسی | وضعیت | واقعیت |
|---|---|---|
| دریافت/استخراج ZIP اصلی | BLOCKED | فایل موجود نیست؛ extraction انجام نشد |
| SHA-256 و CRC امروز برای ZIP B | BLOCKED | hash رسید قبلی فقط مقدار مورد انتظار است |
| README_FA و گزارش نهایی | PASS در حد خواندن و تطبیق | هر دو کامل خوانده شدند؛ خودشان Gate را PARTIAL می‌دانند |
| ۱۳ فایل الزامی | PASS در کپی موجود | با فهرست و hash اعلام‌شده مطابق‌اند |
| ۷۴ فایل موجود در manifest | PASS در حد bytes | هیچ mismatch مشاهده نشد |
| کامل‌بودن mirror فعلی | FAIL ورودی | ۲۳۴ فایل قابل دسترسی نیستند؛ به ZIP اصلی تعمیم داده نشود |
| Namespace لینک‌ها | PASS ساختاری | ۹۸ لینک، صفر مقصد خارج از فهرست مورد انتظار |
| Resolution لینک‌ها در mirror | BLOCKED برای ۷۰ مقصد | نبود فایل فعلی؛ نه اثبات link شکسته در ZIP اصلی |

رسید تاریخی، اندازهٔ **۱۶٬۳۵۷٬۳۹۰ بایت** و SHA-256 زیر را برای ZIP B ثبت کرده است؛ این مقدار در B1 روی اصل ZIP اندازه‌گیری نشده:

`81820725c4ce526465df41fb3bdc36d6d688834040fee2240a27134e4a1dd350`

### دارایی‌ها، duplicateها و مجوز

محتوای ۳۲ دارایی از منابع مشخص با hash/size مقایسه شد. شش PNG از data URIهای یک **رکورد تاریخیِ render شبیه‌سازی‌شده** خارج و فقط در پوشهٔ شواهد B1 ذخیره شدند؛ بایتشان با Manifest برابر است. این عمل تولید تصویر جدید، بازسازی ZIP، اجرای مرورگر یا restore در پروژه نیست. هشت فایل صوتی منبع نیز hash/header متناظر دارند؛ صدایشان در B1 شنیده نشده است.

در declaration دو گروه duplicate وجود دارد: Available/Selected/Correct/Incorrect مربوط به **E05** یک hash دارند و چهار نام متناظر **E08** نیز hash یکسان دارند. بنابراین ۱۲۷ نام artboard طبق declaration، ۱۲۷ طراحی تصویری یکتا نیستند. Correct/Incorrect در speaking می‌تواند N/A منطقی باشد؛ **Selected** در قرارداد applicable است و علت alias شدن باید روشن شود. فایل‌های منفرد این موارد موجود نیستند؛ نتیجه **NEEDS REVIEW** است، نه حکم قطعی corruption.

باینری‌های فونت فعال و فایل‌های OFL همراه در mirror فعلی غایب‌اند؛ تطبیق کامل مجوز/نسخهٔ تحویلی **BLOCKED** است. فایل منبع اصلی Noto در reference باقی مانده و hash و metadata مجوز آن بررسی شد؛ این فایل، همان subset فعالِ ارسال‌شده نیست. declarations حقوق/پرووننس وجود دارند، اما به approval هنری/تجاری تبدیل نشدند.

[فایل‌ها](registers/DELIVERY_FILE_CHECKS.csv) · [دارایی‌ها](registers/ASSET_VALIDATION.csv) · [تصویر/alpha](registers/IMAGE_BYTE_VALIDATION.csv) · [جفت SVG/PNG](registers/LEO_PAIR_CHECKS.csv) · [duplicate declarations](evidence/DECLARED_DUPLICATE_HASHES.json)

## 3. Design Validation

تمام **۶۷ ID** گروه‌های A تا I در specification و metadata موجودند. تمام required fields و مقصدهای `next` وجود دارند؛ CSV و JSON مربوط به **۹۳۸ state** اختلاف ندارند. **۲۴۸ N/A با دلیل حفظ شد**. این صرفاً صحت ساختار و علت‌های ثبت‌شده است؛ معناداری تمام N/Aها یا رفتار UI تأیید نشده است.

**هیچ‌یک از ۶۷ artboard منفردِ مرجع اکنون موجود نیست**؛ بعضی نمودهای کلی مانند Home در study sheet دیده می‌شوند، اما sheet کلی جای بررسی صفحه‌به‌صفحه را نمی‌گیرد. در [SCREEN_67_REVIEW](registers/SCREEN_67_REVIEW.csv) برای هر صفحه، مسیر مورد انتظار، وضعیت availability، state count، N/A و محدودیت review ثبت شده است.

### ناسازگاری‌های مشخص

1. **B02 → H04 — FAIL، MEDIUM:** Primary «تغییر هدف» به صفحهٔ دسترس‌پذیری می‌رود. وجود ID مقصد صحیح است، اما معنای مقصد با وظیفه هم‌خوان نیست. [مقایسهٔ مستقیم](evidence/B02_H04_CONTRACT_COMPARISON.json)
2. **ورودی زمان/هدف — FAIL، MEDIUM:** `primary()` فقط عدد مثبت را اختصاص می‌دهد و سپس navigate می‌کند؛ مقدار نامعتبر صریحاً متوقف/گزارش نمی‌شود. `min=1` به تنهایی جلوی handler یک `type=button` را نمی‌گیرد. این مشاهدهٔ source است؛ مرورگر اجرا نشده است.
3. **D03 — FAIL، HIGH:** عنوان و الگوی grammar پویاست، ولی توضیح فارسی ثابت I am / You are است. برای درس‌هایی مثل This / That و Daily Routine، binding آموزشی نیاز به اصلاح دارد.
4. **State aliases E05/E08 — NEEDS REVIEW:** duplicate declaration با حالت Selectedِ applicable باید تعیین تکلیف شود؛ N/Aهای صحیح نباید برای افزایش پوشش به PASS تبدیل شوند.
5. **Focus — NEEDS REVIEW:** source در تعامل‌های متعدد innerHTML را جایگزین می‌کند و restoration در همهٔ مسیرها روشن نیست. این یک ریسک static است؛ خرابی واقعی keyboard بدون browser test ادعا نشده است.

`node --check` روی JS باقی‌مانده موفق بود؛ این فقط syntax است و کد اجرا نشد. مسیرهای app اصلی دست‌نخورده ماندند.

## 4. Leo Character Consistency

شیت ۱۶ حالت و چهار نمای مرجع موجود، با hash تطبیق و تازه مشاهده شدند. خانوادهٔ رنگ، کلاه، لباس و سبک صورت در sheet مشترک به نظر می‌رسد؛ **این مشاهده، تأیید هنری یا تطبیق همهٔ sourceهای منفرد نیست**.

برای هر ۱۶ حالت یادداشت مستقل نوشته شد: صورت، بدن، دست، نگاه و کاربرد بررسی شد؛ وضعیت همه **NEEDS REVIEW** باقی مانده است. حالت‌های Running/Jumping، هم‌پوشانی دست و صورت و تفکیک Excited/Celebrating به داوری هنری نیاز دارند. حالت اشتباه در sheet تحقیر آشکار ندارد، اما اثر واقعی بر بزرگسال/مبتدی بدون review مخاطب تأیید نمی‌شود.

سه‌رخ عمدتاً بدن روبه‌رو دارد؛ نمای پشت/نیم‌رخ نیز در جزئیات دست، collar و boot نیازمند refinement است. خود B این نماها را draft نامیده بود؛ به final ارتقا داده نشدند. SVG یا PNG ثابت، **Native animation، rig، lip-sync یا نشانهٔ recording واقعی نیست**.

[مرور ۱۶ حالت](registers/LEO_16_STATE_REVIEW.csv) · [turnaround](evidence/LEO_TURNAROUND_REVIEW.json) · [کپی بدون تغییرِ sheet](evidence/unchanged_source_sheets/LEO_CHARACTER_REFERENCE_v2.png)

## 5. Browser Testing

**BLOCKED.** مرورگر واقعی یا ابزار آن در محیط بررسی‌شده یافت نشد و HTML اصلی هم در دسترس نیست. هیچ browser نصب یا source/HTML تازه‌ای به جای بستهٔ اصلی تولید نشد. تست DOM شبیه‌سازی‌شدهٔ فاز B بازاجرا یا به نتیجهٔ B1 تبدیل نشد.

سفر Home تا Progress، جواب غلط/درست، fail-next، Retry، completion تکراری، دکمه/back/scroll و state inspector **اجرا نشده‌اند**. برای هر کدام مراحل و معیار پذیرش در [برنامهٔ تست مرورگر](registers/BROWSER_TEST_PLAN.csv) ثبت شده است.

- **Console Error:** جمع‌آوری نشده؛ «۰ خطا» گزارش نمی‌شود.
- **Network Error:** جمع‌آوری نشده؛ «۰ خطا» گزارش نمی‌شود.
- درخواست‌های خواندن مراجع لغت/IPA، ترافیک prototype یا browser test محسوب نمی‌شوند.

## 6. Mobile & Accessibility

Android، viewport واقعی، keyboard/focus، TalkBack، IPA/native shaping، hitbox فیزیکی، large text و reduced motion روی دستگاه **NOT TESTED** هستند. ابزارهای adb/emulator در دسترس نبودند؛ هیچ نصب یا دستگاه مجازی ایجاد نشد.

**کاری که واقعاً انجام شد:** ۳۲ pair رنگِ token دوباره مستقل محاسبه شد و با حدود ثبت‌شده سازگار بود؛ ۳۲ path-data آیکونِ JSON از نظر syntax parse شد. این‌ها به معنی دسترس‌پذیری کامل، native dp/sp یا کارکرد screen reader نیستند. اعداد geometry قدیمی صرفاً evidence تاریخی‌اند و دوباره به عنوان اندازه‌گیری دستگاه معرفی نشده‌اند.

[contrast تازه](registers/CONTRAST_RECOMPUTED_B1.csv) · [mobile plan](registers/MOBILE_ACCESSIBILITY_TEST_PLAN.csv) · [capabilities](evidence/ENVIRONMENT_CAPABILITIES.json)

## 7. Language & Content Review

متنِ قابل‌دسترسی **۲۵ درس، ۱۰۰ واژه، ۶ گرامر و ۲۵ پرسش** مرور شد؛ ۹۱۳ فیلد متنی آموزشی ثبت شد. corpus فارسی/fragment/contract نیز فهرست و مرور تحریریه شد. متن‌های توسعه‌دهنده از copy مبتدی تفکیک شدند؛ شمارش رشته‌ها برابر تعداد جمله‌های تأییدشده یا coverage کامل متن‌های غایب نیست.

### یافته‌های اولویت‌دار
- **helmet — FAIL، HIGH:** source برابر `/ˈhelɪt/` است و /m/ ندارد. [Cambridge](https://dictionary.cambridge.org/dictionary/english/helmet) در صورت‌های نمایش‌داده‌شده /m/ را دارد. اصلاح نهایی باید با accent/audio policy هماهنگ شود.
- **/æ/ مانند آ — FAIL، HIGH:** راهنمای Basic English Sounds آواهای متفاوت را یکی می‌کند. [مرجع /æ/](https://en.wikipedia.org/wiki/Near-open_front_unrounded_vowel) و [راهنمای IPA فارسی](https://en.wikipedia.org/wiki/Help:IPA/Persian) این تمایز را نشان می‌دهند.
- **my / our — FAIL، MEDIUM:** ترجمهٔ نمونهٔ fire station، مالکیت مفرد را به ما تبدیل کرده است.
- **نگارش فارسی — FAIL، LOW:** «پایانیٔ» و «بسته‌نبودن» بازنگری می‌خواهند.
- **NEEDS REVIEW:** time ranges greeting، ادب مطلق، طبیعی‌بودن برخی جمله‌ها، vowel letters در برابر vowel sounds، accent/IPA style، خوانایی انگلیسیِ طولانی برای مبتدی مطلق و جداسازی jargon فنی.

رونویسی، ارتباط صوت/متن/تمرین و حقوق/گویندهٔ هشت فایل، تایید نشده است. header یا hash، کیفیت شنیداری و تطابق transcript را ثابت نمی‌کند. هیچ STT، recording یا phonetic scoring اجرا نشد.

**هیچ محتوای آموزشی در B1 اصلاح، Approved یا Published نشده و تأیید مدرس/SME جعل نشده است.** پیشنهادها فقط برای بازنگری مجاز ثبت شده‌اند.

[گزارش زبان](review/LANGUAGE_CONTENT_REVIEW_FA.md) · [۱۸ یافته](registers/LANGUAGE_FINDINGS.csv) · [مرور تک‌تک درس‌ها](registers/LESSON_25_EDITORIAL_REVIEW.csv) · [الزامات صوت](registers/AUDIO_TEXT_ALIGNMENT.csv)

## 8. Open Issues

{table(['ID','Severity','Status','یافته'],[(x['issue_id'],x['severity'],x['status'],x['finding']) for x in issues])}

[جزئیات، شواهد، مسئول پیشنهادی و اقدامِ اعمال‌نشده](registers/OPEN_ISSUES.csv). مقدار CRITICAL قدیمی پایین آورده نشده؛ این فاز آن را دوباره کشف یا برطرف نکرده است. نبود یافتهٔ CRITICAL تازه در دامنهٔ محدود، تأیید امنیت نیست.

## 9. Blocked Tests

- اصل ZIP، hash/CRC و extraction بستهٔ B: **BLOCKED**.
- payloadهای غایب، artboardهای منفرد و ۲۱ جفت SVG/PNG: **BLOCKED**.
- فایل‌های فعال font/license و runtime rendering: **BLOCKED**.
- browser journey، Console/Network و focus واقعی: **BLOCKED**.
- Android/device/TalkBack/physical target/large text/native motion: **NOT TESTED**.
- تأیید هنری، حقوق انتشار نهایی، معلم/گوینده/SME و user suitability: **NEEDS REVIEW**.

این موارد با PASSهای ساختاری جبران نمی‌شوند. N/Aهای مستند نیز از این محدودیت‌ها مجوز C تولید نمی‌کنند.

## 10. Recommended Actions

1. **بازیابی ورودی صحیح:** مالک، همان ZIP اصلی B را دوباره ارائه کند؛ hash با رسید مقایسه و سپس در copy مستقل استخراج شود. نبود فایل، مجوز ساخت بستهٔ جدید و معرفی آن به جای اصل نیست.
2. **بازنگری مجاز طراحی/محتوا، نه در B1:** مقصد B02، validation هدف، binding D03 و خطاهای helmet/واکه/ترجمه/copy اصلاح و نسخه‌دار شوند. aliasهای E05/E08 و انتخاب‌های N/A تعیین تکلیف شوند.
3. **پذیرش شخصیت:** sourceهای کامل و همهٔ viewها توسط artist/مالک بررسی و تایید واقعی ثبت شوند؛ static SVG به rig ارتقا داده نشود.
4. **مرورگر واقعی:** روی HTML همان نسخهٔ مورد ارزیابی، سفرهای BR-01…BR-10 با Console/Network evidence غیرحساس انجام شوند. بدون ابزار/مجوز مناسب، BLOCKED بمانند؛ نصب در این فاز انجام نشد.
5. **دستگاه و دسترس‌پذیری:** MA-01…MA-08 با دستگاه/محیط مجاز و artifact/version مشخص اجرا شوند؛ اعداد CSS یا raster را native measurement ننامید.
6. **محتوا/صوت:** transcript و mapping نسخه‌دار، policy لهجه/واژه‌های تخصصی و review مستقل آموزشی/صوتی/ایمنی ثبت شود. پیشنهاد دستیار به‌تنهایی approval نیست.
7. **C0 مستقل بعدی:** وضعیت source واقعی Windows/lock/SDK و هشدارهای امنیتی در مجوز فنی جدا بررسی شود؛ B1 dependency نصب/ارتقا یا patch نکرده است.

## 11. Development Readiness Decision

| شرط ورود به C | وضعیت فعلی | علت |
|---|---|---|
| بستهٔ کامل و بی‌نقص ساختاری | BLOCKED | ZIP اصلی و اکثر payloadها در دسترس نیستند |
| دارایی‌های اصلی تأییدشده | NEEDS REVIEW | تایید هنری/حقوقی و sourceهای کامل موجود نیست |
| مسیر اصلی در مرورگر واقعی بررسی شده | BLOCKED | browser و HTML اصلی در دسترس نیست |
| مسائل مهم طراحی/تعامل تعیین تکلیف شده | FAIL | اشکال‌های source/content ثبت‌شده هنوز اصلاح نشده‌اند |
| فارسی/انگلیسی/a11y مستند | PASS فقط مستندات | مستندسازی وجود دارد؛ رفتار/زبان/دسترس‌پذیری کامل هنوز تأیید نشده |
| نبود ریسک بحرانی باز برای baseline توسعه | NEEDS REVIEW | گزارش CRITICAL قبلی و C0 باز است؛ audit تازه انجام نشده |

**مجوز C صادر نمی‌شود.** دلیل، صرفاً کمبود مستندات نیست؛ ورودی اصلی غایب، اجراهای ضروری مسدود، تأییدهای واقعی موجود نیست و چند اشکال مشخص از شواهد حاضر پیدا شده است. فایل‌های اصلی دست‌نخورده‌اند و C تا O شروع نشده‌اند.

**PARTIAL — MORE VALIDATION REQUIRED**
'''
with (O/'PHASE_B1_FINAL_REPORT_FA.md').open('x',encoding='utf-8') as f:f.write(text)
readme='''# Project Leo — خروجی اعتبارسنجی B.1

تاریخ: ۲۰۲۶-۱۱-۰۵ · تصمیم واحد: **PARTIAL — MORE VALIDATION REQUIRED**

از [گزارش فارسی ۱۱بخشی](PHASE_B1_FINAL_REPORT_FA.md) شروع کنید.

این ZIP **گزارش و شواهد محدود B.1** است؛ بستهٔ B یا prototype بازسازی‌شده نیست. اصل ZIP و HTML فاز B در workspace فعلی غایب بودند. کاربر انتخاب روش را واگذار کرد؛ بررسی موجودی واقعی و بدون جایگزین‌کردن شواهد انجام شد.

## داخل بسته
- گزارش نهایی، [تست‌های گروهی](registers/TEST_REGISTER_FINAL.csv) و [یافته‌های باز](registers/OPEN_ISSUES.csv).
- بررسی هر ۶۷ screen و ۹۳۸ state، بدون تبدیل N/A به PASS رفتاری.
- فهرست فایل‌ها/دارایی‌ها، لینک‌ها، hashهای تطبیق‌شده و محدودیت منابع تکمیلی.
- مرور ۱۶ حالت شخصیت روی sheet موجود؛ sourceهای منفرد/rig تایید نشده‌اند.
- review زبان و جدول هر ۲۵ درس؛ پیشنهادها اعمال نشده و approval معلم نیستند.
- برنامهٔ browser test با BLOCKED و mobile/accessibility با NOT TESTED.
- شش PNG از بایت‌های موجود در رکورد تاریخی استخراج و فقط برای evidence نگه داشته شده‌اند؛ hash آن‌ها با declaration برابر است. این کار تولید asset تازه یا بازسازی بسته نیست.

## آنچه انجام نشد
هیچ dependency نصب/ارتقا، تغییر کد اپ یا DB، API، APK، installer، مرورگر شبیه‌سازی‌شده به جای واقعی، یا تایید هنری/سازمانی ساخته نشد. source app و اسناد قبلی تغییر نکردند.

برای ادامهٔ کامل، ZIP اصلی B و محیط مرورگر/دستگاهِ مجاز لازم است. صرف خواندن این گزارش، مجوز ورود به C نیست.
'''
with (O/'README_FA.md').open('x',encoding='utf-8') as f:f.write(readme)
summary={'date':'2026-11-05','phase':'B.1 validation only','decision':'PARTIAL — MORE VALIDATION REQUIRED','C_authorized':False,'source_changed':False,'original_B_archive_available':False,'test_groups':len(tests),'test_status_counts':dict(counts),'required_files_present':13,'retained_delivered_files_checked':74,'missing_current_mirror_files':234,'asset_payloads_verified_with_explicit_provenance':32,'individual_reference_artboards_available':0,'screen_contracts':67,'state_cells':938,'na_preserved':248,'new_browser_runs':0,'new_simulated_DOM_runs':0,'mobile_runs':0,'qualified_approval_granted':False,'runtime_console_errors':'NOT COLLECTED','runtime_network_errors':'NOT COLLECTED','new_confirmed_critical_findings':0,'historical_CRITICAL_report_retained_unresolved':True,'note':'FAIL items include source/content defects and an explicitly scoped current-input completeness failure, not a new claim that the original ZIP was corrupt.'}
with (O/'evidence/B1_DECISION.json').open('x',encoding='utf-8') as f:json.dump(summary,f,ensure_ascii=False,indent=2)
print('Persian 11-section report and bounded evidence summary written. Decision:',summary['decision'])
