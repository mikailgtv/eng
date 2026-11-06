'use strict';
// Isolated logic checks with a simulated DOM; NOT browser, accessibility technology, audio or native tests.
const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),path=require('path');
const root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'prototype/LEO_DESIGN_PROTOTYPE_FINAL.html'),'utf8');
const script=id=>{const m=html.match(new RegExp('<script\\b[^>]*\\bid="'+id+'"[^>]*>([\\s\\S]*?)</script>'));if(!m)throw Error('Missing script '+id);return m[1];};
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
let osReduced=false;let timerCount=0;let audio=[];const nodes=new Map(),listeners={};let dynamic=new Set();let allButtons=[];
class Element{
 constructor(id,attrs={}){this.id=id;this.attrs=attrs;this.dataset={};for(const [k,v] of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.value=attrs.value||'';this.disabled='disabled' in attrs;this.hidden=false;this._html='';this.textContent='';this.listeners={};this.scrollTop=0;this.className='';this.style={setProperty:(k,v)=>{this.style[k]=v;}};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,b)=>b?this.classes.add(x):this.classes.delete(x)};this.playbackRate=1;this.currentTime=0;}
 set innerHTML(s){this._html=s;if(this.id==='phone'){for(const id of dynamic)nodes.delete(id);dynamic.clear();audio=[];allButtons=[];parseDynamic(s,true);}else if(['gallery','dialog-root'].includes(this.id))parseDynamic(s,false);}
 get innerHTML(){return this._html;}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;}
 focus(){document.activeElement=this;}
 pause(){this.paused=true;}
 play(){this.paused=false;return Promise.resolve();}
 remove(){nodes.delete(this.id);}
 querySelectorAll(q){if(q==='button')return allButtons;return [];}
 querySelector(q){if(q==='img')return {src:'mock-image'};return null;}
 closest(q){return this;}
}
function attrs(raw){const obj={};for(const m of raw.matchAll(/([\w:-]+)(?:="([^"]*)")?/g))obj[m[1]]=decode(m[2]||'');return obj;}
function parseDynamic(s,isPhone){for(const m of s.matchAll(/<(input|select|audio|div|main|h2|p|section|button|pre|span)\b([^>]*)>/g)){const a=attrs(m[2]);let el;if(a.id){el=new Element(a.id,a);nodes.set(a.id,el);if(isPhone)dynamic.add(a.id);}else el=new Element('',a);if(m[1]==='audio')audio.push(el);if(m[1]==='button')allButtons.push(el);}}
for(const id of ['design-data','curriculum-data','audio-data','art-data','icon-data','motion-data','font-licenses','license-text','screen-select','state-select','state-applicability','screen-contract','fail-next','app-frame','phone','prototype-layout','gallery','route-note','dialog-root','feedback-tools','feedback-select'])nodes.set(id,new Element(id));
for(const id of ['design-data','curriculum-data','audio-data','art-data','icon-data','motion-data','font-licenses'])nodes.get(id).textContent=script(id);
const document={documentElement:new Element('html'),activeElement:null,hidden:false,getElementById:id=>nodes.get(id)||null,querySelectorAll:q=>q==='audio'?audio:[],querySelector:q=>q==='[data-action="submit-answer"]'?allButtons.find(b=>b.dataset.action==='submit-answer'):null,addEventListener:(k,f)=>listeners[k]=f};
const context={document,console,setTimeout:()=>++timerCount,clearTimeout:()=>{},matchMedia:()=>({matches:osReduced}),Date};vm.createContext(context);vm.runInContext(script('design-prototype-code'),context);
const api=context.LeoDesignPrototype;const assert=(v,m)=>{if(!v)throw Error(m);};const checks=[];
assert(api.screens.length===67,'67 screen definitions');assert(nodes.get('phone').innerHTML.includes('DESIGN PROTOTYPE'),'Explicit label');
const rendered={};
for(const s of api.screens){api.goto(s.id,false);const markup=nodes.get('phone').innerHTML;assert(markup.includes(s.id+' · DESIGN PROTOTYPE'),'Screen identity '+s.id);assert(markup.length>400,'Screen body '+s.id);rendered[s.id]=markup;}
checks.push('All 67 screen render paths execute with a simulated DOM; each retains the DESIGN PROTOTYPE label.');
for(const s of api.screens){api.goto(s.id,false);for(const state of JSON.parse(script('design-data')).stateNames){api.chooseState(state);const m=api.stateMeta();assert(m&&m.state===state,'State map');if(!m.applicable)assert(m.rationale.startsWith('N/A'),'N/A reason');}}
api.goto('D02',false);api.chooseState('Missing Content');assert(!nodes.get('phone').innerHTML.includes('class="vocab-card"'),'Missing-content scene must not show available word card');api.goto('C01',false);api.chooseState('Loading');assert(!nodes.get('phone').innerHTML.includes('class="chapter-list"'),'Loading scene must not show ready chapter list');
checks.push('All 938 screen/state lookups and simulated render transitions execute; all N/A cases have a reason.');
api.goto('D04',false);api.state.lesson=1;const beforeGuided=api.stats();listeners.click({target:new Element('',{'data-action':'guided','data-value':'morning'})});assert(api.state.guidedChoice==='morning'&&api.stats().attempts===beforeGuided.attempts&&api.stats().completed===beforeGuided.completed,'Guided practice is non-scoring');checks.push('Guided teaching selection changes explanation only; it does not create attempts, scores or completion.');
api.goto('E01',false);api.state.attempts=[];api.state.events=[];api.state.completed=[];api.state.goldenReady=false;
api.chooseState('Success');assert(api.stats().completed===0&&api.stats().attempts===0,'Inspector must not create learning data');
api.chooseState('Available');api.state.answer='Good night.';api.submit();assert(api.stats().wrong===1&&!api.state.goldenReady,'Wrong answer without completion');
api.submit();assert(api.stats().attempts===1,'Repeated same submit idempotent in design simulation');
api.state.answer='Good morning.';api.state.failNext=true;api.submit();assert(api.state.feedback.kind==='savefailed'&&api.stats().attempts===1&&!api.state.goldenReady,'Failed simulated save does not count');
api.commitDemo(api.state.pending.result,api.state.pending.screen);assert(api.stats().correct===1&&api.state.goldenReady,'Explicit retry commits only to design memory');
api.finishSample();assert(api.state.screen==='D07'&&api.stats().completed===1,'Golden journey completion');api.finishSample();assert(api.stats().completed===1,'No duplicate lesson completion');
api.goto('F03',false);assert(nodes.get('phone').innerHTML.includes('۱ / ۲۵'),'Progress derived from session events');
checks.push('Wrong answer, exact sample correctness, simulated save failure, explicit retry, completion and duplicate protection; counters derived only from in-memory demo events.');
assert(api.grade('E04','is').kind==='correct','Fill exact');assert(api.grade('E04','this').kind==='incorrect','No substring false positive');
assert(api.grade('E07','سلام').kind==='correct','Source translation');assert(api.grade('E07','درود').kind==='correct','Declared draft alternative');assert(api.grade('E07','یک پاسخ متفاوت').kind==='ambiguous','Unknown translation not falsely rejected');
assert(api.grade('E03',null,{},[0,1,2]).kind==='correct','Ordering');assert(api.grade('E03',null,{},[2,1,0]).kind==='incorrect','Wrong ordering');
assert(api.grade('E06',null,{},[0,1,2,3]).kind==='correct','Construction');
assert(api.grade('E02',null,{hello:'سلام','good morning':'صبح بخیر',goodbye:'خداحافظ'},[]).kind==='correct','Matching');
checks.push('Deterministic design examples for matching/order/fill/construction/translation; no speech or listening score inferred.');
osReduced=true;api.state.motion='Standard';assert(api.reduced(),'OS reduced motion wins');api.render();assert(document.documentElement.attrs['data-motion']==='Reduced','Reduced mode propagated');osReduced=false;api.state.motion='Low';assert(api.reduced(),'Low tier static fallback');
checks.push('Reduced-motion decision logic respects OS preference; Low tier disables animation logic. No frames were rendered.');
for(const view of ['directions','character','components','motion']){api.state.view=view;api.render();assert(nodes.get('gallery').innerHTML.length>1000,'Gallery '+view);}
checks.push('Direction study, canonical character gallery, component sheet and 13-storyboard gallery render paths execute.');
assert(!/navigator\.mediaDevices|new\s+MediaRecorder|\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|indexedDB/.test(script('design-prototype-code')),'No real API, microphone, network or persistent storage');
checks.push('Static absence of application/network/storage/microphone API calls in the standalone prototype script.');
fs.writeFileSync(path.join(root,'evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz'),zlib.gzipSync(Buffer.from(JSON.stringify(rendered))),{flag:'wx'});
const report={date:'2026-11-04',method:'Node.js built-in vm with explicit simulated DOM and stub media/timer objects',checks,result:'PASS for these isolated logic/static checks only',screen_count:67,state_cells:938,notTested:['Real browser rendering/navigation/input focus','Actual audio decoding or audible playback','Screen reader/TalkBack','Physical touch targets on Android','Native font scaling/RTL','Native runtime/persistence/microphone','Animation frame rate/performance','User research or adult/beginner usability validation']};
fs.writeFileSync(path.join(root,'evidence/PROTOTYPE_LOGIC_TESTS_DELIVERY.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log('PASS: '+checks.length+' bounded logic/static check groups in a simulated DOM.');
console.log('67 screens and 938 state mappings exercised; no browser or native test performed.');
