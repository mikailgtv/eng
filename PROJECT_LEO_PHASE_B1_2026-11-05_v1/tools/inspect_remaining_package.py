"""B1 read-only inspection of a retained subset. Does not reconstruct the B ZIP.
Decoded evidence images are exact bytes already embedded in a retained record,
not generated artwork and not restored into the original application/package.
"""
from pathlib import Path
from collections import Counter,defaultdict
from urllib.parse import unquote
import csv,json,hashlib,re,gzip,base64,io
from html.parser import HTMLParser
from PIL import Image

R=Path('/home/user');B=R/'PROJECT_LEO_PHASE_B_2026-11-04_v1';O=R/'PROJECT_LEO_PHASE_B1_2026-11-05_v1'
for name in ['evidence','registers','tools','review']:(O/name).mkdir(parents=True,exist_ok=True)

def sha(data):return hashlib.sha256(data).hexdigest()
def save_json(name,data):
 p=O/name;p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
def save_csv(name,rows,fields=None):
 p=O/name
 with p.open('x',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=fields or list(rows[0]));writer.writeheader();writer.writerows(rows)

required=['PHASE_B_PRODUCT_DECISIONS.md','PHASE_B_LEO_CHARACTER_BIBLE.md','PHASE_B_DESIGN_SYSTEM.md','PHASE_B_COLOR_TYPOGRAPHY_TOKENS.md','PHASE_B_SCREEN_MAP.md','PHASE_B_SCREEN_SPECIFICATIONS.md','PHASE_B_UX_FLOWS.md','PHASE_B_ANIMATION_STORYBOARD.md','PHASE_B_ACCESSIBILITY_REVIEW.md','PHASE_B_ASSET_MANIFEST.csv','PHASE_B_DESIGN_QA_REPORT.md','PHASE_B_DECISION_LOG.md','PHASE_B_FINAL_REPORT_FA.md']
manifest=json.loads((B/'DELIVERY_MANIFEST.json').read_text())
expected={row['path']:row for row in manifest['files']}
rows=[]
for rel,entry in expected.items():
 p=B/rel;present=p.is_file();actual=sha(p.read_bytes()) if present else ''
 rows.append({'path':rel,'declared_bytes':entry['bytes'],'exists_in_current_mirror':present,'actual_bytes':p.stat().st_size if present else '', 'expected_sha256':entry['sha256'],'actual_sha256':actual,'test_status':'PASS' if present and actual==entry['sha256'] and p.stat().st_size==entry['bytes'] else 'FAIL' if present else 'BLOCKED','scope':'Available-file bytes compared; absent means unavailable here, not proven absent from the original ZIP'})
save_csv('registers/DELIVERY_FILE_CHECKS.csv',rows)
required_rows=[{'file':name,'declared_in_manifest':name in expected,'present_now':(B/name).is_file(),'status':'PASS' if name in expected and (B/name).is_file() and sha((B/name).read_bytes())==expected[name]['sha256'] else 'BLOCKED'} for name in required]
save_csv('registers/REQUIRED_13_FILES.csv',required_rows)

# Check document links against both the declared package namespace and the current mirror.
link_rows=[];allpaths=set(expected)|{'DELIVERY_MANIFEST.json'}
for rel in sorted(expected):
 if not rel.endswith('.md') or not (B/rel).is_file():continue
 text=(B/rel).read_text(encoding='utf-8')
 for label,target in re.findall(r'(?<!!)\[([^\]]+)\]\(([^)]+)\)',text):
  if target.startswith(('https://','http://','mailto:','#')):continue
  clean=unquote(target.split('#',1)[0]);dest=((B/rel).parent/clean).resolve()
  try:normal=str(dest.relative_to(B))
  except ValueError:normal='[OUTSIDE_PACKAGE]'
  declared=normal in allpaths
  link_rows.append({'document':rel,'label':label,'target':clean,'normalized_target':normal,'declared_in_package':declared,'available_now':dest.is_file() if normal!='[OUTSIDE_PACKAGE]' else False,'namespace_status':'PASS' if declared else 'FAIL','current_resolution_status':'PASS' if declared and dest.is_file() else 'BLOCKED' if declared else 'FAIL','runtime_link_navigation':'BLOCKED — real browser unavailable'})
save_csv('registers/INTERNAL_LINK_CHECKS.csv',link_rows)

