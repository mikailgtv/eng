from pathlib import Path
from collections import Counter
import csv,json,hashlib
ROOT=Path('/home/user/PROJECT_LEO_PHASE_B_2026-11-04_v1')
screens=json.loads((ROOT/'design/screens-v3.json').read_text());states=json.loads((ROOT/'design/screen-states-v2.json').read_text());tokens=json.loads((ROOT/'design/tokens-v2.json').read_text());motions=json.loads((ROOT/'design/motions.json').read_text());assets=json.loads((ROOT/'design/ACTIVE_LEO_ASSETS.json').read_text());metrics=json.loads((ROOT/'evidence/MOCKUP_GEOMETRY_MEASUREMENTS_DELIVERY.json').read_text())
BASE='> Project Leo · Phase B · 2026-11-04 · Design delivery v1\n> **DESIGN PROTOTYPE — نه اپ Android، نه APK، نه قابلیت اجراییِ اپ اصلی.**\n> Gate کلی: **PARTIAL**. فازهای C تا O شروع نشده‌اند.\n\n'
def put(name,title,body):
 p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x',encoding='utf-8') as f:f.write('# '+title+'\n\n'+BASE+body.strip()+'\n')
def table(headers,rows):
 esc=lambda x:str(x).replace('|',' / ').replace('\n',' ')
 return '| '+' | '.join(headers)+' |\n|'+'|'.join('---' for _ in headers)+'|\n'+'\n'.join('| '+' | '.join(esc(x) for x in row)+' |' for row in rows)+'\n'

decisions=[
('BD-01','ACCEPTED_SCOPE','اجازهٔ جدید B فقط طراحی را فعال می‌کند','ADR-A01 توقف A با دستور فعلی فقط برای B توسعه یافته؛ هیچ merge/rewrite/dependency/migration/build مجاز نیست.'),
('BD-02','SELECTED_FOR_DESIGN','مبتدی فارسی‌زبانِ بزرگسال، Android-first','محتوا/اقدام اصلی اول؛ پنل مدرس/سازمان از ناوبری اصلی مبتدی جدا. هیچ پژوهش انجام‌شده با کاربر ادعا نشده.'),
('BD-03','SELECTED_FOR_B_PROTOTYPE','مسیر A: Field Notes / دفتر یادگیری','هر دو مسیر contrast کافی دارند؛ A با لئوی evergreen/copper هماهنگ‌تر و برای مطالعهٔ آرام ترجیح طراحی است. این انتخاب نظر مستدل طراح است، نه رأی آزمایش‌شدهٔ مخاطب.'),
('BD-04','DESIGN_CANONICAL; OWNER_REVIEW_OPEN','لئوی 2D برداری، چشم قهوه‌ای و لباس ثابت','ADR-A09 پیشنهادی به canonical design این تحویل محدود شد؛ source برنامه/تصاویر قدیمی عوض نشدند. سه‌رخ/نیم‌رخ/پشت طرح ساختاری و نیازمند بازبینی هنری‌اند.'),
('BD-05','DESIGN_SELECTED','Vazirmatn فارسی + Leo Reading Sans برای English/IPA','اسکن glyph کمبود IPA در فونت فارسی را نشان داد. subset دوم با theta اصلاح و فایل جدید ساخته شد؛ هر دو خانواده OFL و بدون نصب system dependency هستند.'),
('BD-06','ACCEPTED_HONESTY','event موقت prototype جدا از دادهٔ واقعی','عدد محتوا از source؛ progress/attempt نمونه فقط از تعامل حافظهٔ همین HTML. XP/streak/ظرفیت/دادهٔ سازمانی unknown و —؛ native persistence ادعا نمی‌شود.'),
('BD-07','DESIGN_CONTRACT_DEFINED','آموزش → guided بدون نمره → independent نمونه','الگوی ۱۴ مرحلهٔ A و ۱۲ مرحلهٔ B برحسب موضوع ادغام می‌شود؛ grammar/audio نامرتبط اجباری نیست. هدف مستقل انتخاب سلام صبح است؛ دیدن توضیح، اثبات توانایی توضیح‌دادن محسوب نمی‌شود.'),
('BD-08','DRAFT_CONTENT','نمونهٔ واقعی حفظ؛ copy و تبدیل exercise جدا','۲۵ درس/۱۰۰ واژه/۲۵ سؤال/۶ گرامر/۸ صوت عین منبع؛ توضیح فارسی تازه، گزینه‌های MC و اصلاح good afternoon پیشنهادی و review-unverified هستند.'),
('BD-09','BLOCKED_FOR_RELEASE','E05 listening و E08 speaking محدودیت صریح دارند','E05 تا audio/transcript/objective review آماده نیست؛ E08 automatic correct/incorrect و phonetic score ندارد. خودارزیابی score=null است.'),
('BD-10','PROPOSED_FOR_C_D; NOT_INSTALLED','Reanimated برای UI، rig شخصیت بعد از spike','HTML/CSS فقط نمایش طراحی B است. Rive گزینهٔ stateful character، Lottie گزینهٔ timeline کوتاه، SVG/PNG منبع و fallback. runtime/SDK/license دقیق پیش از C/D بررسی شود.'),
('BD-11','PARTIAL_VALIDATION','اندازه‌گیری واقعی محدود، نه PASS کلی','contrast، glyph، alpha، هندسهٔ artboard و simulated-DOM اجرا شد؛ browser/TalkBack/native/performance و user research انجام نشده‌اند.'),
('BD-12','OPEN','English interface کامل نشده','رابط اصلی فارسی است؛ گزینهٔ English بررسی جهت و titleهاست. English learning content/IPA LTR مستقل است، نه ادعای localization کامل UI.'),
('BD-13','OPEN; C_NOT_AUTHORIZED','گیت ورود C پذیرفته نشده','تکمیل/تأیید turnaround، بازبینی بصری مالک، مرورگر/assistive technology، copy review و C0ِ منبع Windows/SDK/security هنوز بازند.'),
]
put('PHASE_B_PRODUCT_DECISIONS.md','تصمیم‌های محصول فاز B', '''
## نتیجهٔ مطالعهٔ ورودی
ZIP فاز A در مسیر جدا استخراج، CRC و hash manifest بررسی شد. هر ۱۷ سند خواسته‌شده کامل خوانده شد و ارجاع تفصیلی design system نیز بررسی شد. اصل فایل‌ها و اسناد A حفظ شدند. تعارض‌های اولیه در [INITIAL_CONFLICT_LOG](design/INITIAL_CONFLICT_LOG.md) ثبت شدند.

## تعریف محصول
Leo همراه آموزشی انگلیسی برای مبتدی فارسی‌زبان و بزرگسال است. تجربهٔ محلی فردی مقدم بر پیچیدگی سازمانی است. firefighter-inspired هویت بصری به معنی آموزش عملیات اضطراری یا تأیید PPE نیست. Next.js LMS و prototype Native مستقل باقی ماندند.

## دو جهت بصری
[مقایسهٔ تصویری](design/VISUAL_DIRECTION_STUDY.png)

| معیار | A: دفتر یادگیری | B: آزمایشگاه زبان | شواهد/نوع داوری |
|---|---|---|---|
| خوانایی | متن تیره روی کاغذ روشن، primary سبز عمیق | متن تیره/indigo روی سطح سرد | ۱۶ جفت رنگ هر مسیر واقعاً محاسبه شد؛ هر دو از آستانه گذشتند |
| تمایز برند | evergreen/copper و شخصیت 2D اصیل، بدون lime/دارایی رقبا | indigo/cyan فنی‌تر؛ هویت UI همچنان مستقل | داوری طراحی، نه trademark clearance |
| بزرگسال/مبتدی | آرام، گرم، یک CTA در Home و hierarchy واضح | رسمی‌تر و نزدیک‌تر به ابزار فنی | hypothesis؛ usability واقعی هنوز NOT TESTED |
| هزینهٔ اجرا | tokens ساده، بدون effect سنگین | از نظر CSS/رسانه مشابه | ادعای کاهش هزینهٔ عددی یا benchmark نداریم |

**A برای prototype انتخاب شد**؛ B برای مطالعه حفظ و در تب مقایسه قابل دیدن است. انتخاب قبلی cream/navy/amber/red بدون بررسی تکرار نشد. نه شخصیت، نه layout اختصاصی و نه asset متعلق به Duolingo/Babbel/Busuu کپی نشده است.

'''+table(['ID','وضعیت','تصمیم','دلیل و مرز'],decisions)+'''
## پژوهش و ابهام‌ها
این فاز requirements-driven design و heuristic review است، نه پژوهش با شرکت‌کننده. personaها فرضِ مخاطب‌اند، نه افراد واقعیِ مصاحبه‌شده. مناسب‌بودن برای بزرگسال/مبتدی نیاز به مشاهدهٔ سفر واقعی توسط مخاطب و بازبینی copy دارد؛ هیچ آمار رضایت، موفقیت یا مدت یادگیری ساخته نشده است.
''')

