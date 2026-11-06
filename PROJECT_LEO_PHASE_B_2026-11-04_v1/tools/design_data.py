"""Phase B design/prototype metadata only. No application module is implemented here."""
from pathlib import Path
ROOT=Path('/home/user/PROJECT_LEO_PHASE_B_2026-11-04_v1')
TOKENS={
 'routeA':{'name':'Field Notes / دفتر یادگیری','paper':'#F6F5F0','surface':'#FFFFFF','ink':'#17372F','muted':'#52655F','primary':'#1B5C4E','primaryInk':'#FFFFFF','primarySoft':'#E7F0E9','accent':'#D6954D','accentInk':'#392A1E','accentSoft':'#F6EBD5','error':'#A23C2F','errorSoft':'#FBEDE7','warning':'#77501F','warningSoft':'#FFF1D2','info':'#315F76','infoSoft':'#EAF2F6','border':'#70867D','decorativeLine':'#DCE4DE','focus':'#134F43','disabledBg':'#E3E7E2','disabledInk':'#52655F'},
 'routeB':{'name':'Signal Lab / آزمایشگاه زبان','paper':'#F3F5FA','surface':'#FFFFFF','ink':'#26324A','muted':'#53627A','primary':'#3D507E','primaryInk':'#FFFFFF','primarySoft':'#E9EDF8','accent':'#86BBC4','accentInk':'#213C45','accentSoft':'#E7F3F4','error':'#A23C2F','errorSoft':'#FBEDE7','warning':'#77501F','warningSoft':'#FFF1D2','info':'#315F76','infoSoft':'#EAF2F6','border':'#74839A','decorativeLine':'#DEE3EC','focus':'#34456E','disabledBg':'#E3E7EE','disabledInk':'#53627A'},
 'type':{'fa':'Vazirmatn','en':'Leo Reading Sans','ipa':'Leo Reading Sans','body':16,'bodyLine':28,'label':14,'labelLine':24,'title':28,'titleLine':42,'display':36,'displayLine':50,'englishWord':32,'englishWordLine':44,'weightBody':400,'weightEmphasis':600,'weightHeading':700},
 'space':[4,8,12,16,24,32,40,48,64],
 'radius':{'control':12,'surface':18,'hero':26,'pill':999},
 'target':48,'icon':24,'stroke':2,
 'breakpoints':{'phoneMax':599,'tabletMin':600,'desktopMin':1024},
 'motion':{'fast':120,'standard':200,'feedback':280,'navigation':220,'celebration':800,'reduced':0,'low':100},
 'selectedRoute':'routeA'
}
STATES=['Initial','Empty','Loading','Available','Selected','Disabled','Success','Error','Offline','Permission Denied','Storage Full','Missing Content','Save Failed','Recovery']
GROUPS={'A':'شروع و هویت','B':'خانه و امروز','C':'مسیر یادگیری','D':'آموزش','E':'تمرین','F':'مرور و پیشرفت','G':'صوت و گفتار','H':'مدیریت محلی','I':'سازمانی آینده'}
# id, Persian title, English title, purpose, principal action, next, kind, flags, persistence-design contract
ROWS=[
('A01','آغاز لئو','Splash','شناخت برند و گذار کوتاه، بدون درصد ساختگی بارگیری.','ادامهٔ پیش‌نمایش','A02','splash','boot,load','در محصول فقط بررسی bootstrap/schema؛ هیچ progress برای دیدن Splash نوشته نمی‌شود.'),
('A02','انگلیسی، قدم به قدم','Welcome','فهمیدن وعدهٔ آموزش از صفر و اینکه ثبت‌نام اجباری نیست.','شروع مسیر من','A03','welcome','','هیچ data write؛ انتخاب شروع فقط navigation است.'),
('A03','زبان رابط','Interface language','انتخاب زبان رابط جدا از زبان توضیح درس.','تأیید زبان','A04','language','select,write','ProfilePreferences.uiLocale؛ توضیح فارسی مبتدی مستقل از English content direction.'),
('A04','یک فضای شخصی برای یادگیری','Local profile','ساخت نام مستعار محلی بدون درخواست نام واقعی یا حساب اینترنتی.','ادامه با این نام','A05','profile','select,write','LocalProfile با ID پایدار آینده؛ alias اختیاری، هیچ credential یا حساب سرور.'),
('A05','برای چه یاد می‌گیری؟','Learning goal','انتخاب انگیزه بدون تعیین سطح یا صلاحیت از روی شغل.','انتخاب هدف','A06','goal','select,write','ProfileGoal.general/workplace؛ هدف شغلی مجوز دسترسی به محتوای منتشرنشده نیست.'),
('A06','زمانی مناسب خودت','Study plan','انتخاب زمان پیشنهادی مطالعه و ساعت اختیاری؛ بدون اعلان اجباری.','ثبت برنامهٔ پیشنهادی','A07','time','select,write','DailyGoal.targetMinutes و preferredTime؛ reminder پیش‌فرض خاموش و consent جدا.'),
('A07','با لئو آشنا شو','Meet Leo','درک نقش همراه آموزشی، نه مربی عملیاتی یا ارزیاب تلفظ.','بریم سراغ یادگیری','A08','meet','','دیدن شخصیت امتیاز یا streak تولید نمی‌کند.'),
('A08','با راحتی خودت شروع کن','Initial accessibility','انتخاب اندازه متن و حرکت با احترام به تنظیم سیستم.','رفتن به خانه','B01','access','select,write','Preferences.textScale/motionMode/sound؛ ذخیرهٔ واقعی متعلق به C/L1 است.'),
('B01','امروز با یک قدم شروع کن','Home / Today','یک اقدام اصلی واضح؛ بدون شلوغی dashboard و آمار ساختگی.','دیدن مسیر یادگیری','C01','home','data,load','خواندن projection هدف/درس آخر/review؛ Home خودش completion یا XP نمی‌نویسد.'),
('B02','هدف امروز','Daily goal','دیدن هدف انتخاب‌شده و تغییر آن بدون فشار یا تنبیه.','تغییر هدف','H04','daily','data,select,write','DailyGoal profile-scoped؛ completed از رویداد معتبر، نه دقیقهٔ بازبودن صفحه.'),
('B03','از همان‌جا ادامه بده','Resume last lesson','ادامه از checkpoint واقعی یا شروع آرام وقتی سابقه‌ای نیست.','ادامهٔ درس نمونه','D01','resume','data,load,content','LessonCheckpoint حاوی contentVersion؛ در نبود checkpoint، Empty به start تبدیل شود.'),
('B04','پیشنهاد بعدی تو','Next lesson suggestion','توضیح دلیل پیشنهاد و امکان انتخاب مستقل.','دیدن درس پیشنهادی','D01','nextlesson','data,load,content','Recommendation بر اساس prerequisites منتشرشده؛ این legacy metadata کامل ندارد.'),
('B05','مرورهای آماده','Due reviews','اولویت دادن به review واقعی؛ صف خالی را شکست تلقی نکن.','دیدن صف مرور','F01','duereview','data,load','ReviewSchedule dueAt/policyVersion؛ تعداد از query، نه عدد نمونه.'),
('B06','پیشرفت قابل توضیح','Progress summary','نمایش numerator/denominator و تفاوت دادهٔ قطعی با pending.','جزئیات پیشرفت','F03','progresssummary','data,load','Projection از eventهای commit‌شده؛ unknown با —، نه درصد جعلی.'),
('B07','راه‌های کوتاه، کارهای روشن','Quick actions','میانبر به کارهای لازم بدون تحمیل teacher/enterprise به مبتدی.','رفتن به تنظیمات','H01','shortcuts','','Navigation فقط؛ مسیرهای سازمانی در catalog طراح جدا می‌مانند.'),
('C01','مسیر یادگیری تو','Learning path','دیدن شش فصل موجود و انتخاب آگاهانه.','باز کردن فصل اول','C02','path','data,load,content','InstalledPackage + ChapterProgress؛ ترتیب درس به‌تنهایی prerequisite نیست.'),
('C02','شروع یادگیری','Chapters','دیدن چهار درس واقعی فصل اول و انتخاب درس نمونه.','سلام و خداحافظی','D01','chapter','data,select,load,content','انتخاب lesson ref و version؛ completion فقط بعد از معیار آموزشی و commit.'),
('C03','واحدهای روشن و کوتاه','Units','نمایش واحدبندی پیشنهادی بدون جا زدن آن به curriculum مصوب.','دیدن درس نمونه','D01','units','data,select,load,content','Unit mapping هدف H/E است؛ گروه‌بندی پیشنهادی Phase B مستقل از source حفظ می‌شود.'),
('C04','چرا این بخش باز یا بسته است؟','Locked / unlocked','تمایز نبود محتوا، prerequisite واقعی و سطح انتخابی.','دیدن پیش‌نیاز','C05','locked','data,load,content','Access reason از versioned prerequisite/capability؛ legacy lock خودکار ساخته نمی‌شود.'),
('C05','پیش‌نیاز، با دلیل','Prerequisites','توضیح دقیق شرط لازم، نه قفل‌کردن مصنوعی مسیر.','بازگشت به مسیر','C01','prerequisites','data,load,content','PrerequisiteGraph authored/approved؛ metadata غایب با unknown نمایش داده شود.'),
('C06','روی دستگاه موجود است','Installed content','شناخت آنچه بسته‌بندی شده و چه چیز فقط طرح آینده است.','کتابخانهٔ بسته‌ها','C07','installed','data,load,content','InstalledPackage version/bytes/checksum؛ فضا فقط از adapter واقعی گزارش می‌شود.'),
('C07','کتابخانهٔ یادگیری','Content package library','دیدن بسته، نسخه، نیاز فضا و وضعیت بازبینی؛ بدون سقف تعداد.','مدیریت فضا','H10','library','data,select,load,content,write,files','PackageManifest و staged import؛ نصب/حذف واقعی در prototype انجام نمی‌شود.'),
('D01','سلام و خداحافظی','Lesson introduction','شناخت هدف درس واقعی Hello and Goodbye قبل از سؤال.','آموزش واژه‌ها','D02','lessonintro','data,load,content','LessonCheckpoint.targetBlock؛ هدف این نمونه انتخاب سلام مناسب صبح است، تأیید معلم نشده.'),
('D02','واژه را در جمله ببین','Vocabulary','خواندن معنی، IPA و جملهٔ واقعی؛ ارتباط واژه با موقعیت.','مثال‌های همین درس','D04','vocabulary','data,select,load,content,write','Bookmark و exposure رویداد جدا؛ دیدن کارت به معنی mastery نیست.'),
('D03','قاعده، همراه مثال','Grammar','خواندن شش یادداشت واقعی و تشخیص اینکه هر درس گرامر مستقل ندارد.','دیدن مثال','D04','grammar','data,load,content','GrammarReference نسخه‌دار؛ توضیح فارسی جدید design copy است و نیاز به QA دارد.'),
('D04','چه زمانی این جمله را می‌گوییم؟','Example','تمایز Good morning، afternoon و good night با زمینهٔ روشن.','تمرین نمونه','E01','example','data,load,content','Reading checkpoint؛ EXAMPLE از source، توضیح فارسی تکمیلی DRAFT.'),
('D05','یک گفت‌وگوی کوتاه','Dialogue','دیدن نوبت‌های A/B از مثال واقعی درس و معنی کلی گفتگو.','تمرین نمونه','E01','dialogue','data,load,content','Dialogue steps از مثال موجود؛ نام‌های علی/سارا شخصیت‌های متن‌اند، نه کاربران.'),
('D06','گوش بده؛ بعد فکر کن','Listening lesson','تمایز فایل موجود با audio/transcript تأییدشدهٔ مربوط به درس.','دیدن فایل‌های موجود','G01','listening','data,load,content','AudioRef + transcript review؛ نگاشت هشت فایل به درس هنوز تأیید نشده است.'),
('D07','یک قدم را مرور کنیم','Lesson summary','جمع‌بندی آموخته و وضعیت قطعی/ناموفق ثبت؛ بدون پاداش جعلی.','دیدن پیشرفت نمونه','F03','summary','data,load,content,write','LessonCompleted فقط پس از معیار و transaction؛ prototype فقط event موقت در حافظه دارد.'),
('E01','سلام مناسب صبح','Multiple choice','انتخاب Good morning برای موقعیت صبح، از پرسش واقعی درس.','بررسی پاسخ','D07','choice','data,select,load,content,write','Attempt.answerOptionId، gradingVersion، feedback و commit؛ choices از مثال‌های source اما تبدیل exercise جدید DRAFT.'),
('E02','واژه و معنی را وصل کن','Matching','تطبیق سه واژهٔ واقعی با معنی فارسی؛ بدون drag اجباری.','بررسی تطبیق','D07','matching','data,select,load,content,write','Stable pair IDs؛ منع پاسخ تکراری و score جزئی با explanation هر pair.'),
('E03','جمله را مرتب کن','Word ordering','چیدن جملهٔ واقعی I am Ali. با ترتیب روشن و کنترل لمسی.','بررسی ترتیب','D07','ordering','data,select,load,content,write','Token IDs مستقل از متن؛ تکرار واژه درست مدیریت شود؛ tap/remove جایگزین drag.'),
('E04','کلمهٔ جاافتاده چیست؟','Fill in the blank','انتخاب is برای سؤال واقعی She ____ a teacher.','بررسی واژه','D07','fill','data,select,load,content,write','Accepted answers authored + normalization؛ پاسخ خالی امتیاز نمی‌گیرد.'),
('E05','از شنیده‌ات چه فهمیدی؟','Listening comprehension','طراحی comprehension واقعی، نه حدس پاسخ از نام فایل صوتی.','نیازمند بازبینی صوت','G01','listeningexercise','data,select,load,content,write','Contract تعریف شده؛ تا audio/transcript/objective alignment و QA تأیید نشود RELEASE_BLOCKED.'),
('E06','یک جمله بساز','Sentence construction','چیدن I am a firefighter. از مثال گرامر واقعی.','بررسی جمله','D07','construction','data,select,load,content,write','Token sequence + authored accepted variants؛ معنای جمله با ترتیب/grammar سنجیده شود.'),
('E07','معنی را طبیعی بگو','Translation','بیان معنی Hello به فارسی؛ ترجمهٔ طبیعی به یک رشتهٔ خشک محدود نشود.','بررسی نمونه','D07','translation','data,select,load,content,write','Accepted set نمونه سلام/درود DRAFT؛ سایر جواب‌ها ambiguous/manual review، نه غلط قطعی.'),
('E08','بشنو و با صدای خودت بگو','Speaking practice','تمرین listen-repeat/self-comparison بدون pronunciation score ساختگی.','دیدن اجازهٔ میکروفون','G03','speakingpractice','data,select,load,content,write,mic','Self-assessment score=null؛ consent و recording مستقل از STT؛ ضبط در این HTML شبیه‌سازی است.'),
('F01','زمان مرور، نه شروع دوباره','Review queue','دیدن reviewهای واقعاً due و علت حضور هر مورد.','دیدن اشتباه‌های نمونه','F02','review','data,select,load,content','ReviewSchedule projection؛ prototype schedule پایدار ندارد و unknown را خالی/— نشان می‌دهد.'),
('F02','اشتباه، سرنخ یادگیری است','Mistake review','فهمیدن علت پاسخ متفاوت و برگشت به آموزش.','دوباره امتحان کن','E01','mistakes','data,select,load,content,write','Attempt source/ref/version؛ retry attempt تازه است و سابقهٔ قبلی پاک نمی‌شود.'),
('F03','پیشرفت، از کار واقعی','Progress','تفکیک محتوای موجود، رویدادهای این صفحه و دادهٔ واقعی اپ.','دیدن تاریخچه','F04','progress','data,load','Projection از event ledger؛ prototype complete set و attempt list موقت را جدا برچسب می‌زند.'),
('F04','مسیر طی‌شده','Learning history','دیدن رخدادها و نوع سنجش بدون دستکاری تاریخچه.','بازگشت به خانه','B01','history','data,select,load','Append-only event history؛ timestamp/score/status واقعی یا unknown؛ هیچ ردیف فرضی.'),
('F05','هدفی که با زندگی تو جور است','Goals','ویرایش هدف بدون تنبیه؛ توضیح متریک قابل محاسبه.','تنظیم هدف','B02','goals','data,select,load,write','DailyGoal version/timezone/target؛ فعالیت تاییدنشده completed نمی‌شود.'),
('F06','نشانه‌های مسیر یادگیری','Achievements','مشاهدهٔ criteria و تمایز نمونهٔ تصویری با نشان واقعاً دریافت‌شده.','بازگشت به مسیر','C01','achievements','data,select,load','Achievement از rule+event معتبر؛ prototype awarded record واقعی ندارد.'),
('F07','پیوستگی، بدون فشار','Streak','نمایش روزهای مطالعه با سیاست روشن و رفتار غیرتنبیهی.','هدف را تنظیم کن','F05','streak','data,load','Distinct study dates در timezone policy؛ در prototype تاریخچهٔ پایدار نیست، پس —.'),
('G01','صدای نمونه، در اختیار تو','Audio player','پخش/توقف/تکرار فایل‌های واقعی موجود در همین HTML.','بازگشت به آموزش','D04','player','data,select,load,content','Audio events؛ progress از HTMLAudioElement در prototype، نه اثبات صدای Android.'),
('G02','حالت شنیدن','Listening mode','تمرکز بر صوت و متن جایگزین معتبر، بدون اعلان مزاحم.','پخش‌کنندهٔ نمونه','G01','listeningmode','data,select,load,content','Playback preference و transcript ref؛ نبود transcript صریح است.'),
('G03','میکروفون با اجازهٔ تو','Recording permission','فهم هدف و consent قبل از permission؛ امکان ادامه بدون میکروفون.','دیدن شبیه‌سازی ضبط','G04','permission','select,write,mic','Consent نسخه‌دار + OS result در محصول؛ این prototype هیچ permission واقعی درخواست نمی‌کند.'),
('G04','حالت ضبط','Recording','درک indicator، stop و interruption؛ بدون وانمودکردن capture واقعی.','پایان شبیه‌سازی','G05','recording','data,select,load,write,mic','Recorder state و final file verification؛ timer prototype فقط زمان اجرای simulation است.'),
('G05','صدای خودت را دوباره بشنو','Replay recording','تمایز recording واقعی با فایل آموزشی نمونه.','دیدن مدیریت ضبط','G06','replay','data,select,load,content,mic','Recording metadata/file hash واقعی؛ این prototype هیچ recording ندارد و replay شخصی غیرفعال است.'),
('G06','حذف ضبط با اطمینان','Delete recording','تأیید دامنهٔ حذف، امکان انصراف و عدم success بدون حذف واقعی.','بازگشت به تمرین','E08','deleterecording','data,select,write,content,mic','File lifecycle + profile scope؛ در prototype فایل واقعی برای حذف وجود ندارد.'),
('G07','صدا در دسترس نیست','Audio error','خطای مشخص و مسیر جایگزین، بدون سرزنش زبان‌آموز.','بازگشت به فایل‌های موجود','G01','audioerror','data,load,content','Missing/corrupt/decoder/interruption reason؛ خطاهای این artboard با برچسب design simulation.'),
('H01','تنظیمات روشن و ساده','Settings','دسترسی به پروفایل، زبان، متن، حرکت، صوت و حفاظت داده.','دسترس‌پذیری','H04','settings','data,select,load','فهرست preferences؛ تغییر هر مقدار به use case مستقل با نتیجهٔ ذخیره متصل می‌شود.'),
('H02','پروفایل‌های همین دستگاه','Profile management','مدیریت local alias و دادهٔ هر پروفایل، نه login سازمانی.','ساخت نام آزمایشی','A04','profiles','data,select,load,write','Profile-scoped repositories؛ حذف انتخابی با confirmation/backup؛ بدون credential در demo.'),
('H03','زبان‌ها را جدا انتخاب کن','Language settings','زبان رابط از انگلیسیِ درس و توضیح فارسی جدا باشد.','بازگشت به تنظیمات','H01','language','select,write','uiLocale/explanationLocale؛ English-only navigation نسخهٔ کامل هنوز بررسی زبانی می‌خواهد.'),
('H04','خواندن و لمس راحت‌تر','Accessibility','اندازهٔ متن، contrast و حرکت با کنترل کاربر.','اعمال در این پیش‌نمایش','H01','access','select,write','Preferences.textScale/motion؛ prototype فقط CSS/session memory را تغییر می‌دهد.'),
('H05','حرکت به اندازهٔ نیاز','Motion settings','Standard/Reduced/Low را با حفظ معنی آموزشی انتخاب کن.','اعمال در پیش‌نمایش','H01','motion','select,write','OS reduce مقدم بر default؛ هیچ پاداشی از animation callback ساخته نشود.'),
('H06','کنترل صدا','Audio settings','خاموش‌کردن effect، سرعت قابل پشتیبانی و عدم autoplay.','دیدن پخش‌کننده','G01','audiosettings','select,write','Playback setting و قابلیت adapter؛ microphone permission جدا از sound toggle.'),
('H07','از پیشرفتت محافظت کن','Backup','انتخاب scope و مقصد، نه ساختن فایل خالی به نام backup.','دیدن قرارداد پشتیبان','H08','backup','data,select,load,write,files','Consistent snapshot/version/hash/encryption choice؛ در prototype backup واقعی ساخته نمی‌شود.'),
('H08','بازیابی، بدون از دست‌دادن داده','Restore','اعتبارسنجی و توضیح merge/replace پیش از هر تغییر.','دیدن طرح واردکردن','H09','restore','data,select,load,write,files,content','Validate staging→preview conflicts→explicit confirmation→atomic activation؛ existing data حفظ شود.'),
('H09','بسته را اول بررسی کن','Import','نسخه، حقوق، اندازه و اعتبار بسته قبل از نصب.','مدیریت فضای دستگاه','H10','import','data,select,load,write,files,content','Schema/hash/path/ref/rights checks؛ no ZIP execution، no silent overwrite یا reset.'),
('H10','فضای دستگاه، با انتخاب تو','Storage management','دیدن bytes واقعی و حذف اختیاری package بدون حذف progress.','بازگشت به کتابخانه','C07','storage','data,select,load,write,files','Filesystem adapter.freeBytes و package actualBytes؛ ظرفیت در prototype unknown نه عدد فرضی.'),
('I01','فضای مدرس','Teacher workspace','طراحی آیندهٔ کار معلم جدا از خانهٔ مبتدی.','نمای کلاس','I02','teacher','data,select,load,future','Server session + teacher assignment + org scope؛ هیچ backend در prototype متصل نیست.'),
('I02','کلاس، در دامنهٔ مجاز','Class overview','دیدن learners/assignment/attendance در کلاس مجاز.','طرح تکلیف','I03','class','data,select,load,future','Class/group scope از target؛ هیچ نام، تعداد فراگیر یا نمرهٔ خصوصی ساخته نمی‌شود.'),
('I03','تکلیف با محتوای مشخص','Assignment','تخصیص content version و معیار روشن قبل از انتشار.','طرح بازخورد','I04','assignment','data,select,load,write,content,future','Assignment version/dueDate/learner scope؛ publish نیازمند permission و audit.'),
('I04','بازبینی فردی، با شواهد','Student review','تفکیک خودارزیابی، پاسخ سنجیده و بازخورد معلم.','گزارش سازمانی','I05','studentreview','data,select,load,write,future','Teacher-reviewed correction با دلیل/audit؛ client score مرجع official نیست.'),
('I05','گزارش آموزش سازمان','Organization reports','گزارش قابل توضیح و محدود به سازمان، نه جدول ساختگی عملکرد.','مدیریت نقش‌ها','I06','organization','data,select,load,files,future','Tenant-scoped aggregate/export با provenance و retention؛ نبود داده با —.'),
('I06','نقش، همراه دامنهٔ دسترسی','Role management','تفکیک platform/org/training/teacher/learner و تأیید تغییر حساس.','بازگشت به فضای مدرس','I01','roles','data,select,load,write,future','Server-authoritative role + scope + audit؛ prototype هیچ permission واقعی را تغییر نمی‌دهد.'),
]

