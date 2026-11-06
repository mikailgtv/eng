
'use strict';
(() => {
 const courses=JSON.parse(document.getElementById('curriculum-data').textContent);
 const audioFiles=JSON.parse(document.getElementById('audio-data').textContent);
 const moduleFA=['شروع یادگیری','الفبا و صداها','واژه‌های پایه','جمله‌های ساده','اعداد و زمان','انگلیسی روزمره'];
 const modules=[]; const lessons=[]; const words=[];
 courses.forEach(course=>course.modules.forEach((mod,mi)=>{
   const moduleIndex=modules.length;
   const group={...mod,index:moduleIndex,fa:moduleFA[moduleIndex]||mod.title,items:[]};
   mod.lessons.forEach((lesson,li)=>{
     const entry={...lesson,index:lessons.length,moduleIndex,moduleTitle:mod.title,moduleFA:group.fa,id:course.code+'-'+mi+'-'+li};
     lessons.push(entry);group.items.push(entry);
     (lesson.vocabulary||[]).forEach(word=>words.push({...word,lessonIndex:entry.index,lessonTitle:entry.title}));
   });
   modules.push(group);
 }));
 const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>String(s).toLocaleLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک');
 let selected=1; let active='lessons';
 const views=['lessons','words','audio','status'];
 const lessonNav=document.getElementById('lesson-nav');
 const lessonDetail=document.getElementById('lesson-detail');
 function showView(view,scroll=false){
   if(!views.includes(view))return;
   active=view;
   views.forEach(name=>{
     document.getElementById('panel-'+name).hidden=name!==view;
     const tab=document.getElementById('tab-'+name);
     tab.classList.toggle('active',name===view);
     tab.setAttribute('aria-selected',String(name===view));
     tab.tabIndex=name===view?0:-1;
   });
   if(view!=='audio') document.querySelectorAll('audio').forEach(player=>player.pause());
   if(scroll)document.getElementById('explore').scrollIntoView({behavior:'smooth',block:'start'});
 }
 function renderNavigation(){
   lessonNav.innerHTML=modules.map(mod=>`<details class="module-group" ${mod.index===lessons[selected].moduleIndex?'open':''}><summary><span class="module-num">${fa(mod.index+1)}</span><span class="module-label">${esc(mod.fa)}<small dir="ltr">${esc(mod.title)} · ${fa(mod.items.length)} درس</small></span></summary>${mod.items.map(l=>`<button type="button" class="lesson-link ${l.index===selected?'selected':''}" data-select-lesson="${l.index}" ${l.index===selected?'aria-current="true"':''}><span class="number">${String(l.index+1).padStart(2,'0')}</span><span lang="en">${esc(l.title)}</span></button>`).join('')}</details>`).join('');
 }
 function blockHTML(b){
   if(b.type==='HEADING')return `<h3 class="block heading en" lang="en">${esc(b.text)}</h3>`;
   if(b.type==='TEXT')return `<p class="block prose en" lang="en">${esc(b.text)}</p>`;
   if(b.type==='EXAMPLE')return `<div class="block example en" lang="en">${b.intro?`<div class="example-intro">${esc(b.intro)}</div>`:''}${(b.items||[]).map(item=>`<div class="example-line"><span>${esc(item.text)}</span>${item.note?`<small>${esc(item.note)}</small>`:''}</div>`).join('')}</div>`;
   if(b.type==='TIP')return `<p class="block tip en" lang="en">${esc(b.text)}</p>`;
   if(b.type==='WARNING')return `<p class="block warning-block en" lang="en">${esc(b.text)}</p>`;
   if(b.type==='QUESTION')return `<div class="question"><div class="question-label">پرسش موجود در درس · بدون نمره‌دهی</div><p class="en prompt" lang="en">${esc(b.prompt)}</p>${b.hint?`<p class="en hint" lang="en">Hint: ${esc(b.hint)}</p>`:''}<details class="answer"><summary>پاسخ پیشنهادی را ببین</summary><p class="en" lang="en">${esc(b.answer)}</p></details><p class="question-note">پاسخ از فایل محتواست؛ پاسخ شما دریافت یا در دیتابیس ذخیره نمی‌شود.</p></div>`;
   return `<p class="source-note">بلوک ${esc(b.type)} در فایل محتوا وجود دارد؛ نمایش اختصاصی آن در این راهنما اضافه نشده است.</p>`;
 }
 function renderLesson(){
   const l=lessons[selected];
   const vocab=l.vocabulary||[];
   const grammar=l.grammar;
   const hasUnrendered=l.blocks.some(b=>['EXAMPLE','WARNING'].includes(b.type));
   lessonDetail.innerHTML=`<article class="lesson-card"><header class="lesson-top"><div class="lesson-kicker"><span>${esc(l.moduleFA)}</span><span>·</span><span>درس ${fa(selected+1)} از ${fa(lessons.length)}</span><span>·</span><span>${fa(l.durationMin)} دقیقهٔ پیشنهادی در داده</span></div><h2 class="lesson-title" lang="en">${esc(l.title)}</h2><p class="lesson-description en" lang="en">${esc(l.description)}</p></header><div class="lesson-body"><details class="objectives"><summary>هدف‌های این درس</summary><ul class="en" lang="en">${(l.objectives||[]).map(o=>`<li>${esc(o)}</li>`).join('')}</ul></details>${l.blocks.map(blockHTML).join('')}${vocab.length?`<section class="section-rule"><h3>واژه‌ها و عبارت‌های همین درس</h3><div class="vocab-mini">${vocab.map(v=>`<div class="word-mini"><div class="en" lang="en"><strong>${esc(v.word)}</strong>${v.phonetic?`<div class="phonetic">${esc(v.phonetic)}</div>`:''}</div><p class="translation">${esc(v.translation||'')}</p>${v.exampleSentence?`<p class="example-sentence en" lang="en">${esc(v.exampleSentence)}</p>`:''}</div>`).join('')}</div></section>`:''}${grammar?`<section class="section-rule"><h3>یادداشت گرامر موجود در داده</h3><div class="grammar-note en" lang="en"><strong>${esc(grammar.title)}</strong><p>${esc(grammar.explanation||'')}</p><ul>${(grammar.patterns||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>${(grammar.examples||[]).map(t=>`<p>${esc(t)}</p>`).join('')}</div><p class="source-note">این فیلد در دادهٔ درس وجود دارد، اما صفحهٔ فعلی اپ آن را نمایش نمی‌دهد. متن بالا نمایشِ داده در همین راهنماست، نه اصلاح اپ.</p></section>`:''}${hasUnrendered?`<p class="source-note">مثال‌ها و هشدارها در این راهنما خوانا شده‌اند؛ در سورس فعلی Android بعضی از این بلوک‌ها به‌صورت JSON نمایش داده می‌شوند. این صفحه بازسازی دقیق ظاهر اپ نیست.</p>`:''}</div><footer class="lesson-footer"><button type="button" class="btn" data-select-lesson="${Math.max(0,selected-1)}" ${selected===0?'disabled':''}>درس قبلی</button><span class="muted small">فقط مرور محتوا؛ بدون ذخیرهٔ پیشرفت</span><button type="button" class="btn small primary" data-select-lesson="${Math.min(lessons.length-1,selected+1)}" ${selected===lessons.length-1?'disabled':''}>درس بعدی</button></footer></article>`;
   renderNavigation();
 }
 function chooseLesson(value,scroll=true){
   const index=Number(value);
   if(!Number.isInteger(index)||index<0||index>=lessons.length)return;
   selected=index; renderLesson();showView('lessons',scroll);
 }
 function renderWords(query=''){
   const term=normalize(query.trim());
   const selectedWords=words.filter(w=>normalize([w.word,w.translation,w.exampleSentence].join(' ')).includes(term));
   document.getElementById('word-count').textContent=fa(selectedWords.length)+' واژه از '+fa(words.length)+' واژهٔ موجود';
   document.getElementById('word-grid').innerHTML=selectedWords.length?selectedWords.map(w=>`<article class="word-card"><h3 class="en" lang="en">${esc(w.word)}</h3>${w.phonetic?`<div class="phonetic en">${esc(w.phonetic)}</div>`:''}<p class="translation">${esc(w.translation||'')}</p><p class="sentence en" lang="en">${esc(w.exampleSentence||'')}</p><button type="button" data-select-lesson="${w.lessonIndex}">باز کردن درس مربوط</button></article>`).join(''):'<p class="empty">در واژه‌های این پروژه نتیجه‌ای پیدا نشد.</p>';
 }
 function renderAudio(){
   document.getElementById('audio-grid').innerHTML=audioFiles.map((a,i)=>`<article class="audio-card"><div class="audio-top"><div class="audio-mark"><svg class="icon"><use href="#i-audio"/></svg></div><div><h3>${esc(a.label)}</h3><small dir="ltr">${esc(a.file)}</small></div></div><audio controls preload="none" aria-label="فایل ${esc(a.file)}" src="${a.uri}" data-audio-index="${i}">مرورگر شما پخش صوت را پشتیبانی نمی‌کند.</audio><p class="audio-error" id="audio-error-${i}" hidden>مرورگر نتوانست این فایل صوتی را پخش کند. این پیام مربوط به همین پیش‌نمایش است، نه اجرای APK.</p></article>`).join('');
   document.querySelectorAll('audio').forEach(player=>{
     player.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==player)other.pause();}));
     player.addEventListener('error',()=>{document.getElementById('audio-error-'+player.dataset.audioIndex).hidden=false;});
   });
 }
 document.addEventListener('click',event=>{
   const target=event.target.closest('button');if(!target||target.disabled)return;
   if(target.hasAttribute('data-select-lesson'))chooseLesson(target.dataset.selectLesson,true);
   else if(target.hasAttribute('data-view'))showView(target.dataset.view,false);
   else if(target.hasAttribute('data-go-view'))showView(target.dataset.goView,true);
 });
 document.getElementById('word-search').addEventListener('input',event=>renderWords(event.target.value));
 document.querySelector('[role="tablist"]').addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();let i=views.indexOf(active);
   if(event.key==='ArrowLeft')i=(i+1)%views.length;
   if(event.key==='ArrowRight')i=(i+views.length-1)%views.length;
   if(event.key==='Home')i=0;if(event.key==='End')i=views.length-1;
   showView(views[i]);document.getElementById('tab-'+views[i]).focus();
 });
 renderLesson();renderWords();renderAudio();showView('lessons');
})();