pose_rows=[
('Neutral','لبخند آرام؛ پلک طبیعی','ایستاده، شانه‌ها متعادل','دو دست پایین و باز','روبه‌رو','حضور خنثی و اعتماد','Welcome/empty','neutral'),
('Happy','دهان باز کوتاه و چشم آرام','وزن متعادل','یک دست خوشامد، دیگری کنار بدن','به یادگیرنده','بازخورد مثبت محدود','پاسخ نمونهٔ درست','neutral'),
('Excited','چشم اندکی بازتر؛ لبخند','بدن ایستاده، بدون اغراق کودکانه','دو دست بالا','روبه‌رو/کمی بالا','اتفاق مثبت ویژه','طراحی reward آینده','happy'),
('Thinking','دهان نامتقارن کوچک','بدن ثابت','دست نزدیک چانه','بالا/چپ','مکث برای فکر؛ نه نمایش AI فعال','راهنما یا save pending','neutral'),
('Confused','یک ابرو بالاتر؛ بدون سرزنش','سر با tilt کم','کف دست‌ها باز','کمی کنار','نیاز به روشن‌سازی مفهوم','کمک آموزشی','encouraging'),
('Teaching','نگاه هشیار و لبخند ملایم','ایستاده','اشارهٔ واضح به محتوا','به سمت محتوا','هدایت توجه','Lesson intro / example','neutral'),
('Listening','چشم آرام و سر کمی مایل','توجه به مخاطب','دست کنار گوش','به یادگیرنده','cue توجه، نه تشخیص گفتار','تمرین صوتی آینده','neutral'),
('Speaking','دهان باز ساده؛ نه viseme معتبر','تنه آرام','یک دست توضیح‌دهنده','روبه‌رو','همراهی روایت واقعی','نمونهٔ motion روایت','neutral'),
('Celebrating','لبخند باز محترمانه','بدن متعادل','دو دست بالا و باز','روبه‌رو','جشن رویداد معتبر','پایان درس/فصل','happy'),
('Encouraging','لبخند نرم و ابروی آرام','tilt ملایم','یک دست به سینه، دیگری باز','به یادگیرنده','همراهی بدون قضاوت','اشتباه و retry','neutral'),
('Sad After Mistake','نگرانی ملایم، بدون اشک یا خشم','سر اندکی مایل','دست همراهی','به یادگیرنده','همدلی؛ نه مجازات','فقط مرجع حالت؛ feedback اصلی از Encouraging استفاده می‌کند','encouraging'),
('Sleeping','چشم بسته','آرام و متوقف','دست‌ها روی تنه','بدون نگاه فعال','استراحت/idle طولانی','مرجعِ حالت، نه مانع مطالعه','neutral'),
('Running','تمرکز بدون خطر/ترس','حالت حرکت سبک','بازوهای مخالف پا','جهت حرکت','نمایش استعاری پیشروی','storyboard reward آینده','neutral'),
('Jumping','لبخند و چشم باز','پاهای جمع‌شده؛ ارتفاع محدود','دو دست بالا','روبه‌رو','جشن کوتاهِ قابل ردشدن','storyboard completion','happy'),
('Winning','لبخند کنترل‌شده','ایستاده','یک دست بالا','به یادگیرنده','شناخت یک milestone واقعی','نشانِ آینده، نه مقدار ساختگی','happy'),
('Explaining a Concept','دهان توضیحی ساده','ایستاده','کتاب ساده و اشاره','به محتوا','آموزش مفهوم، نه تزئین','Grammar/example','teaching'),
]
put('PHASE_B_LEO_CHARACTER_BIBLE.md','Character Bible لئو — canonical design v1', '''
## مرجع و وضعیت پذیرش
[Sheet چهار نما](design/LEO_CHARACTER_REFERENCE_v2.png) · [۱۶ حالت](design/LEO_EXPRESSION_SHEET.png) · [فهرست source/PNG فعال](design/ACTIVE_LEO_ASSETS.json)

یک خانوادهٔ برداری برای تمام صفحه‌های فعال انتخاب شده است. تصویر AI exploratory فقط مطالعهٔ art direction است و در UI استفاده نمی‌شود. وضعیت خانواده **CANONICAL DESIGN CANDIDATE** است؛ نه asset مصوب تجاری و نه rig. نماهای چرخیده construction draft هستند و برای دقت زاویه/دست/پشت لباس بازبینی هنری می‌خواهند. Gate کلی PASS نیست.

## هندسهٔ مرجع
- canvas source: 480×680 واحد، بدون stretch. واحد ساخت `u=160`، جعبهٔ اسمی سر از y=78 تا y=238؛ قد اسمی بدون کلاه 560 واحد =3.5u و baseline نزدیک y=638. کلاه حدود 40 واحد بالاتر می‌رود؛ این grid ساخت است، نه اندازهٔ زیستی یا 3D rig.
- مرکز صورت x=240؛ پهنای اسمی صورت 164 واحد. مرکز چشم‌ها در نمای جلو (199,157) و (281,157)؛ چشم بادامی، iris قهوه‌ای `#70472D`، pupil تیره `#26332D`؛ چشم آبیِ نسخهٔ قدیمی کنار گذاشته شد.
- muzzle روشن `#F6E6BF`، nose قهوه‌ای؛ گوش گرد، دم خمیده و نوک تیره. خال‌ها با anchor ثابت از source ساخته شده‌اند، نه تولید تصادفی در هر حالت.
- صورت ۱۳ anchor الگو دارد؛ بخشی زیر کلاه پنهان می‌شود. دم شش anchor rosette دارد. در viewهای دیگر visibility فرق دارد، نه هویت یا رنگ.
- uniform evergreen `#285D4D`، سایهٔ تخت `#1A433A`، helmet مسی `#B55836`، tape روشن `#D1C391/#F2E5B7`، شلوار `#354D48` و boot `#2B3C3B`. هیچ نشان واقعیِ سازمان یا ادعای PPE رسمی ندارد.
- دستکش با فرم گرد و انگشت‌های stylized؛ کف/پشت دست در نماهای چرخیده نیازمند artist refinement است. سایه‌ها shape تخت‌اند؛ هیچ gradient/3D فریبنده یا texture ساختگی حجیم استفاده نشده.

## قوانین consistency
پالت، landmarkهای سر، فرم کلاه، collar/tape، silhouette و glove/boot مشترک‌اند. تغییر expression حق تغییر گونه، رنگ چشم یا تعداد اندام نمی‌دهد. برای RTL کل شخصیت mirror نشود؛ جهت اشاره با pose یا view مناسب انتخاب شود. تصویر مرجع فقط با تغییر نسخهٔ bible عوض می‌شود. alpha واقعی در PNGها کنترل شده؛ transparent-looking checkerboard به عنوان transparency پذیرفته نمی‌شود.

## لایه‌ها و handoff
SVGها groupهای نام‌دار برای root، tail، legs، torso، arms/gloves، collar، head و helmet دارند. این **source ویرایش‌پذیر طراحی** است، نه فایل Rive/Lottie یا skeleton-tested. PNGهای فعال 720×1020 RGBA، portrait 230×221 و keyframe چشم‌بستهٔ جدا دارند. fallback ثابت همیشه موجود است.

'''+table(['حالت','صورت','بدن','دست‌ها','نگاه','کاربرد آموزشی','محل استفاده','fallback ثابت'],pose_rows)+'''
## منع رفتار آسیب‌زا
اشتباه با خشم، تمسخر، اشک اجباری، از دست‌دادن نمایشی دارایی یا اشارهٔ اتهامی پاسخ داده نمی‌شود. امتیاز و milestone فقط از دادهٔ معتبر می‌آیند؛ شخصیت حق ایجاد موفقیت/نمره/ثبت خیالی ندارد. ایمنی لباس/تصویر عملیاتی به expert review نیاز دارد و خارج از ادعای این طراحی است.
''')

