"""Targeted B1 content corrections in the authorized independent B2 copy only."""
from pathlib import Path
import json,hashlib,copy
ROOT=Path('/home/user/PROJECT_LEO_PHASE_B2_2026-11-05_v1')
source=ROOT/'baseline/source-files/reference/legacy-curriculum.json'
target=ROOT/'working-copy/reference/legacy-curriculum.json'
original=source.read_bytes();assert target.read_bytes()==original
base=json.loads(original);draft=copy.deepcopy(base);changes=[]

def edit(path,expected,new,issue,reason,reference=''):
 node=draft
 for k in path[:-1]:node=node[k]
 assert node[path[-1]]==expected,(path,node[path[-1]])
 node[path[-1]]=new
 changes.append({'json_pointer':'/'+('/'.join(map(str,path))),'before':expected,'after':new,'issue_id':issue,'reason':reason,'reference':reference,'status':'DRAFT_REQUIRES_HUMAN_REVIEW','approval_date':None,'approved_by':None})

lessons=[]
for ci,c in enumerate(draft):
 for mi,m in enumerate(c['modules']):
  for li,l in enumerate(m['lessons']):lessons.append((l,[ci,'modules',mi,'lessons',li]))
bytitle={l['title']:(l,p) for l,p in lessons}
def block_item(title,text):
 l,p=bytitle[title]
 for bi,b in enumerate(l['blocks']):
  for ii,item in enumerate(b.get('items',[])):
   if item.get('text')==text:return item,p+['blocks',bi,'items',ii]
 raise AssertionError((title,text))
def vocab(word):
 for l,p in lessons:
  for vi,v in enumerate(l.get('vocabulary',[])):
   if v['word']==word:return v,p+['vocabulary',vi]
 raise AssertionError(word)
def block_by_text(title,text):
 l,p=bytitle[title]
 for bi,b in enumerate(l['blocks']):
  if b.get('text')==text:return b,p+['blocks',bi]
 raise AssertionError((title,text))

v,p=vocab('helmet');edit(p+['phonetic'],'/ˈhelɪt/','/ˈhelmɪt/','B1-I04','Restore the missing /m/ while retaining the existing second-vowel variant; no global accent or audio approval is claimed.','https://dictionary.cambridge.org/dictionary/english/helmet')
it,p=block_item('Basic English Sounds','a — /æ/ — cat, hat')
edit(p+['note'],'like “آ”','در cat و hat صدای /æ/ را تمرین می‌کنیم؛ این صدا با «آ» فارسی یکی نیست. نشانهٔ صدا با نام حرف فرق دارد.','B1-I05','Remove misleading Persian-vowel equivalence; keep existing valid cat/hat examples.','https://en.wikipedia.org/wiki/Help:IPA/Persian')
b,p=block_by_text('Basic English Sounds','One letter can have different sounds. Start with the most common sound of each vowel:')
edit(p+['text'],b['text'],'A letter can have different sounds. These are five sounds to practise. IPA symbols show sounds, not letter names.','B1-I05','Avoid the unsupported most-common-sound claim and distinguish sounds from letters.')
it,p=block_item('Basic English Sounds','o — /ɑː/ — hot, dog')
edit(p+['text'],it['text'],'o — /ɑː/ — hot','B1-I05','Retain one common American example; avoid treating dog identically across accents.')
edit(p+['note'],'like “ا”','این نمونه مربوط به یک تلفظ رایج آمریکایی است؛ تلفظ واکه‌ها با لهجه تغییر می‌کند و به بازبینی صوت نیاز دارد.','B1-I05','Declare accent limitation without inventing a verified recording or global accent policy.')
it,p=block_item('Workplace Words','This is my fire station.')
edit(p+['note'],'این آتش‌نشانی ماست.','این ایستگاه آتش‌نشانی من است.','B1-I08','Preserve singular my rather than changing to our.')
v,p=vocab('fire station');edit(p+['translation'],'آتش‌نشانی','ایستگاه آتش‌نشانی','B1-I08','Use the building/location term consistently in the professional vocabulary example.')
it,p=block_item('The verb “to be”','The station is big.')
edit(p+['note'],'آتش‌نشانی بزرگ است.','ایستگاه آتش‌نشانی بزرگ است.','B1-I08','Clarify the same location noun without changing the English example.')
it,p=block_item('My Daily Routine',"I go to the fire station at eight.")
edit(p+['note'],'ساعت هشت به آتش‌نشانی می‌روم.','ساعت هشت به ایستگاه آتش‌نشانی می‌روم.','B1-I08','Consistent term for fire station.')
v,p=vocab('good afternoon');edit(p+['translation'],'عصر بخیر','بعدازظهر بخیر','B1-I16','Bring the draft source translation into line with the already-documented B UI correction.')
for text,note,new in [('Good morning.','until 12:00','usually in the morning'),('Good afternoon.','12:00 – 18:00','in the afternoon; the context matters'),('Good evening.','after 18:00','in the evening; the context matters')]:
 it,p=block_item('Hello and Goodbye',text);edit(p+['note'],note,new,'B1-I16','Use contextual examples instead of universal clock cut-offs.')
