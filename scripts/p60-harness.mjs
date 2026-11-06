import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/tmp/pwt/package.json');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:4100';
const OUT = '/home/user/evidence/p60';
fs.mkdirSync(OUT, { recursive: true });
const exe = '/home/user/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';

const rows=[];
const row=(id,name,kind,ok,detail)=>{rows.push({id,name,kind,ok,detail}); console.log(`${ok?'PASS':ok===null?'BLOCK': 'FAIL'} [${kind}] ${id} ${name} — ${detail}`)};

async function checkServer(){
  for(let i=0;i<10;i++){
    try{ const r=await fetch(`${BASE}/api/auth/login`, {method:'GET'}); if([405,401,200].includes(r.status)) return true; }catch{} await new Promise(r=>setTimeout(r,800));
  } return false;
}
async function login(request, identifier, password){
  const r=await request.post(`${BASE}/api/auth/login`, {data:{identifier,password}, headers:{origin:BASE}});
  if(!r.ok()) throw new Error(`login ${identifier} ${r.status()} ${await r.text()}`);
  return r.headersArray().filter(h=>h.name.toLowerCase()==='set-cookie').map(h=>h.value);
}
let browser;
async function ensureBrowser(){ if(!browser) browser=await chromium.launch({executablePath: exe, args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}); return browser;}

function pngDimensions(file){ const buf=fs.readFileSync(file); if(buf[0]!==0x89) throw new Error('not PNG'); return {w:buf.readUInt32BE(16), h:buf.readUInt32BE(20)}; }

try{
  const up=await checkServer(); row('S0','Server ready 4100','REAL',up,`up=${up}`); if(!up) throw new Error('server not ready');
  const browser=await ensureBrowser();
  // A1 attempt
  {
    const ctx=await browser.newContext({viewport:{width:1280,height:900}});
    const ck=await login(ctx.request,'p58.alice','Student#Demo1');
    await ctx.addCookies(ck.map(v=>{const [p]=v.split(';'); const i=p.indexOf('='); return {name:p.slice(0,i), value:p.slice(i+1), domain:'127.0.0.1', path:'/'};}));
    const page=await ctx.newPage();
    try{
      await page.goto(`${BASE}/student/progress`, {waitUntil:'commit', timeout:90000});
      await page.waitForSelector('text=My Progress', {timeout:15000}).catch(()=>{});
      await page.waitForTimeout(1200);
      const txt=await page.locator('main').innerText().catch(()=> '');
      row('A1','Login + open /student/progress','REAL', txt.includes('My Progress')||txt.includes('Your progress'), txt.slice(0,80).replace(/\s+/g,' '));
      const f1=`${OUT}/p60-desktop-progress.png`;
      await page.screenshot({path:f1, fullPage:false});
      const d=pngDimensions(f1); const s=fs.statSync(f1).size;
      row('B1','Desktop 1280x900 screenshot','REAL', s>0 && d.w===1280 && d.h===900, `size=${s} ${d.w}x${d.h}`);
    }catch(e){ row('A1','Login + open /student/progress','REAL',false, String(e).slice(0,200));}
    await ctx.close(); await new Promise(r=>setTimeout(r,1000));
  }
  {
    const ctx=await browser.newContext({viewport:{width:375,height:812}});
    const ck=await login(ctx.request,'p58.alice','Student#Demo1');
    await ctx.addCookies(ck.map(v=>{const [p]=v.split(';'); const i=p.indexOf('='); return {name:p.slice(0,i), value:p.slice(i+1), domain:'127.0.0.1', path:'/'};}));
    const page=await ctx.newPage();
    try{
      await page.goto(`${BASE}/student/progress`, {waitUntil:'commit', timeout:90000});
      await page.waitForTimeout(1000);
      const f2=`${OUT}/p60-mobile-progress.png`; await page.screenshot({path:f2, fullPage:false});
      const d=pngDimensions(f2); const s=fs.statSync(f2).size;
      row('E1','Mobile 375x812 screenshot','REAL', s>0 && d.w===375 && d.h===812, `size=${s} ${d.w}x${d.h}`);
      const ov=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth}));
      row('E2','No horizontal overflow 375','REAL', ov.scrollW <= ov.clientW+1, JSON.stringify(ov));
    }catch(e){ row('E1','Mobile 375x812 screenshot','REAL',false, String(e).slice(0,200));}
    await ctx.close(); await new Promise(r=>setTimeout(r,800));
  }
  {
    const ctx=await browser.newContext({viewport:{width:1280,height:900}});
    const ck=await login(ctx.request,'p58.bob','Student#Demo1');
    await ctx.addCookies(ck.map(v=>{const [p]=v.split(';'); const i=p.indexOf('='); return {name:p.slice(0,i), value:p.slice(i+1), domain:'127.0.0.1', path:'/'};}));
    const page=await ctx.newPage();
    try{
      await page.goto(`${BASE}/student/progress`, {waitUntil:'commit', timeout:90000});
      await page.waitForTimeout(1000);
      const f3=`${OUT}/p60-empty-progress.png`; await page.screenshot({path:f3, fullPage:false});
      const d=pngDimensions(f3); const s=fs.statSync(f3).size;
      row('B9','Empty 1280x900 screenshot','REAL', s>0 && d.w===1280, `size=${s} ${d.w}x${d.h}`);
    }catch(e){ row('B9','Empty 1280x900 screenshot','REAL',false, String(e).slice(0,200));}
    await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:1280,height:900}});
    const ck=await login(ctx.request,'p58.alice','Student#Demo1');
    await ctx.addCookies(ck.map(v=>{const [p]=v.split(';'); const i=p.indexOf('='); return {name:p.slice(0,i), value:p.slice(i+1), domain:'127.0.0.1', path:'/'};}));
    const page=await ctx.newPage();
    try{
      await page.goto(`${BASE}/student/progress`, {waitUntil:'commit', timeout:90000});
      await page.waitForSelector('[data-testid="daily-goal-card"]', {timeout:10000}).catch(()=>{});
      await page.waitForTimeout(1000);
      const f4=`${OUT}/p60-daily-goal.png`; await page.screenshot({path:f4, fullPage:false});
      const d=pngDimensions(f4); const s=fs.statSync(f4).size;
      row('C3b','Daily-goal 1280x900 screenshot','REAL', s>0 && d.w===1280, `size=${s} ${d.w}x${d.h}`);
    }catch(e){ row('C3b','Daily-goal 1280x900 screenshot','REAL',false, String(e).slice(0,200));}
    await ctx.close();
  }
}catch(e){
  console.error('FATAL', e);
  rows.push({id:'FATAL', name:String(e), kind:'REAL', ok:false, detail:String(e.stack||e).slice(0,500)});
}finally{
  if(browser) await browser.close();
  fs.writeFileSync(`${OUT}/p60-e2e.json`, JSON.stringify({at:new Date().toISOString(), rows}, null,2));
  const p=rows.filter(r=>r.ok===true).length, f=rows.filter(r=>r.ok===false).length;
  console.log(`=== P60 HARNESS: ${p} pass, ${f} fail ===`);
}