assets=list(csv.DictReader((B/'PHASE_B_ASSET_MANIFEST.csv').open(encoding='utf-8-sig')))
assert len({x['asset_id'] for x in assets})==len(assets)
assert len({x['path'] for x in assets})==len(assets)
expected_sha=defaultdict(list)
for a in assets:expected_sha[a['sha256']].append(a)
embedded=[];recovered={}
markup_path=B/'evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz'
class Collect(HTMLParser):
 def __init__(self):super().__init__();self.data=[]
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if key=='src' and value and value.startswith('data:'):self.data.append((tag,value))
if markup_path.is_file():
 markup_bytes=markup_path.read_bytes()
 expected_record=expected.get('evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz')
 record_auth='MATCHES_DELIVERY_MANIFEST' if expected_record and sha(markup_bytes)==expected_record['sha256'] else 'RETAINED_UNLISTED_EVIDENCE'
 markup=json.loads(gzip.decompress(markup_bytes))
 for sid,html in markup.items():
  parser=Collect();parser.feed(html)
  for tag,uri in parser.data:
   if ';base64,' not in uri:continue
   prefix,payload=uri.split(';base64,',1)
   try:data=base64.b64decode(payload,validate=True)
   except Exception:continue
   digest=sha(data)
   if digest not in expected_sha:continue
   for a in expected_sha[digest]:
    rec={'asset_path':a['path'],'screen':sid,'retained_record':'evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz','retained_record_provenance':record_auth,'bytes':len(data),'sha256':digest,'media_type':prefix[5:],'status':'PASS','scope':'Exact embedded bytes match the asset manifest; NOT original ZIP presence, NOT browser execution'}
    embedded.append(rec)
    if a['path'] not in recovered:
     evidence_path=''
     if prefix=='data:image/png':
      evidence_dir=O/'evidence/verified_embedded_pngs';evidence_dir.mkdir(exist_ok=True)
      p=evidence_dir/(digest+'.png')
      if not p.exists():
       with p.open('xb') as f:f.write(data)
      evidence_path=str(p.relative_to(O))
     recovered[a['path']]={'data':data,'origin':'retained simulated-render markup, exact asset hash match','evidence_file':evidence_path}
 save_json('evidence/RETAINED_MARKUP_ORIGIN.json',{'file':'evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz','sha256':sha(markup_bytes),'listed_in_delivered_manifest':bool(expected_record),'provenance':record_auth,'note':'This is a historical simulated-DOM record. B1 does not rerun or count it as a real browser test.'})
if embedded:save_csv('registers/EMBEDDED_ASSET_HASH_MATCHES.csv',embedded)

# Original public project audio remains available. Compare its bytes, never imply B package presence.
byte_sources={}
for a in assets:
 direct=B/a['path']
 if direct.is_file():byte_sources[a['path']]={'data':direct.read_bytes(),'origin':'current B mirror file','evidence_file':''}
 elif a['path'] in recovered:byte_sources[a['path']]=recovered[a['path']]
 elif a['category'].startswith('Legacy audio'):
  source=R/'EnglishLearning-Offline/assets/audio'/Path(a['path']).name
  if source.is_file() and sha(source.read_bytes())==a['sha256']:
   byte_sources[a['path']]={'data':source.read_bytes(),'origin':'unchanged original public audio source, not B package file','evidence_file':''}
