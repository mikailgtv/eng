"""Original layered SVG design assets. Not a React Native component or production rig."""
from pathlib import Path
import math,json,hashlib,subprocess
from PIL import Image
ROOT=Path('/home/user/PROJECT_LEO_PHASE_B_2026-11-04_v1')
P={'fur':'#D7A04F','furShadow':'#BA7D36','muzzle':'#F6E6BF','spots':'#65422D','eye':'#70472D','pupil':'#26332D','jacket':'#285D4D','jacketShadow':'#1A433A','jacketLight':'#38715C','tape':'#D1C391','tapeLight':'#F2E5B7','helmet':'#B55836','helmetShadow':'#873E28','helmetLight':'#D18450','pants':'#354D48','boot':'#2B3C3B','sole':'#172B2A','glove':'#D2B07B','line':'#68442D'}
POSES={
'neutral':dict(l=[(164,275),(135,344),(127,402)],r=[(316,275),(342,345),(348,405)],face='neutral',look=(0,0)),
'happy':dict(l=[(164,275),(126,330),(104,319)],r=[(316,275),(348,337),(315,381)],face='happy',look=(0,0)),
'excited':dict(l=[(164,275),(114,248),(104,196)],r=[(316,275),(366,247),(376,191)],face='excited',look=(0,-2)),
'thinking':dict(l=[(164,275),(137,342),(130,403)],r=[(316,275),(338,275),(271,226)],face='thinking',look=(-4,-3)),
'confused':dict(l=[(164,275),(126,319),(95,286)],r=[(316,275),(360,324),(389,289)],face='confused',look=(3,0),headtilt=-5),
'teaching':dict(l=[(164,275),(132,343),(127,403)],r=[(316,275),(356,284),(388,238)],face='neutral',look=(3,0),rightHand='point'),
'listening':dict(l=[(164,275),(108,238),(140,178)],r=[(316,275),(346,343),(351,403)],face='listening',look=(-3,0),headtilt=-4),
'speaking':dict(l=[(164,275),(128,326),(97,309)],r=[(316,275),(348,342),(349,400)],face='speaking',look=(0,0)),
'celebrating':dict(l=[(164,275),(112,253),(94,212)],r=[(316,275),(365,247),(387,202)],face='happy',look=(0,-2)),
'encouraging':dict(l=[(164,275),(131,326),(100,320)],r=[(316,275),(333,321),(269,305)],face='warm',look=(0,1),headtilt=3),
'sad-after-mistake':dict(l=[(164,275),(142,325),(208,313)],r=[(316,275),(350,348),(365,389)],face='kindConcern',look=(0,2),headtilt=4),
'sleeping':dict(l=[(164,275),(137,339),(224,361)],r=[(316,275),(345,339),(267,355)],face='sleeping',look=(0,0),headtilt=10),
'running':dict(l=[(164,275),(112,290),(102,343)],r=[(316,275),(365,244),(354,202)],face='focused',look=(3,0),tilt=7,legs='run'),
'jumping':dict(l=[(164,275),(117,243),(105,197)],r=[(316,275),(360,240),(378,190)],face='excited',look=(0,-2),legs='jump',lift=-12),
'winning':dict(l=[(164,275),(132,341),(126,401)],r=[(316,275),(364,273),(362,213)],face='happy',look=(1,-1),rightHand='fist'),
'explaining':dict(l=[(164,275),(129,330),(157,353)],r=[(316,275),(360,289),(390,252)],face='speaking',look=(3,0),rightHand='point',book=True),
}

def path(d,fill='none',stroke=None,width=1,extra=''):
 return f'<path d="{d}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '')+f' {extra}/>'
def ellipse(x,y,rx,ry,fill,extra=''):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def ring(x,y,scale=1,rot=0):
 return f'<g transform="translate({x} {y}) rotate({rot}) scale({scale})">'+path('M-8 -3 Q-7 -10 0 -9 Q9 -8 9 -1 Q10 6 3 9 Q-6 10 -9 3',P['spots'])+path('M-3 -3 Q3 -6 5 -1 Q6 4 1 5 Q-5 4 -3 -3',P['fur'])+'</g>'