put('PHASE_B_DESIGN_SYSTEM.md','Design System فاز B', '''
مرجع tokens: [tokens-v2.json](design/tokens-v2.json)؛ مرجع اجزا: [Component Sheet](design/COMPONENT_REFERENCE_SHEET.png). این‌ها قرارداد طراحی‌اند، نه component library Native.

## زبان بصری و سلسله‌مراتب
مسیر منتخب Field Notes: کاغذ روشن، متن تیره، evergreen برای اقدام، copper/ochre برای accent محدود. یک focus card در Home و یک اقدام اصلی؛ هدف و progress بخش‌های ساده‌اند، نه کارت‌های تکراری. illustration در خدمت زمینه/feedback، نه پوشاندن متن یا فشار احساسی. teacher/enterprise در catalog طراحی جداست.

| بخش | قرارداد |
|---|---|
| Color | همهٔ semantic pairs از tokens؛ raw contrast و نقش هر جفت ثبت شده. رنگ تزیینی مجوز متن کم‌کنتراست نیست. |
| Typography | Vazirmatn برای فارسی، Leo Reading Sans برای English/IPA؛ body16، caption14، heading28، word36 و line-height مشخص. |
| Spacing/grid | 4/8/12/16/24/32/40/48/64؛ phone margin24 (در عرض کوچک16–20)، tablet reflow دوپنلی؛ spacing از هدف صفحه می‌آید. |
| Radius/elevation | control12، surface18، hero26؛ یک shadow سبک برای قاب prototype. shadow مفهوم permission/selection را منتقل نمی‌کند. |
| Iconography | ۳۲ shape خطی اصیل، viewBox24، stroke2؛ آیکون کوچک داخل target حداقل48، نه خودِ 24px به‌عنوان hit area. |
| Button | primary/secondary/text/icon؛ حداقل48 منطقی، loading و disabled با دلیل؛ دکمه فقط با نتیجهٔ معتبر success می‌دهد. |
| Card | focus lesson، vocabulary و message؛ rowهای تنظیمات/history با divider به جای card بی‌هدف. |
| Input | label پایدار، placeholder کمکی، error مرتبط و حفظ مقدار؛ نام مستعار اختیاری، بدون password/credential واقعی در prototype. |
| Selection | border + متن/icon، نه رنگ تنها؛ radio keyboard/tap و matching بدون drag اجباری. |
| Progress | numerator/denominator و provenance؛ unknown با —، هرگز fake percentage. وضعیت pending از committed جدا. |
| Navigation | Home/Path/Review/Settings؛ مسیرهای آینده خارج از bottom nav. back و active state روشن، focus پس از transition نیاز به browser verification دارد. |
| Dialog | نام/دامنهٔ عمل، لغو واضح، focus trap/return در نمونه؛ آزمون واقعی keyboard و screen reader انجام نشده. |
| Toast/feedback | inline و role=status در prototype؛ اطلاعات حیاتی فقط toast گذرا نیست. Correct و Save success دو state مستقل‌اند. |
| Empty | علت نداشتن داده و راه شروع؛ آمار یا کاربر فرضی برای پرکردن صفحه نداریم. |
| Loading | skeleton ثابت و متن، بدون درصد جعلی؛ shimmer اجباری نیست. |
| Error/recovery | علت قابل‌فهم، نگه‌داشتن انتخاب، retry امن و مسیر جایگزین؛ در prototype simulation برچسب‌دار است. |
| Disabled | کنترل غیرفعال با توضیح readable؛ متن مهم با opacity کم پنهان نمی‌شود. |

## RTL/LTR
رابط اصلی فارسی RTL، مثال/IPA/کد با `dir=ltr` و language context جدا. nav جهت‌دار semantic است؛ waveform، timeline صوت و glyphهای فنی کورکورانه mirror نمی‌شوند. تصویر Leo هم به خاطر RTL flip نمی‌شود. English interface کامل هنوز تحویل نشده؛ mode انگلیسی prototype بررسی عنوان/جهت است و توضیح فارسی جدا می‌ماند.

## Responsive و accessibility
Phone اولویت؛ breakpointهای طراحی phone<600، tablet600–1023 و desktop≥1024. سه tablet artboard مستقل موجود است، اما breakpoint CSS در مرورگر اجرا نشده. target48dp در محصول، معادل‌سازی با 48 logical px در طرح فقط فرض طراحی است؛ native measurement هنوز لازم است.

برای large text، صفحه scroll می‌شود و bottom nav در نمونه می‌تواند دو ردیفی شود؛ متن کوچک نمی‌شود تا به زور جا بگیرد. reflow واقعی در 150/200٪، TalkBack و حالت device low-performance هنوز NOT TESTED هستند؛ حداقل‌های source به تنهایی PASS نیستند.
''')

