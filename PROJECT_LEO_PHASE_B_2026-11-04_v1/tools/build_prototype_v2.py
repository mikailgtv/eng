from pathlib import Path
import base64,json,hashlib
from design_data import ROOT,TOKENS,GROUPS,STATES

def data_uri(path,mime):return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
def safe_json(data):return json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
screens=json.loads((ROOT/'design/screens-v2.json').read_text())
used=['id','group','group_title','title','title_en','purpose','primary','next','kind','flags','persistence_contract','interruption_contract']
ss=[{k:s[k] for k in used} for s in screens]
states=json.loads((ROOT/'design/screen-states.json').read_text())
pool=[];poolmap={}
def intern(text):
 if text not in poolmap:poolmap[text]=len(pool);pool.append(text)
 return poolmap[text]
compact=[]
for s in states:compact.append([s['screen_id'],STATES.index(s['state']),s['applicable'],intern(s['rationale']),intern(s['ui_copy']),intern(s['behavior'])])
pose_labels=[('neutral','خنثی'),('happy','خوشحال'),('excited','هیجان‌زده'),('thinking','در حال فکر'),('confused','نیازمند روشن‌سازی'),('teaching','آموزش'),('listening','گوش‌دادن'),('speaking','گفتن'),('celebrating','جشن کوتاه'),('encouraging','تشویق'),('sad-after-mistake','همدلی پس از اشتباه'),('sleeping','استراحت'),('running','دویدن'),('jumping','پرش'),('winning','پیروزی'),('explaining','توضیح مفهوم')]
data={'tokens':TOKENS,'groups':GROUPS,'screens':ss,'stateNames':STATES,'statePool':pool,'stateCompact':compact,'poseLabels':pose_labels}
asset_meta=json.loads((ROOT/'evidence/LEO_RASTER_VALIDATION_v3.json').read_text())
art={}
for a in asset_meta['active_assets']:
 key=a['state'] if a['view']=='front' else a['view']
 art[key]=data_uri(ROOT/a['png'],'image/png')
