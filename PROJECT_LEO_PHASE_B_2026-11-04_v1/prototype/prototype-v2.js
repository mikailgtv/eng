'use strict';
(() => {
 const read=id=>JSON.parse(document.getElementById(id).textContent);
 const DATA=read('design-data'), SOURCE=read('curriculum-data'), AUDIO=read('audio-data'), ART=read('art-data'), ICONS=read('icon-data'), MOTIONS=read('motion-data');
 const screens=DATA.screens, byId=Object.fromEntries(screens.map(s=>[s.id,s]));
 const flat=SOURCE.flatMap(c=>c.modules.flatMap((m,mi)=>m.lessons.map((l,li)=>({...l,moduleIndex:mi,moduleTitle:m.title,legacyId:c.code+'-'+mi+'-'+li}))));
 const words=flat.flatMap((l,li)=>(l.vocabulary||[]).map(v=>({...v,lessonIndex:li})));
 const chapterFA=['شروع یادگیری','الفبا و صداها','واژه‌های پایه','جمله‌های ساده','اعداد و زمان','انگلیسی روزمره'];
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fa=n=>String(n).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[+n]);
 const icon=(n,extra='')=>'<svg class="icon '+extra+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(ICONS[n]||ICONS.info)+'"/></svg>';
 const image=(state='neutral',classes='hero-figure',alt='لئو، همراه آموزشی')=>'<img class="'+classes+'" src="'+ART[state]+'" alt="'+E(alt)+'">';
 const btn=(label,action,args='',style='secondary',disabled=false)=>'<button type="button" class="'+style+'" data-action="'+action+'" '+args+(disabled?' disabled':'')+'>'+label+'</button>';
 const go=(id,label,style='secondary')=>btn(label,'go','data-target="'+id+'"',style);
 const note=(title,body,type='info')=>'<div class="notice '+type+'">'+icon(type==='error'?'close':type==='success'?'check':'info')+'<div><strong>'+title+'</strong>'+body+'</div></div>';
 const heading=(title,lead='')=>'<h2 tabindex="-1" id="screen-heading">'+title+'</h2>'+(lead?'<p class="lead">'+lead+'</p>':'');
 const sourceTag=(text='متن انگلیسی و واژه‌ها از فایل فعلی پروژه‌اند؛ متن فارسی تازه و تبدیل تمرین‌ها پیشنهاد طراحی و بازبینی‌نشده‌اند.')=>'<div class="source-tag">'+text+'</div>';
 const empty=(title,text,ic='book')=>'<div class="empty-state"><span class="feature-icon">'+icon(ic)+'</span><h3>'+title+'</h3><p>'+text+'</p></div>';
 let timers=[];let lastSubmission=null;
 const state={screen:'A02',history:[],view:'prototype',route:'routeA',device:'phone',scene:'Available',alias:'',goal:'general',minutes:10,uiLocale:'fa',textScale:1,motion:'Standard',sound:true,chapter:0,lesson:1,word:0,audio:0,answer:null,pairs:{},matchLeft:null,tokens:[],input:'',feedback:null,pending:null,failNext:false,attempts:[],completed:[],events:[],bookmarks:[],goldenReady:false,recordSimulation:false,recordStarted:0};
 const normalize=s=>String(s).normalize('NFKC').trim().toLowerCase().replace(/[.!?؟]+$/g,'').replace(/\s+/g,' ');
 const currentLesson=()=>flat[state.lesson]||flat[1];
 const stateMeta=()=>DATA.states.find(x=>x.screen_id===state.screen&&x.state===state.scene);
 const stats=()=>({completed:state.completed.length,total:flat.length,attempts:state.attempts.length,correct:state.attempts.filter(a=>a.outcome==='correct').length,wrong:state.attempts.filter(a=>a.outcome==='incorrect').length,percent:Math.round(100*state.completed.length/flat.length)});
 function clearTimers(){timers.forEach(x=>clearTimeout(x));timers=[];}
 function reduced(){return state.motion!=='Standard'||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
 function pauseAudio(){document.querySelectorAll('audio').forEach(a=>a.pause());}
 function goto(id,push=true){
  if(!byId[id])return;
  if(push&&state.screen!==id)state.history.push(state.screen);
  pauseAudio();clearTimers();lastSubmission=null;state.screen=id;state.view='prototype';state.scene='Available';state.feedback=null;state.pending=null;
  state.answer=null;state.pairs={};state.matchLeft=null;state.tokens=[];state.input='';state.recordSimulation=false;
  render();
 }
 function applyRoute(){const t=DATA.tokens[state.route];Object.entries(t).forEach(([key,val])=>{if(key!=='name')document.documentElement.style.setProperty('--'+key,val);});document.documentElement.setAttribute('data-motion',reduced()?'Reduced':state.motion);}
 function option(label,value,field,english=false){
  const selected=String(state[field])===String(value);
  return '<button type="button" role="radio" aria-checked="'+selected+'" class="choice'+(selected?' selected':'')+'" data-action="option" data-field="'+field+'" data-value="'+E(value)+'"><span class="radio" aria-hidden="true"></span><span class="'+(english?'en':'label')+'"'+(english?' lang="en" dir="ltr"':'')+'>'+label+'</span></button>';
 }
 function flatRow(title,sub,target,ic='book'){
  return '<div class="flat-item"><span class="feature-icon">'+icon(ic)+'</span><div class="grow"><strong>'+title+'</strong><small>'+sub+'</small></div>'+go(target,icon('back'),'icon-button')+'</div>';
 }
 function setting(title,sub,target,ic){return '<button type="button" class="setting-row" data-action="go" data-target="'+target+'"><span class="feature-icon">'+icon(ic)+'</span><span class="grow"><strong>'+title+'</strong><small>'+sub+'</small></span>'+icon('back')+'</button>';}
 function sourceQuestion(){return flat[1].blocks.find(b=>b.type==='QUESTION');}
 function sentenceTokens(){return state.screen==='E06'?['I','am','a','firefighter.']:['I','am','Ali.'];}
 function feedbackHTML(){
  const f=state.feedback;if(!f)return '';
  const pose=f.kind==='correct'?'happy':f.kind==='savefailed'?'thinking':'encouraging';
  const title={correct:'در این نمونه درست است',incorrect:'یک نکته را با هم مرور کنیم',ambiguous:'این پاسخ نیاز به بررسی دارد',savefailed:'پاسخ بررسی شد، اما ثبت شبیه‌سازی نشد'}[f.kind];
  const lead=f.kind==='savefailed'?'این سناریوی طراحیِ خطای ذخیره است. هیچ پیشرفت یا پاداشی اضافه نشده و پاسخ برای تلاش دوباره حفظ شده است.':f.text;
  return '<section class="feedback '+f.kind+'" role="status" aria-live="polite"><div class="feedback-head">'+image(pose,'','لئو با واکنش محترمانه')+'<h3>'+title+'</h3></div><p>'+lead+'</p><p class="caption">نتیجه فقط متعلق به تعامل این HTML است؛ در اپ یا دیتابیس ذخیره نشده.</p><div class="button-row">'+(f.kind==='savefailed'?btn('تلاش دوبارهٔ شبیه‌سازی','retry-save','','secondary'):f.kind==='correct'?btn('ادامهٔ سفر نمونه','finish-sample','','primary'):btn('دوباره امتحان کن','retry-exercise','','secondary'))+'</div></section>';
 }
 function exerciseBody(s){
  let content=heading(s.title,s.purpose);
  if(s.id==='E01'){
   content+='<div class="question-context"><strong>موقعیت: ساعت ۸ صبح</strong><p>به معلمت سلام می‌کنی. سلامِ مخصوص صبح کدام است؟</p></div><p class="question-prompt" lang="en">'+E(sourceQuestion().prompt)+'</p><div class="choices" role="radiogroup" aria-label="پاسخ نمونه">'+['Good morning.','Good afternoon.','Good night.'].map(x=>option(E(x),x,'answer',true)).join('')+'</div>';
  } else if(s.id==='E02'){
   const pairs=[['hello','سلام'],['good morning','صبح بخیر'],['goodbye','خداحافظ']];
   content+='<div class="matching-grid"><div class="matching-column">'+pairs.map(([en])=>'<button type="button" class="matching-choice en '+(state.matchLeft===en?'chosen':'')+' '+(state.pairs[en]?'assigned':'')+'" lang="en" data-action="match-left" data-value="'+E(en)+'" aria-pressed="'+(state.matchLeft===en)+'">'+E(en)+'</button>').join('')+'</div><div class="matching-column" dir="rtl">'+[pairs[2],pairs[0],pairs[1]].map(([en,fa])=>'<button type="button" class="matching-choice" data-action="match-right" data-value="'+E(fa)+'">'+E(fa)+'</button>').join('')+'</div></div><p class="caption" style="margin-top:14px">اول واژه، بعد معنی را لمس کن. کشیدن لازم نیست؛ با صفحه‌کلید هم قابل انتخاب است.</p><ul class="pairs-list">'+Object.entries(state.pairs).map(([en,fa])=>'<li><bdi dir="ltr" lang="en">'+E(en)+'</bdi> ← '+E(fa)+'</li>').join('')+'</ul>';
  } else if(['E03','E06'].includes(s.id)){
   const correct=sentenceTokens();const order=s.id==='E06'?[3,0,2,1]:[2,0,1];
   content+=note('معنی جمله',s.id==='E06'?'من آتش‌نشان هستم.':'من علی هستم.','info')+'<div class="sentence-well" aria-label="جملهٔ انتخاب‌شده">'+(state.tokens.length?state.tokens.map((i,position)=>btn(E(correct[i]),'remove-token','data-position="'+position+'"','word-token')).join(''):'<span class="caption">واژه‌ها را به ترتیب انتخاب کن</span>')+'</div><div class="token-bank" aria-label="واژه‌های قابل انتخاب">'+order.filter(i=>!state.tokens.includes(i)).map(i=>btn(E(correct[i]),'add-token','data-index="'+i+'"','word-token')).join('')+'</div><p class="caption" style="margin-top:14px">لمس هر واژهٔ چیده‌شده آن را برمی‌گرداند. ترتیب انتخاب، جایگزین دسترس‌پذیر drag است.</p>';
  } else if(s.id==='E04'){
   const l=flat.find(x=>x.title.startsWith('The verb'));const q=l.blocks.find(x=>x.type==='QUESTION');
   content+='<p class="question-prompt" lang="en">'+E(q.prompt)+'</p><div class="field"><label for="exercise-input">پاسخ انگلیسی</label><input id="exercise-input" dir="ltr" lang="en" value="'+E(state.input)+'" autocomplete="off" placeholder="am / is / are"><p>فقط کلمهٔ جاافتاده را بنویس.</p></div>';
  } else if(s.id==='E07'){
   content+='<div class="vocab-card"><div class="word" lang="en" dir="ltr">Hello</div><p class="caption">معنی طبیعی فارسی را بنویس.</p></div><div class="field"><label for="exercise-input">پاسخ فارسی</label><input id="exercise-input" dir="rtl" lang="fa" value="'+E(state.input)+'" autocomplete="off" placeholder="پاسخ تو"><p>«سلام» از منبع موجود است؛ «درود» در این تبدیلِ تمرین، پاسخ جایگزینِ پیشنهادی است. پاسخ‌های دیگر بدون بررسی، غلط قطعی اعلام نمی‌شوند.</p></div>';
  } else if(s.id==='E05'){
   content+=note('این نوع هنوز آمادهٔ انتشار نیست','فایل صوتی موجود است، اما ارتباط فایل، متن و سؤالِ listening باید بازبینی شود. اینجا نمره‌ای از روی فایل حدس نمی‌زنیم.','warning')+'<div class="choices">'+option('گزینهٔ پاسخ در بستهٔ بازبینی‌شده','a','answer')+option('گزینهٔ دومِ بستهٔ بازبینی‌شده','b','answer')+'</div>'+go('G01','شنیدن فایل‌های موجود','secondary wide');
  } else {
   content+=image('listening')+note('خودت مقایسه کن، نه امتیاز ساختگی','گوش‌دادن، ضبط، شناخت گفتار و ارزیابی تلفظ چهار قابلیت متفاوت‌اند. در این HTML فقط پخش فایل نمونه واقعی است؛ ضبط شبیه‌سازی طراحی است.','info')+go('G03','دیدن طرح اجازهٔ میکروفون','primary wide');
  }
  if(!['E05','E08'].includes(s.id))content+='<div class="button-row">'+btn('بررسی پاسخ در نمونه','submit-answer','','primary wide')+'</div>';
  return content+feedbackHTML()+sourceTag();
 }
 function renderBody(s){
  const l=currentLesson(),st=stats();
  if(s.group==='E')return exerciseBody(s);
  switch(s.kind){
   case 'splash':return '<div class="welcome">'+image('neutral')+'<div class="wordmark">leo</div><p class="lead">انگلیسی، قدم به قدم</p><p class="caption" style="margin-top:28px">این تصویر Splash طراحی است؛ سرعت راه‌اندازی Android اندازه‌گیری نشده.</p></div>';
   case 'welcome':return '<div class="welcome">'+image('happy')+heading('از یک سلام ساده شروع کن.','با توضیح فارسی، مثال روشن و تمرین کوتاه جلو برو. برای شروع یادگیری حساب اینترنتی لازم نیست.')+'<div class="button-row">'+go('B01','فعلاً فقط درس را ببین','text-button')+'</div></div>';
   case 'language':return heading('زبان رابط را انتخاب کن','متن‌های انگلیسی و IPA همیشه جهت درست خود را دارند؛ زبان توضیح درس می‌تواند فارسی بماند.')+'<div class="choices" role="radiogroup" aria-label="زبان رابط">'+option('فارسی · پیشنهاد این طرح','fa','uiLocale')+option('English · بررسی جهت رابط','en','uiLocale')+'</div>'+note('محدودهٔ این پیش‌نمایش','رابط اصلی این تحویل فارسی است. انتخاب English جهت قاب و عنوان‌ها را نشان می‌دهد؛ ترجمهٔ کامل همهٔ متن‌های رابط هنوز تأیید نشده است.','info');
   case 'profile':return image('encouraging','hero-figure small')+heading('با یک نام دلخواه','نیازی به نام واقعی، ایمیل یا رمز نیست.')+'<div class="field"><label for="alias-input">نام مستعار، اختیاری</label><input id="alias-input" value="'+E(state.alias)+'" dir="auto" autocomplete="off" placeholder="مثلاً: زبان‌آموز"><p>در این prototype نام فقط در حافظهٔ همین صفحه می‌ماند.</p></div>'+note('پروفایل محلی، نه حساب سازمانی','در محصول، پیشرفت هر پروفایل جدا ذخیره خواهد شد. در این HTML حساب یا دیتابیس ایجاد نمی‌شود.','info');
   case 'goal':return heading(s.title,'هدف را می‌توانی هر زمان عوض کنی؛ شغل، سطح زبان را تعیین نمی‌کند.')+'<div class="choices" role="radiogroup" aria-label="هدف یادگیری">'+option('شروع انگلیسی برای زندگی روزمره','general','goal')+option('ارتباط در محیط کار','workplace','goal')+option('انگلیسی آتش‌نشانی و صنعت · مسیر آینده','firefighter','goal')+'</div>'+note('محتوای ایمنی، جای آموزش رسمی نیست','مسیر حرفه‌ای هنوز بستهٔ تأییدشده ندارد و به بازبینی متخصص نیاز دارد.','warning');
   case 'time':return heading(s.title,'کم و پیوسته، به انتخاب خودت. اعلان به‌صورت خودکار فعال نمی‌شود.')+'<div class="choices" role="radiogroup" aria-label="زمان پیشنهادی">'+[5,10,15].map(n=>option(fa(n)+' دقیقه · هدف پیشنهادی',String(n),'minutes')).join('')+'</div><div class="field"><label for="custom-minutes">زمان دلخواه، به دقیقه</label><input id="custom-minutes" type="number" min="1" value="'+E(state.minutes||'')+'" inputmode="numeric"><p>این مقدار هدف انتخابی است، نه زمان مطالعهٔ ثبت‌شده.</p></div>';
   case 'meet':return '<div class="welcome">'+image('teaching')+heading('من لئو هستم.','وقتی جواب متفاوتی بدهی، دلیلش را با هم می‌بینیم. قرار نیست سرزنش شوی.')+'</div>'+note('نقش من در این طرح','همراه آموزشی‌ام؛ نه مربی عملیات اضطراری و نه دستگاه تشخیص یا نمره‌دهی تلفظ.','info');
   case 'access':return heading(s.title,'چیزی را که برایت راحت‌تر است انتخاب کن.')+'<div class="choices" role="radiogroup" aria-label="اندازهٔ متن">'+option('اندازهٔ پایه · ۱۶','1','textScale')+option('متن بزرگ‌تر · ۱۵۰٪','1.5','textScale')+option('متن خیلی بزرگ · ۲۰۰٪','2','textScale')+'</div>'+setting('حرکت کمتر','معنی آموزش بدون حرکت هم حفظ می‌شود','H05','eye')+note('محدودهٔ بررسی','اندازه‌ها و کنتراست در طراحی اندازه‌گیری شده‌اند؛ رفتار واقعی مرورگر، TalkBack و Android هنوز تست نشده است.','info');
   case 'home':return heading((state.alias?E(state.alias)+'، ':'')+'وقت یک قدم کوچک است.','یک درس روشن؛ بدون عجله و بدون امتیاز نمایشی.')+'<div class="lesson-focus"><div class="top"><div><span class="quiet-chip">شروع گفت‌وگو</span><h3 style="margin-top:12px" lang="en">Hello and Goodbye</h3><p class="caption">'+fa(flat[1].durationMin)+' دقیقهٔ تخمینیِ محتوای درس</p></div>'+image('teaching','')+'</div><div class="bottom">'+go('C01',state.goldenReady?'ادامهٔ مسیر نمونه':'دیدن مسیر یادگیری','primary')+'</div></div><div class="section-heading"><h3>هدف انتخابی</h3>'+go('B02',icon('settings'),'icon-button')+'</div><div class="meta-row"><span>'+fa(state.minutes||10)+' دقیقهٔ پیشنهادی</span><span>زمان واقعی: —</span></div><div class="section-heading"><h3>پیشرفت این پیش‌نمایش</h3></div><div class="meta-row"><span>'+fa(st.completed)+' از '+fa(st.total)+' درس</span><span>'+fa(st.percent)+'٪</span></div><div class="progress-track" aria-label="پیشرفت موقت این پیش‌نمایش"><div class="progress-fill" style="width:'+st.percent+'%"></div></div><p class="caption" style="margin-top:10px">فقط از تعامل همین صفحه محاسبه می‌شود؛ با بستن صفحه پاک خواهد شد.</p><div class="section-heading"><h3>مرور</h3></div>'+flatRow('مرورهای سررسیدشده','برنامهٔ مرور پایدار هنوز وجود ندارد','F01','review');
   case 'daily':case 'goals':return heading(s.title,'هدف انتخابی را با پیشرفت واقعی اشتباه نمی‌گیریم.')+'<div class="stat-row"><div class="stat"><strong>'+fa(state.minutes||10)+'</strong><span>دقیقه، هدف انتخابی</span></div><div class="stat"><strong>—</strong><span>زمان مطالعهٔ ثبت‌شده</span></div></div><div class="field"><label for="custom-minutes">هدف دلخواه به دقیقه</label><input id="custom-minutes" type="number" min="1" inputmode="numeric" value="'+E(state.minutes||10)+'"></div>'+note('بدون فشار','تغییر هدف امتیاز منفی یا از دست‌دادن پیشرفت ایجاد نمی‌کند. اعلان اختیاری است.','info');
   case 'resume':return heading(s.title,'در محصول، از checkpoint همان نسخهٔ محتوا ادامه خواهی داد.')+(state.events.length?note('سفر نمونه در این صفحه وجود دارد','برای ادامهٔ درس نمونه به همان محتوا برگرد.','success'):empty('هنوز سابقهٔ پایداری نداریم','می‌توانی از درس نمونه شروع کنی؛ ادامهٔ جعلی ساخته نمی‌شود.'))+go('D01','درس واقعی نمونه را ببین','primary wide');
   case 'nextlesson':return heading(s.title,'دلیل پیشنهاد باید برای تو روشن باشد.')+note('پیشنهاد طراحی برای شروع','درس Hello and Goodbye برای آشنایی با سلام‌ها انتخاب شده است؛ این پیشنهادِ طراحی، تحلیل هوشمند سطح کاربر نیست.','info')+go('D01','دیدن درس نمونه','primary wide');
   case 'duereview':case 'review':return heading(s.title,'مرور زمانی می‌آید که یک برنامهٔ معتبر و آیتمِ سررسیدشده وجود داشته باشد.')+empty('صفِ واقعیِ مرور در این prototype نداریم','در محصول، dueAt و policyVersion از دادهٔ پایدار خوانده می‌شوند. می‌توانی خطاهای همین جلسهٔ نمونه را ببینی.','review')+go('F02','مرور پاسخ‌های همین نمونه','secondary wide');
   case 'progresssummary':case 'progress':return heading(s.title,'عددها فقط از تعامل این صفحه آمده‌اند، نه از اپ یا حساب واقعی.')+'<div class="stat-row"><div class="stat"><strong>'+fa(st.completed)+' / '+fa(st.total)+'</strong><span>درس کامل‌شده در نمایش موقت</span></div><div class="stat"><strong>'+fa(st.correct)+' / '+fa(st.attempts)+'</strong><span>پاسخ درست از بررسی‌های ثبت‌شده در حافظهٔ این نمونه</span></div></div><div class="progress-track"><div class="progress-fill" style="width:'+st.percent+'%"></div></div>'+note('دادهٔ پایدار در این فایل وجود ندارد','XP، استریک، ظرفیت ذخیره و نمرهٔ رسمی از دادهٔ واقعی اپ خوانده نشده‌اند؛ برای آن‌ها مقدار ساختگی نشان نمی‌دهیم.','info')+flatRow('تاریخچهٔ این جلسه','رویدادهای موقت همین prototype','F04','clock')+flatRow('استریک و نشان‌ها','قرارداد طراحی، بدون رکورد واقعی','F07','award');
   case 'shortcuts':return heading(s.title,'فقط مسیرهای لازم برای زبان‌آموز؛ سازمان و مدرس در catalog طراح جدا هستند.')+flatRow('مسیر یادگیری','شش فصل موجود','C01','path')+flatRow('مرور','پاسخ‌های همین نمونه','F01','review')+flatRow('صوت نمونه','هشت فایل موجود','G01','headphones')+flatRow('تنظیمات','متن، حرکت و حفاظت داده','H01','settings');
   case 'path':return heading(s.title,'با محتوای واقعی Pre-A1 جلو برو؛ وجود سطح در فهرست به معنی انتشار محتوای آن نیست.')+'<div class="chapter-list">'+SOURCE[0].modules.map((m,i)=>'<div class="chapter"><button type="button" class="chapter-button '+(i===state.chapter?'active':'')+'" data-action="chapter" data-index="'+i+'"><span class="chapter-index">'+fa(i+1)+'</span><span class="grow"><strong>'+chapterFA[i]+'</strong><small lang="en">'+E(m.title)+'</small></span><span class="caption">'+fa(m.lessons.length)+' درس</span></button>'+(i<5?'<div class="chapter-line" aria-hidden="true"></div>':'')+'</div>').join('')+'</div>'+note('پیش‌نیازها هنوز authored نشده‌اند','برای این دادهٔ قدیمی قفل آموزشیِ حدسی نمی‌سازیم. سطوح بعدی هنوز محتوای منتشرشده ندارند.','info');
   case 'chapter':{
    const m=SOURCE[0].modules[state.chapter];let start=SOURCE[0].modules.slice(0,state.chapter).reduce((n,m)=>n+m.lessons.length,0);
    return heading(chapterFA[state.chapter],'<bdi dir="ltr" lang="en">'+E(m.description)+'</bdi>')+m.lessons.map((l,i)=>'<button type="button" class="lesson-link '+(state.lesson===start+i?'selected':'')+'" data-action="lesson" data-index="'+(start+i)+'"><span class="feature-icon">'+icon(state.completed.includes(start+i)?'check':'book')+'</span><span class="grow"><strong lang="en">'+E(l.title)+'</strong><small>'+fa(l.durationMin)+' دقیقهٔ تخمینی · '+fa(l.blocks.filter(b=>b.type==='QUESTION').length)+' پرسش در منبع</small></span>'+icon('back')+'</button>').join('')+sourceTag('عنوان‌ها و زمان‌ها از source هستند. سفر تعاملی اصلی این prototype برای Hello and Goodbye است؛ سایر درس‌ها قابل مرور محتوا هستند.');
   }
   case 'units':return heading(s.title,'واحدبندی جدید هنوز ساختار منتشرشدهٔ curriculum نیست.')+note('گروه‌بندی پیشنهادی طراحی','«سلام و معرفی» می‌تواند Hello and Goodbye و My Name Is را کنار هم قرار دهد. این پیشنهاد باید در H با هدف، prerequisite و ID پایدار authored شود.','warning')+go('D01','دیدن یکی از درس‌های واقعی','primary wide');
   case 'locked':case 'prerequisites':return heading(s.title,'بسته‌نبودن یک درس باید دلیل داشته باشد.')+note('شرط آموزشی در legacy موجود نیست','دادهٔ فعلی prerequisite کامل ندارد؛ در این prototype محدودیت یادگیری اختراع نشده است.','info')+'<div class="flat-list">'+flatRow('Pre-A1','محتوای موجود در این فایل','C01','book')+'<div class="flat-item"><span class="feature-icon">'+icon('lock')+'</span><div class="grow"><strong>A1 تا C2</strong><small>محتوای این سطح‌ها هنوز منتشر نشده است؛ نه اینکه کاربر شکست خورده باشد.</small></div></div></div>';
   case 'installed':case 'library':return heading(s.title,'بسته‌ها با نسخه، حقوق و اندازهٔ واقعی قابل مدیریت خواهند بود.')+'<div class="lesson-focus"><div class="bottom"><span class="quiet-chip">محتوای موجود برای طراحی</span><h3 style="margin-top:12px">English Starter · Pre-A1</h3><p class="lead">'+fa(flat.length)+' درس · '+fa(words.length)+' واژه · '+fa(AUDIO.length)+' فایل صوتی موجود</p><p class="caption">محتوا legacy draft است؛ Approved توسط مدرس یا SME نیست.</p>'+go('C01','مرور محتوای همین فایل','primary wide')+'</div></div>'+note('نصب بسته در این prototype انجام نمی‌شود','این HTML فایل‌های لازم خود را همراه دارد. ظرفیت دستگاه و package install واقعی اندازه‌گیری نشده‌اند.','info');
   case 'lessonintro':return '<div class="eyebrow-line">'+E(chapterFA[l.moduleIndex])+' · درس واقعیِ منبع</div>'+heading('<span class="en" lang="en">'+E(l.title)+'</span>')+'<p class="lead en" lang="en">'+E(l.description)+'</p>'+image('teaching')+note('هدف این سفر نمونه',state.lesson===1?'سلام مناسب صبح را انتخاب کنیم و بفهمیم چرا Good night برای سلام‌دادن نیست.':'محتوای این درس واقعی است؛ تمرین تعاملیِ اصلی این prototype برای Hello and Goodbye طراحی شده.','info')+sourceTag();
   case 'vocabulary':{
    const vs=l.vocabulary||[];if(!vs.length)return heading(s.title)+empty('واژهٔ جداگانه در این درس ثبت نشده','متن و مثال‌های درس را ببین؛ برای پرکردن صفحه واژهٔ جدید فرضی اضافه نمی‌کنیم.')+go('D04','دیدن متن و مثال','primary wide');
    const v=vs[state.word%vs.length];const translation=v.word==='good afternoon'?'بعدازظهر بخیر':v.translation;
    return '<div class="meta-row"><span>واژهٔ '+fa((state.word%vs.length)+1)+' از '+fa(vs.length)+'</span><span class="quiet-chip">واژه در موقعیت</span></div><div class="vocab-card"><div class="word" lang="en">'+E(v.word)+'</div><p class="ipa" lang="en">'+E(v.phonetic||'')+'</p><p class="translation">'+E(translation)+'</p><p class="example-sentence" lang="en">'+E(v.exampleSentence||'')+'</p></div><div class="button-row">'+btn('واژهٔ قبلی','word-prev','','secondary')+btn('واژهٔ بعدی','word-next','','secondary')+'</div>'+btn((state.bookmarks.includes(v.word)?'نشانک این نمونه برداشته شود':'در این نمونه نشانک بگذار'),'bookmark','','text-button')+note('تلفظ صوتی برای هر واژه تأیید نشده','IPA و مثال موجودند؛ نام فایل hello را برای همهٔ واژه‌ها پخش نمی‌کنیم.','info')+sourceTag(v.word==='good afternoon'?'واژه/IPA/مثال از منبع؛ «بعدازظهر بخیر» اصلاح ترجمهٔ پیشنهادی B است. متن اصلی عصر بخیر بود و تغییر نکرده است.':'واژه، ترجمه، IPA و مثال از منبع موجود؛ نشانک در این HTML موقت است.');
   }
   case 'grammar':{
    let gl=l.grammar?l:flat.find(x=>x.grammar);let g=gl.grammar;
    return heading(g.title,'این یادداشت از منبع موجود است؛ در صورت نبود گرامر مستقل در درس انتخابی، نمونهٔ واقعیِ درس دیگر را نشان می‌دهیم.')+'<div class="vocab-card"><h3 class="en" lang="en">'+E(g.title)+'</h3><p class="en" lang="en">'+E(g.explanation||'')+'</p>'+(g.patterns||[]).map(x=>'<p class="example-sentence" lang="en">'+E(x)+'</p>').join('')+'</div>'+note('توضیح فارسی پیشنهادی','در نمونهٔ I am / You are، برای معرفی خود از I am و برای مخاطب از You are استفاده می‌شود. این متن تازه هنوز بازبینی مدرس نشده است.','info')+sourceTag('منبع: '+E(gl.title)+'؛ الگوها از grammar واقعی خوانده شده‌اند.');
   }
   case 'example':return heading(s.title,state.lesson===1?'عبارت‌ها را همراه موقعیت بخوان.':'متن و مثال‌های واقعی همین درس؛ پیش‌نمایش طراحی.')+l.blocks.filter(b=>['TEXT','EXAMPLE','WARNING'].includes(b.type)).map(b=>b.type==='EXAMPLE'?(b.items||[]).map(x=>'<div class="example-row"><strong lang="en">'+E(x.text)+'</strong>'+(x.note?'<p class="muted" dir="auto">'+E(x.note)+'</p>':'')+'</div>').join(''):b.type==='WARNING'?note('نکتهٔ منبع','<bdi dir="ltr" lang="en">'+E(b.text)+'</bdi>','warning'):'<p class="en" lang="en" style="margin:16px 0">'+E(b.text)+'</p>').join('')+sourceTag('ساعت‌های مثال، مدل سادهٔ این درس‌اند؛ کاربرد واقعی به موقعیت نیز وابسته است. تبدیل سؤال به تمرین جدید در B، DRAFT است.');
   case 'dialogue':return heading(s.title,'یک مثال واقعی از Hello and Goodbye؛ نقش‌های A/B شخصیت‌های متن‌اند، نه کاربران.')+'<div class="speech-bubble"><span class="speaker">A</span><p class="en" lang="en">Good morning, Ali!</p></div><div class="speech-bubble other"><span class="speaker">B</span><p class="en" lang="en">Good morning, Sara!</p></div>'+note('پرسش برای فکرکردن','در این مثال، هر دو نفر چه عبارتی را برای سلام استفاده کردند؟ پاسخ را در خود گفت‌وگو پیدا کن.','info')+sourceTag();
   case 'listening':case 'listeningmode':return heading(s.title,'هشت فایل واقعی موجودند، اما متن و نسبت هر فایل به درس باید بازبینی شود.')+image('listening')+note('فایل موجود با فعالیت تأییدشده فرق دارد','پخش‌کنندهٔ این HTML فقط نمونهٔ موجود را پخش می‌کند. متن مکتوب درس، transcript تأییدشدهٔ فایل نیست و نمرهٔ listening از آن حدس زده نمی‌شود.','warning')+go('G01','فایل‌های موجود را ببین','primary wide');
   case 'summary':return image(state.completed.includes(1)?'celebrating':'encouraging')+heading(state.completed.includes(1)?'سفر نمونه را تمام کردی.':'قبل از پایان، یک تمرین کوتاه','در این نمایش یاد گرفتیم Good morning برای صبح است و Good night در این درس برای خداحافظی شب آمده است.')+(state.completed.includes(1)?note('فقط در حافظهٔ این صفحه','یک درس در مسیر این prototype علامت خورده است؛ این رویداد در اپ یا SQLite ذخیره نشده.','success'):note('هنوز completion ساخته نشده','برای سفر اصلی، پاسخ نمونه را بررسی کن. دیدن این صفحه یا حالت Success در ابزار طراح، درس را کامل نمی‌کند.','info'))+go(state.completed.includes(1)?'F03':'E01',state.completed.includes(1)?'پیشرفت این نمونه':'تمرین نمونه','primary wide');
   case 'mistakes':{
    const mistakes=state.attempts.filter(x=>x.outcome==='incorrect');return heading(s.title,'این فهرست فقط پاسخ‌های همین جلسهٔ prototype است.')+(mistakes.length?mistakes.map(a=>'<div class="history-row"><strong>'+E(a.screen)+' · پاسخ نیازمند مرور</strong><p>'+E(a.explanation)+'</p>'+go('E01','آموزش و تلاش دوباره','text-button')+'</div>').join(''):empty('هنوز پاسخ نادرستی در این نمونه ثبت نشده','می‌توانی در تمرین، گزینهٔ دیگری را انتخاب کنی و طراحی بازخورد را ببینی.','review'));
   }
   case 'history':return heading(s.title,'فقط رویدادهای ایجادشده با تعامل همین صفحه؛ با refresh پاک می‌شوند.')+(state.events.length?state.events.map((e,i)=>'<div class="history-row"><strong>'+fa(i+1)+' · '+E(e.label)+'</strong><small>'+E(e.kind)+' · حافظهٔ موقت prototype</small></div>').join(''):empty('این جلسه هنوز رویدادی ندارد','به درس نمونه برو و یک تعامل واقعی در همین صفحه انجام بده.','clock'));
   case 'achievements':return heading(s.title,'نشان باید معیار و رویداد معتبر داشته باشد.')+image('winning')+empty('رکوردِ واقعی دریافت نشان نداریم','تصویر لئو و نماد جایزه، طراحی‌اند. در این prototype نشان پایدار یا XP واقعی محاسبه نمی‌شود.','award')+sourceTag('در محصول آینده، Achievement از ledger و rule version خوانده می‌شود؛ تعداد ثابت نشان نمایش داده نخواهد شد.');
   case 'streak':return heading(s.title,'پیوستگی یادگیری با داده و سیاست روشن؛ نه فشار و تنبیه.')+'<div class="stat-row"><div class="stat"><strong>—</strong><span>استریک؛ تاریخچهٔ پایدار موجود نیست</span></div><div class="stat"><strong>—</strong><span>رکورد شخصی؛ محاسبه نشده</span></div></div>'+note('هیچ عدد ثابتی جای تاریخچه نمی‌گذاریم','timezone، تاریخ‌های مطالعه، grace policy و ساعت نادرست دستگاه باید در محصول مدیریت شوند.','info');
   case 'player':return heading(s.title,'پخش در همین مرورگر است؛ شاهد عملکرد صوت در Android نیست.')+'<div class="field"><label for="audio-select">فایل موجود</label><select id="audio-select">'+AUDIO.map((a,i)=>'<option value="'+i+'" '+(state.audio===i?'selected':'')+'>'+E(a.label)+' · '+E(a.file)+'</option>').join('')+'</select></div><div class="audio-card"><span class="quiet-chip">فایل اصلیِ پروژه</span><p class="en" lang="en" style="margin-top:12px">'+E(AUDIO[state.audio].file)+'</p><audio id="sample-audio" controls preload="none" src="'+AUDIO[state.audio].uri+'" aria-label="فایل صوتی نمونه">مرورگر پخش صدا را پشتیبانی نمی‌کند.</audio><div class="button-row">'+btn('بازپخش','audio-replay','','secondary')+btn('سرعت ۰٫۷۵ / ۱','audio-speed','','secondary')+'</div><p id="audio-status" class="caption" role="status">پخش خودکار خاموش است.</p></div>'+sourceTag('حقوق/گوینده و هم‌خوانی transcript این فایل‌ها هنوز نیاز به بررسی دارند. هیچ صدای جدیدی در B ساخته نشده است.');
   case 'permission':return image('listening')+heading(s.title,'در محصول، اول دلیل استفاده و رضایت روشن، بعد اجازهٔ سیستم.')+note('اینجا میکروفون فعال نمی‌شود','دکمهٔ زیر فقط طراحی صفحهٔ ضبط را نمایش می‌دهد؛ مرورگر هیچ permission یا صدایی دریافت نمی‌کند.','info')+'<div class="flat-list">'+flatRow('بدون میکروفون هم ادامه بده','گوش‌دادن به نمونه یا تمرین متنی','G01','headphones')+'</div>'+btn('دیدن حالت اجازه‌ندادن','scenario','data-scene="Permission Denied"','secondary wide');
   case 'recording':return heading(s.title,'نمایش کنترل‌ها و رفتار؛ نه ضبط واقعی.')+'<div class="record-display"><div class="record-symbol">'+icon('mic')+'</div><strong>میکروفون خاموش است</strong><div class="record-timer" id="record-timer">'+(state.recordSimulation?'00:00':'—')+'</div><p class="caption">زمانِ اجرای شبیه‌سازی، نه طول صدای ضبط‌شده</p><div class="wave-placeholder" aria-hidden="true">'+Array(18).fill('<span></span>').join('')+'</div><p class="caption">سطح صدا اندازه‌گیری نمی‌شود.</p></div><div class="button-row">'+btn(state.recordSimulation?'پایان شبیه‌سازی':'شروع شبیه‌سازی','record-sim','','primary')+'</div>'+note('قرارداد محصول آینده','recording تنها پس از رویداد واقعی recorder و نهایی‌سازی فایل موفق می‌شود؛ رد اجازه یا فضای کم، موفقیت نیست.','info');
   case 'replay':return heading(s.title,'صدای آموزشی را به‌جای صدای ضبط‌شدهٔ کاربر جا نمی‌زنیم.')+empty('در این prototype هیچ صدایی ضبط نشده','پخش صدای خودت غیرفعال است. می‌توانی فایل آموزشی موجود را از player جدا بشنوی.','mic')+btn('پخش recording شخصی','noop','','secondary wide',true)+go('G01','پخش فایل آموزشیِ موجود','text-button');
   case 'deleterecording':return heading(s.title,'در محصول، نام فایل، مدت واقعی و پروفایل مربوط قبل از تأیید نشان داده می‌شود.')+empty('فایل ضبط‌شده‌ای برای حذف وجود ندارد','فایل‌ها یا داده‌های اپ اصلی خوانده یا پاک نمی‌شوند.','mic')+btn('دیدن طرح تأیید حذف','show-delete-dialog','','secondary wide');
   case 'audioerror':return heading(s.title)+note('نمونهٔ طراحی خطای صوت','فایل ممکن است نصب نشده، خراب یا غیرقابل decode باشد. این artboard خطای واقعی دستگاه را گزارش نمی‌کند.','error')+go('G01','بازگشت به فایل موجود','primary wide')+go('D04','ادامه با مثال مکتوب','text-button');
   case 'settings':return heading(s.title,'ترجیحات و حفاظت داده، با اختیار روشن.')+setting('پروفایل‌ها','فقط همین دستگاه؛ نه حساب سازمانی','H02','user')+setting('زبان','رابط و توضیح درس مستقل','H03','book')+setting('دسترس‌پذیری','اندازه متن و خوانایی','H04','eye')+setting('حرکت','Standard، Reduced، Low','H05','light')+setting('صدا','بدون autoplay','H06','volume')+setting('پشتیبان و بازیابی','نسخه، اعتبار و تأیید','H07','shield')+setting('مدیریت فضا','ظرفیت واقعی، بدون عدد فرضی','H10','storage');
   case 'profiles':return heading(s.title,'نام این صفحه فقط برای همین prototype است.')+'<div class="flat-item"><span class="feature-icon">'+icon('user')+'</span><div class="grow"><strong>'+E(state.alias||'زبان‌آموز آزمایشی')+'</strong><small>موقت؛ بدون حساب اینترنتی یا دادهٔ اپ</small></div></div>'+go('A04','تغییر نام در این نمونه','secondary wide')+note('در محصول','queryها و حذف/backup باید profile-scoped باشند. این HTML دادهٔ چندکاربرهٔ امن یا حساب سازمانی ایجاد نمی‌کند.','info');
   case 'motion':return heading(s.title,'آموزش بدون حرکت هم باید قابل فهم بماند.')+'<div class="choices" role="radiogroup" aria-label="میزان حرکت">'+option('Standard · حرکت کوتاه و رویدادمحور','Standard','motion')+option('Reduced · بدون حرکت غیرضروری','Reduced','motion')+option('Low · حالت ثابت و سبک','Low','motion')+'</div>'+note('ترجیح سیستم محترم است','اگر سیستم reduced motion را فعال کرده باشد، prototype آن را رعایت می‌کند. این بررسی به معنی تست native frame rate نیست.','info');
   case 'audiosettings':return heading(s.title,'کنترل صوت از permission میکروفون جداست.')+'<div class="setting-row"><div class="grow"><strong>بازخورد صوتی اختیاری</strong><small>هیچ صدای effect تازه‌ای در این طراحی ساخته نشده.</small></div><button type="button" class="toggle" role="switch" aria-checked="'+state.sound+'" aria-label="بازخورد صوتی نمونه" data-action="toggle-sound"><span class="toggle-track"></span></button></div>'+go('G01','آزمایش فایل موجود در مرورگر','secondary wide')+note('بدون پخش پنهان','در این prototype autoplay وجود ندارد؛ تغییر کلید، permission یا recording ایجاد نمی‌کند.','info');
   case 'backup':case 'restore':case 'import':return heading(s.title,s.purpose)+'<div class="flat-list"><div class="flat-item"><span class="feature-icon">'+icon('shield')+'</span><div class="grow"><strong>نسخه و اعتبار فایل</strong><small>schema version، checksum و provenance</small></div></div><div class="flat-item"><span class="feature-icon">'+icon('storage')+'</span><div class="grow"><strong>فضای لازم قبل از تغییر</strong><small>staging، rollback و دادهٔ قبلی</small></div></div><div class="flat-item"><span class="feature-icon">'+icon('user')+'</span><div class="grow"><strong>دامنهٔ انتخابی</strong><small>پروفایل، محتوا و رضایت جدا برای recording</small></div></div></div>'+note('فقط قرارداد طراحی','این فایل backup نمی‌سازد، فایل کاربر را باز نمی‌کند و restore/import انجام نمی‌دهد. نمایش Success در inspector صرفاً یک state طراحی است.','warning')+btn('دیدن حالت خطا','scenario','data-scene="Save Failed"','secondary wide');
   case 'storage':return heading(s.title,'محدودیت تعداد درس نداریم؛ ظرفیت واقعی دستگاه محدود است.')+'<div class="stat-row"><div class="stat"><strong>—</strong><span>فضای آزاد؛ در این HTML خوانده نشده</span></div><div class="stat"><strong>—</strong><span>حجم دادهٔ اپ؛ دسترسی نداریم</span></div></div>'+note('پیشرفت قربانی آزادکردن فضا نمی‌شود','در محصول، حذف بستهٔ اختیاری با انتخاب کاربر ممکن است؛ progress و backup بدون تأیید پاک نمی‌شوند.','info')+go('C07','دیدن طرح کتابخانه','secondary wide');
   default:if(s.group==='I')return enterpriseBody(s);return heading(s.title,s.purpose);
  }
 }
 function enterpriseBody(s){
  let body=heading(s.title,s.purpose)+'<div class="future-banner">FUTURE DESIGN · هیچ سازمان، حساب یا دادهٔ فراگیری متصل نیست.</div>';
  if(s.kind==='roles')body+='<div class="choices" role="radiogroup" aria-label="نقش‌های طراحی آینده">'+['Platform administrator','Organization administrator','Training manager','Teacher','Learner'].map(x=>option('<bdi lang="en" dir="ltr">'+E(x)+'</bdi>',x,'answer')).join('')+note('نقش بدون scope مجوز نیست','actor و tenant مقصد باید در سرور اعتبارسنجی شوند. انتخاب این فهرست هیچ permissionی را تغییر نمی‌دهد.','warning');
  else if(s.kind==='assignment')body+='<div class="field"><label>محتوای هدف در طراحی</label><div class="vocab-card"><p class="en">Hello and Goodbye</p><p class="caption">نسخه و class scope باید از سرویس معتبر بیاید.</p></div></div>'+note('انتشار واقعی غیرفعال است','در طرح نهایی، معیار سنجش، deadline و enrollment قبل از انتشار مشخص می‌شوند.','info');
  else if(s.kind==='studentreview')body+=empty('فراگیری برای بازبینی انتخاب نشده','نمره، نام و پاسخ خصوصی اختراع نمی‌شود. نمای فردی باید از سرویس مجاز و در scope کلاس بارگیری شود.','user');
  else body+='<table class="enterprise-table"><thead><tr><th>دامنه</th><th>دادهٔ معتبر</th></tr></thead><tbody><tr><td>کلاس / سازمان</td><td>— متصل نیست</td></tr><tr><td>فراگیر / پیشرفت</td><td>— دریافت نشده</td></tr><tr><td>گزارش / تأیید</td><td>— در دسترس نیست</td></tr></tbody></table>'+note('حفظ مرز یادگیری محلی','نبود سرویس سازمانی نباید درس بسته‌بندی‌شدهٔ فردی را متوقف کند.','info');
  return body;
 }
 function stateOverlay(s){
  if(state.scene==='Available'||state.scene==='Initial')return '';
  const m=stateMeta();if(!m)return '';
  if(!m.applicable)return '<div class="state-banner"><strong>N/A</strong> · '+E(m.rationale)+'</div>';
  if(state.scene==='Loading')return '<div class="state-banner"><strong>DESIGN STATE: Loading</strong><p>نمایش حالت؛ نه بارگیری واقعی دادهٔ اپ</p></div><div class="skeleton tall" aria-hidden="true"></div><div class="skeleton" aria-hidden="true"></div>';
  const type=['Error','Permission Denied','Storage Full','Missing Content','Save Failed'].includes(state.scene)?'error':state.scene==='Success'?'success':'info';
  return '<div class="state-banner"><strong>DESIGN STATE: '+E(state.scene)+'</strong><p>این سناریو شبیه‌سازی طراحی است و رویداد واقعی دستگاه/دیتابیس را گزارش نمی‌کند.</p></div>'+note(E(state.scene),E(m.ui_copy),type)+(state.scene==='Empty'?empty('داده‌ای برای این حالت نداریم',m.behavior):'')+(type==='error'?btn('بازگشت به حالت آمادهٔ طرح','scenario','data-scene="Available"','secondary wide'):'');
 }
 function writeBlocked(s){const m=stateMeta();return !!(m&&m.applicable&&['Loading','Disabled','Permission Denied','Storage Full','Missing Content','Save Failed'].includes(state.scene)&&s.flags.includes('write'));}
 function primaryAction(s){
  if(s.group==='E')return '';
  if(s.id==='G04')return '';
  if(s.id==='G05')return go('G06','دیدن مدیریت ضبط','secondary wide');
  if(s.id==='D07')return '';
  return btn(E(s.primary)+(s.group==='I'?' · طرح آینده':''),'primary','','primary wide',writeBlocked(s));
 }
 function renderPhone(){
  const s=byId[state.screen];const previousMain=document.getElementById('app-main');const previousScroll=previousMain?previousMain.scrollTop:0;const previousId=document.getElementById('phone').dataset.screen;const f=document.getElementById('app-frame');
  f.className='app-frame '+state.device+(Number(state.textScale)>=1.5?' large-text':'');f.style.setProperty('--text-scale',String(state.textScale));f.setAttribute('dir',state.uiLocale==='en'?'ltr':'rtl');
  const title=state.uiLocale==='en'?s.title_en:s.title;
  document.getElementById('phone').innerHTML='<div class="frame-label"><span class="en">'+s.id+' · DESIGN PROTOTYPE</span><span>موقت، نه اپ</span></div><header class="app-header">'+btn(icon('arrow'),'back','','icon-button')+'<div class="title-wrap"><div class="eyebrow">'+E(s.group_title)+'</div><h1>'+E(title)+'</h1></div><span class="brand-small">leo</span></header><main class="app-main" id="app-main" lang="fa" dir="rtl">'+(s.group==='I'?'<div class="quiet-chip warm">آیندهٔ سازمانی · خارج از مسیر مبتدی</div>':'')+stateOverlay(s)+renderBody(s)+'</main>'+(primaryAction(s)?'<footer class="app-footer">'+primaryAction(s)+(s.group==='A'?go('B01','فعلاً بدون تنظیم ادامه بده','text-button'):'')+'</footer>':'')+(s.group==='A'?'':'<nav class="bottomnav" aria-label="ناوبری اصلی طرح">'+[['B01','خانه','home'],['C01','مسیر','path'],['F01','مرور','review'],['H01','تنظیمات','settings']].map(([id,t,ic])=>'<button type="button" data-action="go" data-target="'+id+'" class="'+(state.screen===id?'active':'')+'">'+icon(ic)+'<span>'+t+'</span></button>').join('')+'</nav>');
  const main=document.getElementById('app-main');if(main)main.scrollTop=previousId===s.id?previousScroll:0;document.getElementById('phone').dataset.screen=s.id;
  const sample=document.getElementById('sample-audio');
  if(sample){sample.addEventListener('playing',()=>{document.getElementById('audio-status').textContent='فایل نمونه در همین مرورگر در حال پخش است؛ نه صدای ضبط‌شدهٔ کاربر.';});sample.addEventListener('error',()=>{document.getElementById('audio-status').textContent='مرورگر نتوانست این فایل را پخش کند. هیچ موفقیت پخشی ثبت نشده.';});}
  if(state.screen==='G04'&&state.recordSimulation)startSimulationClock();
 }
 function chooseState(scene){if(!DATA.stateNames.includes(scene))return;state.scene=scene;state.feedback=null;render();}
 function renderInspector(){
  document.getElementById('screen-select').innerHTML=Object.entries(DATA.groups).map(([g,t])=>'<optgroup label="'+E(g+' · '+t)+'">'+screens.filter(s=>s.group===g).map(s=>'<option value="'+s.id+'" '+(s.id===state.screen?'selected':'')+'>'+E(s.id+' · '+s.title)+'</option>').join('')+'</optgroup>').join('');
  document.getElementById('state-select').innerHTML=DATA.stateNames.map(n=>'<option '+(n===state.scene?'selected':'')+'>'+n+'</option>').join('');
  const m=stateMeta();document.getElementById('state-applicability').textContent=m?(m.applicable?'این state برای این صفحه تعریف شده است؛ فقط نمایش طراحی.':m.rationale):'';
  const s=byId[state.screen];document.getElementById('screen-contract').innerHTML='<summary>قرارداد همین صفحه · '+s.id+'</summary><dl><dt>هدف</dt><dd>'+E(s.purpose)+'</dd><dt>ذخیره در محصول</dt><dd>'+E(s.persistence_contract)+'</dd><dt>قطع فرایند</dt><dd>'+E(s.interruption_contract)+'</dd><dt>شواهد</dt><dd>طراحی مستقل؛ نه اجرای source اپ یا اتصال به database</dd></dl>';
  document.querySelectorAll('[data-device]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.device===state.device)));
  document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===state.view)));
  const fail=document.getElementById('fail-next');if(fail){fail.setAttribute('aria-pressed',String(state.failNext));fail.textContent=state.failNext?'خطای ثبت بعدی: روشن':'خطای ثبت بعدی: خاموش';}
 }
 function renderGallery(){
  let html='';
  if(state.view==='character')html=heading('یک خانوادهٔ تصویری برای لئو','دارایی‌های canonical برداری این فاز؛ poseهای طراحی، نه rig یا animation engine تولیدی.')+'<div class="gallery-grid">'+DATA.poseLabels.map(([key,faLabel])=>'<article class="gallery-tile">'+image(key,'','لئو در حالت '+faLabel)+'<h3>'+faLabel+'</h3><small class="en">'+key+'</small></article>').join('')+'</div><h2 style="margin-top:32px">چهار نمای مرجع</h2><div class="gallery-grid">'+[['neutral','جلو'],['three-quarter','سه‌رخ'],['profile','نیم‌رخ'],['back','پشت']].map(([key,label])=>'<article class="gallery-tile">'+image(key,'','نمای '+label)+'<h3>'+label+'</h3></article>').join('')+'</div>'+note('تأیید هنری نهایی باز است','هندسه و palette مشترک‌اند؛ بررسی turn-around، تناسب با بزرگسال و پذیرش مالک هنوز جای داوری انسانی دارد. تصویر exploratory وارد UI فعال نشده است.','info');
  else if(state.view==='directions')html=heading('دو مسیر بصری؛ یک انتخاب ثبت‌شده','این مقایسه، ارزیابی طراحی است؛ پژوهش انجام‌شده با کاربران واقعی ادعا نمی‌شود.')+'<div class="direction-grid">'+['routeA','routeB'].map(k=>{const t=DATA.tokens[k];return '<article class="direction" style="background:'+t.paper+';color:'+t.ink+'"><span class="quiet-chip">'+(k==='routeA'?'انتخاب طراحی برای prototype':'مسیر بررسی‌شده، انتخاب‌نشده')+'</span><h2 style="margin-top:14px">'+E(t.name)+'</h2><div class="swatches">'+['paper','ink','primary','accent','error'].map(c=>'<span class="swatch" style="background:'+t[c]+'" title="'+c+' '+t[c]+'"></span>').join('')+'</div><div class="preview-box" style="background:'+t.surface+'"><h3>از یک سلام ساده شروع کن.</h3><p style="color:'+t.muted+';margin:10px 0 16px">توضیح فارسی، مثال انگلیسی و یک اقدام روشن.</p><button type="button" class="primary" data-action="route" data-route="'+k+'" style="background:'+t.primary+';color:'+t.primaryInk+';border-color:'+t.primary+'">دیدن این مسیر</button></div><p style="color:'+t.muted+';margin-top:18px">'+(k==='routeA'?'گرم‌تر، کم‌تنش‌تر و هماهنگ با uniform اصیل لئو؛ انتخاب بر اساس قضاوت مستدل طراحی، نه نتیجهٔ آزمون کاربر.':'فضای فنی‌تر و سردتر؛ contrast مناسب دارد اما برای شروع آرام مبتدی، جهت اول ترجیح داده شد.')+'</p></article>';}).join('')+'</div>'+note('اندازه‌گیری','هر دو مسیر برای جفت‌رنگ‌های مستند آزمون ریاضی شده‌اند. کمینهٔ متن مسیر A برابر ۴٫۹۶۱:۱ و مرز ضروری ۳٫۵۶۶:۱ است؛ این تست جای مشاهدهٔ مرورگر و screen reader را نمی‌گیرد.','info');
  else if(state.view==='components')html=heading('مرجع اجزا و حالت‌ها','tokenها در همهٔ طرح‌ها مشترک‌اند؛ نه مجموعهٔ کامپوننت Native پیاده‌شده.')+'<div class="component-grid"><section class="component-group"><h3>اقدام‌ها و focus</h3><div class="button-row">'+go('B01','اقدام اصلی','primary')+go('H01','اقدام ثانویه','secondary')+'</div>'+btn('غیرفعال با دلیل','noop','','secondary',true)+'<p class="small-note">علت غیرفعال‌بودن با متن خوانا کنار کنترل بیان می‌شود. حداقل هدف طراحی ۴۸ واحد منطقی است.</p></section><section class="component-group"><h3>ورودی و انتخاب</h3><div class="field"><label for="component-name">برچسب پایدار</label><input id="component-name" placeholder="نام دلخواه، نه نام واقعی"></div>'+option('انتخاب قابل تغییر','general','goal')+'</section><section class="component-group"><h3>بازخورد غیررنگی</h3>'+note('پاسخ روشن است','متن و icon همراه رنگ، نه رنگِ تنها.','success')+note('ثبت انجام نشد','داده و انتخاب قبلی حفظ می‌شود.','error')+'</section><section class="component-group"><h3>خالی و بارگیری</h3>'+empty('هنوز سابقه‌ای نیست','یک راه شروع مشخص به کاربر بده.','book')+'<div class="skeleton" aria-hidden="true"></div><p class="small-note">Skeleton ثابت در reduced motion؛ درصد حدسی ممنوع.</p></section></div>';
  else if(state.view==='motion')html=heading('Storyboard حرکت، نه موتور Native','هر نمونه دستی و محدود اجرا می‌شود؛ هیچ انیمیشنی score یا ذخیرهٔ واقعی تولید نمی‌کند.')+'<div class="motion-grid">'+MOTIONS.map(m=>'<article class="motion-card"><h3>'+E(m.title)+'</h3><p>'+E(m.trigger)+'</p><div class="frames"><div class="frame animation-stage" id="motion-'+m.id+'">'+image(m.pose,'','حالت اولیهٔ طرح')+'<small>'+E(m.initial)+'</small></div><div class="frame">'+image(m.endPose,'','حالت پایانیٔ طرح')+'<small>'+E(m.final)+'</small></div></div><p><strong>'+m.duration+' ms</strong> · '+E(m.easing)+'</p><p>Reduced: '+E(m.reduced)+'<br>Low: '+E(m.low)+'</p>'+btn('اجرای نمونهٔ طراحی','motion-demo','data-motion-id="'+m.id+'"','tool-button')+'</article>').join('')+'</div>';
  document.getElementById('gallery').innerHTML=html;
 }
 function render(){
  applyRoute();renderInspector();const main=state.view==='prototype';
  document.getElementById('prototype-layout').hidden=!main;document.getElementById('gallery').hidden=main;
  if(main)renderPhone();else renderGallery();
  document.getElementById('route-note').hidden=state.route==='routeA';
 }
 function grade(screenId,answer,pairs=state.pairs,tokens=state.tokens){
  if(screenId==='E01')return normalize(answer)===normalize(sourceQuestion().answer)?{kind:'correct',text:'Good morning سلامِ متناسب با صبح در این نمونه است.'}:{kind:'incorrect',text:normalize(answer)==='good night'?'Good night در این درس برای خداحافظی شب است، نه سلامِ صبح.':'Good afternoon به بعدازظهر مربوط است؛ موقعیت سؤال، صبح است.'};
  if(screenId==='E02'){const ok=pairs.hello==='سلام'&&pairs['good morning']==='صبح بخیر'&&pairs.goodbye==='خداحافظ';return {kind:ok?'correct':'incorrect',text:ok?'هر سه واژه با معنی ثبت‌شدهٔ منبع هماهنگ‌اند.':'hello یعنی سلام؛ good morning یعنی صبح بخیر؛ goodbye یعنی خداحافظ.'};}
  if(screenId==='E03'||screenId==='E06'){const count=screenId==='E03'?3:4;const ok=tokens.length===count&&tokens.every((n,i)=>n===i);return {kind:ok?'correct':'incorrect',text:screenId==='E03'?'ترتیبِ جملهٔ نمونه: I am Ali.':'ترتیبِ جملهٔ نمونه: I am a firefighter.'};}
  if(screenId==='E04')return {kind:normalize(answer)==='is'?'correct':'incorrect',text:'با She در این جمله از is استفاده می‌کنیم: She is a teacher.'};
  if(screenId==='E07'){const n=normalize(answer).replace(/ي/g,'ی').replace(/ك/g,'ک');return ['سلام','درود'].includes(n)?{kind:'correct',text:'این دو پاسخ در قرارداد طراحیِ همین نمونه پذیرفته شده‌اند؛ ترجمه‌های دیگر هم ممکن است نیازمند بررسی باشند.'}:{kind:'ambiguous',text:'پاسخ منبع «سلام» است. برای رد قطعیِ ترجمهٔ متفاوت، rubric یا بازبینی انسانی لازم است؛ نمرهٔ غلط ساختگی نمی‌دهیم.'};}
  return {kind:'ambiguous',text:'این نوع بدون دادهٔ معتبر نمره‌دهی نمی‌شود.'};
 }
 function commitDemo(result,screenId){
  state.attempts.push({screen:screenId,outcome:result.kind,explanation:result.text});
  state.events.push({kind:'DEMO_ATTEMPT',label:'بررسی پاسخ '+screenId+' · '+({correct:'درست',incorrect:'نیازمند مرور',ambiguous:'نیازمند بررسی'}[result.kind]||'')});
  if(screenId==='E01'&&result.kind==='correct')state.goldenReady=true;
  state.feedback=result;state.pending=null;
 }
 function submit(){
  const id=state.screen;if(['E05','E08'].includes(id))return;
  const input=document.getElementById('exercise-input');if(input)state.input=input.value;
  const answer=['E04','E07'].includes(id)?state.input:state.answer;
  if((id==='E01'&&!answer)||(['E04','E07'].includes(id)&&!String(answer||'').trim())||(id==='E02'&&Object.keys(state.pairs).length!==3)||(['E03','E06'].includes(id)&&state.tokens.length!==(id==='E03'?3:4))){state.feedback={kind:'ambiguous',text:'ابتدا پاسخ یا انتخاب را کامل کن؛ پاسخ خالی نمره نمی‌گیرد.'};renderPhone();return;}
  const signature=JSON.stringify({id,answer,pairs:state.pairs,tokens:state.tokens});
  if(lastSubmission&&lastSubmission.signature===signature&&!state.pending){state.feedback=lastSubmission.result;renderPhone();return;}
  const result=grade(id,answer);
  lastSubmission={signature,result};
  if(state.failNext){state.failNext=false;state.pending={result,screen:id};state.feedback={kind:'savefailed',text:''};}
  else commitDemo(result,id);
  renderInspector();renderPhone();
 }
 function finishSample(){
  if(state.goldenReady&&!state.completed.includes(1)){state.completed.push(1);state.events.push({kind:'DEMO_LESSON_COMPLETED',label:'پایان سفر نمونهٔ Hello and Goodbye'});}
  goto(state.goldenReady?'D07':'E01');
 }
 function startSimulationClock(){
  const tick=()=>{if(state.screen!=='G04'||!state.recordSimulation)return;const el=document.getElementById('record-timer');if(el){const seconds=Math.floor((Date.now()-state.recordStarted)/1000);el.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}timers.push(setTimeout(tick,1000));};tick();
 }
 function showDialog(){
  const previous=document.activeElement;const root=document.getElementById('dialog-root');
  root.innerHTML='<div class="dialog-backdrop"><section class="dialog-box" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">طرح تأیید حذف ضبط</h2><p>در محصول، نام و مدت فایل واقعی و دامنهٔ حذف اینجا نمایش داده می‌شود. در این prototype فایل ضبط‌شده‌ای وجود ندارد و چیزی حذف نمی‌شود.</p><div class="dialog-actions">'+btn('انصراف','close-dialog','','secondary')+btn('بستن نمایشِ تأیید','close-dialog','','primary')+'</div></section></div>';
  const buttons=root.querySelectorAll('button');if(buttons.length)buttons[0].focus();
  root.onkeydown=e=>{if(e.key==='Escape'){root.innerHTML='';if(previous?.focus)previous.focus();}if(e.key==='Tab'&&buttons.length){const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 }
 function runMotion(id){
  const m=MOTIONS.find(x=>x.id===id),el=document.getElementById('motion-'+id);if(!m||!el)return;
  if(reduced())return;
  const im=el.querySelector('img');
  if(id==='blink'&&ART['blink-closed']&&im){const original=im.src;timers.push(setTimeout(()=>{im.src=ART['blink-closed'];},55));timers.push(setTimeout(()=>{im.src=original;},160));return;}
  el.classList.add(m.cssClass||'reveal');timers.push(setTimeout(()=>el.classList.remove(m.cssClass||'reveal'),Math.max(300,m.duration)+50));
 }
 function primary(){
  const s=byId[state.screen];
  if(s.kind==='profile'){const input=document.getElementById('alias-input');state.alias=input?input.value.trim():state.alias;}
  if(s.kind==='time'||s.kind==='daily'||s.kind==='goals'){const input=document.getElementById('custom-minutes');if(input&&Number(input.value)>0)state.minutes=Number(input.value);}
  if(s.id==='D04'){state.lesson=1;goto('E01');return;}
  if(s.id==='D01')state.word=0;
  if(s.id==='H07'){state.scene='Selected';render();return;}
  goto(s.next);
 }
 document.addEventListener('click',event=>{
  const el=event.target.closest('button[data-action]');if(!el||el.disabled)return;
  const a=el.dataset.action;
  if(a==='go')goto(el.dataset.target);
  else if(a==='primary')primary();
  else if(a==='back'){const prior=state.history.pop();goto(prior||'B01',false);}
  else if(a==='start'){state.lesson=1;goto('A02');}
  else if(a==='chapter'){state.chapter=Number(el.dataset.index);goto('C02');}
  else if(a==='lesson'){state.lesson=Number(el.dataset.index);state.word=0;goto('D01');}
  else if(a==='option'){const f=el.dataset.field;if(['goal','minutes','uiLocale','textScale','motion','answer'].includes(f)){state[f]=el.dataset.value;state.feedback=null;render();}}
  else if(a==='word-next'||a==='word-prev'){const n=(currentLesson().vocabulary||[]).length;if(n)state.word=(state.word+(a==='word-next'?1:n-1))%n;renderPhone();}
  else if(a==='bookmark'){const v=(currentLesson().vocabulary||[])[state.word];if(v){const i=state.bookmarks.indexOf(v.word);if(i<0)state.bookmarks.push(v.word);else state.bookmarks.splice(i,1);}renderPhone();}
  else if(a==='match-left'){state.matchLeft=el.dataset.value;renderPhone();}
  else if(a==='match-right'){if(state.matchLeft){for(const k of Object.keys(state.pairs))if(state.pairs[k]===el.dataset.value)delete state.pairs[k];state.pairs[state.matchLeft]=el.dataset.value;state.matchLeft=null;}renderPhone();}
  else if(a==='add-token'){const n=Number(el.dataset.index);if(!state.tokens.includes(n))state.tokens.push(n);renderPhone();}
  else if(a==='remove-token'){state.tokens.splice(Number(el.dataset.position),1);renderPhone();}
  else if(a==='submit-answer')submit();
  else if(a==='retry-exercise'){lastSubmission=null;state.feedback=null;state.answer=null;state.input='';state.tokens=[];state.pairs={};renderPhone();}
  else if(a==='retry-save'){if(state.pending)commitDemo(state.pending.result,state.pending.screen);renderPhone();}
  else if(a==='finish-sample')finishSample();
  else if(a==='fail-next'){state.failNext=!state.failNext;renderInspector();}
  else if(a==='scenario')chooseState(el.dataset.scene);
  else if(a==='device'){state.device=el.dataset.device;render();}
  else if(a==='view'){pauseAudio();clearTimers();state.view=el.dataset.view;render();}
  else if(a==='route'){state.route=el.dataset.route;state.view='prototype';render();}
  else if(a==='toggle-sound'){state.sound=!state.sound;renderPhone();}
  else if(a==='audio-replay'){const audio=document.getElementById('sample-audio');if(audio){audio.currentTime=0;audio.play().catch(()=>{document.getElementById('audio-status').textContent='پخش شروع نشد؛ در مرورگر خود دوباره تلاش کن.';});}}
  else if(a==='audio-speed'){const audio=document.getElementById('sample-audio');if(audio){audio.playbackRate=audio.playbackRate===1?.75:1;document.getElementById('audio-status').textContent='سرعت پخش این مرورگر: '+audio.playbackRate+'×';}}
  else if(a==='record-sim'){if(state.recordSimulation){state.recordSimulation=false;clearTimers();goto('G05');}else{state.recordSimulation=true;state.recordStarted=Date.now();renderPhone();}}
  else if(a==='show-delete-dialog')showDialog();
  else if(a==='close-dialog'){document.getElementById('dialog-root').innerHTML='';const target=document.querySelector('[data-action="show-delete-dialog"]');if(target)target.focus();}
  else if(a==='motion-demo')runMotion(el.dataset.motionId);
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseAudio();clearTimers();state.recordSimulation=false;}});
 document.addEventListener('change',e=>{
  if(e.target.id==='screen-select')goto(e.target.value);
  if(e.target.id==='state-select')chooseState(e.target.value);
  if(e.target.id==='audio-select'){pauseAudio();state.audio=Number(e.target.value);renderPhone();}
 });
 document.addEventListener('input',e=>{if(e.target.id==='exercise-input')state.input=e.target.value;if(e.target.id==='alias-input')state.alias=e.target.value;});
 document.addEventListener('keydown',e=>{
  const radio=e.target.closest('button[role="radio"]');
  if(radio&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   const group=radio.closest('[role="radiogroup"]');if(!group)return;
   const all=Array.from(group.querySelectorAll('button[role="radio"]'));let i=all.indexOf(radio);const move=['ArrowLeft','ArrowDown'].includes(e.key)?1:-1;i=(i+move+all.length)%all.length;
   e.preventDefault();all[i].click();const changed=document.querySelector('button[role="radio"][data-field="'+radio.dataset.field+'"][data-value="'+all[i].dataset.value+'"]');if(changed)changed.focus();
  }
 });
 // Test hooks only expose design simulation, never the application's database or credentials.
 globalThis.LeoDesignPrototype={state,screens,stats,grade,goto,renderBody,stateMeta,chooseState,submit,finishSample,commitDemo,reduced,render};
 render();
})();
