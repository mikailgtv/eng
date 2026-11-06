"""Raster design artboards using existing Pillow+RAQM, not browser screenshots.
Same tokens, canonical artwork and source curriculum as the independent prototype.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from functools import lru_cache
import json,math,hashlib
from design_data import ROOT,TOKENS
SCREENS=json.loads((ROOT/'design/screens-v2.json').read_text());BY={x['id']:x for x in SCREENS}
CURR=json.loads(Path('/home/user/EnglishLearning-Offline/assets/curriculum.json').read_text());LESSONS=[l for c in CURR for m in c['modules'] for l in m['lessons']]
GROUP_FA=['شروع یادگیری','الفبا و صداها','واژه‌های پایه','جمله‌های ساده','اعداد و زمان','انگلیسی روزمره']
P=2
METRICS=[]
@lru_cache(maxsize=300)
def font(size,weight=400,english=False):
 file=ROOT/'assets/fonts'/('LeoReadingSans-Variable-v2.ttf' if english else 'Vazirmatn-Variable.ttf')
 f=ImageFont.truetype(str(file),round(size*P),layout_engine=ImageFont.Layout.RAQM)
 f.set_variation_by_axes([weight,100] if english else [weight]);return f

def fa(n):return str(n).translate(str.maketrans('0123456789','۰۱۲۳۴۵۶۷۸۹'))
def rtl(s):return any('\u0600'<=c<='\u06ff' for c in s)
class Board:
 def __init__(self,w=390,h=844,route='routeA',sid='sheet',scene='Available',scale=1):
  self.w=w;self.h=h;self.c=TOKENS[route];self.sid=sid;self.scene=scene;self.scale=scale
  self.im=Image.new('RGB',(w*P,h*P),self.c['paper']);self.d=ImageDraw.Draw(self.im);self.targets=[];self.texts=[];self.clipped=[]
 def box(self,x,y,w,h,fill='surface',radius=12,border=None,width=1):
  f=self.c.get(fill,fill);outline=self.c.get(border,border) if border else None
  self.d.rounded_rectangle((round(x*P),round(y*P),round((x+w)*P),round((y+h)*P)),radius=round(radius*P),fill=f,outline=outline,width=max(1,round(width*P)))
 def line(self,points,color='decorativeLine',width=1):self.d.line([(round(x*P),round(y*P)) for x,y in points],fill=self.c.get(color,color),width=round(width*P),joint='curve')
 def text(self,s,x,y,w,size=16,weight=400,color='ink',align=None,max_lines=None,english=None):
  size=min([14,16,18,20,24,28,32,36],key=lambda n:(abs(n-size),-n));s=str(s);isfa=rtl(s) if english is None else not english;f=font(size,weight,not isfa);direction='rtl' if isfa else 'ltr';language='fa' if isfa else 'en';align=align or ('right' if isfa else 'left')
  def length(t):return self.d.textlength(t,font=f,direction=direction,language=language)/P
  lines=[]
  for paragraph in s.split('\n'):
   line=''
   for word in paragraph.split(' '):
    test=(line+' '+word).strip()
    if length(test)<=w or not line:line=test
    else:lines.append(line);line=word
   lines.append(line)
  all_count=len(lines)
  if max_lines is not None and len(lines)>max_lines:
   lines=lines[:max_lines]
   while length(lines[-1]+'…')>w and lines[-1]:lines[-1]=lines[-1][:-1]
   lines[-1]+='…';self.clipped.append({'text_excerpt':s[:70],'reason':'Static viewport excerpt only; full content remains in the HTML design','screen':self.sid})
  lh={14:24,16:28,18:30,20:32,24:36,28:42,32:44,36:50}[size]
  for j,t in enumerate(lines):
   tx=x+w if align=='right' else x+w/2 if align=='center' else x
   anchor='rt' if align=='right' else 'mt' if align=='center' else 'lt'
   self.d.text((round(tx*P),round((y+j*lh)*P)),t,font=f,fill=self.c.get(color,color),anchor=anchor,direction=direction,language=language)
   self.texts.append({'screen':self.sid,'text_kind':'fa' if isfa else 'en/ipa','size_logical':size,'box_width':w,'measured_width':round(length(t),2),'fits_width':length(t)<=w+1,'y':round(y+j*lh,2)})
  return len(lines)*lh
 def character(self,state,x,y,h,view=None):
  if state=='blink-closed':p=ROOT/'assets/leo/png/leo-blink-closed-keyframe-v1-raster-v3.png'
  elif state=='portrait':p=ROOT/'assets/leo/png/leo-portrait-v1-raster-v3.png'
  else:p=ROOT/'assets/leo/png'/('leo-'+state+'-'+(view or 'front')+'-v1-raster-v3.png')
  with Image.open(p) as src:
   w=src.width/src.height*h;im=src.resize((round(w*P),round(h*P)),Image.Resampling.LANCZOS)
   self.im.paste(im,(round(x*P),round(y*P)),im)
  return w
 def icon(self,name,x,y,size=24):
  p=ROOT/'assets/icons/png'/(name+'.png')
  if not p.exists():return
  with Image.open(p) as src:
   im=src.resize((round(size*P),round(size*P)),Image.Resampling.LANCZOS);self.im.paste(im,(round(x*P),round(y*P)),im)
 def button(self,label,x,y,w,primary=True,disabled=False,icon=None,h=52):
  h=max(48,h);self.box(x,y,w,h,'disabledBg' if disabled else 'primary' if primary else 'surface',12,'border' if not primary or disabled else 'primary')
  col='disabledInk' if disabled else 'primaryInk' if primary else 'ink'
  if icon:self.icon(icon,x+(w-24)/2,y+(h-24)/2)
  else:self.text(label,x+10,y+(h-26)/2,w-20,16,600,col,'center',2)
  self.targets.append({'screen':self.sid,'label':label or icon,'width':w,'height':h,'pass_48':w>=48 and h>=48,'measurement':'Design-artboard logical geometry; not Android dp or browser computed box'})
  return y+h
 def row(self,title,subtitle,y,icon='book',english=False,h=72):
  if y+h>self.h-105:return y
  self.line([(24,y+h),(self.w-24,y+h)])
  self.box(self.w-68,y+9,44,44,'primarySoft',12);self.icon(icon,self.w-58,y+19)
  tx=24;tw=self.w-110
  self.text(title,tx,y+8,tw,17,600,max_lines=1,english=english)
  self.text(subtitle,tx,y+38,tw,14,400,'muted',max_lines=1)
  self.targets.append({'screen':self.sid,'label':title,'width':self.w-48,'height':h,'pass_48':True,'measurement':'Design-artboard row target'})
  return y+h
 def input(self,label,placeholder,y,english=False):
  self.text(label,24,y,self.w-48,16,600);y+=32;self.box(24,y,self.w-48,54,'surface',12,'border');self.text(placeholder,40,y+14,self.w-80,16,400,'muted',english=english)
  self.targets.append({'screen':self.sid,'label':label,'width':self.w-48,'height':54,'pass_48':True,'measurement':'Design-artboard input geometry'});return y+80
 def callout(self,title,body,y,kind='info',max_lines=3):
  key={'info':('infoSoft','info'),'warning':('warningSoft','warning'),'error':('errorSoft','error'),'success':('primarySoft','primary')}[kind]
  h=58+max_lines*24;self.box(24,y,self.w-48,h,key[0],12)
  self.text(title,40,y+12,self.w-80,16,600,key[1],max_lines=1)
  self.text(body,40,y+43,self.w-80,14,400,key[1],max_lines=max_lines);return y+h+16
 def save(self,path):
  path.parent.mkdir(parents=True,exist_ok=True);assert not path.exists()
  self.im.save(path,format='WEBP' if path.suffix=='.webp' else 'PNG',quality=92,method=6)
  METRICS.append({'screen':self.sid,'scene':self.scene,'file':str(path.relative_to(ROOT)),'logical_viewport':[self.w,self.h],'export_size':[self.w*P,self.h*P],'targets':self.targets,'text_measurements':self.texts,'viewport_excerpts':self.clipped,'method':'Pillow RAQM design artboard; not browser screenshot','sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

def phone(s,scene='Available',route='routeA',w=390,h=844,scale=1):
 b=Board(w,h,route,s['id'],scene,scale);c=b.c;g=s['group'];k=s['kind']
 b.box(0,0,w,34,'primarySoft',0);b.text('DESIGN ARTBOARD',16,8,w-32,14,600,'primary','left',english=True);b.text(s['id'],16,8,w-32,14,600,'primary','right',english=True)
 b.box(0,34,w,80,'surface',0);b.text('leo',24,54,65,26,700,'ink','left',english=True);b.text(s['title'],93,57,w-117,18,600,max_lines=2)
 b.line([(0,114),(w,114)])
 bottom=74 if g!='A' else 28
 primary_visible=k not in ['home','settings','summary']
 footer_top=h-bottom-(82 if primary_visible else 0)
 if g!='A':
  b.box(0,h-74,w,74,'surface',0);b.line([(0,h-74),(w,h-74)])
  for i,(label,ic) in enumerate([('خانه','home'),('مسیر','path'),('مرور','review'),('تنظیمات','settings')]):
   x=w-8-(i+1)*(w-16)/4;b.icon(ic,x+(w-16)/8-12,h-66,24);b.text(label,x,h-36,(w-16)/4,14,400,'primary','center',1)
   b.targets.append({'screen':s['id'],'label':label,'width':(w-16)/4,'height':62,'pass_48':True,'measurement':'Design-artboard navigation target'})
 else:b.text('طرح مستقل؛ نه اجرای Android',20,h-24,w-40,14,400,'muted','center',1)
 if primary_visible:
  b.box(0,footer_top,w,82,'surface',0);b.line([(0,footer_top),(w,footer_top)]);b.button('بررسی پاسخ' if g=='E' and s['id'] not in ['E05','E08'] else s['primary'],24,footer_top+14,w-48,disabled=scene in ['Disabled','Loading','Permission Denied','Storage Full','Missing Content'] or s['id']=='E05')
 limit=footer_top-12;y=136
 feedback_scene=scene in ['Correct','Incorrect','Save Failed','Selected'] and g=='E'
 if scene not in ['Available','Initial','Correct','Incorrect','Selected']:
  b.text('حالت طراحی: '+scene,24,y,w-48,14,600,'muted');y+=31
  if scene=='Loading':
   for hh in [150,26,26]:b.box(24,y,w-48,hh,'decorativeLine',12);y+=hh+18
   b.text('بارگیریِ واقعی اپ انجام نشده است.',24,y,w-48,16,400,'muted',max_lines=2);return b
  if scene in ['Error','Permission Denied','Storage Full','Missing Content','Save Failed','Recovery'] and not feedback_scene:
   title={'Error':'این کار کامل نشد','Permission Denied':'این دسترسی داده نشده','Storage Full':'فضای کافی نیست','Missing Content':'محتوا در دسترس نیست','Save Failed':'ثبت انجام نشد','Recovery':'از آخرین حالت معتبر ادامه بده'}[scene]
   y=b.callout(title,'نمونهٔ طراحی است؛ دادهٔ قبلی حفظ می‌شود. موفقیت یا خطای واقعی دستگاه گزارش نشده است.',y,'info' if scene=='Recovery' else 'error',3)
   b.button('بازگشت یا تلاش دوباره',24,y,w-48,False);return b
  if scene=='Empty':
   b.character('encouraging',w/2-55,y,155);y+=170;b.text('هنوز داده‌ای برای این حالت نداریم.',24,y,w-48,22,600,max_lines=2);y+=78;b.text('یک راه شروع روشن؛ بدون عدد یا سابقهٔ ساختگی.',24,y,w-48,16,400,'muted',max_lines=3);return b
  if scene=='Offline':y=b.callout('محتوای نصب‌شده ادامه دارد','آفلاین بودن برای یادگیری محلی خطا نیست. این artboard، آزمون حالت هواپیما نیست.',y,'info',2)
 if k in ['splash','welcome','meet']:
  pose='happy' if k=='welcome' else 'teaching' if k=='meet' else 'neutral';hero_h=min(236,max(130,limit-y-180));b.character(pose,w/2-hero_h*720/1020/2,y,hero_h);y+=hero_h+15
  title='از یک سلام ساده شروع کن.' if k=='welcome' else 'من لئو هستم؛ با هم تمرین می‌کنیم.' if k=='meet' else 'انگلیسی، قدم به قدم'
  y+=b.text(title,24,y,w-48,28,700,align='center',max_lines=2)+12
  b.text('توضیح فارسی، مثال انگلیسی و یک قدم روشن. حساب اینترنتی برای شروع لازم نیست.',30,y,w-60,16,400,'muted','center',3)
 elif k=='home':
  y+=b.text('وقت یک قدم کوچک است.',24,y,w-48,28,700,max_lines=2)+6;b.text('یک درس روشن، بدون عجله.',24,y,w-48,16,400,'muted');y+=43
  b.box(24,y,w-48,270,'surface',18);b.box(24,y,w-48,180,'primarySoft',18);b.character('teaching',32,y+10,164)
  b.text('شروع گفت‌وگو',150,y+20,w-198,14,600,'primary',max_lines=2);b.text('Hello and\nGoodbye',150,y+59,w-196,23,700,english=True);b.text(fa(LESSONS[1]['durationMin'])+' دقیقهٔ تخمینی',150,y+136,w-196,14,400,'muted',max_lines=1)
  b.button('دیدن مسیر یادگیری',42,y+198,w-84);y+=295
  b.text('هدف پیشنهادیِ قابل تغییر',24,y,w-48,18,600);y+=37;b.text('زمان انتخابی هدف است؛ نه زمان مطالعه.',24,y,w-48,14,400,'muted');y+=35
  b.text('پیشرفتِ این نمونهٔ خالی',24,y,w-48,18,600);y+=35
  b.box(24,y,w-48,10,'primarySoft',5);y+=24;b.text(fa(len([]))+' از '+fa(len(LESSONS))+' درس · رویداد نمونه‌ای هنوز ایجاد نشده',24,y,w-48,14,400,'muted',max_lines=2)
 elif k in ['language','goal','time','access','motion']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+8
  opts={'language':['فارسی · پیشنهاد این طرح','English · بررسی جهت رابط'],'goal':['انگلیسی برای زندگی روزمره','انگلیسی در محیط کار','صنعت و آتش‌نشانی · آینده'],'time':['۵ دقیقهٔ پیشنهادی','۱۰ دقیقهٔ پیشنهادی','۱۵ دقیقهٔ پیشنهادی'],'access':['متن پایه · ۱۶','متن بزرگ‌تر · ۱۵۰٪','متن خیلی بزرگ · ۲۰۰٪'],'motion':['Standard · حرکت کوتاه','Reduced · حالت کم‌حرکت','Low · حالت ثابت سبک']}[k]
  for i,text in enumerate(opts):
   b.box(24,y,w-48,68,'primarySoft' if i==0 else 'surface',12,'primary' if i==0 else 'border',2 if i==0 else 1);b.text(text,42,y+20,w-84,16,600 if i==0 else 400,max_lines=1);b.targets.append({'screen':s['id'],'label':text,'width':w-48,'height':68,'pass_48':True,'measurement':'Design radio row'});y+=82
  if y<limit-80:b.text('این انتخاب در محصول باید پایدار شود؛ در prototype فقط موقت است.',24,y,w-48,14,400,'muted',max_lines=3)
 elif k=='profile':
  y+=b.text('با یک نام دلخواه',24,y,w-48,28,700,max_lines=2)+6;b.text('نام واقعی، ایمیل یا رمز لازم نیست.',24,y,w-48,16,400,'muted');y+=44;y=b.input('نام مستعار، اختیاری','زبان‌آموز',y);b.character('encouraging',w/2-70,y,190)
 elif k in ['daily','goals']:
  y+=b.text('هدفی که می‌توانی تغییر بدهی',24,y,w-48,26,700,max_lines=2)+16;y=b.input('هدف دلخواه به دقیقه','انتخاب کاربر',y);b.callout('بدون تنبیه','تغییر هدف باعث حذف پیشرفت نمی‌شود. completed باید از رویداد معتبر بیاید.',y,'info',3)
 elif k=='path':
  y+=b.text('مسیر یادگیری تو',24,y,w-48,28,700)+7;b.text('۶ فصل واقعیِ محتوای موجود',24,y,w-48,16,400,'muted');y+=42
  for i,m in enumerate(CURR[0]['modules']):
   if y+78>limit:break
   b.box(w-72,y+7,48,48,'primary' if i==0 else 'surface',14,'primary' if i==0 else 'border');b.text(fa(i+1),w-68,y+17,40,20,600,'primaryInk' if i==0 else 'primary','center',1);b.text(GROUP_FA[i],24,y+7,w-112,18,600,max_lines=1);b.text(m['title'],24,y+37,w-112,14,400,'muted',english=True,max_lines=1);b.targets.append({'screen':s['id'],'label':m['title'],'width':w-48,'height':76,'pass_48':True,'measurement':'Design chapter target'});y+=78
 elif k=='chapter':
  y+=b.text('شروع یادگیری',24,y,w-48,28,700)+14
  for l in CURR[0]['modules'][0]['lessons']:
   y=b.row(l['title'],fa(l['durationMin'])+' دقیقهٔ تخمینی',y,'book',True,82)
 elif k in ['units','locked','prerequisites','installed','library']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+16
  if k in ['installed','library']:
   b.box(24,y,w-48,186,'surface',18);b.text('English Starter',44,y+20,w-88,24,700,english=True);b.text('Pre-A1',44,y+60,w-88,18,600,'primary',english=True);b.text('۲۵ درس · ۱۰۰ واژه · ۸ فایل صوت',44,y+104,w-88,16,400,max_lines=2);y+=208
  else:y=b.row('Hello and Goodbye','درس موجود؛ واحد/پیش‌نیاز کامل هنوز authored نشده',y,'book',True,92)
  b.callout('مرز دادهٔ موجود','برای پرکردن طرح، بسته، قفل یا prerequisite فرضی به دادهٔ واقعی اضافه نمی‌شود.',y,'info',3)
 elif k=='lessonintro':
  b.text('هدف درس',24,y,w-48,14,600,'primary');y+=31;y+=b.text('Hello and Goodbye',24,y,w-48,28,700,english=True,max_lines=2)+12
  b.text('سلام مناسب صبح را انتخاب کنیم؛ تفاوت آن با خداحافظی شب را بفهمیم.',24,y,w-48,18,400,max_lines=3);y+=110;b.character('teaching',w/2-72,y,204);y+=210
  if y<limit-65:b.text('درس واقعی منبع؛ متن فارسی تازه DRAFT است.',24,y,w-48,14,400,'muted',max_lines=2)
 elif k=='vocabulary':
  b.text('واژهٔ ۱ از ۶ · درس Hello and Goodbye',24,y,w-48,14,400,'muted');y+=40;b.box(24,y,w-48,280,'surface',20)
  b.text('hello',44,y+30,w-88,36,600,align='center',english=True);b.text('/həˈloʊ/',44,y+95,w-88,18,400,'muted','center',english=True);b.text('سلام',44,y+143,w-88,23,600,'primary','center');b.line([(44,y+192),(w-44,y+192)]);b.text('Hello! I am Ali.',44,y+214,w-88,18,400,english=True)
  y+=300;b.button('واژهٔ بعدی',24,y,(w-60)/2,False);b.button('واژهٔ قبلی',36+(w-60)/2,y,(w-60)/2,False);y+=72;b.text('IPA و مثال از دادهٔ واقعی‌اند؛ فایل صوتیِ هر واژه هنوز نگاشت نشده.',24,y,w-48,14,400,'muted',max_lines=3)
 elif k=='grammar':
  y+=b.text('قاعده، همراه مثال',24,y,w-48,28,700)+15
  for line in ['I am Ali.','You are Sara.']:y=b.row(line,'نمونه از grammar واقعی My Name Is','book' if False else y,'book',True,82)
  b.callout('توضیح فارسی پیشنهادی','برای معرفی خود I am و برای مخاطب You are. این تبدیل فارسی هنوز review نشده است.',y+14,'info',3)
 elif k=='example':
  y+=b.text('جمله را با موقعیت ببین',24,y,w-48,27,700,max_lines=2)+16
  for en,fa_text in [('Good morning.','صبح بخیر؛ موقعیت نمونه صبح است.'),('Good afternoon.','بعدازظهر بخیر؛ اصلاح ترجمهٔ پیشنهادی.'),('Good night.','شب بخیر، هنگام خداحافظی در این درس.')]:
   if y+100>limit:break
   b.text(en,24,y,w-48,23,600,english=True);b.text(fa_text,24,y+39,w-48,16,400,'muted',max_lines=2);b.line([(24,y+92),(w-24,y+92)]);y+=112
 elif k=='dialogue':
  y+=b.text('یک گفت‌وگوی کوتاه',24,y,w-48,28,700)+20
  for i,(who,text) in enumerate([('A','Good morning, Ali!'),('B','Good morning, Sara!')]):
   x=24 if i==0 else 50;b.box(x,y,w-74,116,'surface' if i==0 else 'primarySoft',18);b.text(who,x+16,y+14,w-106,14,600,'muted',english=True);b.text(text,x+16,y+46,w-106,21,500,english=True,max_lines=2);y+=140
  b.text('این دیالوگ از یک مثال واقعی درس آمده است.',24,y,w-48,14,400,'muted',max_lines=2)
 elif g=='E':
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+10
  if s['id']=='E08':
   b.character('listening',w/2-60,y,170);y+=182;b.callout('بدون نمرهٔ تلفظ','Correct/Incorrect آوایی N/A است؛ فقط ضبط واقعی آینده و خودمقایسه، نه score ساختگی.',y,'warning',3)
  elif s['id']=='E05':
   y=b.callout('قرارداد مشخص، محتوای صوتی بازبینی نشده','تا transcript و سؤالِ متناظر معتبر نباشد، این نوع آمادهٔ انتشار نیست.',y,'warning',3)
   b.text('فایل نمونه ≠ آزمون شنیداری تاییدشده',24,y,w-48,16,600,max_lines=2)
  else:
   if k=='choice':
    b.box(24,y,w-48,62,'accentSoft',12);b.text('ساعت ۸ صبح، به معلمت سلام می‌کنی.',38,y+17,w-76,16,500,'accentInk',max_lines=1);y+=78
    for i,t in enumerate(['Good morning.','Good afternoon.','Good night.']):
     selected=(scene in ['Correct','Selected','Save Failed'] and i==0) or (scene=='Incorrect' and i==2)
     b.box(24,y,w-48,58,'primarySoft' if selected else 'surface',12,'primary' if selected else 'border',2 if selected else 1);b.text(t,42,y+16,w-84,18,500,english=True,max_lines=1);b.targets.append({'screen':s['id'],'label':t,'width':w-48,'height':58,'pass_48':True,'measurement':'Design choice target'});y+=70
   elif k=='matching':
    for a,btext in [('hello','سلام'),('good morning','صبح بخیر'),('goodbye','خداحافظ')]:
     b.button(a,24,y,(w-60)/2,False);b.button(btext,36+(w-60)/2,y,(w-60)/2,False);y+=66
    b.text('لمس واژه، سپس معنی؛ بدون drag اجباری.',24,y,w-48,14,400,'muted',max_lines=2);y+=54
   elif k in ['ordering','construction']:
    sentence=['I','am','Ali.'] if k=='ordering' else ['I','am','a','firefighter.'];b.box(24,y,w-48,98,'surface',14,'border');b.text('جمله را به ترتیب بساز',40,y+20,w-80,16,400,'muted');y+=118
    x=24
    for t in sentence:
     tw=max(56,min(w-48,len(t)*12+25))
     if x+tw>w-24:x=24;y+=64
     b.button(t,x,y,tw,False);x+=tw+8
    y+=80;b.text('با لمس، واژه اضافه می‌شود؛ لمس دوباره آن را برمی‌گرداند.',24,y,w-48,14,400,'muted',max_lines=3);y+=75
   else:
    q='She ____ a teacher.' if k=='fill' else 'Hello';y+=b.text(q,24,y,w-48,26,600,english=True,max_lines=2)+20;y=b.input('پاسخ '+('انگلیسی' if k=='fill' else 'فارسی'),'is' if scene=='Correct' and k=='fill' else 'پاسخ تو',y,english=k=='fill')
   if feedback_scene and y<limit-70:
    kind='success' if scene=='Correct' else 'error' if scene in ['Incorrect','Save Failed'] else 'info'
    title={'Correct':'طرح بازخورد درست','Incorrect':'نکته را دوباره ببین','Save Failed':'ثبت نشد؛ انتخاب حفظ می‌شود','Selected':'انتخاب شده، هنوز بررسی نشده'}[scene]
    if k=='translation' and scene=='Incorrect':title='پاسخ متفاوت؛ نیازمند بررسی';kind='warning'
    b.callout(title,'این state طراحی است؛ پیشرفت واقعی یا تایید ذخیرهٔ اپ محسوب نمی‌شود.',min(y+4,limit-123),kind,2)
 elif k=='summary':
  b.character('celebrating',w/2-68,y,192);y+=206;y+=b.text('یک قدم را مرور کردیم.',24,y,w-48,27,700,align='center',max_lines=2)+12;b.text('Good morning برای موقعیت صبح بود. پایان واقعی درس فقط پس از معیار و commit معتبر است.',24,y,w-48,16,400,'muted',max_lines=4);y+=128;b.button('دیدن پیشرفت نمونه',24,y,w-48)
 elif k in ['listening','listeningmode','player','audioerror']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+10
  b.character('listening',w/2-58,y,164);y+=174
  if k=='audioerror':b.callout('صدا در دسترس نیست','خطای فایل/decoder باید روشن باشد؛ پیام پخش موفق ساختگی ممنوع.',y,'error',3)
  else:
   b.box(24,y,w-48,122,'surface',16);b.text('hello-1.mp3',44,y+16,w-88,18,600,english=True);b.button('پخش نمونهٔ مرورگری',44,y+53,w-88,False);y+=140;b.text('فایل موجود است؛ transcript و نگاشت آن به فعالیت درس هنوز review نشده.',24,y,w-48,14,400,'muted',max_lines=3)
 elif k in ['permission','recording','replay','deleterecording']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+15
  b.character('listening',w/2-60,y,168);y+=182
  b.callout('میکروفون این prototype خاموش است','ضبط، بازپخشِ صدای کاربر و حذف فایل واقعی اجرا نمی‌شوند. این طرح، ارزیابی تلفظ هم ندارد.',y,'info',3)
 elif k in ['progress','progresssummary','streak','achievements','history','mistakes','review','duereview','resume','nextlesson']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+10
  if k=='achievements':b.character('winning',w/2-58,y,164);y+=180
  if k in ['progress','progresssummary']:
   b.text(fa(len([]))+' / '+fa(len(LESSONS)),24,y,w-48,36,600,english=False);y+=60;b.text('حالت خالیِ نمونه؛ بدون رویداد',24,y,w-48,16,400,'muted');y+=48;b.box(24,y,w-48,10,'primarySoft',5);y+=38
  b.callout('دادهٔ واقعی ساخته نمی‌شود','تاریخچه، XP، streak یا نتیجهٔ سازمانی بدون دادهٔ پایدار با — یا حالت خالی نمایش داده می‌شود.',y,'info',3)
 elif k in ['settings','shortcuts','profiles','audiosettings']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+14
  entries=[('پروفایل‌ها','فقط همین دستگاه','user'),('زبان و متن','فارسی، انگلیسی و IPA','book'),('حرکت','کم‌حرکت و حالت سبک','light'),('صدا','بدون autoplay','volume'),('حفاظت داده','پشتیبان و بازیابی','shield')]
  if k=='profiles':entries=[('زبان‌آموز آزمایشی','فقط حافظهٔ همین prototype','user')]
  for a,sub,ic in entries:y=b.row(a,sub,y,ic)
 elif k in ['backup','restore','import','storage']:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+12
  for a,sub,ic in [('نسخه و اعتبار','schema، checksum و rights','shield'),('فضای لازم','staging و نگهداری دادهٔ قبلی','storage'),('دامنهٔ انتخابی','پروفایل و recording با رضایت','user')]:y=b.row(a,sub,y,ic,False,82)
  if y<limit-80:b.text('در این HTML فایل، دیتابیس یا فضای واقعی دستگاه خوانده/تغییر داده نمی‌شود.',24,y+15,w-48,14,400,'muted',max_lines=3)
 elif g=='I':
  b.text('FUTURE DESIGN',24,y,w-48,14,600,'warning',english=True);y+=34;y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+14
  for a,sub in [('سازمان / کلاس','— متصل نیست'),('فراگیر / پیشرفت','— دریافت نشده'),('مجوز / گزارش','— نیازمند سرویس معتبر')]:y=b.row(a,sub,y,'organization',False,82)
  if y<limit-80:b.text('هیچ نام، تعداد، نمره یا اجازهٔ ساختگی به عنوان دادهٔ واقعی نشان داده نمی‌شود.',24,y+14,w-48,14,400,'muted',max_lines=3)
 else:
  y+=b.text(s['title'],24,y,w-48,26,700,max_lines=2)+14;b.text(s['purpose'],24,y,w-48,16,400,'muted',max_lines=5)
 return b

if __name__=='__main__':
 (ROOT/'mockups/phone').mkdir();(ROOT/'mockups/state-examples').mkdir();(ROOT/'mockups/tablet').mkdir()
 for s in SCREENS:phone(s).save(ROOT/'mockups/phone'/(s['id']+'__Available.webp'))
 variants=[]
 for s in SCREENS:
  if s['group']=='E':
   for scene in ['Selected','Correct','Incorrect','Save Failed']:variants.append((s['id'],scene))
 variants += [('B01','Empty'),('B01','Loading'),('B01','Offline'),('G03','Permission Denied'),('G04','Storage Full'),('D06','Missing Content'),('H08','Error'),('H08','Recovery')]
 for sid,scene in variants:phone(BY[sid],scene).save(ROOT/'mockups/state-examples'/(sid+'__'+scene.replace(' ','_')+'.webp'))
 # Tablet artboards are authored two-pane compositions, not scaled phone screenshots.
 for sid in ['B01','D02','I05']:
  b=Board(840,1000,'routeA',sid,'Tablet-reflow')
  b.box(0,0,840,42,'primarySoft',0);b.text('LEO / TABLET DESIGN ARTBOARD',32,10,776,16,600,'primary',english=True)
  b.text(BY[sid]['title'],32,76,776,28,700)
  b.box(608,142,200,756,'surface',18,'decorativeLine');b.text('مسیر یادگیری',624,167,168,20,600)
  yy=224
  for label in GROUP_FA:
   b.box(624,yy,168,64,'primarySoft' if yy==224 else 'surface',12,'border');b.text(label,635,yy+17,146,16,500,max_lines=1)
   b.targets.append({'screen':sid,'label':label,'width':168,'height':64,'pass_48':True,'measurement':'Authored tablet sidebar target'});yy+=80
  b.box(32,142,552,756,'surface',20,'decorativeLine')
  if sid=='B01':
   b.text('وقت یک قدم کوچک است.',56,174,504,28,700)
   b.text('یک درس روشن، بدون امتیاز نمایشی.',56,225,504,16,400,'muted')
   b.box(56,285,504,285,'primarySoft',18);b.character('teaching',68,303,244)
   b.text('Hello and\nGoodbye',278,326,252,28,700,english=True)
   b.text('۱۲ دقیقهٔ تخمینیِ درس',278,435,252,16,400,'muted')
   b.button('دیدن مسیر یادگیری',278,484,252)
   b.text('پیشرفت این نمونهٔ خالی',56,610,504,20,600);b.box(56,657,504,10,'primarySoft',5)
   b.text('۰ از ۲۵ درس؛ رویدادی هنوز ایجاد نشده.',56,690,504,16,400,'muted')
  elif sid=='D02':
   b.text('واژهٔ ۱ از ۶ · محتوای واقعی درس',56,174,504,16,400,'muted')
   b.text('hello',56,259,504,36,600,align='center',english=True)
   b.text('/həˈloʊ/',56,331,504,20,400,'muted','center',english=True)
   b.text('سلام',56,407,504,28,600,'primary','center')
   b.line([(76,482),(540,482)]);b.text('Hello! I am Ali.',76,528,464,24,400,english=True)
   b.button('واژهٔ قبلی',56,642,240,False);b.button('واژهٔ بعدی',320,642,240,False)
   b.button('مثال‌های همین درس',56,749,504)
  else:
   b.text('FUTURE DESIGN',56,174,504,16,600,'warning',english=True)
   b.text('دادهٔ سازمانی متصل نیست.',56,232,504,24,600)
   yy=324
   for label,value in [('دامنهٔ سازمان','— از سرور دریافت نشده'),('کلاس‌ها / فراگیران','— دادهٔ خصوصی ساخته نشده'),('نتیجه / تأیید','— شاهد ارزیابی وجود ندارد')]:
    b.text(label,56,yy,504,18,600);b.text(value,56,yy+38,504,16,400,'muted');b.line([(56,yy+81),(560,yy+81)]);yy+=116
   b.button('طرح مدیریت نقش‌ها',56,749,504,False)
  b.text('طرح reflow؛ نه تست CSS مرورگر یا Android. مرجع هندسهٔ logical px است.',32,940,776,16,400,'muted',max_lines=2)
  b.save(ROOT/'mockups/tablet'/(sid+'__Tablet.webp'))
 # Two actual side-by-side design studies use identical source content and different tokens.
 board=Board(1000,1120,'routeA','DIRECTIONS','Two visual directions')
 board.text('دو مسیر بصری؛ انتخاب طراحی: دفتر یادگیری',32,28,936,30,700)
 for x,route,label in [(55,'routeA','A · Field Notes — SELECTED FOR B'),(555,'routeB','B · Signal Lab — EXPLORATION')]:
  board.text(label,x,92,390,17,600,'muted',english=True,max_lines=2)
  im=phone(BY['B01'],route=route).im.resize((390*P,844*P),Image.Resampling.LANCZOS);board.im.paste(im,(x*P,142*P))
 board.text('مقایسهٔ heuristic طراحی؛ هیچ پژوهش کاربر یا تست دستگاه ادعا نشده است.',32,1030,936,16,400,'muted',max_lines=2)
 board.save(ROOT/'design/VISUAL_DIRECTION_STUDY.png')
 # Canonical character reference and expression sheet.
 ref=Board(1200,870,'routeA','CHARACTER_REFERENCE','four views')
 ref.text('LEO / CANONICAL VECTOR DESIGN v1',32,25,1136,27,700,english=True)
 ref.text('مرجع چهار نما · دارایی طراحی لایه‌دار، نه rig تولیدی',32,82,1136,21,500,'muted')
 for i,(view,label) in enumerate([('front','Front'),('three-quarter','Three-quarter'),('profile','Profile'),('back','Back')]):
  x=35+i*295;ref.box(x,145,270,620,'surface',18);ref.character('neutral',x+20,175,540,view);ref.text(label,x+15,710,240,19,600,'ink','center',english=True)
 ref.text('تناسب اسمی: سر 160 واحد، قد بدون کلاه 560 واحد؛ palette و landmarkها مشترک.',32,795,1136,17,400,'muted',max_lines=2)
 ref.save(ROOT/'design/LEO_CHARACTER_REFERENCE.png')
 poses=list(json.loads((ROOT/'evidence/LEO_ASSET_GEOMETRY.json').read_text())['poses'])
 ref=Board(1200,1830,'routeA','CHARACTER_EXPRESSIONS','16 design states');ref.text('LEO / 16 DESIGN STATES',32,24,1136,28,700,english=True)
 for i,state in enumerate(poses):
  col=i%4;row=i//4;x=24+col*294;y=95+row*421;ref.box(x,y,276,401,'surface',16);ref.character(state,x+23,y+10,331);ref.text(state,x+10,y+350,256,17,500,'ink','center',2,True)
 ref.save(ROOT/'design/LEO_EXPRESSION_SHEET.png')
 # Component reference sheet.
 ref=Board(1000,1240,'routeA','COMPONENT_REFERENCE','tokens and states');ref.text('LEO / COMPONENT REFERENCE',32,28,936,28,700,english=True)
 ref.text('رنگ، تایپوگرافی و حالت‌ها؛ مرجع طراحی، نه کامپوننت Native',32,85,936,20,500,'muted')
 ref.button('اقدام اصلی',40,150,280);ref.button('اقدام ثانویه',360,150,280,False);ref.button('غیرفعال با دلیل',680,150,280,False,True)
 ref.box(40,245,440,188,'surface',18);ref.text('توضیح فارسیِ خوانا',64,269,392,28,700);ref.text('Hello and Goodbye',64,323,392,26,600,english=True);ref.text('/həˈloʊ/  /ɡʊd ˈmɔːrnɪŋ/',64,375,392,18,400,'muted',english=True)
 for i,(key,label) in enumerate([('ink','Ink'),('primary','Primary'),('accent','Accent'),('error','Error'),('info','Info')]):
  x=530+i*85;ref.box(x,250,62,62,key,12);ref.text(label,x-7,330,76,14,400,'muted','center',1,True)
 ref.callout('پاسخ و ذخیره دو وضعیت مستقل‌اند','جواب درست همراه Save Failed نباید پیشرفت یا reward ایجاد کند.',470,'info',2)
 ref.box(40,650,440,210,'primarySoft',18);ref.text('بازخوردِ صحیح',64,674,392,22,600,'primary');ref.text('متن، icon و دلیل؛ نه فقط سبزشدن.',64,722,392,17,400,'primary',max_lines=2)
 ref.box(520,650,440,210,'errorSoft',18);ref.text('ثبت نشد',544,674,392,22,600,'error');ref.text('انتخاب حفظ شود و retry امن پیشنهاد شود.',544,722,392,17,400,'error',max_lines=2)
 for i,name in enumerate(['home','path','review','book','headphones','mic','storage','settings','shield','award','check','close']):
  x=48+(i%6)*155;y=930+(i//6)*106;ref.icon(name,x+42,y,48);ref.text(name,x,y+55,132,14,400,'muted','center',1,True)
 ref.save(ROOT/'design/COMPONENT_REFERENCE_SHEET.png')
 # Motion boards: 13 individual sequences, each with event/fallback labels.
 motions=json.loads((ROOT/'design/motions.json').read_text())
 for m in motions:
  b=Board(1080,700,'routeA','MOTION-'+m['id'],m['id']);b.text(m['title'],32,22,1016,28,700);b.text(m['trigger'],32,78,1016,16,400,'muted',max_lines=2)
  for i,pose in enumerate([m['pose'],m['endPose'],m['endPose'] if m['id']!='blink' else 'neutral']):
   x=30+i*350;b.box(x,160,320,395,'surface',16);b.character(pose,x+60,180,300);b.text(['Initial','Transition / design keyframe','Final / fallback'][i],x+10,505,300,16,600,'muted','center',2,True)
  b.text(str(m['duration'])+' ms · '+m['easing'],32,586,1016,17,600,'primary',english=True);b.text('Reduced / Low: نمای ثابت و متن کامل؛ اجرای دستی این طرح، رویداد واقعی محصول نیست.',32,631,1016,16,400,'muted',max_lines=2)
  b.save(ROOT/'storyboards'/('MOTION_'+m['id']+'.webp'))
 report={'method':'Pillow RAQM raster design artboards; NOT browser screenshots or Android execution','artboards':METRICS,'all_targets_48':all(x['pass_48'] for r in METRICS for x in r['targets']),'text_width_issues':[x for r in METRICS for x in r['text_measurements'] if not x['fits_width']],'browser_layout':'NOT TESTED','phone_dp_equivalence':'NOT TESTED; geometry is logical design pixels','native_font_scaling':'NOT TESTED'}
 with (ROOT/'evidence/MOCKUP_GEOMETRY_MEASUREMENTS.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
 print('Design artboards exported:',len(METRICS),'Phone defaults:',len(SCREENS),'State examples:',len(variants),'Motion boards:',len(motions))
 print('Logical target checks:',report['all_targets_48'],'Text width issues:',len(report['text_width_issues']))
