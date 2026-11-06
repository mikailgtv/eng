import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const out = '/home/user/phase66-gallery';
import fs from 'fs';
fs.mkdirSync(out, {recursive:true});

async function run(){
  const browser = await chromium.launch({args:['--no-sandbox']});
  const ctx = await browser.newContext({viewport:{width:1280,height:900}});
  // Login page
  let page = await ctx.newPage();
  await page.goto(BASE+'/login', {waitUntil:'domcontentloaded', timeout:30000});
  await page.waitForTimeout(2000);
  await page.screenshot({path: out+'/01-login-desktop.png', fullPage:true});
  console.log('login desktop done');
  // Mobile login
  const mctx = await browser.newContext({viewport:{width:375,height:812}});
  let mpage = await mctx.newPage();
  await mpage.goto(BASE+'/login', {waitUntil:'domcontentloaded', timeout:30000});
  await mpage.waitForTimeout(1500);
  await mpage.screenshot({path: out+'/01-login-mobile.png', fullPage:true});
  console.log('login mobile done');

  // Helper to login and capture
  async function loginAndCapture(role, user, pass, paths){
    const c = await browser.newContext({viewport:{width:1280,height:900}});
    const p = await c.newPage();
    await p.goto(BASE+'/login', {waitUntil:'domcontentloaded'});
    await p.waitForTimeout(1000);
    await p.fill('input[name="identifier"]', user);
    await p.fill('input[name="password"]', pass);
    await p.click('button[type="submit"]');
    await p.waitForTimeout(3000);
    // try to wait for dashboard
    try { await p.waitForURL(/\/student|\/teacher|\/admin/, {timeout:8000}); } catch {}
    await p.waitForTimeout(1500);
    console.log(role+' logged in url '+p.url());
    for(let pp of paths){
      try {
        await p.goto(BASE+pp.path, {waitUntil:'domcontentloaded', timeout:20000});
        await p.waitForTimeout(2000);
        await p.screenshot({path: out+'/'+pp.name, fullPage:true});
        console.log('captured '+pp.name+' for '+role);
      } catch(e){ console.log('fail '+pp.name+' '+e.message); }
    }
    await c.close();
  }

  // Student: james.carter
  await loginAndCapture('student','james.carter','Student#Demo1', [
    {path:'/student', name:'02-student-dashboard.png'},
    {path:'/student/learning', name:'03-student-learning.png'},
    {path:'/student/progress', name:'04-student-progress.png'},
    {path:'/student/review', name:'05-student-review.png'},
    {path:'/student/exams', name:'06-student-exams.png'},
    {path:'/student/speaking', name:'07-student-speaking.png'},
    {path:'/student/profile', name:'08-student-profile.png'},
  ]);

  // Teacher: sara.whitfield
  await loginAndCapture('teacher','sara.whitfield','Teacher#Demo1', [
    {path:'/teacher', name:'09-teacher-dashboard.png'},
    {path:'/teacher/groups', name:'10-teacher-groups.png'},
    {path:'/teacher/students', name:'11-teacher-students.png'},
    {path:'/teacher/exams', name:'12-teacher-exams.png'},
    {path:'/teacher/results', name:'13-teacher-results.png'},
  ]);

  // Admin
  await loginAndCapture('admin','admin','Admin#Demo1', [
    {path:'/admin', name:'14-admin-dashboard.png'},
    {path:'/admin/users', name:'15-admin-users.png'},
    {path:'/admin/groups', name:'16-admin-groups.png'},
    {path:'/admin/curriculum', name:'17-admin-curriculum.png'},
    {path:'/admin/settings', name:'18-admin-settings.png'},
  ]);

  await browser.close();
  console.log('done');
}
run().catch(e=>{console.error(e); process.exit(1)});