colorrows=[]
for k,v in tokens['routeA'].items():
 if k!='name':colorrows.append((k,v, 'decorative only' if k=='decorativeLine' else 'semantic use per design system'))
ratios=list(csv.DictReader((ROOT/'evidence/CONTRAST_MEASUREMENTS.csv').open(encoding='utf-8-sig')))
put('PHASE_B_COLOR_TYPOGRAPHY_TOKENS.md','Color & Typography Tokens', '''
## پالت منتخب A
'''+table(['Token','Value','Scope'],colorrows)+'''
## typography
| نقش | اندازهٔ طراحی | line-height پایه | توضیح |
|---|---|---|---|
| فارسی body |16|28|Vazirmatn؛ افزایش با text-scale |
| label/caption |14|24|هیچ متن حیاتی با اندازهٔ ریز تزئینی جایگزین نشود |
| عنوان اصلی |28|42|وزن700؛ wrap طبیعی |
| واژهٔ انگلیسی |36|50|Leo Reading Sans؛ LTR |
| IPA |18|حدود30|فونت مکمل؛ بدون mirror یا اضافه‌کردن slash تکراری |
| controls |16|متناسب با حداقل52 ارتفاع در نمونهٔ اصلی|متن چندخطی در صورت نیاز، نه کاهش فونت |
| icon |24|داخل48 target|label برای icon-only |

weightهای 400/600/700، scale فاصله و radius در JSON مرجعند. بعضی roleهای display/wordmark/English examples اندازهٔ اپتیکی مستقل دارند؛ source CSS همراه است. CSS px، native sp/dp اندازه‌گیری‌شده محسوب نمی‌شود.

## اندازه‌گیری رنگ واقعی
نسبت‌ها با تبدیل sRGB به linear luminance و `(Lmax+0.05)/(Lmin+0.05)` محاسبه شده‌اند؛ screenshot eye-balling یا نظر طراح جای این محاسبه نیست. ۳۲ جفت تعریف‌شده برای دو مسیر بررسی شدند. همهٔ جفت‌های متنِ تعریف‌شده ≥4.5 و مرزهای ضروری ≥3 بودند. مسیر A: کمینهٔ متن **4.961:1** و non-text **3.566:1**.

'''+table(['Route','FG token','BG token','Role','Ratio','Minimum','Result'],[(x['route'],x['foreground_token'],x['background_token'],x['role'],x['ratio'],x['minimum'],x['result']) for x in ratios])+'''
## استثناها و محدودیت
decorative separator و illustration همان معیار مرز control ضروری را ندارند؛ معنی اصلی با متن/icon قوی مستقل ارائه می‌شود. native browser audio controls، رنگ‌های واقعی OS، font smoothing و contrast در تمام ترکیبات پویا توسط مرورگر اندازه‌گیری نشده‌اند. کنترل runtime و color-blind/user review برای gate C باز است.

## فونت و حقوق
Vazirmatn از مخزن رسمی Google Fonts، بدون تغییر و با OFL همراه. IPAهای موجود چند glyph خارج از پوشش آن داشتند؛ Leo Reading Sans subset تغییرنام‌یافتهٔ Noto Sans برای Latin/IPA/Greek افزوده شد. subset اول theta نداشت و رد شد؛ v2 مستقل ساخته شد. همهٔ IPAهای ۱۰۰ واژهٔ موجود در cmap v2 پوشش داده شدند. TTF و WOFF فعال cmap یکسان دارند؛ conversion مجوز را تغییر نمی‌دهد. source Git blob و SHA-256 در evidence‌اند؛ این اعتبارسنجی digital signature مستقل نیست. هیچ font/system package نصب نشده است.
''')

maprows=[]
for s in screens:
 file='mockups/phone/'+s['id']+'__Available'+('_v2' if s['id'] in ['C03','C04','C05','D04'] else '')+'.webp'
 maprows.append((s['id'],s['group_title'],s['title'],s['title_en'],s['kind'],s['next'],'[mockup]('+file+')'))
put('PHASE_B_SCREEN_MAP.md','Screen Map — ۶۷ صفحه و نمای طراحی', '''
گروه B چند subview/component از Home دارد؛ وجود ID برای آن‌ها به معنی ساخت dashboard شلوغ یا routeهای اضافی در app نیست. همهٔ گروه‌های A تا I پوشش طراحی دارند؛ I همیشه FUTURE و جدا از مسیر مبتدی است.

'''+table(['ID','گروه','نام فارسی','English','نوع نما','مقصد primary','Artboard'],maprows)+'''
## Navigation
A02 → A03 → A04 → A05 → A06 → A07 → A08 → B01؛ skip به Home موجود است. سفر اصلی: B01 → C01 → C02 → D01 → D02 → D04 → E01 → D07 → F03. دیگر صفحه‌ها از catalog انتخاب می‌شوند. نقش/permission سازمانی در این HTML ایجاد نمی‌شود.

[Prototype مستقل](prototype/LEO_DESIGN_PROTOTYPE_FINAL.html) دارای selector تمام ۶۷ ID، state inspector، مقایسهٔ دو مسیر، gallery شخصیت، reference اجزا و motion storyboard است. این navigation فقط در کد/DOM شبیه‌سازی‌شده بررسی شده، نه در مرورگر واقعی.
''')

specparts=['## قرارداد خواندن این سند\nهدف/اقدام/محتوا/feedback/اشتباه/interruption/persistence برای هر ID ثبت شده است. persistenceها **طراحی آینده** هستند. در HTML هیچ DB، localStorage یا file-picker/microphone واقعی استفاده نشده.\n\nماتریس کامل: [SCREEN_STATE_MATRIX_v2.csv](design/SCREEN_STATE_MATRIX_v2.csv). ۶۷×۱۴=۹۳۸ حالت بررسی شده؛ ۲۴۸ مورد N/A با دلیل‌اند. N/A با «تست نشده» فرق دارد. Error/Loading/Empty/MissingContent، در حالت applicable نباید با دادهٔ آمادهٔ متناقض نمایش داده شوند.\n']
for s in screens:
 rows=[x for x in states if x['screen_id']==s['id']]
 learning=s['learning_goal'] if s['group'] in ['D','E'] or s['id']=='F02' else 'N/A برای سنجش مستقیم زبان؛ این صفحه وظیفهٔ UX/پشتیبانی/مدیریت دارد. هدف آن: '+s['purpose']
 specparts.append('## '+s['id']+' — '+s['title']+' / '+s['title_en']+'\n\n'+table(['مولفه','Specification'],[
 ('Scope',s['scope']),('هدف UX',s['purpose']),('هدف یادگیری',learning),('اقدام کاربر',s['user_action']),('محتوای دیده‌شده',s['visible_content']),('بازخورد',s['feedback_contract']),('اشتباه و خطا',s['error_contract']),('قطع فرایند',s['interruption_contract']),('قرارداد داده/ذخیره',s['persistence_contract']),('Primary / next',s['primary']+' → '+s['next']),('دسترس‌پذیری',s['accessibility']),('Release status','DESIGN ONLY؛ وجود طرح هیچ feature را برای اپ اصلی operational یا release-ready نمی‌کند.')])+'\n'+table(['State','Applicable?','UI / rationale','رفتار'],[(x['state'],'YES' if x['applicable'] else 'N/A',x['ui_copy'] if x['applicable'] else x['rationale'],x['behavior']) for x in rows]))
