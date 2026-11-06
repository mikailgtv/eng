"""Parse the project's literal educational data without executing TypeScript."""
from pathlib import Path
from collections import Counter
import ast,csv,hashlib,json,re
ROOT=Path('/home/user');OUT=ROOT/'PROJECT_LEO_PHASE_A_2026-11-04_v1'
class LiteralParser:
    def __init__(self,text,bindings=None):self.text=text;self.pos=0;self.bindings=bindings or {}
    def skip(self):
        while True:
            m=re.match(r'\s+|//[^\n]*(?:\n|$)|/\*[\s\S]*?\*/',self.text[self.pos:])
            if not m:return
            self.pos+=len(m.group())
    def take(self,s):
        self.skip()
        if not self.text.startswith(s,self.pos):raise ValueError('Unexpected literal token')
        self.pos+=len(s)
    def string(self):
        self.skip();q=self.text[self.pos];start=self.pos;self.pos+=1
        while self.pos<len(self.text):
            c=self.text[self.pos];self.pos+=1
            if c=='\\':self.pos+=1
            elif c==q:
                raw=self.text[start:self.pos]
                return json.loads(raw) if q=='"' else ast.literal_eval(raw)
        raise ValueError('Unterminated string')
    def identifier(self):
        self.skip();m=re.match(r'[A-Za-z_$][\w$]*',self.text[self.pos:])
        if not m:raise ValueError('Expected identifier')
        self.pos+=len(m.group());return m.group()
    def value(self):
        self.skip();c=self.text[self.pos]
        if c in ['"',"'"]:return self.string()
        if c=='[':
            self.take('[');values=[]
            while True:
                self.skip()
                if self.text.startswith(']',self.pos):self.take(']');return values
                if self.text.startswith('...',self.pos):
                    self.take('...');key=self.identifier();part=self.bindings[key]
                    if not isinstance(part,list):raise ValueError('Non-list spread')
                    values.extend(part)
                else:values.append(self.value())
                self.skip()
                if self.text.startswith(',',self.pos):self.take(',')
                else:self.take(']');return values
        if c=='{':
            self.take('{');obj={}
            while True:
                self.skip()
                if self.text.startswith('}',self.pos):self.take('}');return obj
                key=self.string() if self.text[self.pos] in ['"',"'"] else self.identifier()
                self.take(':');obj[key]=self.value();self.skip()
                if self.text.startswith(',',self.pos):self.take(',')
                else:self.take('}');return obj
        m=re.match(r'-?\d+(?:\.\d+)?',self.text[self.pos:])
        if m:self.pos+=len(m.group());return json.loads(m.group())
        key=self.identifier()
        if key in {'true','false','null'}:return {'true':True,'false':False,'null':None}[key]
        if key in self.bindings:return self.bindings[key]
        raise ValueError('Non-literal/external expression not evaluated')

def parse_export(p,name,bindings=None):
    s=p.read_text();m=re.search(r'export\s+const\s+'+name+r'\b[^=]*=',s)
    if not m:raise ValueError('Missing export '+name)
    return LiteralParser(s[m.end():],bindings).value()
base=ROOT/'prisma/curriculum'
a=parse_export(base/'pre-a1-modules-1-3.ts','MODULES_1_3')
b=parse_export(base/'pre-a1-modules-4-6.ts','MODULES_4_6')
levels=parse_export(base/'index.ts','SEED_LEVELS')
courses=parse_export(base/'index.ts','SEED_COURSES',{'MODULES_1_3':a,'MODULES_4_6':b})
offline=json.loads((ROOT/'EnglishLearning-Offline/assets/curriculum.json').read_text())
rows=[];blocks=Counter();words=[];grammar=0;objectives=0;examples=0
for course in offline:
    for mi,mod in enumerate(course['modules']):
        for li,lesson in enumerate(mod['lessons']):
            types=Counter(block['type'] for block in lesson['blocks']);blocks.update(types)
            vocab=lesson.get('vocabulary',[]);words.extend(vocab);grammar+=bool(lesson.get('grammar'));objectives+=len(lesson.get('objectives',[]))
            examples+=sum(len(x.get('items',[])) for x in lesson['blocks'] if x['type']=='EXAMPLE')
            rows.append({'legacy_position_id':course['code']+'-'+str(mi)+'-'+str(li),'course_code':course['code'],'level':course['levelCode'],'chapter_number':mi+1,'chapter_title':mod['title'],'lesson_number_in_chapter':li+1,'lesson_title':lesson['title'],'estimated_minutes':lesson['durationMin'],'objectives':len(lesson.get('objectives',[])),'vocabulary_entries':len(vocab),'grammar_note_present':bool(lesson.get('grammar')),'question_blocks':types['QUESTION'],'block_types':','.join(types),'stable_explicit_lesson_id':bool(lesson.get('id')),'audio_reference_present':bool(lesson.get('audio')),'review_status':'LEGACY_DRAFT_REVIEW_UNVERIFIED','native_renderer_gap':','.join(t for t in types if t not in {'TEXT','HEADING','TIP','GRAMMAR','QUESTION'})})
with (OUT/'inventory/LESSON_INVENTORY.csv').open('x',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
report={'levels_defined':levels,'seed_ts_matches_offline_json':courses==offline,'courses':len(offline),'modules':sum(len(c['modules']) for c in offline),'lessons':len(rows),'vocabulary_entries':len(words),'unique_words':len({w['word'].lower() for w in words}),'grammar_notes':grammar,'question_blocks':blocks['QUESTION'],'example_blocks':blocks['EXAMPLE'],'example_items':examples,'block_type_counts':dict(blocks),'objective_statements':objectives,'lessons_with_explicit_stable_id':sum(r['stable_explicit_lesson_id'] for r in rows),'lessons_with_audio_reference':sum(r['audio_reference_present'] for r in rows),'words_with_translation':sum(bool(w.get('translation')) for w in words),'words_with_phonetic':sum(bool(w.get('phonetic')) for w in words),'words_with_example':sum(bool(w.get('exampleSentence')) for w in words),'limits':'Literal/source inspection only; no teacher review, CEFR certification, or learner validation claimed'}
with (OUT/'evidence/CURRICULUM_CENSUS.json').open('x',encoding='utf-8') as f:json.dump(report,f,indent=2,ensure_ascii=False)
print(json.dumps({k:v for k,v in report.items() if k!='levels_defined'},ensure_ascii=False,indent=2))
print('Levels:',[(x['code'],x['status']) for x in levels])