def tail(view):
 d='M309 433 C367 444 407 490 396 534 C388 566 351 570 337 546'
 s=path(d,'none',P['spots'],36)+path(d,'none',P['fur'],30)
 for x,y,scale,angle in [(330,443,.63,-28),(351,454,.6,-10),(371,474,.62,25),(386,499,.63,38),(386,526,.6,55),(372,548,.65,68)]:s+=ring(x,y,scale,angle)
 s+=path('M356 555 Q343 553 337 546','none',P['spots'],30)
 if view=='profile':s='<g transform="translate(480 0) scale(-1 1)">'+s+'</g>'
 return '<g id="tail" data-layer="tail">'+s+'</g>'

def boot(x,y,flip=False):
 d='M-23 -49 L22 -49 L21 -9 Q30 -2 42 2 Q51 9 47 22 Q26 29 4 23 L-22 23 L-25 4Z'
 s=path(d,P['boot'])+path('M-23 15 Q9 16 20 19 Q34 23 48 17 L47 25 Q27 31 5 26 L-22 26Z',P['sole'])+path('M-15 -42 L11 -42 L11 -11','none','#465852',3)
 return f'<g transform="translate({x} {y}) scale({-1 if flip else 1} 1)">'+s+'</g>'

def legs(pose,view):
 kind=pose.get('legs','stand')
 if kind=='run':legsdef=[((196,447),(166,509),(116,557),False),((282,447),(305,492),(349,516),True)]
 elif kind=='jump':legsdef=[((196,447),(173,503),(133,526),False),((282,447),(309,503),(349,525),True)]
 else:legsdef=[((196,447),(196,516),(190,607),True),((284,447),(284,516),(290,607),False)]
 s=''
 for i,(hip,knee,foot,flip) in enumerate(legsdef):
  if view=='profile':
   hip=(215+i*37,hip[1]);knee=(215+i*34,knee[1]);foot=(211+i*44,foot[1]);flip=False
  d=f'M{hip[0]} {hip[1]} Q{knee[0]} {knee[1]-20} {knee[0]} {knee[1]} L{foot[0]} {foot[1]-33}'
  s+=f'<g id="leg-{i}" data-layer="leg-{i}">'+path(d,'none',P['pants'] if i else '#2C433F',49)
  s+=path(f'M{knee[0]-17} {knee[1]-4} Q{knee[0]} {knee[1]+5} {knee[0]+17} {knee[1]-3}','none','#496056',3)
  s+=boot(*foot,flip)+'</g>'
 return s

def glove(x,y,angle=0,kind='open',flip=False):
 if kind=='point':
  d='M-12 15 Q-18 9 -14 -1 L-11 -13 Q-13 -34 -4 -35 Q3 -34 1 -13 L3 -7 Q10 -17 16 -11 L17 -4 Q27 -7 27 2 Q27 13 15 20 Q1 29 -12 15Z'
 elif kind=='fist':
  d='M-17 -10 Q-15 -23 -5 -18 Q2 -25 8 -18 Q17 -21 20 -10 L23 8 Q14 25 -7 21 Q-21 14 -17 -10Z'
 else:
  d='M-17 9 Q-22 2 -29 -1 Q-35 -7 -29 -11 Q-24 -14 -17 -7 L-18 -22 Q-18 -31 -11 -31 Q-5 -30 -6 -21 L-5 -29 Q-4 -36 3 -34 Q9 -32 7 -22 L9 -25 Q13 -33 19 -29 Q23 -25 18 -15 L22 -17 Q29 -19 30 -12 Q30 -5 20 9 Q11 24 -4 23 Q-13 21 -17 9Z'
 s=path(d,P['glove'], '#9E794B',2.2)
 if kind=='open':s+=path('M-14 1 Q-2 -3 10 5 M-3 17 Q5 16 12 10','none','#B18B55',2)
 elif kind=='fist':s+=path('M-12 -6 L12 -5 M-5 -15 L-5 -5 M7 -16 L7 -4','none','#A7814D',2)
 else:s+=path('M3 -4 Q3 7 13 9 M-8 13 Q1 18 12 14','none','#A7814D',2)
 return f'<g data-layer="glove" transform="translate({x} {y}) rotate({angle}) scale({-1 if flip else 1} 1)">'+s+'</g>'