exercise=[
('E01','گزینه از سؤال واقعی صبح','exact option + explanation','صحیح/نیازمند مرور با متن، نه رنگ تنها','score صرفاً نمونه؛ commit failure جدا','Contract defined; native/teacher QA pending'),
('E02','word↔translation از source','pair ID، منع انتخاب تکراری، feedback هر pair','نشان‌دادن mapping و علت','attempt/version در آینده؛ retry بدون duplicate','Contract defined; not implemented in app'),
('E03','I am Ali.','token order با ID نه string تکراری','نمایش ترتیب و امکان تغییر','checkpoint/drop alternative','Contract defined; not implemented in app'),
('E04','She ____ a teacher.','accepted exact normalized answers؛ نه substring','is با explanation کوتاه','empty invalid؛ حفظ input در خطا','Contract defined; not implemented in app'),
('E05','audio/transcript alignment ناموجود','logic قابل تعریف است، دادهٔ معتبر لازم','فقط future layout؛ ارزیابی واقعی غیرفعال','تا QA محتوای صوتی، release blocked','BLOCKED_CONTENT_REVIEW'),
('E06','I am a firefighter.','token sequence و variants authored','معنا/grammar با معیار روشن','حفظ چیدمان در save failure','Contract defined; draft educational conversion'),
('E07','hello → سلام؛ درود به‌عنوان draft alternative','accepted set یا rubric؛ unknown ambiguous','پاسخ متفاوت بدون معیار قطعی، غلط قطعی نیست','manual/null برای ابهام','Contract defined; linguistic review pending'),
('E08','listen-repeat/self comparison','recorded audio واقعی در آینده؛ نه text-match phonetics','Correct/Incorrect آوایی N/A؛ خوداظهاری مجزا','score=null؛ رضایت/permission/final file validation','BLOCKED_NATIVE_RECORDING; automatic scoring unavailable'),
]
specparts.append('## قرارداد ویژهٔ ۸ نوع تمرین\n\n'+table(['ID','منبع/نمونه','validation','feedback','score / persistence','وضعیت'],exercise)+'\n«نوع قابل تعریف» با «نوع پیاده‌شده/قابل انتشار» یکی نیست. تمام این نوع‌ها در اپ اصلی هنوز از روی این تحویل ساخته نشده‌اند. حالات Selected/Correct/Incorrect/Save Failed برای بررسی طراحی موجود است؛ در E08 عدم تعریف correct/incorrect آوایی صریح است و در E05 وابسته به QA.\n')
put('PHASE_B_SCREEN_SPECIFICATIONS.md','Screen Specifications و State Matrix', '\n\n'.join(specparts))

put('PHASE_B_UX_FLOWS.md','جریان‌های UX و تجربهٔ آموزشی', '''
## سفر اصلی قابل مشاهده
| گام | صفحه | عمل و بازخورد | مرز صداقت |
|---|---|---|---|
|۱|A02–A08|آشنایی، زبان/alias/هدف/دسترس‌پذیری اختیاری؛ skip وجود دارد|حساب اینترنتی ایجاد نمی‌شود؛ alias در حافظه است |
|۲|B01|یک CTA روشن برای مسیر؛ دادهٔ تازه بدون XP/streak جعلی|progress از events همین فایل یا — |
|۳|C01|شش فصل واقعی source|prerequisite حدسی ساخته نمی‌شود |
|۴|C02|انتخاب Hello and Goodbye از فصل اول|عنوان/زمان واقعی metadata؛ curriculum legacy review-unverified |
|۵|D01|هدف روشن: انتخاب سلام مخصوص صبح|هدف جدیدِ تبدیل‌شده به طراحی، approved معلم نیست |
|۶|D02|واژه، معنی، IPA و جملهٔ واقعی|صوت برای هر واژه جعلی attach نشده |
|۷|D04|مثال + guided selection با راهنمای morning|بدون attempt/score/completion |
|۸|E01|تمرین مستقل؛ Good night بازخورد دلیل‌دار، Good morning پاسخ مناسب|اعتبارسنجی فقط نمونهٔ موقت HTML، نه موتور اپ |
|۹|D07|جمع‌بندی پس از موفقیت ثبت شبیه‌سازی‌شدهٔ همان سفر|forced Success در inspector lesson را complete نمی‌کند |
|۱۰|F03/F04|progress و history از رویدادهای همین نمونه|با refresh پاک می‌شود؛ دادهٔ واقعی اپ خوانده نشده |

## تدریس تطبیقی، نه قالب خشک
مراحل ۱۴گانهٔ A و ۱۲گانهٔ B به صورت objective/context → vocabulary/visual/examples → guidance → independent practice → explanation → summary/review طراحی شده‌اند. گرامر در درس Hello and Goodbye فیلد مستقل ندارد؛ نمونهٔ واقعی My Name Is با label منبع در D03 قابل مشاهده است. audio برای نمونه موجود است ولی alignment نیاز به QA دارد؛ سکوت یا نبود فایل با ادعای «پخش شد» پر نمی‌شود.

## خطای ثبت با پاسخ درست فرق دارد
در inspector «خطای ثبت بعدی» را فعال کن، در E01 پاسخ مناسب را انتخاب و بررسی کن. نتیجهٔ آموزشی معلوم می‌شود، اما attempt/progress در حافظهٔ نمونه هم تا retry اضافه نمی‌شود. انتخاب حفظ و retry ارائه می‌شود. در محصول واقعی این مرز باید transaction/operation ID معتبر داشته باشد؛ آن زیرساخت در B ساخته نشده.

## مراجعات و حالت‌های دیگر
- F01 بدون schedule واقعی، due count نمی‌سازد. F02 فقط خطاهای همین جلسه را نشان می‌دهد؛ تمرین دوباره تاریخچهٔ قبلی را حذف نمی‌کند.
- G03/G04 میکروفون درخواست نمی‌کنند. timer فقط مدت simulation است؛ G05 recording ندارد و فایل آموزشی را به‌جای صدای کاربر معرفی نمی‌کند.
- H07–H10 فایل/backup/restore واقعی اجرا نمی‌کنند. در محصول preflight/validation/staging/atomic activation لازم است؛ low-storage پیشرفت را پاک نمی‌کند.
- I01–I06 آیندهٔ سازمانی‌اند؛ بدون اتصال، table با — یا Empty، نه نام و نمره و permission فرضی.
- interruption در محصول باید draft/checkpoint را حفظ کند؛ prototype storage ندارد و برخی draftها هنگام خروج از نمای exercise reset می‌شوند. این محدودیت نمونه است، نه قرارداد مطلوب C.

## walkthrough دستی که هنوز انجام نشده
با مرورگر واقعی در 390px و tablet، یک بار پاسخ غلط، یک بار درست، یک بار save-failed، keyboard-only، reduced OS و large text را بررسی کنید. TalkBack، focus پس از navigation، nested scroll و audio events جدا ثبت شوند. دستورهای تست app یا ساخت APK در این سند اجرا نشده‌اند.
''')

