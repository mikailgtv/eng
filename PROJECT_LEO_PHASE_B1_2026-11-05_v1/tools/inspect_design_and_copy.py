"""B1 static source/contracts/copy inspection. No JavaScript or DOM execution."""
from pathlib import Path
from collections import Counter
from html.parser import HTMLParser
import csv,json,re,gzip,hashlib
R=Path('/home/user');B=R/'PROJECT_LEO_PHASE_B_2026-11-04_v1';O=R/'PROJECT_LEO_PHASE_B1_2026-11-05_v1'
def j(path):return json.loads(path.read_text())
def savej(name,data):
 with (O/name).open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
def csvout(name,rows):
 with (O/name).open('x',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
screens=j(B/'design/screens-v3.json');states=j(B/'design/screen-states-v2.json');byid={x['id']:x for x in screens}
state_csv=list(csv.DictReader((B/'design/SCREEN_STATE_MATRIX_v2.csv').open(encoding='utf-8-sig')))
keymap={(x['screen_id'],x['state']):x for x in states}
state_checks=[]
for x in state_csv:
 y=keymap.get((x['screen_id'],x['state']))
 equal=y is not None and str(y['applicable']).lower()==x['applicable'].lower() and all(str(y[k])==x[k] for k in ['rationale','ui_copy','behavior','prototype_status'])
 state_checks.append({'screen_id':x['screen_id'],'state':x['state'],'original_applicability':x['applicable'],'original_rationale':x['rationale'],'contract_json_csv_status':'PASS' if equal else 'FAIL','behavior_validation_status':'NOT TESTED','note':'N/A remains N/A; schema equality does not validate visual behavior.'})
csvout('registers/STATE_CONTRACT_CHECKS.csv',state_checks)
assetrows=list(csv.DictReader((B/'PHASE_B_ASSET_MANIFEST.csv').open(encoding='utf-8-sig')))
asset_paths={x['path']:x for x in assetrows}
fullspec=(B/'PHASE_B_SCREEN_SPECIFICATIONS.md').read_text()
per_screen=[]
for s in screens:
 sid=s['id'];path='mockups/phone/'+sid+'__Available'+('_v2' if sid in ['C03','C04','C05','D04'] else '')+'.webp'
 specific=[x for x in states if x['screen_id']==sid]
 fields=['purpose','learning_goal','user_action','visible_content','feedback_contract','error_contract','interruption_contract','persistence_contract','accessibility']
 bad=[k for k in fields if not s.get(k)]
 per_screen.append({'screen_id':sid,'group':s['group'],'title':s['title'],'reference_artboard':path,'declared_in_asset_manifest':path in asset_paths,'artboard_available_now':(B/path).is_file(),'reference_payload_review':'PASS' if (B/path).is_file() else 'BLOCKED','spec_section_present':bool(re.search(r'^## '+re.escape(sid)+r'\s',fullspec,re.M)),'missing_spec_fields':','.join(bad),'state_count':len(specific),'na_count':sum(not x['applicable'] for x in specific),'na_without_reason':sum(not x['applicable'] and not x['rationale'].startswith('N/A') for x in specific),'next_id':s['next'],'next_id_exists':s['next'] in byid,'contract_structure_status':'PASS' if not bad and len(specific)==14 and s['next'] in byid else 'FAIL','semantic_review_status':'FAIL' if sid in ['B02','D03'] else 'NEEDS REVIEW','visual_behavior_status':'BLOCKED','runtime_status':'BLOCKED','note':'Individual artboards/prototype unavailable. Semantic observations are static, not browser results.'})
csvout('registers/SCREEN_67_REVIEW.csv',per_screen)

# Fresh arithmetic, rather than copying Phase B's PASS labels.
tokens=j(B/'design/tokens-v2.json')
prior=list(csv.DictReader((B/'evidence/CONTRAST_MEASUREMENTS.csv').open(encoding='utf-8-sig')))
def lum(h):
 vals=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 v=[a/12.92 if a<=.04045 else ((a+.055)/1.055)**2.4 for a in vals]
 return .2126*v[0]+.7152*v[1]+.0722*v[2]
contrast=[]
for x in prior:
 c=tokens[x['route']];fg=c[x['foreground_token']];bg=c[x['background_token']];lo,hi=sorted([lum(fg),lum(bg)]);ratio=(hi+.05)/(lo+.05);minimum=float(x['minimum'])
 contrast.append({'route':x['route'],'foreground_token':x['foreground_token'],'background_token':x['background_token'],'foreground':fg,'background':bg,'role':x['role'],'fresh_ratio':round(ratio,3),'required_minimum':minimum,'matches_prior_rounded_value':round(ratio,3)==float(x['ratio']),'status':'PASS' if ratio>=minimum else 'FAIL','scope':'Token arithmetic only; computed browser/native styles and OS media controls not tested'})
csvout('registers/CONTRAST_RECOMPUTED_B1.csv',contrast)

# Source excerpts as actual evidence, not a program run.
code=(B/'prototype/prototype-v8.js').read_text();lines=code.splitlines()
selected=[]
needles=["case 'grammar'",'let gl=l.grammar','توضیح فارسی پیشنهادی','function primary()',"s.kind==='time'",'goto(s.next)','function chooseState','حال\u200cت پایانی','حالت پایانیٔ','browser','record-sim']
for n,line in enumerate(lines,1):
 if any(p in line for p in needles):selected.append({'file':'prototype/prototype-v8.js','line':n,'excerpt':line,'method':'Read-only source review; not browser execution'})
savej('evidence/STATIC_SOURCE_EXCERPTS.json',selected)
savej('evidence/B02_H04_CONTRACT_COMPARISON.json',{'B02':byid['B02'],'target_H04':byid['H04'],'finding':'The daily-goal primary next target is Accessibility, not an explicitly explained goal confirmation/resume destination. Static UX contract mismatch; no runtime execution.'})

# Parse all available source curriculum fields, preserving source text and review status.
curr=j(B/'reference/legacy-curriculum.json');corpus=[];vocab=[];grammar=[];chapters=[];render=[]
for course in curr:
 for mi,mod in enumerate(course['modules']):
  chapters.append({'title':mod['title'],'lessons':len(mod['lessons'])})
  for li,l in enumerate(mod['lessons']):
   lid=f'{course["code"]}-{mi}-{li}'
   render.append('\n## '+lid+' — '+l['title'])
   def add(field,text,kind):
    if text is None:return
    text=str(text);corpus.append({'lesson_ref':lid,'field':field,'kind':kind,'text':text,'review_status':'NEEDS REVIEW','review_scope':'Assistant editorial/static review, not qualified teacher approval'})
   add('title',l['title'],'English');add('description',l['description'],'English');render.append(l['description'])
   for n,t in enumerate(l.get('objectives',[])):add(f'objectives[{n}]',t,'English objective');render.append('OBJECTIVE: '+t)
   for bi,block in enumerate(l['blocks']):
    typ=block['type']
    for key in ['text','intro','prompt','answer','hint']:
     if block.get(key):add(f'blocks[{bi}].{key}',block[key],typ);render.append(typ+' '+key.upper()+': '+block[key])
    for n,it in enumerate(block.get('items',[])):
     for key in ['text','note']:
      if it.get(key):add(f'blocks[{bi}].items[{n}].{key}',it[key],typ);render.append('EXAMPLE '+key.upper()+': '+it[key])
   for vi,v in enumerate(l.get('vocabulary',[])):
    vocab.append({'lesson_ref':lid,'lesson':l['title'],**v})
    render.append('VOCAB: '+v['word']+' | '+v.get('translation','')+' | '+v.get('phonetic','')+' | '+v.get('exampleSentence',''))
    for key in ['word','translation','phonetic','exampleSentence']:
     if v.get(key):add(f'vocabulary[{vi}].{key}',v[key],'Vocabulary '+key)
   if l.get('grammar'):
    g=l['grammar'];grammar.append({'lesson_ref':lid,'lesson':l['title'],'grammar':g})
    render.append('GRAMMAR: '+json.dumps(g,ensure_ascii=False))
    for key in ['title','explanation']:
     if g.get(key):add('grammar.'+key,g[key],'Grammar')
    for key in ['patterns','examples']:
     for n,text in enumerate(g.get(key,[])):add('grammar.'+key+f'[{n}]',text,'Grammar')
csvout('registers/EDUCATIONAL_TEXT_CORPUS.csv',corpus)
csvout('registers/VOCABULARY_100_REVIEW_SOURCE.csv',[{'lesson_ref':v['lesson_ref'],'lesson':v['lesson'],'word':v['word'],'translation':v.get('translation',''),'phonetic':v.get('phonetic',''),'exampleSentence':v.get('exampleSentence',''),'status':'NEEDS REVIEW — editorial review only, no teacher/audio approval'} for v in vocab])
savej('evidence/GRAMMAR_SOURCE_ITEMS.json',grammar)
(O/'review/CURRICULUM_REVIEW_TEXT.md').write_text('# Text reviewed from the retained source corpus\n\nVerbatim educational content for B1 review, not newly approved/published curriculum.\n'+'\n'.join(render),encoding='utf-8')

# All retained normal-screen text and all Persian-bearing JS string fragments are catalogued.
class Texts(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,text):
  text=' '.join(text.split())
  if text:self.parts.append(text)
unique={}
mp=B/'evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz'
if mp.is_file():
 for sid,h in json.loads(gzip.decompress(mp.read_bytes())).items():
  p=Texts();p.feed(h)
  for t in p.parts:
   if re.search('[\u0600-\u06ff]',t):unique.setdefault(t,{'sources':set(),'kind':'retained normal-screen text'});unique[t]['sources'].add(sid)
for m in re.finditer(r"'((?:\\.|[^'\\])*)'|\"((?:\\.|[^\"\\])*)\"|`((?:\\.|[^`\\])*)`",code,re.S):
 raw=next((x for x in m.groups() if x is not None),'')
 if not re.search('[\u0600-\u06ff]',raw):continue
 raw=raw.replace('\\n',' ').replace('\\\"','"').replace("\\'","'")
 p=Texts();p.feed(raw)
 for t in p.parts:
  if re.search('[\u0600-\u06ff]',t):
   unique.setdefault(t,{'sources':set(),'kind':'JS literal fragment; may be designer-only or incomplete until assembled'})
   unique[t]['sources'].add('prototype-v8.js:'+str(code.count('\n',0,m.start())+1))
ui_rows=[{'id':f'FA-{i:04d}','text':t,'sources':'; '.join(sorted(v['sources'])),'origin_kind':v['kind'],'status':'NEEDS REVIEW','scope':'Retained/generated text, not live browser output; final copy approval not granted'} for i,(t,v) in enumerate(sorted(unique.items()),1)]
csvout('registers/PERSIAN_UI_COPY_CORPUS.csv',ui_rows)
(O/'review/PERSIAN_UI_COPY_REVIEW_TEXT.md').write_text('# Persian UI copy inventory for editorial review\n\nNo native/browser test or qualified copy approval is claimed.\n\n'+'\n'.join(x['id']+' | '+x['text'] for x in ui_rows),encoding='utf-8')
summary={'screens':len(screens),'groups':dict(Counter(s['group'] for s in screens)),'state_cells':len(states),'na_cells':sum(not x['applicable'] for x in states),'state_csv_json_mismatches':sum(x['contract_json_csv_status']=='FAIL' for x in state_checks),'screen_required_field_failures':sum(bool(x['missing_spec_fields']) for x in per_screen),'missing_screen_spec_sections':sum(not x['spec_section_present'] for x in per_screen),'dangling_next_ids':sum(not x['next_id_exists'] for x in per_screen),'individual_reference_artboards_available':sum(x['artboard_available_now'] for x in per_screen),'contrast_pairs_recomputed':len(contrast),'contrast_failures':sum(x['status']=='FAIL' for x in contrast),'contrast_disagreements_with_B':sum(not x['matches_prior_rounded_value'] for x in contrast),'educational_field_texts':len(corpus),'vocabulary_items':len(vocab),'grammar_notes':len(grammar),'unique_Persian_UI_texts_or_literal_fragments':len(ui_rows),'language_approval':'NEEDS REVIEW; not a qualified teacher approval','runtime_executed':False}
savej('evidence/DESIGN_COPY_SUMMARY.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