def arm(points,side,kind='open',front=True):
 a,b,c=points;d=f'M{a[0]} {a[1]} Q{b[0]} {b[1]} {c[0]} {c[1]}'
 s=path(d,'none',P['jacketShadow'],46)+path(d,'none',P['jacket'],39)
 # Reflective cuff perpendicular to forearm direction.
 t=.74;x=b[0]+(c[0]-b[0])*t;y=b[1]+(c[1]-b[1])*t
 dx=c[0]-b[0];dy=c[1]-b[1];ln=max(1,math.hypot(dx,dy));nx=-dy/ln;ny=dx/ln
 x1=x+nx*21;y1=y+ny*21;x2=x-nx*21;y2=y-ny*21
 s+=path(f'M{x1:.2f} {y1:.2f} L{x2:.2f} {y2:.2f}','none',P['tape'],13)
 s+=path(f'M{x1:.2f} {y1:.2f} L{x2:.2f} {y2:.2f}','none',P['tapeLight'],4)
 angle=math.degrees(math.atan2(dy,dx))+90
 s+=glove(c[0],c[1]+(8 if dy>0 else -5),angle,kind,side=='left')
 return f'<g id="arm-{side}" data-layer="arm-{side}">'+s+'</g>'

def torso(view):
 if view=='profile':
  body=path('M197 249 Q233 232 274 256 L291 447 Q257 465 198 449 L190 286Z',P['jacket'])
  body+=path('M198 254 Q226 248 233 260 L229 450 L199 449Z',P['jacketShadow'])
  body+=path('M193 335 L282 337 L284 356 L194 354Z',P['tape'])+path('M194 341 L283 343 L283 348 L194 347Z',P['tapeLight'])
  body+=path('M197 427 L289 430 L290 444 L198 441Z',P['tape'])
 else:
  body=path('M164 265 Q178 247 211 244 L269 244 Q301 246 316 265 L337 449 Q291 466 240 461 Q190 467 143 449Z',P['jacket'])
  body+=path('M164 265 Q180 252 192 251 L182 452 Q160 455 143 449Z',P['jacketShadow'])
  body+=path('M288 252 Q307 253 316 265 L337 449 L312 456Z','#235243')
  body+=path('M154 333 Q240 345 326 333 L328 352 Q240 363 152 352Z',P['tape'])
  body+=path('M154 339 Q240 351 327 339 L327 344 Q240 355 153 344Z',P['tapeLight'])
  body+=path('M146 427 Q240 441 334 427 L336 443 Q240 458 144 443Z',P['tape'])
  body+=path('M147 433 Q240 447 335 433 L335 437 Q240 450 145 437Z',P['tapeLight'])
  if view!='back':
   body+=path('M240 266 L240 456','none',P['jacketShadow'],3)
   body+=path('M185 292 L213 292 L213 306 L185 306Z',P['jacketShadow'])+path('M189 296 L209 296 L209 302 L189 302Z',P['tape'])
   body+=path('M271 379 L308 379 L306 406 L273 406Z','#235243')+path('M272 381 L308 381','none',P['jacketLight'],2)
  else:body+=path('M240 266 L240 329 M240 360 L240 430','none',P['jacketShadow'],2)
 return '<g id="torso" data-layer="torso">'+body+'</g>'

def ears(view):
 if view=='profile':return ellipse(211,112,19,28,P['spots'])+ellipse(211,111,13,21,P['fur'])+ellipse(211,111,7,13,P['furShadow'])
 return ''.join(ellipse(x,111,22,29,P['spots'])+ellipse(x,110,16,22,P['fur'])+ellipse(x,110,9,15,P['furShadow']) for x in [153,327])

def eye(x,y,prefix,side,pose,small=False):
 face=pose['face'];dx,dy=pose.get('look',(0,0));sx=.8 if small else 1
 if face in ['sleeping']:
  return path(f'M{x-16} {y} Q{x} {y+12} {x+16} {y}','none',P['spots'],4)
 width=18*sx;upper=17 if face=='excited' else 13;lower=18 if face in ['happy','excited'] else 16
 d=f'M{x-width} {y} Q{x} {y-upper} {x+width} {y} Q{x} {y+lower} {x-width} {y}Z'
 cid=prefix+'eye-'+side
 s=f'<defs><clipPath id="{cid}">'+path(d,'#fff')+'</clipPath></defs>'+path(d,'#FFFDF1',P['spots'],2.2)
 s+=f'<g clip-path="url(#{cid})">'+ellipse(x+dx,y+dy+2,9*sx,10,P['eye'])+ellipse(x+dx+1,y+dy+2,4.3*sx,6,P['pupil'])+ellipse(x+dx-3,y+dy-2,2.5,2.5,'#FFFDF1')+'</g>'
 browy=y-17
 if face=='kindConcern':d=f'M{x-15} {browy+2} Q{x} {browy-(5 if side=="left" else 2)} {x+15} {browy-2}'
 elif face=='confused' and side=='right':d=f'M{x-14} {browy-7} Q{x} {browy-15} {x+15} {browy-4}'
 elif face=='thinking':d=f'M{x-14} {browy} Q{x} {browy-5} {x+15} {browy+1}'
 else:d=f'M{x-15} {browy} Q{x} {browy-5} {x+15} {browy+1}'
 return s+path(d,'none',P['spots'],3.5)

