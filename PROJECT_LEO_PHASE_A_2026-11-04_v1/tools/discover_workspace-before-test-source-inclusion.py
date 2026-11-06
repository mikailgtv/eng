"""Read-only Phase A discovery. Never executes application or migration code.
Private credentials are excluded; database/upload contents are not exported.
"""
from pathlib import Path, PurePosixPath
from collections import Counter, defaultdict
import csv, hashlib, json, os, re, zipfile
from PIL import Image

ROOT=Path('/home/user')
OUT=ROOT/'PROJECT_LEO_PHASE_A_2026-11-04_v1'
EXCLUDED_DIRS={'.git','.arena','.cache','.local','.npm','.venv','node_modules','.next','.nuxt','.output','.expo','.config','.ssh','.aws','.azure','dist','build','out','target','coverage','__pycache__','.playwright-cli','.pytest_cache','.mypy_cache','.ruff_cache','.svelte-kit','.turbo','.vite'}
PRIVATE_TOP={'backups','uploads','e2e'}
CODE_EXT={'.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.sh','.css','.sql','.prisma','.yml','.yaml','.toml'}
IMAGE_EXT={'.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.bmp'}
MEDIA_EXT=IMAGE_EXT|{'.mp3','.wav','.ogg','.opus','.m4a','.aac','.mp4','.webm','.ttf','.otf','.woff','.woff2','.riv','.lottie','.glb','.gltf','.blend','.psd','.ai'}

def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()

def credential(p):
    return p.name.startswith('.env') or p.name in {'.npmrc','.netrc','.git-credentials','credentials','id_rsa','id_ed25519'} or p.suffix.lower() in {'.pem','.key','.jks','.keystore','.p12','.pfx'}

def safe_text(t):
    t=re.sub(r'(?i)(?:https?|postgres(?:ql)?|mysql|sqlserver|file)://[^\s<>`\]\)]+','[URL REDACTED]',t)
    t=re.sub(r'(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b','[EMAIL REDACTED]',t)
    # Titles/headings only; do not export literal values of sensitive fields.
    if re.search(r'(?i)(password|passwd|secret|token|api.?key|bucket|authorization|cookie)\s*[:=]',t):
        return '[sensitive-looking heading redacted]'
    return t[:400]

def family(rel):
    parts=rel.parts; first=parts[0]
    if first=='EnglishLearning-Offline':return 'Expo offline prototype'
    if first.startswith('EnglishLearning-Offline-Doctor-Fix'):return 'Expo repair helper/evidence'
    if first.startswith('EnglishLearning-Features-Preview'):return 'Separate content walkthrough'
    if first in {'preview','netlify-demo','phase66-gallery'} or 'PREVIEW' in rel.name:return 'Static preview or gallery'
    if first in PRIVATE_TOP or first=='evidence':return 'Historical test/backup/upload artifact'
    if rel.suffix=='.md':return 'Historical documentation'
    if first in {'src','prisma','public','scripts','.github'} or len(parts)==1:return 'Original Next.js LMS'
    return 'Other existing artifact'

def category(rel):
    if rel.suffix.lower() in {'.db','.sqlite','.sqlite3','.dump','.db-journal','.bak'}:return 'protected data artifact'
    if rel.parts[0] in {'uploads','backups','e2e'}:return 'protected historical/test artifact'
    if rel.suffix.lower()=='.md':return 'documentation'
    if rel.suffix.lower() in MEDIA_EXT:return 'media or visual asset'
    if rel.suffix.lower()=='.zip':return 'archive'
    if rel.suffix.lower() in CODE_EXT:return 'source/configuration'
    if rel.suffix.lower() in {'.json','.webmanifest'}:return 'structured data/configuration'
    if rel.suffix.lower()=='.html':return 'HTML report/preview'
    return 'other'

