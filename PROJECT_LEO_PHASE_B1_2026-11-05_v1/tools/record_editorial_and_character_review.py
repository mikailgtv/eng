from pathlib import Path
import json,csv,re
R=Path('/home/user');B=R/'PROJECT_LEO_PHASE_B_2026-11-04_v1';O=R/'PROJECT_LEO_PHASE_B1_2026-11-05_v1'

def csvout(name,rows):
 with (O/name).open('x',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

# All proposals below are review recommendations only. No input file is edited.
language=[
('LANG-01','HIGH','FAIL','Workplace Words / helmet.phonetic','/ˈhelɪt/','صامت /m/ از helmet حذف شده است؛ این خطای دادهٔ آموزشی است، نه تفاوت معمول لهجه.','اصلاح با یک شیوهٔ آوانویسی مصوب؛ Cambridge نمونهٔ /ˈhel.mət/ و در بخش American /ˈhel·mɪt/ دارد. انتخاب نهایی با policy لهجه/گوینده.','https://dictionary.cambridge.org/dictionary/english/helmet'),
('LANG-02','HIGH','FAIL','Basic English Sounds / EXAMPLE note','a — /æ/ — cat, hat | like “آ”','برابرگرفتن /æ/ با آ فارسی گمراه‌کننده است؛ آوای جلویی نزدیک‌باز با آوای بلند/پسین آ یکی نیست.','حذف تطبیق نادرست در بازنگری مجاز؛ راهنمای شنیداری/وضعیت دهان و تقریب فارسی با برچسب محدودیت و بازبینی متخصص.','https://en.wikipedia.org/wiki/Near-open_front_unrounded_vowel ; https://en.wikipedia.org/wiki/Help:IPA/Persian'),
('LANG-03','HIGH','FAIL','D03 / prototype-v8.js grammar renderer','عنوان/الگو از g می‌آید؛ توضیح فارسی همیشه دربارهٔ I am / You are است.','در انتخاب This / That یا Talking about your day، توضیح فارسی به موضوع جاری متصل نیست. این نتیجهٔ source review است، نه مشاهده در مرورگر.','اتصال توضیح locale به grammar ID/version؛ اگر ترجمه موجود نیست صریح اعلام شود، نه نمایش توضیح موضوع دیگر.','evidence/STATIC_SOURCE_EXCERPTS.json ; evidence/GRAMMAR_SOURCE_ITEMS.json'),
('LANG-04','MEDIUM','FAIL','Workplace Words / example translation','This is my fire station. → این آتش‌نشانی ماست.','my به ما/our تغییر کرده؛ برای درسِ beginner که مالکیت را می‌آموزد تطابق صریح لازم است.','در بازنگری، یا متن انگلیسی our شود یا ترجمهٔ مالکیت من با معنای ایستگاه هماهنگ شود؛ B1 هیچ‌کدام را اعمال نکرده.','reference/legacy-curriculum.json'),
('LANG-05','MEDIUM','NEEDS REVIEW','Hello and Goodbye / greeting times','Good afternoon: 12:00–18:00; Good evening: after 18:00','این زمان‌ها مثال‌اند، نه مرز قطعی کاربرد در همهٔ موقعیت‌ها. disclaimer نمونه در prototype وجود دارد و باید کنار مثال قابل دیدن بماند.','عبارت‌های تقریبی/وابسته به موقعیت و مثال واقعی؛ QA معلم، نه تبدیل خودکار به rule قطعی.','reference/legacy-curriculum.json ; prototype/prototype-v8.js'),
('LANG-06','MEDIUM','NEEDS REVIEW','Hello and Goodbye / good afternoon translation','در source: عصر بخیر؛ در UI پیشنهادی B: بعدازظهر بخیر','اصلاح پیشنهادی B از source جداست؛ بهترشدن متن یک صفحه به معنی اصلاح منبع یا approval انتشار نیست.','یکپارچه‌سازی ترجمهٔ مصوب در بستهٔ نسخه‌دار بعدی؛ فعلاً provenance و DRAFT حفظ شود.','reference/legacy-curriculum.json ; prototype/prototype-v8.js'),
('LANG-07','LOW','NEEDS REVIEW','Food and Drinks / Persian example','من نان و پنیر صبحانه می‌خورم.','نگارش فارسی طبیعی‌تر می‌تواند رابطهٔ for breakfast را روشن‌تر کند.','پیشنهاد بازبینی: «من برای صبحانه نان و پنیر می‌خورم.»؛ بدون ادعای تایید معلم.','reference/legacy-curriculum.json'),
('LANG-08','MEDIUM','NEEDS REVIEW','Daily Routine / English and grammar note','I sleep at ten at night. / Put the time at the end.','برای منظور رفتن به رختخواب، go to bed طبیعی‌تر است؛ جای زمان در پایان تنها الگوی ممکن نیست.','تفکیک sleep / go to bed و معرفی الگوی ساده به عنوان یک الگو، نه قاعدهٔ انحصاری.','reference/legacy-curriculum.json'),
('LANG-09','LOW','NEEDS REVIEW','Numbers 20–100','Put a dash between the ten and the single number.','hyphen اصطلاح دقیق‌تری از dash است و tens/ones از the ten طبیعی‌تر است.','نمونهٔ پیشنهادی برای مرور: Use a hyphen in numbers such as twenty-five.','reference/legacy-curriculum.json'),
('LANG-10','MEDIUM','NEEDS REVIEW','Letter Names / Basic Sounds / IPA style','five vowels; zee; hot/dog with /ɑː/; IPA rhotic forms','حرف صدادار با تعداد صداهای صدادار فرق دارد؛ شیوهٔ لهجه/IPA باید مشخص باشد. تفاوت معتبر لهجه به عنوان خطا علامت‌گذاری نشود.','تعیین accent/style guide و audio QA؛ نوشتن five vowel letters در محل مناسب و توضیح محدودیت تقریب.','reference/legacy-curriculum.json'),
('LANG-11','LOW','NEEDS REVIEW','Colors','The night is black.','از نظر دستوری ممکن است، اما برای مثال ملموس رنگ black به اندازهٔ یک شیء طبیعی و روشن نیست.','نمونهٔ قابل بررسی: My boots are black.؛ صرفاً پیشنهاد تحریریه.','reference/legacy-curriculum.json'),
('LANG-12','LOW','NEEDS REVIEW','Simple Requests / politeness','perfect English manners / makes any order polite','please و thank you کمک می‌کنند، ولی perfect/any ادعای مطلق دربارهٔ ادب و موقعیت می‌سازد.','تعدیل به can make a request more polite و توجه به لحن/موقعیت.','reference/legacy-curriculum.json'),
('LANG-13','MEDIUM','NEEDS REVIEW','Beginner-facing vs designer-facing copy','actor، tenant، query، profile-scoped، commit، transcript و authored در متن قاب نمونه','این واژگان برای reviewer فنی قابل قبول‌اند، اما نباید بدون تفکیک وارد متن نهایی مبتدی شوند.','لایهٔ annotation طراح جدا؛ معادل فارسی روشن در محصول. برچسب DESIGN PROTOTYPE و مرز صداقت حذف نشود.','registers/PERSIAN_COPY_CORPUS_v2.csv'),
('LANG-14','LOW','FAIL','C04/C05 / Persian UI wording','بسته‌نبودن یک درس باید دلیل داشته باشد.','نفیِ «نبودن» با پیام مورد نظر دربارهٔ قفل‌بودن درس سازگار نیست و می‌تواند معنا را وارونه کند.','تصمیم copy روشن، مثلاً «اگر درسی قفل است، دلیل آن را ببین.»؛ اعمال نشده.','prototype/prototype-v8.js'),
('LANG-15','LOW','FAIL','Motion image alt copy','حالت پایانیٔ طرح','ترکیب اضافه پس از ی در این عبارت نامناسب/ناآشناست.','پیشنهاد نگارشی: «حالت پایانی طرح»؛ بدون تغییر منبع.','prototype/prototype-v8.js'),
('LANG-16','MEDIUM','NEEDS REVIEW','General learner context / Workplace Words','These words are for YOUR job.','مخاطب عمومی Project Leo الزاماً آتش‌نشان نیست؛ شغل کاربر از مشاهدهٔ درس فرض نشود.','برچسب «نمونهٔ محیط کار: ایستگاه آتش‌نشانی» یا context بر اساس انتخاب آگاهانهٔ مسیر، نه فرض شغل.','reference/legacy-curriculum.json'),
('LANG-17','MEDIUM','NEEDS REVIEW','Whole Pre-A1 corpus','بخش عمدهٔ توضیح‌های درسی انگلیسی است و بعضی اهداف کلی‌اند.','برای مبتدی مطلق فارسی‌زبان، توضیح/راهنمای فارسی بیشتر و هدف قابل مشاهده لازم است؛ «Feel ready» آزمون‌پذیر مستقل نیست.','بازبینی کامل آموزشی با مدرس؛ تعداد ۲۵ درس یا ۱۰۰ واژه به معنی curriculum تأییدشده نیست.','reference/legacy-curriculum.json'),
('LANG-18','LOW','NEEDS REVIEW','Months / calendar context','The first month of the year is January.','در زمینهٔ این درس منظور Gregorian calendar است؛ برای مخاطب فارسی‌زبان بهتر است صریح شود.','نام‌بردن تقویم میلادی در راهنما؛ تاریخ‌های کاربر/تقویم محلی جدا بماند.','reference/legacy-curriculum.json'),
]
langrows=[{'issue_id':i,'severity':sev,'status':status,'location':loc,'observed_text_or_rule':obs,'finding':finding,'recommended_review_action_NOT_APPLIED':change,'evidence_or_reference':ref,'approval':'No qualified teacher/linguistic approval granted'} for i,sev,status,loc,obs,finding,change,ref in language]
csvout('registers/LANGUAGE_FINDINGS.csv',langrows)

# Lesson-by-lesson coverage of the existing 25-lesson corpus. No automatic publishing.
notes={
'What is English?':'هدف Feel ready و انگلیسیِ توضیح برای مبتدی مطلق نیازمند بازبینی؛ شاهد اندازه‌گیری readiness وجود ندارد.',
'Hello and Goodbye':'محتوای اصلی قابل فهم؛ ساعت‌های قطعی و lineage ترجمهٔ afternoon نیاز به review دارند (LANG-05/06).',
'My Name Is...':'مثال‌های نام/معرفی طبیعی‌اند؛ hint انگلیسی و gloss my/your برای مبتدی فارسی‌زبان روشن‌تر شود. approval صادر نشده.',
'Basic Classroom English':'فرمان‌های ساده موجود؛ هم‌خوانی please در ترجمه و scaffold فارسی بازبینی شود.',
'The English Alphabet':'۲۶ حرف و ترتیب بررسی متنی شد؛ نمایش lowercase/letter-name/audio با کاربر واقعی هنوز تایید نشده.',
'Letter Names':'تفکیک vowel letter و vowel sound، zee/zed و accent policy بازبینی شود (LANG-10).',
'Basic English Sounds':'خطای معادل آ برای /æ/ و انتخاب لهجه/audio باید قبل از انتشار رفع شود (LANG-02/10).',
'Spelling Simple Words':'نمونه‌های spell بررسی شدند؛ distinction letter name / word sound و audio باید توسط مدرس تایید شود.',
'People':'مثال‌های پایه بررسی شد؛ لحن/ضمیر و scaffold برای بزرگسال در مسیر reviewer باقی است.',
'Family':'نمونه‌ها ساده‌اند؛ اختیار skip برای مثال‌های شخصی و نیاز به اجبار نکردن بیان اطلاعات خانوادگی.',
'Common Objects':'متن قابل فهم؛ نگارش فارسی مانند «خودکار توست» و آموزش تصویری می‌تواند طبیعی‌تر شود.',
'Colors':'طبیعی‌بودن مثال The night is black و context رنگ تجهیزات بازبینی شود (LANG-11).',
'I, You, He, She':'محتوای pronoun بررسی شد؛ D03 فارسی به این note درست bind نشده است (LANG-03).',
'The verb “to be”':'الگوهای am/is/are وجود دارند؛ معنای station و دامنهٔ توضیح فارسی/current note بازبینی شود.',
'This and That':'الگوی near/far در داده وجود دارد؛ توضیح ثابت فارسی D03 مربوط به این موضوع نیست (LANG-03).',
'Simple Questions':'عبارت before the person باید به subject/pattern محدود و روشن شود؛ D03 binding نیز مشکل دارد.',
'Numbers 1–20':'اعداد/نمونه‌ها بررسی شد؛ اگر هدف زبان است، پاسخ صرفاً عددیِ 3+4 به تنهایی شاهد گفتن seven نیست.',
'Numbers 20–100':'forty/fifty صحیح‌اند؛ اصطلاح dash/ten نیاز به اصلاح آموزشی دارد (LANG-09).',
'Days of the Week':'ترتیب و capitalization در داده موجود؛ شروع هفته در تقویم UI از فهرست آموزشی مستقل تعیین شود.',
'Months':'Gregorian context و capitalization روشن شود؛ approval آموزشی صادر نشده (LANG-18).',
'What Time Is It?':'عبارت‌های ساعت بررسی شد؛ o’clock یک الگوی ساعت کامل است نه الزام همهٔ بیان‌های زمان؛ variant جواب authored شود.',
'Food and Drinks':'ترجمهٔ breakfast و مطلق‌گویی ادب سفارش نیاز به review دارد؛ phrase An apple a day جملهٔ کامل نیست (LANG-07/12).',
'Workplace Words':'IPA helmet غلط و ترجمهٔ my/our ناسازگار است؛ فرض شغل کاربر و اصطلاح station نیز review می‌خواهد (LANG-01/04/16).',
'Simple Requests':'نمونه‌های درخواست روشن‌اند؛ perfect manners / any request باید تعدیل شود (LANG-12).',
'My Daily Routine':'sleep/go to bed، جای عبارت زمان و D03 binding نیاز به بازنگری دارند (LANG-08/03).',
}
course=json.loads((B/'reference/legacy-curriculum.json').read_text());lessonrows=[]
for c in course:
 for mi,m in enumerate(c['modules']):
  for li,l in enumerate(m['lessons']):
   lessonrows.append({'lesson_ref':c['code']+'-'+str(mi)+'-'+str(li),'title':l['title'],'editorial_status':'FAIL' if l['title'] in ['Basic English Sounds','Workplace Words'] else 'NEEDS REVIEW','review_note':notes[l['title']],'reviewer_type':'Assistant editorial review of available text; not a qualified teacher certification','changes_applied':False})
assert len(lessonrows)==25
csvout('registers/LESSON_25_EDITORIAL_REVIEW.csv',lessonrows)

# Image observations are based on the available expression/turnaround sheets, not nonexistent individual SVGs.
observations=[
('neutral','ایستاده و متعادل؛ چشم بادامی و لباس با پالت مشترک','صورت/کلاه/رنگ‌ها با خانواده هماهنگ به نظر می‌رسند؛ اندازه‌گیری SVG اصل و approval هنری موجود نیست.'),
('happy','لبخند باز و یک دست خوشامد','پالت/لباس ثابت؛ تفاوت صورت و دست قابل تشخیص است؛ پذیرش بزرگسال نیازمند review.'),
('excited','دو دست بالا و چشم بازتر','با celebrating شباهت زیاد دارد؛ دامنهٔ تفاوت دو حالت باید در art/motion review روشن شود.'),
('thinking','دست کنار چانه و نگاه منحرف','ژست با نام هم‌خوان؛ زاویه/اتصال دست و پوشاندن صورت نیاز به کنترل اندازهٔ کوچک دارد.'),
('confused','کف دست‌ها رو به بالا، ابروی متفاوت','حالت پرسشی دیده می‌شود؛ نباید به سرزنش/تمسخر تبدیل شود؛ تأیید انسانی باز است.'),
('teaching','اشارهٔ دست رو به محتوا','سیلوئت قابل تشخیص؛ جهت اشاره باید با محل محتوا انتخاب شود، نه flip کور RTL.'),
('listening','دست کنار گوش','cue شنیدن است؛ نه proof فعال بودن میکروفون یا فهم گفتار؛ hand/ear overlap review لازم.'),
('speaking','دهان باز ساده و دست توضیحی','gesture طراحی است، نه lip-sync یا نمرهٔ تلفظ.'),
('celebrating','دو دست باز و بالارفته','مشابه excited؛ فقط پس از رویداد معتبر و با reduced fallback.'),
('encouraging','یک دست نزدیک سینه و دست باز','پاسخ حمایتی دیده می‌شود؛ مرور ادراکی با مخاطب لازم است.'),
('sad-after-mistake','ابروی نگران و دهان افتادهٔ ملایم','تحقیر آشکار در sheet دیده نشد؛ اثر روانی/عدم شرم‌سازی بدون user review تایید نمی‌شود.'),
('sleeping','چشم بسته و دست‌های روی تنه','با استراحت هم‌خوان؛ نسبت سر مایل و گردن/collar برای asset production نیازمند review.'),
('running','بدن مایل و پاهای خم‌شده','وزن/تعادل و تفکیک از jumping نیازمند artist بررسی است؛ هیچ run-cycle تایید نشده.'),
('jumping','پاها جمع و دست‌ها بالا','کی‌فریم ثابت است؛ flight/landing یا rig اعتبارسنجی نشده.'),
('winning','یک دست بالارفته و ایستادن متعادل','سبک مشترک؛ ژست به‌تنهایی نشان یا برد واقعی ایجاد نمی‌کند.'),
('explaining','کتاب باز و دست اشاره','محتوای آموزشی باید مستقل قابل فهم بماند؛ مرز دست/کتاب در اندازه‌های کوچک review شود.'),
]
charrows=[]
for state,visible,review in observations:
 charrows.append({'state':state,'visible_evidence':'design/LEO_EXPRESSION_SHEET.png (SHA checked against retained manifest)','observation':visible,'consistency_review':review,'status':'NEEDS REVIEW','individual_svg_png_pair':'BLOCKED — original pair payloads unavailable','native_animation_or_rig':'NOT TESTED; static SVG is not a native animation or rig','approval_granted':False})
csvout('registers/LEO_16_STATE_REVIEW.csv',charrows)
turns=[
{'view':'Front','observation':'مرجع روبه‌رو و پالت/لباس مشخص‌اند؛ source نامزد طراحی است نه approval نهایی.','status':'NEEDS REVIEW'},
{'view':'Three-quarter','observation':'بدن/شانه/پاها عمدتاً روبه‌رو باقی مانده‌اند و تغییر صورت محدود است؛ برای مرجع سه‌رخ قابل اتکا باید حجم و چرخش بدن روشن‌تر شود.','status':'NEEDS REVIEW'},
{'view':'Profile','observation':'تغییر سیلوئت صورت دیده می‌شود؛ تناسب muzzle و روی‌هم‌افتادگی اندام/کف دست باید توسط artist تایید شود.','status':'NEEDS REVIEW'},
{'view':'Back','observation':'نمای پشت همچنان زبان بصری یقه/دست‌ها/جزئیات چکمهٔ جلو را تداعی می‌کند؛ بازنگری view-specific لازم است.','status':'NEEDS REVIEW'}]
(O/'evidence/LEO_TURNAROUND_REVIEW.json').write_text(json.dumps({'source':'design/LEO_CHARACTER_REFERENCE_v2.png','method':'Fresh visual inspection of the available reference sheet only; not a new drawing or formal artist approval','views':turns,'changes_applied':False},ensure_ascii=False,indent=2))
print('Recorded 18 editorial findings, per-lesson review for 25 lessons, and review notes for all 16 character states. No source modified.')