def head(pose,view,prefix):
 if view=='profile':
  s=ears(view)+path('M202 104 Q246 83 276 111 Q290 139 288 171 Q303 177 320 183 Q335 195 315 209 L286 216 Q270 239 232 234 Q202 217 194 178Z',P['fur'])
  s+=path('M278 171 Q299 179 320 183 Q330 191 316 203 L282 217 L259 207Z',P['muzzle'])
  s+=path('M312 183 Q327 184 329 192 Q327 202 315 202 L307 193Z',P['spots'])
  s+=eye(272,151,prefix,'profile',pose,True)
  for x,y,rx,ry,a in [(214,140,5,8,-15),(221,160,4,6,15),(217,183,5,7,5),(227,203,5,7,-20),(245,122,5,4,10)]:s+=ellipse(x,y,rx,ry,P['spots'],f'transform="rotate({a} {x} {y})"')
  s+=path('M285 205 Q301 214 313 207','none',P['spots'],3)
 elif view=='back':
  s=ears(view)+path('M164 116 Q170 78 240 78 Q310 78 316 116 L322 179 Q320 215 285 230 Q260 238 240 238 Q207 238 177 217 Q156 198 158 164Z',P['fur'])
  for x,y,sc,a in [(190,145,.8,-10),(222,133,.7,15),(260,133,.7,-15),(290,145,.8,10),(182,177,.7,10),(217,172,.65,-20),(262,172,.65,20),(298,177,.7,-10),(207,208,.7,5),(240,215,.65,15),(275,208,.7,-5)]:s+=ring(x,y,sc,a)
 else:
  s=ears(view)+path('M164 116 Q170 78 240 78 Q310 78 316 116 L322 177 Q321 211 287 229 Q265 238 240 238 Q211 238 187 226 Q157 211 158 177Z',P['fur'])
  s+=path('M161 142 Q167 114 185 103 Q175 147 182 177 Q187 206 204 225 Q173 217 163 199 Q155 180 161 142Z',P['furShadow'])
  shift=13 if view=='three-quarter' else 0
  s+=path(f'M{201+shift} 185 Q{208+shift} 173 {224+shift} 181 Q{240+shift} 188 {256+shift} 181 Q{272+shift} 174 {280+shift} 190 Q{285+shift} 215 {261+shift} 230 Q{240+shift} 239 {218+shift} 230 Q{192+shift} 217 {201+shift} 185Z',P['muzzle'])
  for x,y,rx,ry,a in [(181,132,5,7,20),(175,153,4,6,-20),(177,178,5,7,-20),(187,196,4,6,-25),(200,123,4,6,35),(220,116,4,6,15),(240,113,4,6,0),(260,116,4,6,-15),(280,123,4,6,-35),(299,132,5,7,-20),(306,153,4,6,20),(303,178,5,7,20),(293,196,4,6,25)]:
   if view=='three-quarter' and x<190:continue
   s+=ellipse(x+(shift*.4 if x>190 and x<290 else 0),y,rx,ry,P['spots'],f'transform="rotate({a} {x} {y})"')
  s+=eye(199+shift,157,prefix,'left',pose,view=='three-quarter')+eye(281+shift*.35,157,prefix,'right',pose)
  nx=240+shift
  s+=path(f'M{nx-16} 188 Q{nx} 183 {nx+16} 188 Q{nx+13} 202 {nx} 208 Q{nx-13} 201 {nx-16} 188Z',P['spots'])
  s+=path(f'M{nx-9} 189 Q{nx} 187 {nx+9} 190','none','#92653F',2.5)
  s+=path(f'M{nx} 207 L{nx} 214','none',P['spots'],2.5)
  face=pose['face']
  if face in ['happy','excited']:
   s+=path(f'M{nx-22} 215 Q{nx} 238 {nx+22} 215 Q{nx} 225 {nx-22} 215Z',P['spots'])
   s+=path(f'M{nx-14} 218 Q{nx} 225 {nx+14} 218','none','#FFF8DC',3)
  elif face=='speaking':s+=ellipse(nx,222,12,8,P['spots'])+ellipse(nx,225,7,3,'#C97958')
  elif face=='kindConcern':s+=path(f'M{nx-18} 220 Q{nx} 218 {nx+18} 222','none',P['spots'],2.5)
  elif face in ['thinking','confused']:s+=path(f'M{nx-11} 220 Q{nx} 217 {nx+14} 220','none',P['spots'],2.5)
  else:s+=path(f'M{nx-21} 214 Q{nx-9} 228 {nx} 215 Q{nx+10} 228 {nx+21} 214','none',P['spots'],2.7)
  for x,y in [(216+shift,199),(211+shift,206),(264+shift,199),(269+shift,206)]:s+=ellipse(x,y,1.8,1.7,P['spots'])
 tilt=pose.get('headtilt',0)
 return f'<g id="head" data-layer="head" transform="rotate({tilt} 240 230)">'+s+helmet(view)+'</g>'

