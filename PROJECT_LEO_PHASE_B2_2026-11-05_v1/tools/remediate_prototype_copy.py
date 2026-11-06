"""Narrow repairs to the retained design-prototype source in B2 Working Copy.
Does NOT create/replace the missing original HTML and does NOT edit either app.
"""
from pathlib import Path
import json,hashlib,re,subprocess
R=Path('/home/user/PROJECT_LEO_PHASE_B2_2026-11-05_v1')
base=R/'baseline/source-files';work=R/'working-copy'
p=work/'prototype/prototype-v8.js';original=(base/'prototype/prototype-v8.js').read_text();assert p.read_text()==original
s=original;journal=[]
def replace(old,new,issue,count=1):
 global s
 actual=s.count(old);assert actual==count,('Unexpected source match count',issue,actual,old[:90])
 s=s.replace(old,new)
 journal.append({'issue':issue,'old_fragment':old,'new_fragment':new,'matches':actual})

content=json.loads((work/'reference/legacy-curriculum.json').read_text())
fa_by_id={
 'EN-STARTER-PREA1-0-2':'برای معرفی خود از I am و برای مخاطب از You are استفاده می‌کنیم. مثال‌های همین درس را با نام‌هایشان بخوان.',
 'EN-STARTER-PREA1-3-0':'I یعنی من و you یعنی تو یا شما. he، she، it، we و they ضمیرهای دیگری هستند؛ آن‌ها را با مثال‌های همین درس مقایسه کن.',
 'EN-STARTER-PREA1-3-1':'در جمله‌های مثبت این درس، با I از am، با he یا she یا it از is و با you یا we یا they از are استفاده می‌کنیم.',
 'EN-STARTER-PREA1-3-2':'برای اشاره به چیزی نزدیک از this و برای چیزی دورتر از that استفاده می‌کنیم. موقعیت هر مثال را ببین؛ توضیح درس معرفی نام جای این قاعده را نمی‌گیرد.',
 'EN-STARTER-PREA1-3-3':'الگوهای پرسشی همین درس را دنبال کن: What is ...?، Where are ...? و Who is ...? جای فعل be و بقیهٔ جمله را در هر مثال مقایسه کن؛ همهٔ پرسش‌های انگلیسی این الگو را ندارند.',
 'EN-STARTER-PREA1-5-3':'در این مثال‌ها دربارهٔ کارهای روزانه می‌گوییم: I، سپس فعل و زمان. عبارت زمان می‌تواند جای دیگری هم بیاید؛ در نمونه‌های این درس در پایان آمده است.'
}
bindings={}
for c in content:
 for mi,m in enumerate(c['modules']):
  for li,l in enumerate(m['lessons']):
   if l.get('grammar'):
    key=c['code']+'-'+str(mi)+'-'+str(li)
    bindings[key]={'lessonTitle':l['title'],'grammarTitle':l['grammar']['title'],'expectedPatterns':l['grammar']['patterns'],'fa':fa_by_id[key],'reviewStatus':'DRAFT_REQUIRES_HUMAN_REVIEW','approvalDate':None}