rows=[];sources=[];reports=[];assets=[];routes=[];archives=[];private=Counter();skipped=Counter();summaries=defaultdict(Counter)
for base, dirs, files in os.walk(ROOT):
    dirs[:]=[d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith('PROJECT_LEO_')]
    for name in sorted(files):
        p=Path(base)/name; rel=p.relative_to(ROOT)
        if p.is_symlink():skipped['symlink']+=1;continue
        if credential(p):skipped['credential/config path']+=1;continue
        cat=category(rel); fam=family(rel); n=p.stat().st_size
        if rel.parts[0] in PRIVATE_TOP:
            private[rel.parts[0]+' files']+=1;private[rel.parts[0]+' bytes']+=n
            # No per-user filenames or data payload in the downloadable inventory.
            continue
        digest=sha(p)
        row={'path':str(rel),'family':fam,'category':cat,'bytes':n,'sha256':digest,'inspection':'metadata+hash'}
        summaries[fam]['files']+=1;summaries[fam]['bytes']+=n
        text=None
        if p.suffix.lower() in CODE_EXT|{'.md','.json','.html','.txt','.webmanifest'} or name in {'.nvmrc','.gitignore'}:
            try:text=p.read_text(encoding='utf-8');row['inspection']='text scanned+hash'
            except UnicodeError:row['inspection']='binary metadata+hash'
        rows.append(row)
        if text is not None and p.suffix.lower() in CODE_EXT:
            source={'path':str(rel),'family':fam,'lines':len(text.splitlines()),'bytes':n,
                    'exports':' | '.join(sorted(set(re.findall(r'export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|type|interface)\s+(\w+)',text)))),
                    'flags':' | '.join(flag for flag,pattern in [('TODO',r'\bTODO\b'),('FIXME',r'\bFIXME\b'),('placeholder',r'placeholder'),('mock/demo',r'\b(?:mock|demo|fake)\b'),('Alert/alert call',r'\b(?:Alert\.alert|alert)\s*\(')] if re.search(pattern,text,re.I)),
                    'prisma_reference':bool(re.search(r'\bprisma\b',text)),
                    'sqlite_reference':bool(re.search(r'expo-sqlite|SQLite',text)),
                    'network_api_reference':bool(re.search(r'\bfetch\s*\(|XMLHttpRequest|WebSocket',text)),
                    'inspection':'static source scan; flags are leads, not verified defects'}
            sources.append(source)
            if rel.parts[:2]==('src','app') and name in {'page.tsx','route.ts'}:
                pathparts=[x for x in rel.parts[2:-1] if not (x.startswith('(') and x.endswith(')'))]
                methods=re.findall(r'export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b',text)
                guard_calls=sorted(set(re.findall(r'\b((?:require|assert|ensure|with)[A-Z]\w*)\s*\(',text)))
                routes.append({'file':str(rel),'route':'/'+('/'.join(pathparts)),
                               'kind':'API' if name=='route.ts' else 'page',
                               'methods':','.join(methods),'guard_identifiers':','.join(guard_calls),
                               'static_only':'YES; indirect guards and runtime access not verified'})
        if text is not None and p.suffix.lower()=='.md':
            headings=[safe_text(s.lstrip('#').strip()) for s in text.splitlines() if re.match(r'^#{1,6}\s',s)]
            phases=sorted(set(re.findall(r'(?i)(?:svg)?phase[_ -]?(\d+(?:[_\.]\d+)?[Rr]?)',rel.name)))
            reports.append({'path':str(rel),'family':fam,'phase':','.join(phases),
                            'title':headings[0] if headings else '(no Markdown heading)',
                            'headings':' | '.join(headings),
                            'pass_mentions':len(re.findall(r'\bPASS(?:ED)?\b',text,re.I)),
                            'fail_mentions':len(re.findall(r'\bFAIL(?:ED)?\b',text,re.I)),
                            'not_tested_mentions':len(re.findall(r'NOT[ _-]?TESTED|BLOCKED',text,re.I)),
                            'sha256':digest,'status':'Historical claim/evidence; not re-executed in Phase A'})
        if p.suffix.lower() in MEDIA_EXT:
            purpose='historical screenshot/evidence' if rel.parts[0] in {'evidence','phase66-gallery'} else 'candidate application/media asset'
            media={'path':str(rel),'family':fam,'purpose':purpose,'format':p.suffix.lower().lstrip('.'),'bytes':n,'sha256':digest,'width':'','height':'','mode':'','provenance':'Not independently verified for commercial release','review_status':'Inventory only; no quality/legal/audio review approval'}
            if p.suffix.lower() in IMAGE_EXT-{'.svg','.ico'}:
                try:
                    with Image.open(p) as im:media.update(width=im.width,height=im.height,mode=im.mode,format=im.format)
                except Exception:media['review_status']='Image metadata could not be parsed; content not treated as valid'
            assets.append(media)
        if p.suffix.lower()=='.zip':
            try:
                with zipfile.ZipFile(p) as z:
                    entries=z.infolist(); unsafe=sum(PurePosixPath(i.filename).is_absolute() or '..' in PurePosixPath(i.filename).parts for i in entries)
                    protected_members=sum(credential(Path(i.filename)) or any(x in {'uploads','backups','.git'} for x in PurePosixPath(i.filename).parts) or Path(i.filename).suffix.lower() in {'.db','.sqlite','.dump'} for i in entries)
                    public_code=sum(Path(i.filename).suffix.lower() in CODE_EXT for i in entries)
                    manifest_summaries=[]
                    for i in entries:
                        if PurePosixPath(i.filename).name=='package.json' and 'node_modules' not in i.filename and not credential(Path(i.filename)):
                            data=json.loads(z.read(i));deps=data.get('dependencies',{})
                            manifest_summaries.append({'entry':i.filename,'name':data.get('name'),'version':data.get('version'),'next':deps.get('next'),'expo':deps.get('expo'),'react_native':deps.get('react-native')})
                    archives.append({'path':str(rel),'sha256':digest,'entries':len(entries),'code_entries':public_code,'unsafe_paths':unsafe,'protected_members':protected_members,'crc_valid':z.testzip() is None,'manifests':manifest_summaries,'note':'Inspected without extraction; not executed, not declared release-ready'})
            except Exception as e:archives.append({'path':str(rel),'status':'Inspection failed','error_type':type(e).__name__})