def helmet(view):
 if view=='profile':
  s=path('M188 117 Q186 65 226 45 Q261 37 282 81 L292 111 Q322 113 343 126 Q329 136 294 134 L190 129 Q176 126 188 117Z',P['helmet'])
  s+=path('M188 117 Q236 100 290 112 L295 129 L190 129Z',P['helmetShadow'])
  s+=path('M220 49 Q206 75 210 109','none',P['helmetLight'],5)
  return '<g id="helmet" data-layer="helmet">'+s+'</g>'
 s=path('M148 121 Q148 71 197 47 Q211 38 227 40 Q234 28 247 35 Q253 38 254 43 Q304 50 327 87 Q333 101 332 123Z',P['helmet'])
 s+=path('M246 43 Q294 56 305 119 L332 123 Q336 72 278 49Z',P['helmetShadow'])
 s+=path('M191 56 Q175 82 174 115 M239 44 Q223 73 224 113','none',P['helmetLight'],4)
 if view!='back':
  cx=252 if view=='three-quarter' else 241
  s+=path(f'M{cx-17} 63 Q{cx} 54 {cx+17} 65 L{cx+14} 92 Q{cx} 107 {cx-14} 92Z',P['helmetLight'])
 s+=path('M137 116 Q242 95 341 117 Q357 124 342 137 Q312 148 288 135 Q241 125 193 135 Q159 149 135 135 Q125 126 137 116Z',P['helmetShadow'])
 s+=path('M141 118 Q239 103 335 120','none','#C67946',3)
 return '<g id="helmet" data-layer="helmet">'+s+'</g>'

def svg_body(state='neutral',view='front',prefix='leo-'):
 p=dict(POSES[state]);s=tail(view)+legs(p,view)
 if view=='profile':
  p['l']=[(208,272),(187,340),(189,405)];p['r']=[(269,274),(288,344),(293,405)]
 if view=='back':p['face']='neutral'
 s+=arm(p['l'],'left')
 s+=path('M215 217 L265 217 L268 264 L240 278 L212 264Z',P['muzzle'])
 s+=torso(view)
 s+=arm(p['r'],'right',p.get('rightHand','open'))
 s+='<g id="collar" data-layer="collar">'+path('M209 237 L240 265 L221 281 L195 250 L197 232Z',P['jacketShadow'])+path('M270 237 L240 265 L257 281 L285 249 L283 232Z',P['jacketShadow'])+'</g>'
 s+=head(p,view,prefix)
 if p.get('book'):
  s+='<g id="book-prop" data-layer="book-prop">'+path('M124 331 Q149 326 166 340 Q184 328 211 333 L211 377 Q185 372 166 383 Q145 372 124 377Z','#F5E9C7',P['jacketShadow'],3)+path('M166 341 L166 382','none','#C5B489',2)+path('M133 343 L155 348 M133 353 L155 357 M178 347 L201 342 M178 357 L201 352','none','#A69571',2)+'</g>'
 s=f'<g id="leo-body" data-layer="root" transform="translate(0 {p.get("lift",0)}) rotate({p.get("tilt",0)} 240 390)">'+s+'</g>'
 # Give every layer a unique, stable per-asset prefix for safe inline composition.
 import re
 s=re.sub(r'id="(?!'+re.escape(prefix)+r')([^\"]+)"',lambda m:'id="'+prefix+m.group(1)+'"',s)
 return s

