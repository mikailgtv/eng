from pathlib import Path
import csv,json,hashlib,zipfile
ROOT=Path('/home/user');B=ROOT/'PROJECT_LEO_PHASE_B_2026-11-04_v1'
files=set()
def add(relative):
 p=B/relative;assert p.is_file(),relative;files.add(p)
for p in B.glob('*.md'):files.add(p)
add('PHASE_B_ASSET_MANIFEST.csv')
for row in csv.DictReader((B/'PHASE_B_ASSET_MANIFEST.csv').open(encoding='utf-8-sig')):add(row['path'])
for name in ['design/tokens-v2.json','design/screens-v3.json','design/screen-states-v2.json','design/SCREEN_STATE_MATRIX_v2.csv','design/motions.json','design/icons.json','design/ACTIVE_LEO_ASSETS.json','design/INITIAL_CONFLICT_LOG.md','design/PROTOTYPE_LIMITS.md','docs/PHASE_B_KNOWLEDGE_MAP.md','prototype/prototype-v8.js','prototype/prototype-v3.css','assets/fonts/OFL-Vazirmatn.txt','assets/fonts/OFL-NotoSans.txt','assets/fonts/DERIVATION_NOTICE_v2.md','reference/LEO_IMAGE_CONCEPT_PROMPT.txt','reference/ANIMATION_LICENSE_REFERENCES.json']:
 add(name)
for name in ['PHASE_A_INPUT_FILES.json','FONT_PROVENANCE.json','LATIN_IPA_FONT_PROVENANCE.json','FONT_WOFF_VALIDATION.json','PERSIAN_GLYPH_COVERAGE.json','CONTRAST_MEASUREMENTS.csv','LEO_ASSET_GEOMETRY.json','LEO_RASTER_VALIDATION_v3.json','ICON_EXPORTS.json','PROTOTYPE_BUILD_RECORD_FINAL.json','PROTOTYPE_LOGIC_TESTS_DELIVERY.json','STATIC_MARKUP_REVIEW_DELIVERY.json','MOCKUP_GEOMETRY_MEASUREMENTS_DELIVERY.json','ACTIVE_ASSET_SUMMARY.json','REJECTED_TRIAL_INDEX.json','PHASE_B_DELIVERY_VALIDATION.json']:
 add('evidence/'+name)
for name in ['README.md','design_data.py','create_leo_assets.py','rasterize_design_svg_v3.py','render_design_boards_v4.py','build_prototype_final.py','test_design_prototype_delivery.cjs','check_design_markup_delivery.py','write_phase_b_documents.py','create_asset_manifest.py','validate_phase_b_delivery.py','package_phase_b.py']:
 add('tools/'+name)
for p in files:
 assert p.suffix.lower() not in {'.db','.sqlite','.sqlite3','.dump','.apk','.aab','.exe','.msi','.msix','.pem','.key','.jks','.keystore','.p12','.pfx'}
 assert not p.name.startswith('.env') and p.name not in {'.npmrc','.netrc','.git-credentials'}
 assert not any(k in {'node_modules','.git','phase-a-extracted','__pycache__'} for k in p.relative_to(B).parts)
assert all('REJECTED_GENERATED_TRIALS' not in p.name for p in files)
manifest={'project':'Project Leo','phase':'B only','date':'2026-11-04','gate':'PARTIAL','C_entry_accepted':False,'application_code_modified':False,'database_modified':False,'dependencies_installed_or_changed':False,'files':[{'path':str(p.relative_to(B)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)],'notes':['Self-contained DESIGN PROTOTYPE is not an APK.','Design artboards are not runtime screenshots.','Rejected trials and the extracted duplicate Phase A reference are retained separately and excluded from active delivery.','Human art/owner review, browser/accessibility and content checks remain open.','This manifest does not hash itself; archive checksum is supplied separately.']}
p=B/'DELIVERY_MANIFEST.json'
with p.open('x',encoding='utf-8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
files.add(p)
archive=ROOT/'PROJECT_LEO_PHASE_B_2026-11-04_v1.zip'
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(files):z.write(p,arcname=str(Path(B.name)/p.relative_to(B)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(files)
 for p in files:assert z.read(str(Path(B.name)/p.relative_to(B)))==p.read_bytes()
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
with (ROOT/(archive.name+'.sha256')).open('x',encoding='utf-8') as f:f.write(sha+'  '+archive.name+'\n')
report={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':sha,'file_count':len(files),'crc_valid':True,'all_members_match_current_files':True,'required_deliverables':13,'prototype':'PROJECT_LEO_PHASE_B_2026-11-04_v1/prototype/LEO_DESIGN_PROTOTYPE_FINAL.html','verdict':'PARTIAL','C_started':False,'original_database_sha256':hashlib.sha256((ROOT/'prisma/dev.db').read_bytes()).hexdigest(),'original_lock_sha256':hashlib.sha256((ROOT/'package-lock.json').read_bytes()).hexdigest()}
with (ROOT/'PROJECT_LEO_PHASE_B_2026-11-04_v1_DELIVERY.json').open('x') as f:json.dump(report,f,indent=2)
print(json.dumps(report,indent=2))