asset_rows=[];image_rows=[]
for a in assets:
 src=byte_sources.get(a['path']);status='BLOCKED';note='Asset bytes unavailable; declaration alone is not validation.'
 if src:
  data=src['data'];status='PASS' if sha(data)==a['sha256'] and len(data)==int(a['bytes']) else 'FAIL'
  note='Byte integrity only; no approval, native test, or original ZIP presence inferred.'
  if a['format'].lower() in {'png','webp','jpg','jpeg'}:
   try:
    with Image.open(io.BytesIO(data)) as im:
     im.load();actual_size=list(im.size);mode=im.mode;alpha_extrema=list(im.getchannel('A').getextrema()) if mode=='RGBA' else None
     alpha_fraction=round(im.getchannel('A').histogram()[0]/(im.width*im.height),6) if mode=='RGBA' else 0
    dimension_match=not a.get('width') or actual_size==[int(a['width']),int(a['height'])]
    alpha_match=a.get('has_alpha') in {'N/A',''} or (a['has_alpha']=='True')==(mode=='RGBA' and alpha_extrema[0]<255)
    image_rows.append({'asset_path':a['path'],'source_kind':src['origin'],'actual_width':actual_size[0],'actual_height':actual_size[1],'mode':mode,'alpha_extrema':str(alpha_extrema),'fully_transparent_fraction':alpha_fraction,'dimension_matches_manifest':dimension_match,'alpha_matches_manifest':alpha_match,'status':'PASS' if dimension_match and alpha_match else 'FAIL','scope':'Decode, dimensions and alpha only; not artistic approval or browser/native rendering'})
   except Exception as e:image_rows.append({'asset_path':a['path'],'source_kind':src['origin'],'actual_width':'','actual_height':'','mode':'','alpha_extrema':'','fully_transparent_fraction':'','dimension_matches_manifest':False,'alpha_matches_manifest':False,'status':'FAIL','scope':'Decode failed: '+type(e).__name__})
 asset_rows.append({'asset_id':a['asset_id'],'path':a['path'],'category':a['category'],'direct_file_available':(B/a['path']).is_file(),'verified_byte_source':src['origin'] if src else 'UNAVAILABLE','integrity_status':status,'rights_status_declared':a['rights_status'],'review_status_declared':a['review_status'],'declaration_fields_present':all(a.get(k) for k in ['provenance','rights_status','review_status','sha256']),'evidence_file':src['evidence_file'] if src else '','scope':note})
save_csv('registers/ASSET_VALIDATION.csv',asset_rows)
if image_rows:save_csv('registers/IMAGE_BYTE_VALIDATION.csv',image_rows)

# Pair tests require both actual files; a PNG alone cannot prove a matching SVG.
leo=json.loads((B/'design/ACTIVE_LEO_ASSETS.json').read_text());pairs=[]
for a in leo:
 svg=byte_sources.get(a['svg']);png=byte_sources.get(a['png'])
 pairs.append({'state':a['state'],'view':a['view'],'svg_path':a['svg'],'png_path':a['png'],'svg_bytes_available':bool(svg),'png_bytes_available':bool(png),'status':'BLOCKED' if not(svg and png) else 'NEEDS REVIEW','reason':'Both artifact payloads and render equivalence are needed. A shared name or historical raster report is insufficient.'})
save_csv('registers/LEO_PAIR_CHECKS.csv',pairs)

hashgroups=defaultdict(list)
for entry in manifest['files']:hashgroups[entry['sha256']].append(entry['path'])
dups=[{'sha256':k,'paths':v,'classification':'NEEDS REVIEW — identical declared bytes can be deliberate derivatives/duplicated evidence; not automatically a fault'} for k,v in hashgroups.items() if len(v)>1]
save_json('evidence/DECLARED_DUPLICATE_HASHES.json',dups)
summary={'date':'2026-11-05','scope':'Available retained B files plus explicitly identified exact-hash embedded/original-source bytes; not a reconstructed B ZIP','original_B_zip_available':False,'zip_extraction_status':'BLOCKED','manifest_entries':len(expected),'direct_manifest_entries_available':sum(x['exists_in_current_mirror'] for x in rows),'direct_manifest_entries_unavailable':sum(not x['exists_in_current_mirror'] for x in rows),'present_file_integrity_failures':sum(x['test_status']=='FAIL' for x in rows),'required_13_present_and_matching':sum(x['status']=='PASS' for x in required_rows),'internal_links':len(link_rows),'undeclared_link_targets':sum(x['namespace_status']=='FAIL' for x in link_rows),'current_unavailable_link_targets':sum(x['current_resolution_status']=='BLOCKED' for x in link_rows),'asset_declarations':len(assets),'direct_assets_available':sum(x['direct_file_available'] for x in asset_rows),'asset_payloads_verified_from_any_labeled_source':sum(x['integrity_status']=='PASS' for x in asset_rows),'asset_payloads_unavailable':sum(x['integrity_status']=='BLOCKED' for x in asset_rows),'embedded_png_assets_recovered':sum(bool(x['evidence_file']) for x in recovered.values()),'images_freshly_decoded':len(image_rows),'image_format_dimension_alpha_failures':sum(x['status']=='FAIL' for x in image_rows),'svg_png_pairs_blocked':sum(x['status']=='BLOCKED' for x in pairs),'declared_duplicate_hash_groups':len(dups)}
save_json('evidence/STRUCTURAL_SUMMARY.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