assert len(bindings)==6
with (work/'reference/GRAMMAR_FA_BINDINGS_DRAFT_B2.json').open('x',encoding='utf-8') as f:json.dump({'version':'B2-draft-v1','bindings':bindings,'approved':False,'published':False},f,ensure_ascii=False,indent=2)
pure=r'''
 // B2_PURE_REMEDIATION_START — unit-testable logic; not browser/device proof.
 const B2_GRAMMAR_BINDINGS = __BINDINGS__;
 const B2_GOAL_MIN = 1;
 const B2_GOAL_MAX = 1440;
 function validateGoalMinutes(raw,badInput=false){
   if(badInput)return {ok:false,code:'NOT_NUMERIC',message:'یک عدد صحیح از ۱ تا ۱۴۴۰ وارد کن.'};
   if(raw===null||raw===undefined||String(raw).trim()==='')return {ok:false,code:'REQUIRED',message:'زمان هدف را وارد کن؛ مقدار قبلی به‌جای ورودی خالی ثبت نمی‌شود.'};
   if(!['string','number'].includes(typeof raw))return {ok:false,code:'NOT_NUMERIC',message:'زمان هدف باید عدد باشد.'};
   const text=String(raw).trim();
   if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return {ok:false,code:'NOT_NUMERIC',message:'فقط عدد دقیقه را بنویس؛ متن، علامت گروه‌بندی یا توان عدد پذیرفته نمی‌شود.'};
   const value=Number(text);
   if(!Number.isFinite(value)||!Number.isSafeInteger(value))return {ok:false,code:'WHOLE_MINUTES',message:'هدف را با دقیقهٔ صحیح وارد کن، نه مقدار اعشاری یا نامعتبر.'};
   if(value<B2_GOAL_MIN||value>B2_GOAL_MAX)return {ok:false,code:'OUT_OF_RANGE',message:'هدف روزانه باید از ۱ تا ۱۴۴۰ دقیقه باشد.'};
   return {ok:true,value};
 }
 function goalReturnTarget(history){
   const previous=Array.isArray(history)&&history.length?history[history.length-1]:null;
   return previous==='F05'?'F05':'B01';
 }
 function planGoalUpdate(raw,context){
   const checked=validateGoalMinutes(raw,context.badInput);
   if(!checked.ok)return {ok:false,code:checked.code,message:checked.message,previousValue:context.previousMinutes,destination:null};
   return {ok:true,value:checked.value,destination:context.screenId==='B02'?goalReturnTarget(context.history):context.declaredNext};
 }
 function grammarViewFor(lesson){
   const g=lesson&&lesson.grammar;
   if(!g||typeof g.title!=='string'||!Array.isArray(g.patterns))return {kind:'missing',fa:null,patterns:[],examples:[],reviewStatus:'UNAVAILABLE'};
   const patterns=g.patterns.filter(x=>typeof x==='string');
   const examples=Array.isArray(g.examples)?g.examples.filter(x=>typeof x==='string'):[];
   const binding=B2_GRAMMAR_BINDINGS[lesson.legacyId];
   const bound=!!binding&&binding.lessonTitle===lesson.title&&binding.grammarTitle===g.title&&JSON.stringify(binding.expectedPatterns)===JSON.stringify(patterns);
   return {kind:bound?'bound':'unbound',lessonTitle:lesson.title,title:g.title,en:typeof g.explanation==='string'?g.explanation:'',fa:bound?binding.fa:null,patterns,examples,reviewStatus:bound?binding.reviewStatus:'BINDING_UNAVAILABLE'};
 }
 function sameFocusIdentity(attributes,descriptor){
   if(!descriptor)return false;
   if(descriptor.kind==='id')return attributes.id===descriptor.id;
   if(descriptor.kind!=='data')return false;
   return Object.entries(descriptor.attributes||{}).every(([key,value])=>attributes[key]===value);
 }
 // B2_PURE_REMEDIATION_END

 function renderGrammarPage(lesson){
   const view=grammarViewFor(lesson);
   if(view.kind==='missing')return heading('گرامر همین درس')+empty('برای این درس گرامر جداگانه ثبت نشده','توضیح درس دیگری را جای آن نشان نمی‌دهیم. می‌توانی مثال‌های همین درس را ببینی.')+go('D04','دیدن مثال‌های همین درس','secondary wide');
   const patterns=view.patterns.map(text=>{
     const parts=text.split(' — ');
     return '<p class="example-sentence">'+(parts.length===2?'<bdi dir="ltr" lang="en">'+E(parts[0])+'</bdi> — <bdi dir="rtl" lang="fa">'+E(parts[1])+'</bdi>':'<bdi dir="ltr" lang="en">'+E(text)+'</bdi>')+'</p>';
   }).join('');
   const examples=view.examples.map(text=>'<p class="example-sentence en" lang="en" dir="ltr">'+E(text)+'</p>').join('');
   const localized=view.fa?note('توضیح فارسی همین ساختار',E(view.fa),'info'):note('توضیح فارسی معتبر پیدا نشد','عنوان و مثال‌های منبع را نشان می‌دهیم، اما توضیح فارسی نامرتبط یا حدسی نمی‌سازیم.','warning');
   return heading('<bdi dir="ltr" lang="en">'+E(view.title)+'</bdi>','منبع این بخش همان درس انتخاب‌شده است.')+'<div class="vocab-card">'+(view.en?'<p class="en" lang="en" dir="ltr">'+E(view.en)+'</p>':'')+patterns+'</div>'+localized+'<section class="grammar-examples"><h3>مثال‌های همین ساختار</h3>'+examples+'</section>'+sourceTag('منبع: '+E(view.lessonTitle)+'؛ توضیح فارسیِ کپی اصلاحی هنوز پیش‌نویس است و تأیید مدرس ندارد.');
 }
 function goalField(label){
   const value=state.goalDraft===null?String(state.minutes):state.goalDraft;
   const error=state.goalError||'';
   return '<div class="field"><label for="custom-minutes">'+E(label)+'</label><input id="custom-minutes" type="number" min="1" max="1440" step="1" inputmode="numeric" value="'+E(value)+'" aria-invalid="'+Boolean(error)+'" aria-describedby="goal-help goal-error"><p id="goal-help">عدد صحیح ۱ تا ۱۴۴۰ دقیقه؛ این هدف انتخابی است، نه زمان مطالعهٔ ثبت‌شده.</p><p id="goal-error" class="goal-error" role="alert" '+(error?'':'hidden')+'>'+E(error)+'</p></div>';
 }
 const B2_FOCUS_ATTRIBUTES=['data-action','data-field','data-value','data-index','data-position','data-target','data-device','data-view','data-motion-id'];
 let dialogReturnFocus=null;
 function captureFocusIdentity(element=document.activeElement){
   if(!element||typeof element.getAttribute!=='function')return null;
   if(element.id)return {kind:'id',id:element.id};
   const attributes={};
   for(const key of B2_FOCUS_ATTRIBUTES){const value=element.getAttribute(key);if(value!==null)attributes[key]=value;}
   return attributes['data-action']?{kind:'data',attributes}:null;
 }
 function usableFocusTarget(element){
   return !!element&&element.isConnected!==false&&!element.disabled&&element.getAttribute?.('aria-disabled')!=='true'&&!element.closest?.('[hidden]');
 }
 function findFocusTarget(descriptor){
   if(!descriptor)return null;
   if(descriptor.kind==='id'){
     const element=document.getElementById(descriptor.id);return usableFocusTarget(element)?element:null;
   }
   for(const element of document.querySelectorAll('button[data-action], input[id], select[id], textarea[id], summary[id]')){
     if(!usableFocusTarget(element))continue;
     const attrs={id:element.id};for(const key of B2_FOCUS_ATTRIBUTES)attrs[key]=element.getAttribute(key);
     if(sameFocusIdentity(attrs,descriptor))return element;
   }
   return null;
 }
 function restoreFocusIdentity(descriptor){
   let target=findFocusTarget(descriptor);
   if(!target){const id=state.view==='prototype'?'screen-heading':'gallery-heading';target=findFocusTarget({kind:'id',id})||findFocusTarget({kind:'id',id:'app-screen-title'});}
   if(target&&typeof target.focus==='function'){
     try{target.focus({preventScroll:!(descriptor&&descriptor.reveal)});}catch{target.focus();}
   }
 }
 function exerciseEntryFocus(){
   if(['E04','E07'].includes(state.screen))return {kind:'id',id:'exercise-input',reveal:true};
   if(state.screen==='E01')return {kind:'data',attributes:{'data-action':'option','data-field':'answer','data-value':'Good morning.'},reveal:true};
   if(state.screen==='E02')return {kind:'data',attributes:{'data-action':'match-left','data-value':'hello'},reveal:true};
   return {kind:'id',id:'screen-heading',reveal:true};
 }
 function closeDesignDialog(){
   document.getElementById('dialog-root').innerHTML='';const target=dialogReturnFocus;dialogReturnFocus=null;restoreFocusIdentity(target);
 }
'''.replace('__BINDINGS__',json.dumps(bindings,ensure_ascii=False,separators=(',',':')))
replace(" let timers=[];let lastSubmission=null;",pure+"\n let timers=[];let lastSubmission=null;",'B1-I03/B1-I07/B1-I18')
replace("minutes:10,uiLocale:","minutes:10,goalDraft:null,goalError:null,goalBadInput:false,uiLocale:",'B1-I07')
replace("const selected=String(state[field])===String(value);","const selected=String(field==='minutes'?(state.goalDraft===null?state.minutes:state.goalDraft):state[field])===String(value);",'B1-I07')
# Scoped heading IDs prevent hidden phone/gallery headings sharing an id.
replace("const heading=(title,lead='')=>'<h2 tabindex=\"-1\" id=\"screen-heading\">'+title+'</h2>'", "const heading=(title,lead='')=>'<h2 tabindex=\"-1\" id=\"'+(state.view==='prototype'?'screen-heading':'gallery-heading')+'\">'+title+'</h2>'",'B1-I18')
replace("=>'<div class=\"source-tag\">'+text+'</div>';","=>'<details class=\"source-tag\"><summary>یادداشت طراحی و منبع</summary><div>'+text+'</div></details>';",'B1-I16')
# Grammar renderer: no fallback to a different lesson's note.
old=s[s.index("   case 'grammar':{"):s.index("   case 'example':",s.index("   case 'grammar':{"))]
replace(old,"   case 'grammar':return renderGrammarPage(l);\n",'B1-I03')
old='<div class="field"><label for="custom-minutes">زمان دلخواه، به دقیقه</label><input id="custom-minutes" type="number" min="1" value="\'+E(state.minutes||\'\')+\'" inputmode="numeric"><p>این مقدار هدف انتخابی است، نه زمان مطالعهٔ ثبت‌شده.</p></div>'
replace("+'</div>"+old+"';","+'</div>'+goalField('زمان دلخواه، به دقیقه');",'B1-I07')
old='<div class="field"><label for="custom-minutes">هدف دلخواه به دقیقه</label><input id="custom-minutes" type="number" min="1" inputmode="numeric" value="\'+E(state.minutes||10)+\'"></div>'
replace("+'</div>"+old+"'+note(","+'</div>'+goalField('هدف دلخواه به دقیقه')+note(",'B1-I07')
# Navigation resets only transient goal error/draft; invalid submission never calls goto.
replace("state.input='';state.recordSimulation=false;\n  render();","state.input='';state.recordSimulation=false;state.goalDraft=null;state.goalError=null;state.goalBadInput=false;\n  render({focus:{kind:'id',id:'screen-heading',reveal:true}});",'B1-I06/B1-I07/B1-I18')
replace("function renderPhone(){\n   const s=", "function renderPhone(options={}){\n   const focus=options.focus||captureFocusIdentity();\n   const s=",'B1-I18')
replace("<div class=\"eyebrow\">'+E(s.group_title)+'</div><h1>'+E(title)+'</h1>","<div class=\"eyebrow\" lang=\"fa\" dir=\"rtl\">'+E(s.group_title)+'</div><h1 id=\"app-screen-title\" tabindex=\"-1\" lang=\"'+(state.uiLocale==='en'?'en':'fa')+'\" dir=\"'+(state.uiLocale==='en'?'ltr':'rtl')+'\">'+E(title)+'</h1>",'B1-I17/B1-I18')
replace("if(state.screen==='G04'&&state.recordSimulation)startSimulationClock();\n }","if(state.screen==='G04'&&state.recordSimulation)startSimulationClock();\n  if(options.manageFocus!==false)restoreFocusIdentity(focus);\n }",'B1-I18')
replace("function render(){\n  applyRoute();", "function render(options={}){\n  const focus=options.focus||captureFocusIdentity();\n  applyRoute();",'B1-I18')
replace("if(main)renderPhone();else renderGallery();\n  document.getElementById('route-note').hidden=state.route==='routeA';", "if(main)renderPhone({manageFocus:false});else renderGallery();\n  document.getElementById('route-note').hidden=state.route==='routeA';\n  restoreFocusIdentity(focus);",'B1-I18')
replace("'<h3>'+title+'</h3></div><p>'+lead", "'<h3 id=\"feedback-title\" tabindex=\"-1\">'+title+'</h3></div><p>'+lead",'B1-I18')
# Feedback paths all use the same explicit new-result focus intent.
replace("renderPhone();return;}\n  const signature=", "renderPhone({focus:{kind:'id',id:'feedback-title',reveal:true}});return;}\n  const signature=",'B1-I18')
replace("state.feedback=lastSubmission.result;renderPhone();return;", "state.feedback=lastSubmission.result;renderPhone({focus:{kind:'id',id:'feedback-title',reveal:true}});return;",'B1-I18')
replace("renderInspector();renderPhone();\n }\n function finishSample", "renderInspector();renderPhone({focus:{kind:'id',id:'feedback-title',reveal:true}});\n }\n function finishSample",'B1-I18')
replace("const previous=document.activeElement;const root=document.getElementById('dialog-root');", "dialogReturnFocus=captureFocusIdentity();const root=document.getElementById('dialog-root');",'B1-I18')
replace("if(e.key==='Escape'){root.innerHTML='';if(previous?.focus)previous.focus();}", "if(e.key==='Escape'){e.preventDefault();closeDesignDialog();return;}",'B1-I18')
replace("else if(a==='close-dialog'){document.getElementById('dialog-root').innerHTML='';const target=document.querySelector('[data-action=\"show-delete-dialog\"]');if(target)target.focus();}", "else if(a==='close-dialog')closeDesignDialog();",'B1-I18')
# Validate and commit goal draft before navigation; preserve the old value on all failures.
old="  if(s.kind==='time'||s.kind==='daily'||s.kind==='goals'){const input=document.getElementById('custom-minutes');if(input&&Number(input.value)>0)state.minutes=Number(input.value);}"
new="""  if(s.kind==='time'||s.kind==='daily'||s.kind==='goals'){
    const input=document.getElementById('custom-minutes');
    const raw=input?input.value:null;
    const plan=planGoalUpdate(raw,{screenId:s.id,declaredNext:s.next,history:state.history,previousMinutes:state.minutes,badInput:!!input?.validity?.badInput});
    state.goalDraft=raw===null?'':String(raw);
    if(!plan.ok){state.goalError=plan.message;renderPhone({focus:{kind:'id',id:'custom-minutes',reveal:true}});return;}
    state.minutes=plan.value;state.goalError=null;state.goalDraft=null;state.goalBadInput=false;
    if(s.id==='B02'){
      if(state.history[state.history.length-1]===plan.destination)state.history.pop();
      goto(plan.destination,false);return;
    }
  }"""
