from pathlib import Path
import json,csv,hashlib,xml.etree.ElementTree as ET
from design_data import ROOT,TOKENS,SCREEN,STATES,state_spec

def luminance(h):
 c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
 return .2126*c[0]+.7152*c[1]+.0722*c[2]
def contrast(a,b):
 x,y=sorted([luminance(a),luminance(b)]);return (y+.05)/(x+.05)
pairs=[('ink','paper','text',4.5),('ink','surface','text',4.5),('muted','paper','text',4.5),('muted','surface','text',4.5),('primaryInk','primary','text',4.5),('primary','primarySoft','text',4.5),('accentInk','accent','text',4.5),('accentInk','accentSoft','text',4.5),('error','errorSoft','text',4.5),('warning','warningSoft','text',4.5),('info','infoSoft','text',4.5),('disabledInk','disabledBg','disabled explanatory text',4.5),('border','paper','essential boundary',3),('border','surface','essential boundary',3),('focus','paper','focus indicator',3),('primary','primarySoft','progress fill',3)]
ratios=[]
for route in ['routeA','routeB']:
 for fg,bg,role,minimum in pairs:
  ratio=contrast(TOKENS[route][fg],TOKENS[route][bg]);ratios.append({'route':route,'foreground_token':fg,'background_token':bg,'role':role,'foreground':TOKENS[route][fg],'background':TOKENS[route][bg],'ratio':round(ratio,3),'minimum':minimum,'result':'PASS' if ratio>=minimum else 'FAIL'})
with (ROOT/'evidence/CONTRAST_MEASUREMENTS.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(ratios[0]));w.writeheader();w.writerows(ratios)
(ROOT/'design/tokens.json').write_text(json.dumps(TOKENS,ensure_ascii=False,indent=2))
(ROOT/'design/screens.json').write_text(json.dumps(SCREEN,ensure_ascii=False,indent=2))
states=[state_spec(s,state) for s in SCREEN for state in STATES]
with (ROOT/'design/SCREEN_STATE_MATRIX.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(states[0]));w.writeheader();w.writerows(states)
(ROOT/'design/screen-states.json').write_text(json.dumps(states,ensure_ascii=False,indent=2))
print('Screen definitions:',len(SCREEN),'assessed state cells:',len(states),'N/A with reason:',sum(not s['applicable'] for s in states))
print('Contrast failures:',[x for x in ratios if x['result']=='FAIL'])
print('Minimum text contrast A:',min(x['ratio'] for x in ratios if x['route']=='routeA' and x['minimum']==4.5))
print('Minimum non-text contrast A:',min(x['ratio'] for x in ratios if x['route']=='routeA' and x['minimum']==3))
# Original generic monoline icons; no icon package or external brand asset used.
icons={
'home':'M3 11 12 3 21 11 M5 10v11h5v-7h4v7h5V10',
'path':'M5 4h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h11 M5 2v4 M19 18v4',
'book':'M12 5v15 M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z',
'review':'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18A8 8 0 0 1 4 12',
'user':'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M4 21v-2a8 8 0 0 1 16 0v2',
'check':'M5 12l4 4L19 6',
'close':'M6 6l12 12 M18 6 6 18',
'arrow':'M4 12h16 M13 5l7 7-7 7',
'back':'M20 12H4 M11 5l-7 7 7 7',
'play':'M8 4l12 8-12 8Z',
'pause':'M8 4v16 M16 4v16',
'replay':'M4 5v6h6 M5 10a8 8 0 1 1 0 6',
'mic':'M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0Z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',
'headphones':'M4 13v-2a8 8 0 0 1 16 0v2 M4 12H2v7h5v-7Z M20 12h2v7h-5v-7Z',
'info':'M12 10v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
'lock':'M5 10h14v12H5Z M8 10V6a4 4 0 0 1 8 0v4 M12 15v3',
'folder':'M2 6h8l2 3h10v12H2Z M2 6V3h7l3 3h9v3',
'storage':'M3 4h18v16H3Z M3 10h18 M7 7h.01 M7 14h.01 M11 14h6',
'settings':'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
'clock':'M12 7v5l4 3 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
'flag':'M5 22V3 M5 3c5-4 9 5 15 0v10c-6 5-10-4-15 0',
'shield':'M12 2 21 6v7c0 5-9 9-9 9s-9-4-9-9V6Z M8 12l3 3 5-6',
'award':'M8 14 5 22l7-3 7 3-3-8 M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0',
'upload':'M12 17V3 M6 9l6-6 6 6 M3 16v6h18v-6',
'download':'M12 3v14 M6 11l6 6 6-6 M3 17v5h18v-5',
'volume':'M3 9h4l5-5v16l-5-5H3Z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
'eye':'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
'organization':'M3 22V8h8v14 M11 22V2h10v20 M1 22h22 M6 12h2 M6 16h2 M14 6h4 M14 10h4 M14 14h4',
'key':'M15 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M13 12l8 8 M17 16l3-3',
'plus':'M12 4v16 M4 12h16',
'minus':'M4 12h16',
'light':'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M6 6l1 1 M17 17l1 1 M18 6l-1 1 M7 17l-1 1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'
}
(ROOT/'design/icons.json').write_text(json.dumps(icons,indent=2))
sprite='<svg xmlns="http://www.w3.org/2000/svg"><defs>'+''.join('<symbol id="leo-icon-'+name+'" viewBox="0 0 24 24"><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' for name,d in icons.items())+'</defs></svg>'
(ROOT/'assets/icons/leo-icon-sprite.svg').write_text(sprite)
(ROOT/'evidence/DESIGN_CONTRACT_COUNTS.json').write_text(json.dumps({'screens':len(SCREEN),'screen_groups':sorted(set(s['group'] for s in SCREEN)),'state_names':STATES,'state_cells':len(states),'na_with_reason':sum(not x['applicable'] for x in states),'contrast_pairs':len(ratios),'contrast_failures':sum(x['result']=='FAIL' for x in ratios),'icon_shapes':len(icons),'app_implementation':False},indent=2))
