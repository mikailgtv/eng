from pathlib import Path
import re,csv,json,hashlib,xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path('/home/user');B=ROOT/'PROJECT_LEO_PHASE_B_2026-11-04_v1'
required=['PHASE_B_PRODUCT_DECISIONS.md','PHASE_B_LEO_CHARACTER_BIBLE.md','PHASE_B_DESIGN_SYSTEM.md','PHASE_B_COLOR_TYPOGRAPHY_TOKENS.md','PHASE_B_SCREEN_MAP.md','PHASE_B_SCREEN_SPECIFICATIONS.md','PHASE_B_UX_FLOWS.md','PHASE_B_ANIMATION_STORYBOARD.md','PHASE_B_ACCESSIBILITY_REVIEW.md','PHASE_B_ASSET_MANIFEST.csv','PHASE_B_DESIGN_QA_REPORT.md','PHASE_B_DECISION_LOG.md','PHASE_B_FINAL_REPORT_FA.md']
assert all((B/p).is_file() and (B/p).stat().st_size>500 for p in required)
active=list(csv.DictReader((B/'PHASE_B_ASSET_MANIFEST.csv').open(encoding='utf-8-sig')))
for row in active:
 p=B/row['path'];assert p.is_file(),row['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'],row['path']
assert len({r['path'] for r in active})==len(active)
screens=json.loads((B/'design/screens-v3.json').read_text());states=json.loads((B/'design/screen-states-v2.json').read_text())
assert len(screens)==67 and len(states)==938
assert len({(x['screen_id'],x['state']) for x in states})==938
assert all(x['applicable'] or x['rationale'].startswith('N/A') for x in states)
assert sum(not x['applicable'] for x in states)==248
assert set(s['group'] for s in screens)==set('ABCDEFGHI')
alpha=json.loads((B/'design/ACTIVE_LEO_ASSETS.json').read_text());assert len(alpha)==21
for a in alpha:
 ET.parse(B/a['svg'])
 with Image.open(B/a['png']) as im:assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)
metrics=json.loads((B/'evidence/MOCKUP_GEOMETRY_MEASUREMENTS_DELIVERY.json').read_text());assert len(metrics['artboards'])==127
assert metrics['all_targets_48'] and not metrics['text_width_issues']
links=[];broken=[]
# Validate public deliverable documentation, not extracted inputs or draft source records.
mds=list(B.glob('*.md'))+list((B/'docs').glob('*.md'))+list((B/'design').glob('*.md'))+list((B/'assets/fonts').glob('*v2.md'))+[B/'tools/README.md']
for p in mds:
 for label,target in re.findall(r'(?<!!)\[([^\]]+)\]\(([^)]+)\)',p.read_text()):
  if target.startswith(('http://','https://','mailto:','#')):continue
  path=target.split('#',1)[0];links.append((str(p.relative_to(B)),path))
  if not (p.parent/path).exists():broken.append((str(p.relative_to(B)),path))
assert not broken,broken
base=json.loads((B/'evidence/PROTECTED_BASELINE.json').read_text());missing=[];changed=[]
for rel,expected in base.items():
 p=ROOT/rel
 if not p.is_file():missing.append(rel);continue
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 if h.hexdigest()!=expected:changed.append(rel)
assert not missing and not changed,(missing,changed)
# Screen for obvious embedded credentials without printing candidate values.
patterns={'private_key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----','token_literal':r'\bgh[pousr]_[A-Za-z0-9]{20,}','jwt_literal':r'\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}','db_connection':r'(?i)\b(?:postgresql|postgres|mysql|sqlserver)://[^\s]+','credential_url':r'https?://[^\s/@]+:[^\s/@]+@'}
findings=[]
for p in mds+[B/'PHASE_B_ASSET_MANIFEST.csv']:
 t=p.read_text(encoding='utf-8-sig')
 for name,pattern in patterns.items():
  if re.search(pattern,t):findings.append({'file':str(p.relative_to(B)),'kind':name})
assert not findings,findings
report={'date':'2026-11-04','phase':'B only','overall_gate':'PARTIAL','entry_to_C_accepted':False,'phase_C_to_O_started':False,'required_deliverables':13,'screen_definitions':67,'screen_state_cells':938,'na_with_reason':248,'active_asset_entries':len(active),'active_svg_png_character_pairs':21,'authored_artboards':127,'measured_target_rectangles':sum(len(x['targets']) for x in metrics['artboards']),'measured_text_lines':sum(len(x['text_measurements']) for x in metrics['artboards']),'artboard_text_width_failures':len(metrics['text_width_issues']),'internal_links_checked':len(links),'broken_links':broken,'protected_original_files_hash_checked':len(base),'original_files_changed':changed,'original_files_missing':missing,'database_sha256':hashlib.sha256((ROOT/'prisma/dev.db').read_bytes()).hexdigest(),'application_or_dependency_changes':False,'original_docs_overwritten':False,'obvious_credential_pattern_findings':findings,'screening_scope':'Limited pattern scan and explicit output exclusion, not comprehensive security certification','actually_tested':['Contrast math on 32 defined pairs','Glyph coverage on current samples and 57 Persian-block chars','TTF/WOFF cmap equality','SVG parse and 21 RGBA alpha checks','127 authored raster boards and bounded layout measurements','8 groups of isolated logic/static checks with a simulated DOM','Static markup on 67 generated screen outputs','Artifact/link/source-preservation checks'],'not_tested':['Real browser UX/focus/keyboard and computed layout','TalkBack/screen readers','Native Android/Windows rendering and font scaling','Physical touch/microphone/audible audio playback','FPS/GPU/PSS or device performance','Actual app persistence/migrations/backup/sync','Qualified content/audio/SME review','Real-user usability and final owner/artist approval'],'remaining_gates':['Non-front character construction refinement and owner approval','Real browser/accessibility validation','Content/audio alignment and copy review','English UI localization completion if in first-release scope','C0 source/runtime/security and L1 foundation authorization']}
with (B/'evidence/PHASE_B_DELIVERY_VALIDATION.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print(json.dumps({k:v for k,v in report.items() if k not in ['actually_tested','not_tested','remaining_gates','database_sha256']},ensure_ascii=False,indent=2))