def write_csv(name,data):
    if not data:return
    keys=list(data[0])
    with (OUT/'inventory'/name).open('x',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(data)
for name,data in [('FILE_INVENTORY.csv',rows),('SOURCE_INDEX.csv',sources),('REPORT_REGISTER.csv',reports),('ASSET_REGISTER.csv',assets),('ROUTE_INVENTORY.csv',routes)]:write_csv(name,data)
with (OUT/'inventory/ARCHIVE_REGISTER.json').open('x',encoding='utf-8') as f:json.dump(archives,f,ensure_ascii=False,indent=2)
summary={'public_files':len(rows),'source_or_config_files':len(sources),'reports_read':len(reports),'asset_files':len(assets),'routes':len(routes),'route_types':dict(Counter(r['kind'] for r in routes)),
         'families':{k:dict(v) for k,v in summaries.items()},'private_counts':dict(private),'excluded_counts':dict(skipped),
         'discovery_mode':'Read-only; text/static/metadata inspection, not execution or comprehensive behavioral verification',
         'all_public_hashes':{r['path']:r['sha256'] for r in rows}}
with (OUT/'evidence/BASELINE_DISCOVERY.json').open('x',encoding='utf-8') as f:json.dump(summary,f,ensure_ascii=False,indent=2)
print(json.dumps({k:v for k,v in summary.items() if k!='all_public_hashes'},ensure_ascii=False,indent=2))
print('Top source areas:',dict(Counter('/'.join(Path(s['path']).parts[:3]) for s in sources if s['path'].startswith('src/'))))
print('Asset purposes:',dict(Counter(a['purpose'] for a in assets)))
print('All Markdown documents in the non-private scanned scope were read and indexed. Historical claims were not rerun.')