def document(state='neutral',view='front',portrait=False):
 prefix='leo-'+state+'-'+view+'-'
 vb='126 28 230 221' if portrait else '0 0 480 680'
 w,h=(230,221) if portrait else (480,680)
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}" role="img" aria-labelledby="{prefix}title"><title id="{prefix}title">Leo — {state} — {view}. Original Phase B design asset, not a production animation.</title><metadata>PROJECT LEO / PHASE B / Canonical vector v1. Layer groups are editable SVG geometry; no Rive rig or Android integration. Body reference: head box 160 units; anatomical standing height 560 units; nominal ratio 3.5:1. No third-party logo or character artwork used in the vector.</metadata>{svg_body(state,view,prefix)}</svg>'''

if __name__=='__main__':
 assets=[]
 for state in POSES:
  name=f'leo-{state}-front-v1'
  s=ROOT/'assets/leo/svg'/(name+'.svg')
  with s.open('x') as f:f.write(document(state))
  p=ROOT/'assets/leo/png'/(name+'.png')
  result=subprocess.run(['magick','-background','none',str(s),'-resize','720x1020','PNG32:'+str(p)],capture_output=True,text=True)
  if result.returncode:raise RuntimeError('SVG raster export failed: '+result.stderr[:300])
  with Image.open(p) as im:
   assert im.mode=='RGBA';alpha=im.getchannel('A');bbox=alpha.getbbox();ext=alpha.getextrema();assert ext==(0,255)
  assets.append({'state':state,'view':'front','svg':str(s.relative_to(ROOT)),'png':str(p.relative_to(ROOT)),'svg_sha256':hashlib.sha256(s.read_bytes()).hexdigest(),'png_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':[720,1020],'alpha_extrema':ext,'bbox':bbox,'status':'CANONICAL_DESIGN_CANDIDATE; not production animation or approved rig'})
 for view in ['three-quarter','profile','back']:
  name='leo-neutral-'+view+'-v1';s=ROOT/'assets/leo/svg'/(name+'.svg')
  with s.open('x') as f:f.write(document('neutral',view))
  p=ROOT/'assets/leo/png'/(name+'.png')
  result=subprocess.run(['magick','-background','none',str(s),'-resize','720x1020','PNG32:'+str(p)],capture_output=True,text=True)
  assert result.returncode==0,result.stderr
  with Image.open(p) as im:assert im.mode=='RGBA';bbox=im.getchannel('A').getbbox();assert im.getchannel('A').getextrema()==(0,255)
  assets.append({'state':'neutral','view':view,'svg':str(s.relative_to(ROOT)),'png':str(p.relative_to(ROOT)),'svg_sha256':hashlib.sha256(s.read_bytes()).hexdigest(),'png_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':[720,1020],'alpha_extrema':[0,255],'bbox':bbox,'status':'CANONICAL_DESIGN_CANDIDATE; view construction needs artist review'})
 s=ROOT/'assets/leo/svg/leo-portrait-v1.svg'
 with s.open('x') as f:f.write(document('neutral','front',True))
 p=ROOT/'assets/leo/png/leo-portrait-v1.png'
 subprocess.run(['magick','-background','none',str(s),'-resize','230x221','PNG32:'+str(p)],check=True,capture_output=True)
 assets.append({'state':'portrait','view':'front','svg':str(s.relative_to(ROOT)),'png':str(p.relative_to(ROOT)),'size':[230,221],'status':'Derived crop of canonical neutral asset'})
 with (ROOT/'evidence/LEO_ASSET_GEOMETRY.json').open('x') as f:json.dump({'palette':P,'poses':POSES,'assets':assets,'creation':'Original procedural vector design authored in this standalone Phase B folder. No third-party character source copied.','review':'Human art-direction/trademark acceptance pending; SVG layers are not a tested animation rig.'},f,ensure_ascii=False,indent=2)
 print('Created',len(assets),'SVG/PNG design pairs: 16 expressions, three additional views, one portrait.')
 print('Verified PNG alpha on all full-body files. No application code changed.')
