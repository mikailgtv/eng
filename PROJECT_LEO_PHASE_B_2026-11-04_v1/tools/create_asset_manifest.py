from pathlib import Path
from PIL import Image
import csv,json,hashlib
ROOT=Path('/home/user/PROJECT_LEO_PHASE_B_2026-11-04_v1')
entries=[]
def add(path,category,origin,rights,review,usage,derived=''):
 p=ROOT/path;assert p.is_file(),path
 width=height='';alpha='N/A'
 if p.suffix.lower() in {'.png','.webp','.jpg','.jpeg'}:
  with Image.open(p) as im:
   width,height=im.size;alpha=str(im.mode=='RGBA' and im.getchannel('A').getextrema()[0]<255)
 entries.append({'asset_id':'LEO-B-'+str(len(entries)+1).zfill(4),'path':path,'category':category,'format':p.suffix.lstrip('.'),'bytes':p.stat().st_size,'width':width,'height':height,'has_alpha':alpha,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'provenance':origin,'derived_from':derived,'rights_status':rights,'review_status':review,'intended_use':usage})
active=json.loads((ROOT/'design/ACTIVE_LEO_ASSETS.json').read_text())
for a in active:
 for fmt in ['svg','png']:
  add(a[fmt],'Leo character / '+a['state']+' / '+a['view'],'Original procedural vector artwork authored for Project Leo Phase B','Project-authored design; trademark/human art approval pending',a['acceptance'],'Canonical design prototype / static fallback, not production rig',a['svg'] if fmt=='png' else 'tools/create_leo_assets.py')
add('assets/leo/concepts/leo-art-direction-study.png','Exploratory AI concept','Arena image generation tool; original text brief; not traced as a final rig','Generation/platform terms and commercial clearance not independently reviewed','EXPLORATION ONLY; NOT CANONICAL; not used in active UI','Art-direction reference only','reference/LEO_IMAGE_CONCEPT_PROMPT.txt')
for p in sorted((ROOT/'assets/icons/svg').glob('*.svg')):add(str(p.relative_to(ROOT)),'Original icon','Generic geometry authored in this Phase B; not a third-party icon package','Project-authored design; review pending','DESIGN CANDIDATE','UI icon source')
for p in sorted((ROOT/'assets/icons/png').glob('*.png')):add(str(p.relative_to(ROOT)),'Icon derivative','Local authoring raster export using existing fontTools/Pillow','Same as original icon source','RASTER FORMAT CHECKED; native rendering untested','Reference / raster fallback','assets/icons/svg/'+p.stem+'.svg')
add('assets/icons/leo-icon-sprite.svg','Icon sprite','Original icon paths grouped into symbols','Same as icon sources','DESIGN CANDIDATE','Reference / independent prototype')
for stem in ['Vazirmatn-Variable','LeoReadingSans-Variable-v2']:
 for ext in ['ttf','woff']:
  path='assets/fonts/'+stem+'.'+ext
  add(path,'Typography','Official Google Fonts source; Git blob/SHA evidence; Noto subset renamed with modification notice','SIL OFL 1.1; original license/copyright included','SAMPLE GLYPH COVERAGE CHECKED; native shaping untested','Offline design typography','evidence/FONT_PROVENANCE.json' if stem.startswith('Vazir') else 'evidence/LATIN_IPA_FONT_PROVENANCE.json')
for p in sorted((ROOT/'assets/audio').glob('*.mp3')):
 source=Path('/home/user/EnglishLearning-Offline/assets/audio')/p.name
 assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(p.read_bytes()).digest()
 add(str(p.relative_to(ROOT)),'Legacy audio / unchanged','Existing project asset, copied byte-for-byte; no new narration generated','Legacy rights/speaker/qualified audio review unverified','NOT APPROVED FOR COMMERCIAL RELEASE; playback not auditioned here','Design sample playback only','EnglishLearning-Offline/assets/audio/'+p.name)
add('reference/legacy-curriculum.json','Legacy educational data / unchanged','Existing JSON curriculum; source file preserved','Legacy provenance/linguistic/pedagogical approval unverified','LEGACY_DRAFT; no teacher review claim','Real sample content for visual design','EnglishLearning-Offline/assets/curriculum.json')
metrics=json.loads((ROOT/'evidence/MOCKUP_GEOMETRY_MEASUREMENTS_DELIVERY.json').read_text())
assert len(metrics['artboards'])==127 and len({x['file'] for x in metrics['artboards']})==127
for a in metrics['artboards']:
 add(a['file'],'Design artboard / '+a['screen'],'Authored with Phase B tokens, fonts, content and canonical assets; Pillow RAQM','Project design; underlying fonts OFL and legacy content review pending','ARTBOARD, NOT BROWSER/NATIVE SCREENSHOT','Visual reference / state design','tools/render_design_boards_v4.py')
add('prototype/LEO_DESIGN_PROTOTYPE_FINAL.html','Independent design prototype','Standalone HTML/CSS/JS design simulation with embedded assets/fonts/content','Contains OFL fonts, original design and review-unverified legacy audio/content','PARTIAL design gate; simulated DOM tested, browser/TalkBack/native not tested','Visual exploration only; not APK or Android app','prototype/prototype-v8.js; prototype/prototype-v3.css')
assert len({e['path'] for e in entries})==len(entries)
with (ROOT/'PHASE_B_ASSET_MANIFEST.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(entries[0]));w.writeheader();w.writerows(entries)
(ROOT/'evidence/ACTIVE_ASSET_SUMMARY.json').write_text(json.dumps({'asset_entries':len(entries),'character_pairs':len(active),'front_expressions':16,'reference_views':4,'additional_portrait':1,'additional_blink_keyframe':1,'icon_shapes':32,'design_artboards':127,'legacy_audio_files':8,'generated_audio_files':0,'prototype':'prototype/LEO_DESIGN_PROTOTYPE_FINAL.html','status':'DESIGN ONLY; not an application release'},indent=2))
print('Active asset manifest entries:',len(entries),'with provenance, review and rights status.')