it,p=block_item('Food and Drinks','I eat bread and cheese for breakfast.')
edit(p+['note'],'من نان و پنیر صبحانه می‌خورم.','من برای صبحانه نان و پنیر می‌خورم.','B1-I15','Natural Persian rendering of for breakfast.')
it,p=block_item('My Daily Routine','I sleep at ten at night.')
edit(p+['text'],'I sleep at ten at night.',"I go to bed at ten o'clock.",'B1-I16','Use the natural routine expression for going to bed, not a claim about sleep onset.')
edit(p+['note'],'شب ساعت ده می‌خوابم.','ساعت ده به رختخواب می‌روم.','B1-I16','Align the Persian example with the corrected English meaning.')
l,p=bytitle['My Daily Routine']
edit(p+['grammar','explanation'],'Use I + verb + time. Put the time at the end.','These examples use I + verb + time. A time phrase can also go at the beginning.','B1-I16','Present a useful pattern, not an absolute rule about all time phrases.')
l,p=bytitle['Simple Questions']
edit(p+['grammar','explanation'],'Put am/is/are before the person to make a question.','Look at these patterns: What is ...? Where are ...? Who is ...? They are questions with be.','B1-I16','Replace the unclear before-the-person rule with the patterns actually present in this lesson.')
b,p=block_by_text('Food and Drinks','“…, please” makes any order polite: “Tea, please.” “Water, please.”')
edit(p+['text'],b['text'],'You can use please in a simple request: “Tea, please.” “Water, please.” Tone and context matter too.','B1-I16','Avoid claiming that please makes every order polite.')
b,p=block_by_text('Simple Requests','A smile + “please” + “thank you” = perfect English manners.')
edit(p+['text'],b['text'],'Please and thank you can help make a request polite. Your tone and the situation matter too.','B1-I16','Remove the absolute perfect-manners equation.')
b,p=block_by_text('Numbers 20–100','Put a dash between the ten and the single number:')
edit(p+['text'],b['text'],'Use a hyphen in numbers such as twenty-one and thirty-five:','B1-I16','Use accurate, simple terminology without adding a new exercise.')
b,p=block_by_text('Workplace Words','These words are for YOUR job. Say them out loud:')
edit(p+['text'],b['text'],'Here are some words used at a fire station. Say them out loud:','B1-I16','Do not assume that every general learner works as a firefighter.')
l,p=bytitle['Workplace Words'];edit(p+['description'],'English words from your fire station.','English words used at a fire station.','B1-I16','Keep workplace context without assigning a job to the learner.')
it,p=block_item('Colors','The night is black.')
edit(p+['text'],'The night is black.','My boots are black.','B1-I16','Use a concrete natural example for the color, not an odd general description of night.')
edit(p+['note'],'شب سیاه است.','چکمه‌های من سیاه هستند.','B1-I16','Align the example translation.')
# Named, small Persian proofreading corrections only; no global destructive normalization.
for english,old,new in [('Open your book, please.','کتاب خود را باز کنید','لطفاً کتاب خود را باز کنید.'),('Close your book, please.','کتاب خود را ببندید','لطفاً کتاب خود را ببندید.')]:
 it,p=block_item('Basic Classroom English',english);edit(p+['note'],old,new,'B1-I15','Preserve please in the Persian classroom request.')
l,p=bytitle['Months']
for bi,b in enumerate(l['blocks']):
 if b.get('type')=='QUESTION' and b['prompt']=='The first month of the year is ____.':
  edit(p+['blocks',bi,'prompt'],b['prompt'],'The first month of the Gregorian calendar is ____.','B1-I16','Clarify calendar context for Persian-speaking learners; answer remains January.')

# Confirm no courses/chapters/lessons/vocabulary/exercises were added, removed or reordered.
def counts(c):
 ls=[l for course in c for m in course['modules'] for l in m['lessons']]
 return {'courses':len(c),'chapters':sum(len(x['modules']) for x in c),'lessons':len(ls),'vocabulary':sum(len(x.get('vocabulary',[])) for x in ls),'questions':sum(b['type']=='QUESTION' for l in ls for b in l['blocks']),'grammar_notes':sum(bool(l.get('grammar')) for l in ls),'titles':[l['title'] for l in ls]}
assert counts(base)==counts(draft)
data=(json.dumps(draft,ensure_ascii=False,indent=2)+'\n').encode()
target.write_bytes(data)
meta={'date':'2026-11-05','candidate_version':'B2-content-draft-v1','base_sha256':hashlib.sha256(original).hexdigest(),'candidate_sha256':hashlib.sha256(data).hexdigest(),'review_status':'DRAFT_REQUIRES_HUMAN_REVIEW','approved':False,'published':False,'reviewer':None,'approval_date':None,'accent_policy':'Final project policy and audio/transcript alignment unresolved; only the missing /m/ was restored in the existing transcription variant.','audio_modified':False,'content_counts_preserved':counts(draft),'changes':changes}
with (ROOT/'working-copy/reference/CONTENT_REVIEW_STATUS_B2.json').open('x',encoding='utf-8') as f:json.dump(meta,f,ensure_ascii=False,indent=2)
with (ROOT/'evidence/CONTENT_CHANGE_JOURNAL.json').open('x',encoding='utf-8') as f:json.dump(meta,f,ensure_ascii=False,indent=2)
print('Draft content leaf changes:',len(changes),'counts/order unchanged. No audio edited, no Approved/Published status set.')