motion_rows=[]
for m in motions:motion_rows.append((m['id'],m['title'],m['trigger'],m['initial'],m['final'],str(m['duration'])+' ms',m['easing'],m['interruption'],m['replay'],m['reduced'],m['low'],m['accessibility']))
put('PHASE_B_ANIMATION_STORYBOARD.md','Motion & Animation Storyboard', '''
۱۳ storyboard مجزا در `storyboards/` و gallery prototype وجود دارد. این‌ها source طراحی و نمایش محدود HTML/CSS هستند؛ native engine، Rive rig، FPS یا playback/recording محصول پیاده نشده است. Blink طراحی از دو keyframe واقعی چشم باز/بسته استفاده می‌کند، نه fade کل شخصیت.

'''+table(['ID','گروه','Trigger','Initial','Final','Duration','Easing','Interruption','Replay','Reduced','Low','Alternative'],motion_rows)+'''
## سه tier
Standard: حرکت کوتاه و event-driven، بدون loop نامحدود. Reduced: frame ثابت، متن/icon و focus کامل. Low: همان معنا با asset ثابت و حذف افکت. در prototype ترجیح OS برای reduced رعایت می‌شود؛ logic آن در simulated DOM تست شد، نه frame rendering واقعی. background/خروج صفحه timerهای نمونه و audio را متوقف می‌کند.

## مقایسهٔ ابزار، بدون نصب
| ابزار | کاربرد مناسب | مجوز/هزینه | performance/سازگاری | تصمیم |
|---|---|---|---|---|
| Reanimated | interaction و navigation RN | upstream MIT بررسی شد؛ هزینهٔ توسعه/آزمون جدا | worklet/SDK compatibility باید با baseline واقعی C0 سنجیده شود؛ native benchmark نداریم | پیشنهاد UI برای C/D، نه dependency نصب‌شده |
| Rive | state machine و شخصیت لایه‌دار | runtime upstream MIT؛ editor/team/service ممکن است تجاری باشد، قیمت تأیید نشده | rig و پیچیدگی shape و platform runtime مهم؛ روی دستگاه تست نشده | candidate برای شخصیت بعد از spike |
| Lottie | timeline و effect کوتاه | Lottie Android Apache-2.0؛ Lottie Web MIT؛ مجوز فایل animation جدا | برای stateful character پیچیده یا expressionهای وابسته به داده، نیاز به orchestration دارد | default شخصیت نیست؛ برای effect محدود قابل بررسی |
| SVG/layered art + PNG | منبع قابل ویرایش و fallback سبک | حقوق asset مستقل؛ sourceهای این تحویل original design candidate | PNG با Image عادی، SVG native نیاز به adapter/library بررسی‌شده؛ همهٔ shapeها را همزمان decode نکن | قالب طراحی B، نه rig production |

مراجع مجوز با URL/hash در [ANIMATION_LICENSE_REFERENCES](reference/ANIMATION_LICENSE_REFERENCES.json) ثبت شده‌اند. اجرای دستی motion sample در ابزار طراح نباید source واقعی XP/grade یا ذخیره تلقی شود. هیچ flash یا loop بی‌هدف در الگوی منتخب لازم نیست. Speaking gesture، lip-sync آواشناختی نیست.
''')

put('PHASE_B_ACCESSIBILITY_REVIEW.md','Accessibility Review — محدودهٔ واقعی شواهد', '''
## حکم
**PARTIAL**؛ نه WCAG certification و نه PASS کلی اپ/مرورگر/Android. اندازه‌گیری و آزمون محدود واقعی انجام شده، اما فاصلهٔ آن با دسترس‌پذیری محصول پنهان نمی‌شود.

| موضوع | روش و نتیجه | محدودیت |
|---|---|---|
| Contrast متن | ۳۲ جفت برای دو مسیر؛ همه از threshold ثبت‌شده گذشتند. A min=4.961:1 | فقط ترکیبات تعریف‌شده؛ controls بومی browser/OS و تمام حالت‌های dynamic در مرورگر سنجیده نشد |
| Non-text ضروری | A min=3.566:1 در pairs تعریف‌شده | خط تزیینی exempt، نه هر control کم‌کنتراست |
| Glyph | تمام IPAهای ۱۰۰ واژه و حروف نمونهٔ فارسی/English بررسی شدند؛ کمبودها با font مکمل رفع شد | coverage تمام جهان/کیفیت native shaping ادعا نمی‌شود |
| Typography/raster | Pillow RAQM با فونت‌های ارائه‌شده؛ فارسی و انگلیسی/IPA جدا؛ measured text widths در evidence | این rasterِ طراحی است، نه computed browser CSS یا native sp |
| Targetها | rectangles منطقی artboard اندازه‌گیری شدند و همگی ≥48 بودند؛ CSS icon/control minimum نیز تعریف شده | native dp، physical touch و computed DOM bounding boxes تست نشده |
| Label/role markup | بررسی static خروجی ۶۷ screen در simulated DOM؛ unnamed button/unlabeled input/duplicate attr/radio parent کنترل شد | axe/TalkBack/screen-reader و رفتار واقعی keyboard اجرا نشده |
| RTL/LTR | mark-up direction و rasterهای منتخب Phone/Tablet/mixed text بازبینی شدند | مرورگر واقعی، selection/caret، mirrored nav و همهٔ reflowها NOT TESTED |
| Reduced motion | OS preference در logic بر manual default مقدم است؛ CSS media rule و finite animation declaration موجود است | زمان‌بندی/تاثیر واقعی frameها و GPU/FPS اندازه‌گیری نشده |
| Drag alternative | matching با tap و ordering با افزودن/برداشتن token؛ drag اجباری نیست | accessibility عملی آن با TalkBack هنوز تست نشده |
| Large text | modes 150/200٪ و reflow پیشنهادی موجود | viewport واقعی، focus و عدم قطع محتوا در مرورگر/Native NOT TESTED |

## روش تست لازم پیش از قبول C
Keyboard-only و focus restoration، TalkBack با language switching، 320/390/600/840/desktop widths، 150/200٪ متن، reduced OS، low tier، permission/storage error، portrait/tablet و audio controls واقعی. تست باید artifact/version/device/method/result داشته باشد؛ static source به PASS واقعی تبدیل نشود.

[contrast evidence](evidence/CONTRAST_MEASUREMENTS.csv) · [glyph proof](evidence/LATIN_IPA_FONT_PROVENANCE.json) · [raster geometry](evidence/MOCKUP_GEOMETRY_MEASUREMENTS_DELIVERY.json) · [static markup](evidence/STATIC_MARKUP_REVIEW_DELIVERY.json) · [prototype logic](evidence/PROTOTYPE_LOGIC_TESTS_DELIVERY.json)
''')