replace(old,new,'B1-I06/B1-I07')
old="else if(a==='option'){const f=el.dataset.field;if(['goal','minutes','uiLocale','textScale','motion','answer'].includes(f)){if(f==='answer')resetDraftResult();state[f]=el.dataset.value;state.feedback=null;render();}}"
new="else if(a==='option'){const f=el.dataset.field;if(['goal','minutes','uiLocale','textScale','motion','answer'].includes(f)){if(f==='answer')resetDraftResult();if(f==='minutes'){state.goalDraft=el.dataset.value;state.goalError=null;state.goalBadInput=false;}else state[f]=el.dataset.value;state.feedback=null;render();}}"
replace(old,new,'B1-I07/B1-I18')
replace("else if(a==='add-token'){resetDraftResult();const n=Number(el.dataset.index);if(!state.tokens.includes(n))state.tokens.push(n);renderPhone();}","else if(a==='add-token'){resetDraftResult();const n=Number(el.dataset.index);if(!state.tokens.includes(n))state.tokens.push(n);renderPhone({focus:{kind:'data',attributes:{'data-action':'remove-token','data-position':String(state.tokens.indexOf(n))},reveal:true}});}",'B1-I18')
replace("else if(a==='remove-token'){resetDraftResult();state.tokens.splice(Number(el.dataset.position),1);renderPhone();}","else if(a==='remove-token'){resetDraftResult();const removed=state.tokens[Number(el.dataset.position)];state.tokens.splice(Number(el.dataset.position),1);renderPhone({focus:{kind:'data',attributes:{'data-action':'add-token','data-index':String(removed)},reveal:true}});}",'B1-I18')
replace("state.tokens=[];state.pairs={};renderPhone();}","state.tokens=[];state.pairs={};renderPhone({focus:exerciseEntryFocus()});}",'B1-I18')
replace("else if(a==='retry-save'){if(state.pending)commitDemo(state.pending.result,state.pending.screen);renderPhone();}","else if(a==='retry-save'){if(state.pending)commitDemo(state.pending.result,state.pending.screen);renderPhone({focus:{kind:'id',id:'feedback-title',reveal:true}});}",'B1-I18')
replace("state.view=el.dataset.view;render();}","state.view=el.dataset.view;render({focus:{kind:'id',id:state.view==='prototype'?'screen-heading':'gallery-heading',reveal:true}});}",'B1-I18')
replace("state.route=el.dataset.route;state.view='prototype';render();}","state.route=el.dataset.route;state.view='prototype';render({focus:{kind:'id',id:'screen-heading',reveal:true}});}",'B1-I18')
# Goal input draft is separate from the last committed sample preference.
needle="document.addEventListener('input',e=>{"
replacement="""document.addEventListener('input',e=>{if(e.target.id==='custom-minutes'){
   state.goalDraft=e.target.value;state.goalBadInput=!!e.target.validity?.badInput;state.goalError=null;
   e.target.setAttribute('aria-invalid','false');const error=document.getElementById('goal-error');if(error){error.textContent='';error.hidden=true;}
  }"""
