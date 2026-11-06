from pathlib import Path
from PIL import Image
import base64
import hashlib
import io
import json

ROOT = Path('/home/user')
SOURCE = ROOT / 'EnglishLearning-Offline'
OUTPUT = ROOT / 'EnglishLearning-Features-Preview-v1.html'
if OUTPUT.exists():
    raise SystemExit('Refusing to replace an existing preview. Use a new version name.')

curriculum = json.loads((SOURCE / 'assets/curriculum.json').read_text(encoding='utf-8'))
source_files = list((SOURCE / 'app').rglob('*.tsx')) + list((SOURCE / 'lib').glob('*.ts'))
source_files += [SOURCE / 'assets/curriculum.json', SOURCE / 'assets/mascot.png']
source_files += sorted((SOURCE / 'assets/audio').glob('*.mp3'))
source_hashes = {str(p.relative_to(SOURCE)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files}

with Image.open(SOURCE / 'assets/mascot.png') as im:
    im = im.convert('RGB')
    side = min(im.size)
    x = (im.width - side) // 2
    y = (im.height - side) // 2
    hero = im.crop((x, y, x + side, y + side)).resize((512, 512), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    hero.save(buffer, format='JPEG', quality=90, optimize=True)
    hero_uri = 'data:image/jpeg;base64,' + base64.b64encode(buffer.getvalue()).decode('ascii')

labels = {
    'hello-1.mp3': 'سلام — نمونهٔ ۱',
    'hello-2.mp3': 'سلام — نمونهٔ ۲',
    'myname-1.mp3': 'معرفی نام',
    'numbers-1.mp3': 'اعداد',
    'colors-1.mp3': 'رنگ‌ها',
    'days-1.mp3': 'روزهای هفته',
    'family-1.mp3': 'خانواده',
    'questions-1.mp3': 'پرسش‌ها',
}
audio = []
for name, label in labels.items():
    file = SOURCE / 'assets/audio' / name
    audio.append({'file': name, 'label': label,
                  'uri': 'data:audio/mpeg;base64,' + base64.b64encode(file.read_bytes()).decode('ascii')})
lessons = [l for c in curriculum for m in c['modules'] for l in m['lessons']]
counts = {
    'courses': len(curriculum),
    'modules': sum(len(c['modules']) for c in curriculum),
    'lessons': len(lessons),
    'words': sum(len(l.get('vocabulary', [])) for l in lessons),
    'questions': sum(b['type'] == 'QUESTION' for l in lessons for b in l['blocks']),
    'grammar_notes': sum(bool(l.get('grammar')) for l in lessons),
    'audio_files': len(audio),
}
assert counts == {'courses': 1, 'modules': 6, 'lessons': 25, 'words': 100, 'questions': 25, 'grammar_notes': 6, 'audio_files': 8}

def safe_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')

html = r'''<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="description" content="بازدید تعاملی از محتوای واقعی سورس English Learning، با تفکیک امکانات نوشته‌شده و بخش‌های ناتمام. این فایل اجرای APK نیست.">
<title>English Learning — ببین چه ساخته شده</title>
<style>
:root{--ink:#142d34;--muted:#647779;--paper:#fbfaf6;--white:#fff;--line:#e4e9e5;--green:#20735d;--green-soft:#edf6ef;--gold:#e9ac47;--gold-soft:#fff4da;--red:#a5413c;--red-soft:#fff1ec;--blue:#356782;--blue-soft:#eef5fa;--radius:22px;--shadow:0 14px 40px rgba(25,52,45,.045)}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:100px}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.9 Tahoma,Arial,sans-serif}button,input,select{font:inherit}button,a,input,summary{touch-action:manipulation}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--gold);outline-offset:4px}button:disabled{cursor:default}a{color:var(--green)}button{color:inherit}svg.icon{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}h1,h2,h3,h4,p{margin:0}h1,h2,h3{line-height:1.6}h1{font-size:clamp(30px,4vw,48px);letter-spacing:-1.4px}h2{font-size:24px}h3{font-size:18px}small,.small{font-size:12px}.muted{color:var(--muted)}.en{direction:ltr;text-align:left;font-family:Arial,sans-serif;line-height:1.7}.wrap{max-width:1220px;margin:auto;padding:0 28px}.topbar{background:rgba(251,250,246,.97);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}.top-inner{display:flex;align-items:center;justify-content:space-between;gap:15px;min-height:82px}.brand{display:flex;align-items:center;gap:11px}.logo{height:43px;width:43px;border-radius:14px;background:var(--green);color:white;display:grid;place-items:center}.brand-title{font:700 18px/1.35 Arial,sans-serif;letter-spacing:-.4px;direction:ltr}.brand-sub{font-size:11px;color:var(--muted)}.tag{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:white;border-radius:999px;padding:5px 11px;font-size:11px;white-space:nowrap}.tag .dot{height:6px;width:6px;background:var(--gold);border-radius:50%}.header-note{display:flex;gap:8px;align-items:center}.eyebrow{display:flex;align-items:center;gap:9px;color:var(--green);font-size:12px;font-weight:700;margin-bottom:12px}.eyebrow:before{content:"";width:26px;height:2px;background:var(--gold)}.hero{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);gap:32px;align-items:center;padding:44px 0 30px}.hero-copy>p{max-width:650px;margin-top:15px;color:var(--muted);font-size:15px}.hero-copy em{font-style:normal;color:var(--green)}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:25px}.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:47px;padding:9px 17px;border-radius:12px;border:1px solid var(--line);background:white;font-weight:700;font-size:13px;text-decoration:none}.btn.primary{background:var(--green);color:white;border-color:var(--green)}.btn:hover{filter:brightness(.97)}.btn.small{font-size:12px;padding:5px 12px;min-height:40px}.mascot-scene{border:1px solid #eee5cf;border-radius:32px;background:#fff;position:relative;overflow:hidden;min-height:300px;display:grid;place-items:center;box-shadow:var(--shadow)}.mascot-scene:before{content:"";position:absolute;inset:24px;background:radial-gradient(ellipse at center,#fff3cd,transparent 67%);border:1px dashed #efe5cf;border-radius:50%}.mascot-scene img{position:relative;width:285px;height:285px;object-fit:contain;max-width:100%;mix-blend-mode:multiply}.mascot-caption{position:absolute;bottom:18px;right:16px;background:rgba(255,255,255,.94);border:1px solid var(--line);border-radius:12px;padding:6px 12px;font-size:11px}.mascot-level{position:absolute;top:19px;left:18px;background:var(--green-soft);color:var(--green);border-radius:9px;padding:4px 9px;font:700 11px/1.5 Arial,sans-serif}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);background:white;border-radius:18px;padding:16px 10px;box-shadow:var(--shadow)}.metric{display:flex;align-items:center;justify-content:center;gap:12px;border-left:1px solid var(--line)}.metric:last-child{border-left:0}.metric strong{font-size:28px;font-weight:700;color:var(--green);line-height:1.5}.metric span{font-size:12px;color:var(--muted);line-height:1.7}.notice{display:flex;gap:12px;align-items:flex-start;border:1px solid #f0dfb8;background:#fffaed;border-radius:15px;padding:15px 17px;margin:20px 0;color:#705222;font-size:12px}.notice svg{margin-top:3px}.notice strong{display:block;font-size:13px;margin-bottom:3px}.notice.soft-blue{background:var(--blue-soft);border-color:#dbe8f1;color:#355a70}.notice.red{background:var(--red-soft);border-color:#f0d3ca;color:var(--red)}.notice p{flex:1}.tabs-wrap{margin-top:30px;margin-bottom:21px;scroll-margin-top:100px}.tabs-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:15px}.tabs-heading h2{font-size:22px}.tabs{display:flex;gap:5px;padding:5px;background:#ecefe9;border-radius:14px;width:fit-content;max-width:100%;overflow:auto}.tab{display:flex;align-items:center;gap:8px;white-space:nowrap;border:0;background:transparent;color:var(--muted);border-radius:10px;padding:10px 16px;min-height:47px;font-size:13px;font-weight:700}.tab.active{background:white;color:var(--ink);box-shadow:0 2px 7px rgba(20,45,52,.06)}.tab .icon{width:18px;height:18px}.panel[hidden]{display:none}.explorer{display:grid;grid-template-columns:285px minmax(0,1fr);gap:23px;align-items:start}.sidebar{border:1px solid var(--line);border-radius:18px;background:white;padding:14px;position:sticky;top:100px;max-height:calc(100vh - 125px);overflow:auto}.sidebar-title{padding:5px 6px 13px;border-bottom:1px solid var(--line);margin-bottom:7px}.sidebar-title strong{font-size:13px}.sidebar-title p{font-size:11px;color:var(--muted)}.module-group{border-bottom:1px solid #eff1ed;padding:8px 0}.module-group:last-child{border:0}.module-group>summary{cursor:pointer;list-style:none;display:flex;gap:9px;align-items:center;font-size:12px;min-height:43px}.module-group>summary::-webkit-details-marker{display:none}.module-num{width:26px;height:26px;background:var(--green-soft);color:var(--green);border-radius:8px;display:grid;place-items:center;font-size:11px;flex-shrink:0}.module-label{flex:1;min-width:0}.module-label small{display:block;color:var(--muted);font-family:Arial,sans-serif;font-size:10px;line-height:1.6}.module-group>summary:after{content:"＋";color:var(--muted);font-size:16px}.module-group[open]>summary:after{content:"−"}.lesson-link{display:flex;align-items:center;gap:8px;width:100%;border:1px solid transparent;background:transparent;text-align:left;direction:ltr;border-radius:10px;margin-top:4px;min-height:43px;padding:8px;font:12px/1.5 Arial,sans-serif}.lesson-link:hover{background:#f7f8f5}.lesson-link.selected{background:var(--green-soft);border-color:#d8e8dd;color:var(--green);font-weight:700}.lesson-link span{flex:1}.lesson-link .number{font-size:10px;color:#91a19b;flex:0 0 19px}.lesson-card{border:1px solid var(--line);border-radius:22px;background:white;overflow:hidden;box-shadow:var(--shadow)}.lesson-top{background:linear-gradient(120deg,#f7fbf7,#fffdf4);border-bottom:1px solid var(--line);padding:26px 30px}.lesson-kicker{font-size:11px;color:var(--green);display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}.lesson-title{font:700 29px/1.35 Arial,sans-serif;direction:ltr;text-align:left;color:var(--ink);letter-spacing:-.6px}.lesson-description{margin-top:8px;color:var(--muted);font-size:14px}.lesson-body{padding:25px 30px}.objectives{font-size:12px;color:var(--muted);margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--line)}.objectives summary{cursor:pointer;font-weight:700;color:var(--ink)}.objectives ul{padding-left:20px;margin:9px 0 0}.block{margin:17px 0}.block.heading{font-size:19px;color:var(--ink);font-weight:700}.block.prose{color:#465e63;font-size:15px}.example{background:#f6f8f5;border:1px solid #e8ede5;padding:16px 18px;border-radius:13px;font-size:15px}.example-intro{color:var(--muted);font-size:12px;margin-bottom:9px}.example-line{display:flex;gap:10px;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e1e7df;align-items:baseline;flex-wrap:wrap}.example-line:last-child{border:0}.example-line small{font-size:11px;color:var(--muted)}.tip{font-size:13px;background:var(--gold-soft);color:#806024;border-radius:12px;padding:13px 16px}.warning-block{font-size:13px;background:var(--red-soft);color:var(--red);border-radius:12px;padding:13px 16px}.question{border:1px solid #dce8df;border-radius:15px;padding:18px;margin-top:22px;background:#fbfdfb}.question-label{color:var(--green);font-size:11px;font-weight:700;margin-bottom:8px}.question .prompt{font-size:16px;font-weight:700}.hint{color:var(--muted);font-size:12px;margin-top:8px}.answer{margin-top:14px}.answer summary{display:inline-flex;align-items:center;gap:8px;background:var(--green);color:white;padding:8px 14px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;list-style:none;min-height:42px}.answer summary::-webkit-details-marker{display:none}.answer summary:after{content:"＋"}.answer[open] summary:after{content:"−"}.answer p{margin-top:13px;background:#eaf4ec;color:#235b45;border-radius:10px;padding:12px 14px;font-size:15px}.question-note{font-size:10px;color:var(--muted);margin-top:11px}.section-rule{margin-top:28px;padding-top:22px;border-top:1px solid var(--line)}.section-rule h3{font-size:16px}.vocab-mini{margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.word-mini{background:#fafbf8;border:1px solid var(--line);border-radius:12px;padding:13px}.word-mini strong{font-size:17px}.word-mini .translation{font-size:12px;color:var(--green);margin-top:3px}.word-mini .phonetic{font-size:11px;color:var(--muted);font-family:Arial,sans-serif}.word-mini .example-sentence{font-size:12px;color:var(--muted);margin-top:8px}.grammar-note{background:var(--blue-soft);border:1px solid #dbe6ef;padding:15px;border-radius:13px;margin-top:17px;font-size:14px}.grammar-note strong{display:block;font-size:16px}.grammar-note p{margin-top:8px}.grammar-note ul{padding-left:19px;margin-bottom:0}.source-note{border-right:3px solid var(--gold);background:#fffdf5;color:#7c7055;font-size:11px;padding:10px 13px;margin-top:19px;border-radius:8px}.lesson-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 25px;background:#fafbf8;border-top:1px solid var(--line)}.lesson-footer .btn{min-height:40px;font-size:12px}.panel-intro{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin:0 0 20px}.panel-intro h2{font-size:22px}.panel-intro p{font-size:13px;color:var(--muted);margin-top:7px}.search-field{max-width:390px;flex:1;min-width:200px}.search-field label{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.search-field input{border:1px solid var(--line);border-radius:12px;min-height:47px;background:white;padding:10px 15px;color:var(--ink);width:100%}.words-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.word-card{background:white;border:1px solid var(--line);border-radius:17px;padding:20px;display:flex;flex-direction:column;gap:7px}.word-card h3{font:700 21px/1.4 Arial,sans-serif;color:var(--ink)}.word-card .translation{font-size:13px;color:var(--green);font-weight:700}.word-card .phonetic{font:12px/1.5 Arial,sans-serif;color:var(--muted)}.word-card .sentence{font-size:13px;color:var(--muted);margin-top:6px;flex:1}.word-card button{align-self:flex-start;border:0;border-radius:8px;background:#f1f5ee;font-size:11px;color:var(--green);padding:6px 11px;min-height:36px;margin-top:5px}.empty{padding:30px;border:1px dashed var(--line);border-radius:15px;color:var(--muted)}.audio-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.audio-card{background:white;border:1px solid var(--line);border-radius:18px;padding:22px;overflow:hidden}.audio-top{display:flex;align-items:center;gap:13px;margin-bottom:18px}.audio-mark{width:43px;height:43px;border-radius:13px;background:var(--green-soft);display:grid;place-items:center;color:var(--green)}.audio-top h3{font-size:15px}.audio-top small{color:var(--muted);font:11px/1.5 Arial,sans-serif}.audio-card audio{width:100%;height:40px;display:block}.audio-error{font-size:11px;color:var(--red);margin-top:9px}.status-intro{display:grid;grid-template-columns:1.4fr 1fr;gap:17px;margin-bottom:23px}.purpose{border:1px solid #d5e5d9;background:var(--green-soft);padding:25px;border-radius:19px}.purpose h2{font-size:20px;color:var(--green)}.purpose p{font-size:13px;color:#416858;margin-top:10px}.purpose-avoid{border:1px solid var(--line);background:white;padding:25px;border-radius:19px}.purpose-avoid h3{font-size:16px}.purpose-avoid p{font-size:13px;color:var(--muted);margin-top:10px}.status-section{margin-top:24px}.status-heading{display:flex;align-items:center;gap:10px;font-size:17px;margin-bottom:12px}.status-dot{height:9px;width:9px;border-radius:50%;background:var(--green)}.status-dot.blue{background:var(--blue)}.status-dot.red{background:var(--red)}.status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.status-card{border:1px solid var(--line);background:white;border-radius:16px;padding:20px}.status-card h4{font-size:14px;line-height:1.8}.status-card p{font-size:12px;color:var(--muted);margin-top:7px}.status-card code{display:block;color:#869491;font:10px/1.7 Consolas,monospace;direction:ltr;text-align:left;margin-top:13px;overflow-wrap:anywhere}.status-card .badge{display:inline-flex;align-items:center;gap:5px;font-size:10px;border-radius:6px;padding:2px 7px;background:var(--green-soft);color:var(--green);margin-bottom:9px}.status-card.blue .badge{background:var(--blue-soft);color:var(--blue)}.status-card.red .badge{background:var(--red-soft);color:var(--red)}.status-card.red{border-color:#ecdcd6}.footer{padding:31px 0 30px;margin-top:35px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.footer p{max-width:730px}.footer .edition{white-space:nowrap;direction:ltr;font-family:Arial,sans-serif}.noscript{background:var(--red-soft);padding:20px;color:var(--red);text-align:center}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.view-note{font-size:11px;color:var(--muted);margin-top:10px}.lesson-switch-mobile{display:none}button,summary{-webkit-tap-highlight-color:transparent}
@media(max-width:960px){.wrap{padding:0 20px}.hero{grid-template-columns:1.4fr 1fr;gap:24px}.mascot-scene{min-height:265px}.mascot-scene img{width:255px;height:255px}.explorer{grid-template-columns:240px minmax(0,1fr);gap:16px}.lesson-body,.lesson-top{padding:23px}.words-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.header-note .secondary-tag{display:none}}
@media(max-width:720px){body{font-size:14px}.wrap{padding:0 15px}.top-inner{min-height:70px}.brand-title{font-size:16px}.brand-sub{font-size:10px}.header-note .tag{font-size:10px;padding:3px 8px}.logo{width:37px;height:37px;border-radius:11px}.hero{grid-template-columns:1fr;padding-top:29px;gap:22px}.hero-copy>p{font-size:13px}.hero h1{font-size:33px;letter-spacing:-1px}.mascot-scene{min-height:215px;max-height:215px}.mascot-scene img{width:210px;height:210px}.mascot-scene:before{inset:15px 60px}.mascot-caption{right:12px;bottom:13px;font-size:10px}.mascot-level{top:15px;left:12px}.actions{margin-top:20px;gap:8px}.btn{font-size:12px;padding:8px 13px}.metrics{grid-template-columns:repeat(2,1fr);gap:15px;padding:17px 8px}.metric:nth-child(2){border:0}.metric strong{font-size:26px}.metric span{font-size:11px}.notice{font-size:11px;padding:13px;gap:9px}.notice strong{font-size:12px}.tabs-heading{align-items:flex-start;flex-direction:column;gap:5px}.tabs{width:100%;gap:2px}.tab{flex:1;justify-content:center;padding:9px 10px;font-size:11px}.tab .icon{display:none}.explorer{grid-template-columns:1fr}.sidebar{position:static;max-height:320px}.sidebar-title{padding-bottom:9px}.lesson-top,.lesson-body{padding:20px}.lesson-title{font-size:26px}.lesson-description{font-size:13px}.lesson-kicker{font-size:10px}.block.prose,.example{font-size:14px}.vocab-mini{grid-template-columns:1fr}.question .prompt{font-size:15px}.lesson-footer{padding:14px}.lesson-footer .muted{display:none}.panel-intro{display:block}.search-field{max-width:none;margin-top:17px}.words-grid{gap:10px}.word-card{padding:16px}.word-card h3{font-size:19px}.word-card .translation{font-size:12px}.audio-grid{grid-template-columns:1fr}.status-intro{grid-template-columns:1fr}.status-grid{grid-template-columns:1fr}.status-section{margin-top:22px}.status-heading{font-size:15px}.footer{display:block}.footer .edition{display:block;margin-top:10px}.tabs-wrap{scroll-margin-top:85px}.tag.secondary-tag{display:none}}
@media(max-width:390px){.header-note{display:none}.words-grid{grid-template-columns:1fr}.tab{padding:8px 9px;font-size:10px}.lesson-body,.lesson-top{padding:17px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M12 5v15M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M20 12H4m7-7-7 7 7 7"/></symbol>
<symbol id="i-list" viewBox="0 0 24 24"><path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"/></symbol>
<symbol id="i-audio" viewBox="0 0 24 24"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 12H2v7h5v-7H4Zm16 0h2v7h-5v-7h3ZM17 21h-5"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></symbol>
<symbol id="i-word" viewBox="0 0 24 24"><path d="M3 19 9 4l6 15M5 14h8M17 8h5m-2-3v11m-4-3 4 6 4-6"/></symbol>
</defs></svg>
<noscript><div class="noscript">برای مرور درس‌ها، جاوااسکریپت مرورگر باید فعال باشد. این فایل به نصب Expo یا ورود به حساب نیاز ندارد.</div></noscript>
<header class="topbar"><div class="wrap top-inner"><div class="brand"><div class="logo"><svg class="icon"><use href="#i-book"/></svg></div><div><div class="brand-title">English Learning</div><div class="brand-sub">بازدید از آنچه ساخته شده</div></div></div><div class="header-note"><span class="tag"><span class="dot"></span>پیش‌نمایش محتوا · نه APK</span><span class="tag secondary-tag">بدون ورود به حساب</span></div></div></header>
<main class="wrap">
<section class="hero" aria-labelledby="hero-heading"><div class="hero-copy"><div class="eyebrow">انگلیسی از صفر · سطح Pre-A1</div><h1 id="hero-heading">از <em dir="ltr">«Hello»</em> شروع کن.<br>ببین داخل پروژه چیست.</h1><p>درس‌ها، واژه‌ها و فایل‌های صوتیِ موجود را همین‌جا مرور کن. این صفحه از <strong>محتوای واقعی سورس</strong> ساخته شده؛ برای دیدنش لازم نیست APK بسازی یا دستور دیگری بزنی.</p><div class="actions"><button class="btn primary" type="button" data-select-lesson="1">یک درس را ببین<svg class="icon"><use href="#i-arrow"/></svg></button><button class="btn" type="button" data-go-view="status">چه چیزهایی هنوز آماده نیست؟</button></div><div class="view-note">رابط این راهنما برای مرور محتواست؛ تصویر یا اجرای واقعی اپ اندروید نیست.</div></div><div class="mascot-scene"><img src="__HERO__" width="285" height="285" alt="لئو، پلنگ آتش‌نشان موجود در فایل‌های پروژه"><span class="mascot-level">PRE-A1 · STARTER</span><span class="mascot-caption">لئو؛ شخصیت فعلی پروژه</span></div></section>
<section class="metrics" aria-label="آمار واقعی فایل محتوا"><div class="metric"><strong>۲۵</strong><span>درس کوتاه<br>در ۶ فصل</span></div><div class="metric"><strong>۱۰۰</strong><span>واژه و عبارت<br>با معنی فارسی</span></div><div class="metric"><strong>۲۵</strong><span>پرسش درسی<br>با پاسخ پیشنهادی</span></div><div class="metric"><strong>۸</strong><span>فایل صوتی<br>داخل پوشهٔ پروژه</span></div></section>
<div class="notice"><svg class="icon" aria-hidden="true"><use href="#i-info"/></svg><p><strong>شفاف بگوییم: این نسخه هنوز یک اپ کامل نیست.</strong>محتوای آموزشی وجود دارد، اما دکمه‌های پخش و ضبط در سورس فعلی فقط پیام نشان می‌دهند. استریک و نشان‌ها هم مقدار ثابت‌اند. برگهٔ «وضعیت امکانات» دقیقاً توضیح می‌دهد چه چیزی نوشته شده و چه چیزی ناتمام است.</p></div>
<section id="explore" class="tabs-wrap"><div class="tabs-heading"><h2>خودت محتوا را ببین</h2><span class="small muted">همهٔ نمونه‌ها از فایل‌های همین پروژه‌اند</span></div><div class="tabs" role="tablist" aria-label="بخش‌های راهنما"><button id="tab-lessons" class="tab active" role="tab" aria-selected="true" aria-controls="panel-lessons" data-view="lessons"><svg class="icon"><use href="#i-book"/></svg>درس‌ها</button><button id="tab-words" class="tab" role="tab" aria-selected="false" aria-controls="panel-words" data-view="words"><svg class="icon"><use href="#i-word"/></svg>واژه‌ها</button><button id="tab-audio" class="tab" role="tab" aria-selected="false" aria-controls="panel-audio" data-view="audio"><svg class="icon"><use href="#i-audio"/></svg>فایل‌های صوتی</button><button id="tab-status" class="tab" role="tab" aria-selected="false" aria-controls="panel-status" data-view="status"><svg class="icon"><use href="#i-list"/></svg>وضعیت امکانات</button></div></section>
<section id="panel-lessons" class="panel" role="tabpanel" aria-labelledby="tab-lessons"><div class="explorer"><aside class="sidebar" aria-label="فهرست فصل‌ها و درس‌ها"><div class="sidebar-title"><strong>مسیر شروع انگلیسی</strong><p>یک دوره · ۶ فصل · ۲۵ درس</p></div><div id="lesson-nav"></div></aside><div id="lesson-detail"></div></div></section>
<section id="panel-words" class="panel" role="tabpanel" aria-labelledby="tab-words" hidden><div class="panel-intro"><div><h2>واژه‌های داخل پروژه</h2><p>معنی فارسی، نوشتار تلفظ و مثال انگلیسی؛ عین دادهٔ درس‌ها.</p><p id="word-count" aria-live="polite"></p></div><div class="search-field"><label for="word-search">جست‌وجو در همین راهنما؛ نه قابلیت تأییدشدهٔ اپ</label><input id="word-search" type="search" placeholder="مثلاً hello یا «سلام»" autocomplete="off" dir="auto"></div></div><div id="word-grid" class="words-grid"></div></section>
<section id="panel-audio" class="panel" role="tabpanel" aria-labelledby="tab-audio" hidden><div class="panel-intro"><div><h2>۸ فایل صوتیِ موجود</h2><p>فایل‌ها داخل همین صفحه قرار گرفته‌اند؛ این پخش‌کننده به Expo یا حساب کاربری وصل نیست.</p></div><span class="tag">فایل‌های اصلی MP3</span></div><div class="notice soft-blue"><svg class="icon"><use href="#i-info"/></svg><p><strong>این پخش‌کننده فقط متعلق به همین پیش‌نمایش مرورگری است.</strong>در صفحهٔ فعلی اپ اندروید، دکمهٔ «پخش نمونه» به پخش صوت وصل نشده است. وجود فایل صوتی یا کارکرد این پخش‌کننده، تست پخش صدا در APK محسوب نمی‌شود.</p></div><div id="audio-grid" class="audio-grid"></div></section>
<section id="panel-status" class="panel" role="tabpanel" aria-labelledby="tab-status" hidden>
<div class="status-intro"><article class="purpose"><h2>الان به چه درد می‌خورد؟</h2><p>یک <strong>نمونهٔ اولیهٔ آموزشی برای شروع انگلیسی</strong>: خواندن درس‌های پایه، یادگیری واژه‌ها و دیدن مثال‌های سلام‌واحوال‌پرسی، معرفی، اعداد، زمان و موقعیت‌های روزمره. محتوای فعلی را همین‌جا می‌توانی مرور کنی.</p><p>متن بیشتر درس‌ها انگلیسی است؛ ترجمهٔ فارسی عمدتاً برای واژه‌ها وجود دارد. این مجموعه هنوز یک دورهٔ کاملِ فارسی‌توضیح یا مربی مکالمه نیست.</p></article><article class="purpose-avoid"><h3>فعلاً روی چه چیزهایی حساب نکن؟</h3><p>ضبط و ارزیابی تلفظ، نمره‌دهی واقعی، آزمون جامع، مرور پاسخ‌های غلط، استریک واقعی یا یک اپ اندرویدیِ نصب‌شده و تست‌شده. عنوان «۱۵ بخش کامل» که قبلاً گفته شده بود، با پیاده‌سازی فعلی تطابق ندارد.</p></article></div>
<div class="status-section"><h3 class="status-heading"><span class="status-dot"></span>محتوایی که واقعاً در فایل‌ها وجود دارد</h3><div class="status-grid">
<article class="status-card"><span class="badge">وجود محتوا تأیید شد</span><h4>۶ فصل، ۲۵ درس و ۱۰۰ واژه</h4><p>درس‌ها شامل متن، مثال، نکته و پرسش‌اند. واژه‌ها معنی فارسی، تلفظ نوشتاری و جملهٔ نمونه دارند. این اعداد از فایل محتوای پروژه شمرده شده‌اند.</p><code>assets/curriculum.json</code></article>
<article class="status-card"><span class="badge">وجود فایل تأیید شد</span><h4>۸ فایل MP3 و تصویر لئو</h4><p>فایل‌های صوتی و تصویر همراه سورس هستند. وجود فایل با متصل‌بودن دکمهٔ پخش یا تست صدا روی گوشی فرق دارد.</p><code>assets/audio/*.mp3 · assets/mascot.png</code></article>
<article class="status-card"><span class="badge">دادهٔ آموزشی موجود</span><h4>۲۵ پرسش و ۶ یادداشت گرامر</h4><p>پرسش‌ها پاسخ پیشنهادی دارند، نه گزینه‌های چندگزینه‌ای. ۶ یادداشت گرامر در داده‌ها هستند و توضیحشان انگلیسی است؛ این فیلدها در صفحهٔ فعلی اپ نمایش داده نمی‌شوند.</p><code>assets/curriculum.json → blocks / grammar</code></article>
<article class="status-card"><span class="badge">صفحه‌ها نوشته شده‌اند</span><h4>خانه، دوره‌ها، درس، واژه‌های ذخیره و تنظیمات</h4><p>کد این صفحه‌ها و مسیرهای ناوبری وجود دارد. نمایش و تعامل آن‌ها در Android در این بررسی اجرا نشده است؛ این راهنما بازسازی رابط اصلی نیست.</p><code>app/index.tsx · courses.tsx · lesson/[id].tsx · vocab.tsx · progress.tsx · settings.tsx</code></article>
</div></div>
<div class="status-section"><h3 class="status-heading"><span class="status-dot blue"></span>به کد ذخیره‌سازی متصل است؛ هنوز روی دستگاه تأیید نشده</h3><div class="status-grid">
<article class="status-card blue"><span class="badge">کد متصل · NOT TESTED روی Android</span><h4>علامت‌گذاری تکمیل درس و فهرست پیشرفت</h4><p>دکمهٔ تکمیل درس، تابع نوشتن در SQLite را صدا می‌زند و صفحهٔ پیشرفت داده‌ها را می‌خواند. ماندگاری پس از بستن اپ و حالت هواپیما هنوز روی دستگاه آزمایش نشده‌اند.</p><code>setLessonProgress() · getAllProgress()</code></article>
<article class="status-card blue"><span class="badge">کد متصل · NOT TESTED روی Android</span><h4>ذخیره و حذف واژهٔ دلخواه</h4><p>دکمهٔ نشانک به تابع درج/حذف SQLite متصل است و صفحهٔ واژه‌ها، فهرست نشانک‌ها را می‌خواند. نتیجهٔ واقعی روی گوشی تأیید نشده است.</p><code>toggleBookmark() · getBookmarks()</code></article>
<article class="status-card blue"><span class="badge">کد متصل · NOT TESTED روی Android</span><h4>خروجی JSON و پاک‌کردن پیشرفت با تأیید</h4><p>کد خروجی فایل، اشتراک‌گذاری و پیام تأیید حذف وجود دارد. بازیابی یا واردکردن فایل پشتیبان پیاده نشده؛ خروجی فایل به معنی امکان بازیابی کامل نیست.</p><code>exportProgressToJson() · clearAllProgress() · app/settings.tsx</code></article>
<article class="status-card blue"><span class="badge">هنوز اجرا و تأیید نشده</span><h4>نصب APK و کارکرد واقعی آفلاین</h4><p>طبق خروجی شما، Expo Doctor در ۱۷ بررسی موفق بوده است. این نتیجه فقط بررسی‌های آن ابزار است، نه ساخت APK، اجرای درس‌ها یا آزمون روی گوشی.</p><code>APK / emulator / airplane-mode journey: NOT TESTED</code></article>
</div></div>
<div class="status-section"><h3 class="status-heading"><span class="status-dot red"></span>بخش‌های نمایشی، ناتمام یا غایب در پیاده‌سازی فعلی</h3><div class="status-grid">
<article class="status-card red"><span class="badge">فقط پیام نمایشی</span><h4>پخش صدا و ضبط میکروفون</h4><p>دکمه‌های پخش و ضبط فقط Alert نشان می‌دهند؛ فراخوانی واقعیِ پخش فایل یا ضبط صدا در آن‌ها نیست. پیام «پخش شد» یا «میکروفون روشن شد» شاهد انجام این کارها نیست.</p><code>app/lesson/[id].tsx → Listening / Speaking</code></article>
<article class="status-card red"><span class="badge">ذخیرهٔ پاسخ انجام نمی‌شود</span><h4>«نمایش پاسخ + ذخیره تلاش»</h4><p>دکمه فقط پاسخ آماده را نشان می‌دهد و وضعیت موقت صفحه را تغییر می‌دهد. پیام ذخیره‌شدن پاسخ در این بخش با نوشتن واقعی در SQLite پشتیبانی نمی‌شود؛ نمره‌دهی هم وجود ندارد.</p><code>app/lesson/[id].tsx → QUESTION / quizAnswer</code></article>
<article class="status-card red"><span class="badge">مقدار ثابت؛ نه محاسبه‌شده</span><h4>استریک ۳روزه و ۲ نشان</h4><p>این عددها در کد ثابت‌اند؛ از روزهای مطالعه یا دستاورد واقعی محاسبه نمی‌شوند. نباید آن‌ها را پیشرفت واقعی کاربر حساب کرد.</p><code>app/index.tsx · app/progress.tsx</code></article>
<article class="status-card red"><span class="badge">کلیدها به رفتار لازم متصل نیستند</span><h4>تنظیم صدا، تم تیره و متن بزرگ</h4><p>کلیدها فقط وضعیت همان صفحه را عوض می‌کنند؛ تنظیماتشان ذخیره نمی‌شود و به صدا، اندازهٔ متن یا تم سراسری وصل نیستند. برخی رنگ‌های پوسته جداگانه از تم سیستم گرفته می‌شوند.</p><code>app/settings.tsx → sound / dark / bigText · app/_layout.tsx</code></article>
<article class="status-card red"><span class="badge">جریان کاربری کامل وجود ندارد</span><h4>آزمون جامع، مرور غلط‌ها و جمله‌سازی تعاملی</h4><p>ساخته‌شدن جدول quiz_attempts یا exam_results در دیتابیس به معنی داشتن آزمون کامل نیست. در صفحات فعلی، این جریان‌های نمره‌دار پیاده نشده‌اند؛ جمله‌سازی فقط یک پیشنهاد متنی است.</p><code>lib/db.ts · app/lesson/[id].tsx</code></article>
<article class="status-card red"><span class="badge">نمایش محتوا ناقص است</span><h4>مثال‌ها، هشدارها و یادداشت گرامر</h4><p>بعضی بلوک‌ها مانند EXAMPLE و WARNING در صفحهٔ اپ با JSON.stringify نمایش داده می‌شوند؛ فیلد جداگانهٔ grammar خوانده نمی‌شود. این راهنما آن داده‌ها را خوانا نشان می‌دهد، نه اینکه اپ را اصلاح کرده باشد.</p><code>app/lesson/[id].tsx → default block rendering</code></article>
</div></div>
<div class="notice red"><svg class="icon"><use href="#i-info"/></svg><p><strong>وضعیت امنیت پروژهٔ Android تغییر نکرده است.</strong>گزارش npm که فرستادی هنوز ۱ مورد CRITICAL و ۲۲ مورد HIGH دارد. در این پیش‌نمایش هیچ بستهٔ Expo اجرا یا نصب نمی‌شود، اما این موضوع آسیب‌پذیری‌های پروژهٔ اصلی را رفع نمی‌کند. دسترسی‌پذیری آن‌ها در APK هم در این بررسی تأیید نشده است.</p></div>
</section>
<footer class="footer"><p><strong>این فایل فقط یک راهنمای تعاملیِ جداست.</strong>هیچ حساب، دیتابیس یا پیشرفت واقعی را نمی‌خواند و تغییر نمی‌دهد. تصاویر، محتوا و فایل‌های صوتی داخل همین HTML قرار دارند. کنترل‌های مرور و جست‌وجوی این راهنما به معنی وجود همان قابلیت در اپ نیستند.</p><span class="edition">SOURCE WALKTHROUGH · 2026-11-04 · v1</span></footer>
</main>
<script type="application/json" id="curriculum-data">__CURRICULUM__</script>
<script type="application/json" id="audio-data">__AUDIO__</script>
<script id="preview-script">
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
</script>
</body>
</html>'''
html = html.replace('__HERO__', hero_uri).replace('__CURRICULUM__', safe_json(curriculum)).replace('__AUDIO__', safe_json(audio))
OUTPUT.write_text(html, encoding='utf-8')
for relative, expected in source_hashes.items():
    assert hashlib.sha256((SOURCE / relative).read_bytes()).hexdigest() == expected
manifest = {
    'date': '2026-11-04',
    'deliverable': OUTPUT.name,
    'purpose': 'Separate interactive source-content walkthrough, NOT native Android UI or APK execution',
    'counts': counts,
    'source_files_sha256': source_hashes,
    'source_modifications': 'None',
    'external_resources': 'None; curriculum, image, and original MP3 files embedded',
    'browser_execution': 'NOT TESTED at creation',
    'android_execution': 'NOT TESTED',
    'security_remediation': 'None',
    'bytes': OUTPUT.stat().st_size,
    'sha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
}
(ROOT / 'EnglishLearning-Features-Preview-v1/source-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(OUTPUT.name)
print('Bytes:', OUTPUT.stat().st_size)
print('Counts:', counts)
print('Original source files unchanged. No dependencies installed; no APK build attempted.')