qa_rows=[
('B-Q01','MEDIUM','RESOLVED IN NEW ASSET','Vazirmatn برای IPA کافی نبود؛ subset اول theta را نداشت','Font مکمل OFL و subset v2 با بررسی cmap؛ v1 به عنوان rejected trial نگهداری/آرشیو می‌شود.'),
('B-Q02','HIGH','REJECTED / CORRECTED EXPORT','ImageMagick SVG export بعضی stroke/transformها را حذف کرد','PNGهای اولیه رد شدند؛ authoring renderer موجود بدون dependency جدید به raster-v3 رسید.'),
('B-Q03','MEDIUM','CORRECTED EXPORT','در raster-v2 درزهای stroke ضخیم دیده شد','Union قلم و شکل‌های گرد در v3؛ SVG source اصلی دست‌نخورده ماند.'),
('B-Q04','MEDIUM','CORRECTED DESIGN','Home دو CTA تکراری و برخی icon-only buttonها name نداشتند','یک primary در Home؛ aria-label متناسب با target اضافه شد؛ markup test محدود انجام شد.'),
('B-Q05','HIGH','CORRECTED DESIGN SIMULATION','Loading/Missing/Empty می‌توانست با available content متناقض دیده شود','Composition state اصلاح شد؛ write gate و loading/denied/missing primary guard اضافه شد. تست simulated-DOM، نه native.'),
('B-Q06','MEDIUM','CORRECTED ARTBOARD','CTA در نمونهٔ Save Failed به بررسی پاسخ اشاره می‌کرد','artboardهای جدید retry ثبت را نشان می‌دهند؛ prototype retry نیز primary شد.'),
('B-Q07','MEDIUM','CORRECTED SHEET LAYOUT','چهار نمای sheet اولیه از cell بیرون می‌رفتند','Reference v2 با aspect-preserving fit و label construction draft؛ تصاویر منفرد crop نشده بودند.'),
('B-Q08','MEDIUM','OPEN ART REVIEW','دقت سه‌رخ/نیم‌رخ/پشت و پشت دست/لباس نیازمند refinement است','Human character review و تایید مالک قبل از پذیرش canonical production؛ این نماها final rig نیستند.'),
('B-Q09','HIGH','NOT TESTED / GATE BLOCKER','مرورگر، focus واقعی، TalkBack و native typography اجرا نشده','هیچ browser/dependency برای دورزدن قید نصب نشد؛ gate C پذیرفته نشده است.'),
('B-Q10','MEDIUM','OPEN CONTENT REVIEW','تبدیل exercise، توضیح فارسی و audio/transcript alignment review نشده','DRAFT؛ E05 release-blocked و E08 بدون automatic pronunciation scoring.'),
('B-Q11','MEDIUM','PARTIAL LOCALIZATION','English interface کامل نیست','عنوان/جهت نمونه، نه localization کامل؛ primary فارسی است.'),
('B-Q12','HIGH','C0 OPEN, OUT OF B SCOPE','کپی واقعی Windows/lock و ریسک‌های audit/SDK قدیمی بازند','هیچ remediation یا app rewrite در B انجام نشد؛ severityهای A حفظ می‌شوند.'),
]
put('PHASE_B_DESIGN_QA_REPORT.md','Design QA Report', '''
## Verdict: PARTIAL
خروجی طراحی و prototype تحویل شده، اما **PASS کلی و مجوز ورود C صادر نمی‌شود**. محدودیت ابزار بهانهٔ تبدیل NOT TESTED به PASS نیست.

## آنچه واقعاً اجرا شد
- استخراج امن ZIP A و بررسی CRC/hashهای manifest؛ مطالعهٔ اسناد مقرر.
- contrast ریاضی ۳۲ pair، font glyph coverage و equality در TTF/WOFF.
- export SVG/PNG، alpha واقعی و بازبینی بصری نمونه‌ها/شیت‌ها؛ خطاهای export ثبت و نسخهٔ جدید تولید شد.
- ۶۷ artboard phone، ۴۰ نمونهٔ state/feedback، ۳ tablet composition و reference/motion sheets. این‌ها **artboard** هستند، نه screenshot از مرورگر یا اپ.
- اندازه‌گیری target/text در مختصات logical artboard، نه device dp/sp.
- اجرای render paths و ۹۳۸ state mapping در VM با DOM شبیه‌سازی‌شده؛ Golden journey logic، جواب غلط/درست، save failure، retry، عدم duplicate completion و عدم اثر forced Success بر progress.
- static markup/resource/API inspection؛ نه browser accessibility یا security audit جامع.

'''+table(['ID','شدت','وضعیت','یافته','رسیدگی/محدودیت'],qa_rows)+'''
## بازبینی بصری انجام‌شده
Reference چهار نما، expression sheet، دو مسیر بصری، Home phone، Vocabulary phone/tablet، Save Failed و guided-example artboard مشاهده شدند. typography فارسی در خروجی RAQM خوانا و English/IPA مستقل است. این review نماینده است؛ بررسی چشمی تک‌تک ۱۲۷ artboard یا رفتار واقعی همهٔ viewportها ادعا نمی‌شود.

## موارد NOT TESTED
Browser render/navigation/keyboard/focus، native screen reader/TalkBack، microphone و audio audible playback، Android portrait/tablet واقعی، FPS/GPU/RAM/PSS، permission/filesystem/DB، restart/reboot، source app build و artifact installer. مناسب‌بودن برای بزرگسال/مبتدی hypothesis طراحی است تا user study واقعی انجام شود.

## acceptance items
هویت فعال در UI از یک family می‌آید؛ غیرجلو construction draft است. همهٔ گروه‌های صفحه و state contract پوشش دارند؛ این پوشش برابر تایید رفتار نیست. tokens، provenance و reduced/low fallback مستند/اندازه‌گیری محدود دارند. عکس/HTML/جدول به feature operational ارتقا داده نشده است. موارد باز، مانع PASS کلی باقی می‌مانند.
''')

put('PHASE_B_DECISION_LOG.md','Decision Log فاز B', table(['ID','Status','Decision','Rationale / scope'],decisions)+'''
## حفظ تصمیم‌های باز فاز A
ADR-A03 runtime/SDK، A14 Windows، A15 فایل‌های فعلی Windows، A16 امنیت، A17 permission/sync و بخش‌های حقوق/مقررات/دستگاه A18/A20 همچنان باز یا deferred هستند. انتخاب palette و font طراحی به معنی حل آن‌ها نیست.

## تعارض‌های ثبت‌شده
[INITIAL_CONFLICT_LOG](design/INITIAL_CONFLICT_LOG.md) شامل تفکیک asset ثابت B از rig D، metric حافظه‌ای از دادهٔ واقعی، نگاشت نامعلوم audio/unit، محدودیت ابزار و تفکیک correct از save-success است.

## تاییدهای لازم
۱ انتخاب بصری/شخصیت توسط مالک؛ ۲ artist refinement و تایید turnaround؛ ۳ user walkthrough بزرگسال مبتدی؛ ۴ browser/assistive validation؛ ۵ content-copy/audio QA؛ ۶ source/runtime/security C0 و data foundation L1 در مجوز جدا. هیچ نام reviewer، approval یا credential فرضی ساخته نشده است.

هیچ یک از C تا O آغاز نشده و هیچ file اصلی/گزارش تاریخی overwrite نشده است. sourceهای draft همین طراحی نسخه‌دارند و trialهای ردشده در بستهٔ تحویل فعال جایگزین فایل معتبر نمی‌شوند.
''')

