"""Static lexical inventory. Reads strings; does not execute JavaScript."""
from pathlib import Path
from html.parser import HTMLParser
import json,csv,gzip,re,hashlib
B=Path('/home/user/PROJECT_LEO_PHASE_B_2026-11-04_v1');O=Path('/home/user/PROJECT_LEO_PHASE_B1_2026-11-05_v1')
text=(B/'prototype/prototype-v8.js').read_text()
def literals(s):
 i=0;previous='';n=len(s)
 while i<n:
  c=s[i]
  if c.isspace():i+=1;continue
  if s.startswith('//',i):
   end=s.find('\n',i);i=n if end<0 else end+1;continue
  if s.startswith('/*',i):
   end=s.find('*/',i+2);i=n if end<0 else end+2;continue
  if c in "'\"`":
   q=c;start=i;i+=1;parts=[]
   while i<n:
    c=s[i]
    if c=='\\' and i+1<n:
     nxt=s[i+1];parts.append({'n':'\n','r':'\r','t':'\t'}.get(nxt,nxt));i+=2;continue
    if c==q: i+=1;yield start,''.join(parts);break
    parts.append(c);i+=1
   previous='literal';continue
  if c=='/' and previous in {'(', '=', ':', ',', '[', '!', '?', ';', '{', 'return'}:
   i+=1;cls=False
   while i<n:
    if s[i]=='\\':i+=2;continue
    if s[i]=='[':cls=True
    elif s[i]==']':cls=False
    elif s[i]=='/' and not cls:
     i+=1
     while i<n and s[i].isalpha():i+=1
     break
    i+=1
   previous='regex';continue
  if c.isalpha() or c in '_$':
   m=re.match(r'[\w$]+',s[i:]);previous=m.group();i+=len(m.group());continue
  previous=c;i+=1
class TextParts(HTMLParser):
 def __init__(self):super().__init__();self.text=[]
 def handle_data(self,s):
  s=' '.join(s.split())
  if s:self.text.append(s)
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in {'alt','aria-label','placeholder','title'} and v:self.text.append(v)
unique={}
def add(t,source,audience):
 if not re.search('[\u0600-\u06ff]',t):return
 t=' '.join(t.split())
 if not t:return
 v=unique.setdefault(t,{'sources':set(),'audiences':set()});v['sources'].add(source);v['audiences'].add(audience)
for sid,html in json.loads(gzip.decompress((B/'evidence/RENDERED_SCREEN_MARKUP_DELIVERY.json.gz').read_bytes())).items():
 p=TextParts();p.feed(html)
 for t in p.text:add(t,sid,'Retained phone markup; may include mandatory prototype annotations')
for pos,s in literals(text):
 if not re.search('[\u0600-\u06ff]',s):continue
 p=TextParts();p.feed(s)
 for t in p.text:add(t,'prototype-v8.js:'+str(text.count('\n',0,pos)+1),'Static literal or template fragment; not proof of visibility in live browser')
for state in json.loads((B/'design/screen-states-v2.json').read_text()):
 for key in ['rationale','ui_copy','behavior']:
  add(state[key],state['screen_id']+':'+state['state']+':'+key,'Design state contract, not necessarily learner-facing copy')
rows=[{'copy_id':'COPY-'+str(i).zfill(4),'text':t,'source_locations':'; '.join(sorted(v['sources'])),'audience_scope':'; '.join(sorted(v['audiences'])),'editorial_status':'NEEDS REVIEW','publication_approval':False} for i,(t,v) in enumerate(sorted(unique.items()),1)]
with (O/'registers/PERSIAN_COPY_CORPUS_v2.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
(O/'review/PERSIAN_COPY_REVIEW_v2.md').write_text('# Available Persian copy / state-contract review\n\nStatic/retained strings only. Not a qualified approval; JS fragments and designer annotations are labelled separately.\n\n'+'\n'.join(r['copy_id']+' | '+r['text'] for r in rows),encoding='utf-8')
manifest=json.loads((B/'DELIVERY_MANIFEST.json').read_text());mdrows=[]
for item in manifest['files']:
 p=B/item['path']
 if not p.is_file() or p.suffix!='.md':continue
 s=p.read_text();mdrows.append({'file':item['path'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'text_read_in_full':True,'lines':len(s.splitlines()),'persian_script_characters':len(re.findall('[\u0600-\u06ff]',s)),'audience':'documentation/design contracts','review_class':'Full-text scan + targeted editorial review; not manual certification of every duplicated contract line','status':'NEEDS REVIEW'})
with (O/'registers/DOCUMENT_LANGUAGE_COVERAGE.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(mdrows[0]));w.writeheader();w.writerows(mdrows)
summary={'unique_Persian_copy_or_contract_fragments':len(rows),'available_manifest_markdown_documents_read':len(mdrows),'regex_first_pass_limit':'Initial v1 corpus included some lexical code fragments; v2 skips comments/regex tokens and labels audience. The original extraction is retained, not silently overwritten.','scope_limit':'This inventory cannot include missing files or text only produced by unobserved runtime states/user input. No whole-package language approval is claimed.'}
(O/'evidence/COPY_COVERAGE_v2.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