SCREEN=[]
for row in ROWS:
 id,title,en,purpose,cta,next_id,kind,flagtext,persist=row
 flags=set(flagtext.split(',')) if flagtext else set()
 rec={'id':id,'group':id[0],'group_title':GROUPS[id[0]],'title':title,'title_en':en,'purpose':purpose,'primary':cta,'next':next_id,'kind':kind,'flags':sorted(flags),'persistence_contract':persist,'scope':'FUTURE ORGANIZATIONAL CONCEPT' if 'future' in flags else 'DESIGN PROTOTYPE ONLY','source_status':'Existing educational data reused; new Persian copy/exercise variants are DRAFT, no qualified-review claim','device':'Android portrait primary; tablet reflow; enterprise future may use wider desktop composition'}
 rec['learning_goal']=purpose if id[0] in ['D','E','F'] else 'N/A: این صفحه وظیفهٔ محصول/مدیریت/ناوبری دارد، نه سنجش مستقیم زبان؛ هدف UX همان purpose است.'
 rec['user_action']=cta+'؛ انتخاب/ورود اطلاعات فقط در حافظهٔ این پیش‌نمایش یا برای نمایش state انجام می‌شود.'
 rec['visible_content']=('محتوای واقعی بستهٔ Pre-A1 و برچسب review' if 'content' in flags else 'متن و کنترل‌های تعریف‌شدهٔ همین صفحه؛ بدون private data یا مقادیر عملکرد فرضی')
 rec['feedback_contract']=('خروجی صحیح/نادرست/ambiguous و explanation؛ save-failed مستقل از نتیجهٔ آموزشی.' if id[0]=='E' else 'تغییر state قابل مشاهده با متن و icon؛ تنها پس از نتیجهٔ معتبرِ عمل در محصول.')
 rec['interruption_contract']=('پاسخ/انتخاب pending در محصول checkpoint می‌شود؛ برگشت نباید attempt یا reward تکراری بسازد. در prototype refresh حافظه را پاک می‌کند.' if ('write' in flags or id[0] in ['D','E']) else 'در محصول navigation و context حفظ شود؛ دادهٔ reader تغییر نمی‌کند. بازگشت به صفحهٔ قبل روشن است.')
 rec['error_contract']='خطای مربوط به همین عمل با راه‌حل retry/back/manage storage؛ بدون success نمایشی یا از دست‌دادن دادهٔ قبلی.'
 rec['accessibility']='هدف لمس 48 logical px در طرح، body16، focus/labels، متن انگلیسی و IPA LTR، فارسی RTL، feedback غیررنگی، reduced motion. Native/TalkBack نیازمند آزمون آینده.'
 SCREEN.append(rec)