replace(needle,replacement,'B1-I07')
old="e.preventDefault();all[i].click();const changed=document.querySelector('button[role=\"radio\"][data-field=\"'+radio.dataset.field+'\"][data-value=\"'+all[i].dataset.value+'\"]');if(changed)changed.focus();"
new="e.preventDefault();const descriptor=captureFocusIdentity(all[i]);all[i].click();restoreFocusIdentity(descriptor);"
replace(old,new,'B1-I18')
# Narrow UI copy corrections; preserve prominent DESIGN PROTOTYPE and temporary-state disclosures.
for old,new,issue in [
 ('حالت پایانیٔ طرح','حالت پایانی طرح','B1-I15'),
 ('بسته‌نبودن یک درس باید دلیل داشته باشد.','اگر درسی قفل است، دلیل آن باید روشن باشد.','B1-I15'),
 ('English · بررسی جهت رابط','English · عنوان و جهت نمونه، نه رابط کامل','B1-I17'),
 ('دادهٔ فعلی prerequisite کامل ندارد؛ در این prototype محدودیت یادگیری اختراع نشده است.','پیش‌نیازهای منبع فعلی کامل تعریف نشده‌اند؛ در این پیش‌نمایش محدودیت آموزشی حدسی ایجاد نمی‌کنیم.','B1-I16'),
 ('شرط آموزشی در legacy موجود نیست','پیش‌نیاز آموزشی در منبع فعلی تعریف نشده','B1-I16'),
 ('actor و tenant مقصد باید در سرور اعتبارسنجی شوند. انتخاب این فهرست هیچ permissionی را تغییر نمی‌دهد.','هویت کاربر و دامنهٔ سازمان باید در سرویس معتبر بررسی شوند. انتخاب این فهرست هیچ مجوز واقعی را تغییر نمی‌دهد.','B1-I16'),
 ('حقوق/گوینده و هم‌خوانی transcript این فایل‌ها هنوز نیاز به بررسی دارند. هیچ صدای جدیدی در B ساخته نشده است.','حقوق استفاده، اجازهٔ گوینده و هم‌خوانی رونویسی این فایل‌ها هنوز نیاز به بررسی دارند؛ در این کپی صدای تازه‌ای تولید نشده است.','B1-I16')]:replace(old,new,issue)