art['blink-closed']=data_uri(ROOT/'assets/leo/png/leo-blink-closed-keyframe-v1-raster-v3.png','image/png')
source=Path('/home/user/EnglishLearning-Offline')
curr=json.loads((source/'assets/curriculum.json').read_text())
labels={'hello-1.mp3':'سلام ۱','hello-2.mp3':'سلام ۲','myname-1.mp3':'معرفی نام','numbers-1.mp3':'اعداد','colors-1.mp3':'رنگ‌ها','days-1.mp3':'روزها','family-1.mp3':'خانواده','questions-1.mp3':'پرسش‌ها'}
audio=[{'file':name,'label':label,'uri':data_uri(source/'assets/audio'/name,'audio/mpeg'),'review':'legacy audio; transcript/lesson alignment unverified'} for name,label in labels.items()]
fonts='\n'.join('@font-face{font-family:'+family+';src:url("'+data_uri(ROOT/path,'font/woff')+'") format("woff");font-weight:100 900;font-display:swap;}' for family,path in [('LeoFa','assets/fonts/Vazirmatn-Variable.woff'),('LeoEn','assets/fonts/LeoReadingSans-Variable-v2.woff')])
css=(ROOT/'prototype/prototype-v2.css').read_text()
js=(ROOT/'prototype/prototype-v4.js').read_text()
js=js.replace(" const screens=DATA.screens, byId=", " DATA.states=DATA.stateCompact.map(x=>({screen_id:x[0],state:DATA.stateNames[x[1]],applicable:x[2],rationale:DATA.statePool[x[3]],ui_copy:DATA.statePool[x[4]],behavior:DATA.statePool[x[5]]}));\n const screens=DATA.screens, byId=")
font_licenses={'Vazirmatn':(ROOT/'assets/fonts/OFL-Vazirmatn.txt').read_text(),'Leo Reading Sans / Noto Sans':(ROOT/'assets/fonts/OFL-NotoSans.txt').read_text(),'derivation':(ROOT/'assets/fonts/DERIVATION_NOTICE_v2.md').read_text()}
html='''<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="description" content="Project Leo Phase B: independent design prototype, not an Android app or APK. No application database or microphone access."><title>Leo — Phase B · DESIGN PROTOTYPE</title><style>__FONTS__\n__CSS__</style></head>
<body data-motion="Standard">
<header class="studio-header"><div class="studio-header-inner"><div class="studio-brand"><img src="__PORTRAIT__" alt="چهرهٔ مرجع لئو"><div><div class="wordmark">leo</div><div class="studio-kicker">فاز B · تجربهٔ یادگیری انگلیسی</div></div></div><span class="prototype-badge">DESIGN PROTOTYPE · NOT AN APK</span><nav class="studio-nav" aria-label="بخش‌های بستهٔ طراحی"><button type="button" data-action="view" data-view="prototype" aria-pressed="true">سفر یادگیری</button><button type="button" data-action="view" data-view="directions" aria-pressed="false">دو مسیر بصری</button><button type="button" data-action="view" data-view="character" aria-pressed="false">لئو و ۱۶ حالت</button><button type="button" data-action="view" data-view="components" aria-pressed="false">مرجع اجزا</button><button type="button" data-action="view" data-view="motion" aria-pressed="false">Storyboard حرکت</button></nav></div></header>
<div class="studio-wrap"><div class="scope-note"><div><strong>این فایل یک طرح مستقل و قابل کلیک است؛ محصول Android نیست.</strong> داده‌ها فقط در حافظهٔ این صفحه‌اند و با refresh پاک می‌شوند. هیچ حساب، دیتابیس، فایل کاربر یا میکروفونی خوانده/تغییر داده نمی‌شود. متن فارسی تازه و تبدیل تمرین‌ها هنوز بازبینی مدرس نشده‌اند.</div></div><div id="route-note" class="route-not-selected" hidden>اکنون مسیر بصری B را برای مقایسه می‌بینی؛ مسیر انتخاب‌شده برای این تحویل A است.</div>
<div id="prototype-layout" class="studio-layout"><aside><details class="inspector" open><summary>ابزار بازبینی طراحی <span aria-hidden="true">＋</span></summary><label for="screen-select">۶۷ صفحه/نمای طراحی، گروه A تا I</label><select id="screen-select" aria-label="انتخاب صفحهٔ طراحی"></select><label for="state-select">وضعیت صفحه</label><select id="state-select" aria-label="انتخاب حالت طراحی"></select><div id="state-applicability" class="state-applicability"></div><div class="section"><div class="row"><button type="button" data-action="start">شروع سفر از ابتدا</button><button type="button" data-action="go" data-target="B01">خانهٔ طرح</button></div><button type="button" id="fail-next" class="tool-button full" data-action="fail-next" aria-pressed="false">خطای ثبت بعدی: خاموش</button><p class="small-note">برای دیدن بازخورد نادرست در E01، گزینهٔ Good night را انتخاب کن. سپس پاسخ مناسب صبح را انتخاب کن. برای آزمودن جداییِ جواب درست از ذخیره، «خطای ثبت بعدی» را روشن کن.</p></div><div class="section"><strong>مرز صداقت</strong><p class="small-note">آمار نمونه از تعامل همین صفحه محاسبه می‌شود. XP، استریک، ظرفیت دستگاه و دادهٔ سازمانی با عدد فرضی پر نمی‌شوند. Success انتخاب‌شده در این ابزار فقط state طراحی است.</p></div></details></aside>
<section class="canvas" aria-label="بوم طراحی"><div class="canvas-toolbar"><button type="button" data-action="device" data-device="phone" aria-pressed="true">Phone</button><button type="button" data-action="device" data-device="tablet" aria-pressed="false">Tablet</button><button type="button" data-action="device" data-device="desktop" aria-pressed="false">Desktop / Future</button><button type="button" data-action="route" data-route="routeA">مسیر منتخب A</button></div><div class="device-holder"><div id="app-frame" class="app-frame"><div id="phone"></div></div></div><details id="screen-contract" class="screen-help"></details></section></div>
<section id="gallery" class="gallery" hidden></section></div>
<footer class="studio-footer"><p><strong>وضعیت اعتبارسنجی:</strong> contrast، پوشش glyph، هندسهٔ mockup و منطق مستقل نمونه بررسی می‌شوند؛ مرورگر واقعی، TalkBack، native layout و performance دستگاه در این محیط اجرا نشده‌اند. این فایل PASS کلی یا مجوز شروع C نیست.</p><details><summary style="min-height:48px;cursor:pointer">مجوز فونت و منشأ دارایی‌ها</summary><p>Vazirmatn بدون تغییر و Leo Reading Sans به‌عنوان subset تغییرنام‌یافتهٔ Noto Sans تحت SIL OFL 1.1 استفاده شده‌اند؛ متن مجوزها در همین HTML نیز نگهداری شده است. SVGهای لئو و آیکون‌ها طراحی اصیل این فازند، اما تأیید نهایی هنری/علامت تجاری باز است. هشت فایل صوتی و curriculum از پروژهٔ موجود آمده‌اند و review حرفه‌ای آن‌ها ادعا نشده است.</p><pre id="license-text" style="white-space:pre-wrap;direction:ltr;text-align:left;font:14px/1.7 LeoEn,monospace"></pre></details></footer>
<div id="dialog-root"></div>
<script type="application/json" id="design-data">__DATA__</script><script type="application/json" id="curriculum-data">__SOURCE__</script><script type="application/json" id="audio-data">__AUDIO__</script><script type="application/json" id="art-data">__ART__</script><script type="application/json" id="icon-data">__ICONS__</script><script type="application/json" id="motion-data">__MOTIONS__</script><script type="application/json" id="font-licenses">__LICENSES__</script>
<script id="design-prototype-code">__JS__
document.getElementById('license-text').textContent=Object.entries(JSON.parse(document.getElementById('font-licenses').textContent)).map(([name,text])=>name+'\\n'+text).join('\\n\\n');
</script></body></html>'''
for key,value in {'__FONTS__':fonts,'__CSS__':css,'__PORTRAIT__':art['portrait'],'__DATA__':safe_json(data),'__SOURCE__':safe_json(curr),'__AUDIO__':safe_json(audio),'__ART__':safe_json(art),'__ICONS__':safe_json(json.loads((ROOT/'design/icons.json').read_text())),'__MOTIONS__':safe_json(json.loads((ROOT/'design/motions.json').read_text())),'__LICENSES__':safe_json(font_licenses),'__JS__':js}.items():html=html.replace(key,value)
output=ROOT/'prototype/LEO_DESIGN_PROTOTYPE_v2.html'
with output.open('x',encoding='utf-8') as f:f.write(html)
report={'artifact':str(output.relative_to(ROOT)),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'screen_count':len(ss),'state_cells':len(compact),'embedded_artwork':len(art),'embedded_audio':len(audio),'embedded_font_files':2,'label':'DESIGN PROTOTYPE / NOT AN APK','storage':'in-memory simulation only; no localStorage/IndexedDB or application database','permissions':'No real microphone or file-picker permission requested','network':'No runtime network requests; assets/fonts/content embedded','browser_execution':'NOT TESTED at creation','source_codebases_modified':False}
(ROOT/'evidence/PROTOTYPE_BUILD_RECORD_v2.json').write_text(json.dumps(report,indent=2))
print('Standalone DESIGN PROTOTYPE created:',output.stat().st_size,'bytes; screens:',len(ss),'states:',len(compact))