assert len(SCREEN)==67
BY_ID={s['id']:s for s in SCREEN}
assert all(s['next'] in BY_ID for s in SCREEN)

def state_spec(screen,state):
 f=set(screen['flags']);name=screen['title'];sid=screen['id']
 yes=True;reason='';action='';copy=''
 if state=='Initial':copy=f'نمای اولیهٔ «{name}» با هدف و اقدام اصلی؛ بدون آمار پرشدهٔ فرضی.';action='ورود به صفحه، focus عنوان، حفظ back navigation.'
 elif state=='Empty':
  yes='data' in f or screen['kind'] in ['profile','fill','translation'];reason='صفحه محتوای ثابت/انتخاب‌های تعریف‌شده دارد و collection قابل خالی‌شدن ندارد.'
  copy=f'برای «{name}» هنوز داده/سابقهٔ مناسب موجود نیست؛ به‌جای صفر ساختگی یا صفحه سفید، راه شروع نشان داده شود.';action='شروع مرتبط یا بازگشت؛ بدون ایجاد رکورد در اثر نمایش.'
 elif state=='Loading':
  yes=bool(f&{'load','boot'});reason='عمل async وابسته به داده در این صفحه تعریف نشده؛ spinner تزئینی لازم نیست.'
  copy='در حال آماده‌سازی همین محتوا؛ skeleton ثابت، بدون درصد حدسی.';action='لغو/بازگشت امن؛ focus نپرد، reduced motion بدون shimmer.'
 elif state=='Available':copy=f'محتوای معتبر و کنترل اصلی «{screen["primary"]}» آمادهٔ استفاده است.';action='عرضهٔ محتوا و علت محدودیت در صورت وجود؛ بدون اعلام اجراشدن قابلیت اصلی.'
 elif state=='Selected':
  yes='select' in f;reason='صفحهٔ read-only/آغازین، انتخاب domain مستقل ندارد؛ pressed/focus component جداست.'
  copy='انتخاب با border، icon و متن مشخص؛ فقط رنگ معیار نیست.';action='تغییر/لغو انتخاب و keyboard/tap جایگزین gesture.'
 elif state=='Disabled':
  yes=bool(f&{'write','content','future','mic'});reason='این صفحه prereq/submit/permission gate ندارد؛ navigation بی‌دلیل غیرفعال نشود.'
  copy='اقدام هنوز ممکن نیست؛ علت در متنِ خوانا کنار کنترل بیان شود.';action='ارائهٔ مسیر رفع شرط؛ disabled opacity تنها نشانه نیست.'
 elif state=='Success':
  yes='write' in f or screen['kind']=='player';reason='موفقیت عملیاتی جداگانه‌ای وجود ندارد؛ حالت Available برای خواندن کافی است.'
  copy='در محصول فقط پس از commit یا رویداد معتبر موفق؛ در prototype با برچسب شبیه‌سازی/رویداد موقت.';action='ارائهٔ ادامه بدون قفل‌کردن کاربر پشت جشن؛ عدم reward تکراری.'
 elif state=='Error':
  yes=bool(f&{'data','load','write','boot','content','future'});reason='خطای محلی مستقل تعریف نشده؛ خطای کلی پوسته در recovery عمومی مدیریت می‌شود.'
  copy=f'«{name}» کامل نشد؛ اطلاعات قبلی حفظ می‌شود و علت قابل فهم نمایش داده می‌شود.';action='Retry امن، بازگشت یا راه جایگزین متناسب با عمل.'
 elif state=='Offline':
  copy=('سرویس سازمانی متصل نیست؛ دادهٔ تازه/تغییر حساس در دسترس نیست. یادگیری محلی همچنان جدا قابل ادامه است.' if 'future' in f else 'آفلاین بودن برای محتوای نصب‌شده خطا نیست؛ navigation و آموزش محلی ادامه دارد. این HTML محصول Android نیست.')
  action='عدم loop درخواست شبکه؛ نشان وضعیت آرام، نه هشدار مسدودکننده برای core.'
 elif state=='Permission Denied':
  yes=bool(f&{'mic','files','future'});reason='این صفحه permission سخت‌افزار/فایل/سازمان درخواست نمی‌کند؛ permission بی‌مورد اضافه نشود.'
  copy='دسترسی داده نشده؛ علت بدون سرزنش بیان شود و راه ادامه بدون این دسترسی وجود داشته باشد.';action='انتخاب مقصد دیگر/تنظیم permission یا متن جایگزین؛ هیچ permission واقعی در HTML درخواست نمی‌شود.'
 elif state=='Storage Full':
  yes='write' in f or 'boot' in f or screen['kind']=='storage';reason='این صفحه write/staging مستقلی ندارد؛ کمبود فضا در عمل نویسنده رسیدگی می‌شود.'
  copy='فضای کافی نیست؛ نتیجه/دادهٔ قبلی پاک نمی‌شود. فضا فقط از adapter واقعی خوانده شود.';action='مدیریت بسته‌های اختیاری، توقف امن و تلاش دوباره؛ no destructive reset.'
 elif state=='Missing Content':
  yes='content' in f;reason='صفحه به محتوا/فایل آموزشی وابسته نیست؛ asset تزئینی با fallback مستقل جایگزین می‌شود.'
  copy='محتوای مورد نیاز نصب/معتبر/بازبینی نشده است؛ به‌جای JSON خام یا موفقیت جعلی، علت روشن نمایش داده شود.';action='بازگشت به بستهٔ معتبر/مثال متنی مجاز؛ در core نصب‌شده درخواست اینترنت اجباری نکن.'
 elif state=='Save Failed':
  yes='write' in f;reason='هیچ write مستقلی از این صفحه انجام نمی‌شود؛ read failure در Error است.'
  copy='نتیجه ذخیره نشد؛ انتخاب/پاسخ حفظ می‌شود. نمره/پیشرفت/پاداش هنوز قطعی نیست.';action='Retry همان operation id یا خروج با هشدار؛ success و celebration اجرا نشوند.'
 elif state=='Recovery':
  yes=bool(f&{'data','write','load','content','future','boot'});reason='صفحهٔ ثابت وضعیت بازیابی مستقل ندارد؛ back/restart پوسته کافی است.'
  copy='آخرین حالت معتبر بازیابی شود؛ دادهٔ ناقص به‌صورت قطعی معرفی نشود.';action='Retry بدون duplicate، ادامهٔ checkpoint یا بازگشت به جای امن.'
 return {'screen_id':sid,'state':state,'applicable':yes,'rationale':('قرارداد ویژهٔ این صفحه و flags تعریف‌شده.' if yes else 'N/A — '+reason),'ui_copy':copy if yes else 'N/A','behavior':action if yes else 'N/A','prototype_status':'VISUAL / ephemeral simulation only' if yes else 'N/A'}