# The corrected draft data now supplies this gloss; do not keep an inconsistent special-case override.
replace("const translation=v.word==='good afternoon'?'بعدازظهر بخیر':v.translation;","const translation=v.translation;",'B1-I16')
replace("واژه/IPA/مثال از منبع؛ «بعدازظهر بخیر» اصلاح ترجمهٔ پیشنهادی B است. متن اصلی عصر بخیر بود و تغییر نکرده است.","واژه و مثال از منبع‌اند؛ معنیِ این کپی اصلاحی «بعدازظهر بخیر» است و هنوز پیش‌نویسِ نیازمند بازبینی انسان است.",'B1-I16')

# Validate staged source syntax before replacing the authorized working copy.
staging=R/'evidence/prototype-candidate-stage.js'
with staging.open('x',encoding='utf-8') as f:f.write(s)
check=subprocess.run(['node','--check',str(staging)],capture_output=True,text=True)
assert check.returncode==0,check.stderr
p.write_text(s,encoding='utf-8')
css=work/'prototype/prototype-v3.css';css_original=(base/'prototype/prototype-v3.css').read_text();assert css.read_text()==css_original
css_add='''\n/* B2: scoped validation/focus/copy separation, not a new app component. */
.goal-error{color:var(--error);background:var(--errorSoft);padding:12px;border-radius:10px}
.goal-error[hidden]{display:none!important}
.source-tag>summary{min-height:48px;display:flex;align-items:center;cursor:pointer;font-weight:600}
.source-tag>div{margin-top:8px}
#screen-heading:focus-visible,#gallery-heading:focus-visible,#app-screen-title:focus-visible,#feedback-title:focus-visible{outline:3px solid var(--focus);outline-offset:4px}
'''
css.write_text(css_original+css_add,encoding='utf-8')
# Existing screen metadata and specifications are repaired only in the candidate copy.
scpath=work/'design/screens-v3.json';screens=json.loads(scpath.read_text());row=next(x for x in screens if x['id']=='B02');assert row['next']=='H04';row['next']='B01'
row['persistence_contract']+=' B2 candidate: integer 1–1440 minutes; invalid input neither updates the prior value nor navigates. Return to direct B01/F05 invoker, otherwise B01.'
scpath.write_text(json.dumps(screens,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
mp=work/'PHASE_B_SCREEN_MAP.md';text=mp.read_text();lines=text.splitlines()
for i,line in enumerate(lines):
 if line.startswith('| B02 |'):
  assert line.count('| H04 |')==1;lines[i]=line.replace('| H04 |','| B01 |')
mp.write_text('\n'.join(lines)+'\n\n## B2 candidate navigation clarification\n\nAfter a valid B02 save, return to its direct Home (B01) or Goals (F05) invoker; direct/unknown entry falls back to B01. This candidate decision was delegated by the user; no browser verification is claimed.\n',encoding='utf-8')
sp=work/'PHASE_B_SCREEN_SPECIFICATIONS.md';text=sp.read_text();start=text.index('## B02 —');end=text.index('## B03 —',start);block=text[start:end];assert 'تغییر هدف → H04' in block
block=block.replace('تغییر هدف → H04','تغییر هدف → B01؛ بازگشت به F05 اگر آغازگر مستقیم باشد')
block+='\nB2 candidate: عدد صحیح ۱ تا ۱۴۴۰؛ ورودی نامعتبر با خطای inline متوقف می‌شود، مقدار قبلی به‌عنوان مقدار جدید ثبت نمی‌شود. Keyboard/focus در مرورگر هنوز BLOCKED است.\n\n'
sp.write_text(text[:start]+block+text[end:],encoding='utf-8')

# Record every exact replacement and the byte-level before/after evidence.
report={'date':'2026-11-05','source':'retained Phase B prototype-v8.js','source_original_sha256':hashlib.sha256(original.encode()).hexdigest(),'candidate_sha256':hashlib.sha256(s.encode()).hexdigest(),'replacements':journal,'staged_syntax_check_exit_code':check.returncode,'browser_execution':'BLOCKED: original HTML and real browser unavailable','focus_runtime_verification':'NOT VERIFIED','original_phase_b_modified':False,'missing_html_rebuilt':False}
with (R/'evidence/SOURCE_PATCH_JOURNAL.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print('Controlled source replacements:',len(journal),'staged Node syntax check: PASS.')
print('Only candidate JS/CSS/metadata/specification changed. No original HTML reconstructed, no app code changed.')