put('PHASE_B_FINAL_REPORT_FA.md','گزارش نهایی فاز B', '''
## نتیجهٔ روشن
**وضعیت Phase B: PARTIAL. Design gate برای شروع C هنوز پذیرفته نشده است.** طراحی و دارایی‌ها ساخته شده‌اند، اما بازبینی‌های لازم کامل نیستند. هیچ کد اجرایی اپ، dependency/lockfile، migration یا دیتابیس تغییر نکرده و APK/AAB/installer تولید نشده است.

## تحویل واقعی
- دو مسیر بصری بررسی و A / دفتر یادگیری برای prototype انتخاب شد؛ این یک design decision است، نه نتیجهٔ پژوهش ساختگی.
- یک خانوادهٔ canonical vector برای Leo، ۱۶ حالت ثابت، چهار نمای مرجعِ ساختاری، portrait و keyframe چشم‌بسته. جمعاً ۲۱ جفت SVG/PNG فعال؛ sourceها ویرایش‌پذیرند، PNGها alpha واقعی دارند. non-front views نیاز به refinement دارند.
- ۳۲ icon اصیل، یک sprite و reference اجزا؛ فونت فارسی/English/IPA با مجوزهای همراه و پوشش نمونه اندازه‌گیری‌شده.
- ۶۷ صفحه/نمای گروه A–I؛ ۹۳۸ ترکیب screen/state با ۲۴۸ N/A مستدل؛ specification و قرارداد داده/قطع/خطا برای هر صفحه.
- ۱۲۷ artboard طراحی در مجموعهٔ فعال، شامل ۶۷ phone، ۴۰ state/feedback، ۳ tablet، reference sheets و ۱۳ storyboard حرکت. این تعداد تعداد screenshot runtime یا feature کامل نیست.
- HTML مستقل با برچسب DESIGN PROTOTYPE؛ سفر ورود → Home → مسیر → فصل → درس واقعی → واژه/مثال/راهنما → تمرین مستقل → feedback → summary → progress موقت. رنگ/شخصیت/اجزا/حرکت و state inspector جدا قابل مشاهده‌اند.

## چه چیزهایی concept یا تاییدنشده‌اند؟
نماهای چرخیده و rig تولیدی، animation engine بومی، محتوا/نمره‌گذاری production، recording واقعی، ASR/phonetic scoring، backup/restore، teacher/organization backend و Windows همگی اجرا نشده‌اند. English UI کامل و review محتوا/صوت هنوز باز است. تصویر AI exploratory فقط study است و در UI canonical استفاده نشده.

## شواهد
Contrast و glyph/alpha/هندسهٔ طراحی اندازه‌گیری شدند؛ logic و stateهای prototype با DOM شبیه‌سازی‌شده تست شدند. browser واقعی، TalkBack، audible playback، native layouts، performance و user research اجرا نشدند. نتیجهٔ simulated یا static به نتیجهٔ دستگاه تبدیل نشده است.

## برای C چه مانده؟
بازبینی و تایید مالک/artist، اصلاح/تایید turnaround، walkthrough واقعی browser/keyboard/TalkBack/large text/reduced، QA copy/audio، و C0 برای source فعلی Windows/lock/SDK/security و L1 دادهٔ پایدار. اصل محدودیت‌های فاز A حل‌شده فرض نمی‌شود.

## چگونه ببینی؟
[Prototype را باز کن](prototype/LEO_DESIGN_PROTOTYPE_FINAL.html). فایل مستقل است و به نصب بسته/ورود به حساب نیاز ندارد. از «شروع سفر از ابتدا» استفاده کن؛ در E01 یک بار Good night و سپس Good morning را امتحان کن. «خطای ثبت بعدی» و state selector برای طراحی سناریوها هستند. با refresh، state موقت پاک می‌شود. فایل‌های app اصلی را با این بسته جایگزین نکن.

پس از تحویل، در B توقف شده است؛ C تا O شروع نشده‌اند.
''')

put('README_FA.md','Leo — بستهٔ طراحی فاز B', '''
**ابتدا [DESIGN PROTOTYPE](prototype/LEO_DESIGN_PROTOTYPE_FINAL.html) را باز کن.** این HTML مستقل است؛ app Android یا APK نیست، دادهٔ اصلی را نمی‌خواند و چیزی در app ذخیره نمی‌کند.

## راه سریع بازدید
۱ Welcome و شروع؛ ۲ Home با یک CTA؛ ۳ مسیر و فصل اول؛ ۴ Hello and Goodbye؛ ۵ Vocabulary و Example/Guided؛ ۶ E01 با جواب غلط و درست؛ ۷ summary و progress موقت. برای خطای ثبت، دکمهٔ «خطای ثبت بعدی» را روشن کن. Forced Success در inspector، progress نمی‌سازد.

تب‌های بالای prototype: دو مسیر بصری، ۱۶ حالت Leo، مرجع اجزا و storyboardها. selector طراح همهٔ ۶۷ ID و ۱۴ state را ارائه می‌کند؛ N/A با دلیل روشن است. Teacher/enterprise فقط FUTURE design هستند.

## مدارک الزامی
- [Product decisions](PHASE_B_PRODUCT_DECISIONS.md)
- [Character Bible](PHASE_B_LEO_CHARACTER_BIBLE.md)
- [Design System](PHASE_B_DESIGN_SYSTEM.md)
- [Color/Typography tokens](PHASE_B_COLOR_TYPOGRAPHY_TOKENS.md)
- [Screen map](PHASE_B_SCREEN_MAP.md)
- [Screen/state specifications](PHASE_B_SCREEN_SPECIFICATIONS.md)
- [UX flows](PHASE_B_UX_FLOWS.md)
- [Animation storyboard](PHASE_B_ANIMATION_STORYBOARD.md)
- [Accessibility review](PHASE_B_ACCESSIBILITY_REVIEW.md)
- [Asset manifest](PHASE_B_ASSET_MANIFEST.csv)
- [Design QA](PHASE_B_DESIGN_QA_REPORT.md)
- [Decision log](PHASE_B_DECISION_LOG.md)
- [گزارش فارسی](PHASE_B_FINAL_REPORT_FA.md)

## فایل‌های تصویری و source
`assets/leo/svg` و PNGهای فعال: دارایی‌های design candidate، نه rig تولیدی. `design/LEO_CHARACTER_REFERENCE_v2.png` و `LEO_EXPRESSION_SHEET.png`: مرجع. `mockups/` و `storyboards/`: artboardهای طراحی، نه عکس اجرای app. `assets/fonts/`: font/license/notice. trialهای ردشده و نسخه‌های draft در manifest تحویل فعال نیستند.

## وضعیت پذیرش
**PARTIAL — ورود به C تأیید نشده.** رنگ/glyph/هندسه/logic محدود بررسی شده؛ browser/TalkBack/native/performance و پژوهش کاربر NOT TESTED هستند. refinement نماهای غیرجلو و تایید بصری/محتوایی باز است. هیچ وابستگی نصب و هیچ فایل app/DB/lockfile تغییر نکرده؛ فاز A و گزارش‌های قبلی دست‌نخورده‌اند.
''')
put('docs/PHASE_B_KNOWLEDGE_MAP.md','نگاشت پایگاه دانش A به خروجی B', '''
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
''')
print('Required Phase B Markdown documents and README created; asset CSV is generated separately from actual active files.')
