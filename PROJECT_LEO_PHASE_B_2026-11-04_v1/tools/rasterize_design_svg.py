"""Small authoring renderer for this project's simple SVG geometry only.
Uses already-installed Pillow. Not an application runtime or a general SVG engine.
The installed ImageMagick MSVG export dropped strokes/transforms and was rejected.
"""
from pathlib import Path
import re,math,xml.etree.ElementTree as ET,json,hashlib
from PIL import Image,ImageDraw,ImageChops
ROOT=Path('/home/user/PROJECT_LEO_PHASE_B_2026-11-04_v1')
I=(1,0,0,1,0,0)
def mul(a,b):
 A,B,C,D,E,F=a;g,h,i,j,k,l=b
 return (A*g+C*h,B*g+D*h,A*i+C*j,B*i+D*j,A*k+C*l+E,B*k+D*l+F)
def point(m,p):a,b,c,d,e,f=m;x,y=p;return (a*x+c*y+e,b*x+d*y+f)
def transform(s):
 m=I
 for name,args in re.findall(r'(translate|scale|rotate|matrix)\s*\(([^)]+)\)',s):
  v=[float(x) for x in re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',args)]
  if name=='translate':t=(1,0,0,1,v[0],v[1] if len(v)>1 else 0)
  elif name=='scale':t=(v[0],0,0,v[1] if len(v)>1 else v[0],0,0)
  elif name=='matrix':t=tuple(v)
  else:
   ang=math.radians(v[0]);t=(math.cos(ang),math.sin(ang),-math.sin(ang),math.cos(ang),0,0)
   if len(v)==3:t=mul(mul((1,0,0,1,v[1],v[2]),t),(1,0,0,1,-v[1],-v[2]))
  m=mul(m,t)
 return m

def contours(d):
 toks=re.findall(r'[MLQCZmlqcz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',d)
 i=0;cmd=None;cur=(0,0);start=(0,0);line=[];out=[]
 while i<len(toks):
  if toks[i].isalpha():cmd=toks[i];i+=1
  if cmd in ('Z','z'):
   if line:line.append(start);out.append((line,True));line=[]
   cur=start;cmd=None;continue
  if cmd not in ['M','L','Q','C']:raise ValueError('Unsupported path command in authoring asset: '+str(cmd))
  n={'M':2,'L':2,'Q':4,'C':6}[cmd]
  vals=list(map(float,toks[i:i+n]));i+=n
  if cmd=='M':
   if line:out.append((line,False))
   cur=(vals[0],vals[1]);start=cur;line=[cur];cmd='L'
  elif cmd=='L':cur=(vals[0],vals[1]);line.append(cur)
  elif cmd=='Q':
   p0=cur;p1=tuple(vals[:2]);p2=tuple(vals[2:]);steps=20
   for j in range(1,steps+1):
    t=j/steps;u=1-t;line.append((u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]))
   cur=p2
  else:
   p0=cur;p1=tuple(vals[:2]);p2=tuple(vals[2:4]);p3=tuple(vals[4:]);steps=30
   for j in range(1,steps+1):
    t=j/steps;u=1-t;line.append((u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]))
   cur=p3
 if line:out.append((line,False))
 return out

def color(value):
 if value in (None,'none'):return None
 if value.startswith('#'):
  v=value[1:]
  if len(v)==3:v=''.join(ch*2 for ch in v)
  return tuple(int(v[k:k+2],16) for k in (0,2,4))+(255,)
 return {'white':(255,255,255,255),'black':(0,0,0,255)}[value]

def geometry(el):
 name=el.tag.split('}')[-1]
 if name=='path':return contours(el.get('d',''))
 if name=='ellipse':
  x=float(el.get('cx','0'));y=float(el.get('cy','0'));rx=float(el.get('rx','0'));ry=float(el.get('ry','0'))
  return [([(x+rx*math.cos(t*math.pi/32),y+ry*math.sin(t*math.pi/32)) for t in range(65)],True)]
 return []

def render(svg_path,out_path,width=720,height=1020,ss=2):
 root=ET.parse(svg_path).getroot();vb=list(map(float,root.get('viewBox').split()));size=(width*ss,height*ss)
 initial=(size[0]/vb[2],0,0,size[1]/vb[3],-vb[0]*size[0]/vb[2],-vb[1]*size[1]/vb[3])
 defs={el.get('id'):el for el in root.iter() if el.tag.split('}')[-1]=='clipPath'}
 canvas=Image.new('RGBA',size,(0,0,0,0))
 def paint_shape(el,m,image,mask=False):
  shapes=geometry(el)
  if not shapes:return
  draw=ImageDraw.Draw(image)
  fill=255 if mask else color(el.get('fill','#000'))
  stroke=None if mask else color(el.get('stroke'))
  scale=math.sqrt(abs(m[0]*m[3]-m[1]*m[2]));w=max(1,round(float(el.get('stroke-width','1'))*scale))
  for pts,closed in shapes:
   q=[point(m,p) for p in pts]
   if fill is not None and len(q)>2:draw.polygon(q,fill=fill)
   if stroke is not None and len(q)>1:
    draw.line(q,fill=stroke,width=w,joint='curve')
    if el.get('stroke-linecap')=='round':
     rr=w/2
     for x,y in (q[0],q[-1]):draw.ellipse((x-rr,y-rr,x+rr,y+rr),fill=stroke)
 def visit(el,m,image):
  tag=el.tag.split('}')[-1]
  if tag in ['defs','metadata','title','clipPath']:return
  m=mul(m,transform(el.get('transform','')))
  clip=el.get('clip-path')
  if clip:
   cid=clip.removeprefix('url(#').removesuffix(')');layer=Image.new('RGBA',size,(0,0,0,0))
   for ch in el:visit(ch,m,layer)
   mask=Image.new('L',size,0)
   for ch in defs[cid]:paint_shape(ch,mul(m,transform(ch.get('transform',''))),mask,True)
   layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask));image.alpha_composite(layer);return
  paint_shape(el,m,image)
  for ch in el:visit(ch,m,image)
 visit(root,initial,canvas)
 canvas=canvas.resize((width,height),Image.Resampling.LANCZOS)
 canvas.save(out_path,optimize=True)
 return canvas

if __name__=='__main__':
 # Deterministic geometric checks, not a browser/native renderer test.
 assert point(transform('rotate(90 10 10)'),(20,10))==(10.000000000000002,20.0)
 q=point(transform('translate(10 20) rotate(90) scale(2)'),(2,0));assert abs(q[0]-10)<1e-6 and abs(q[1]-24)<1e-6
 meta=json.loads((ROOT/'evidence/LEO_ASSET_GEOMETRY.json').read_text());new=[]
 for rec in meta['assets']:
  svg=ROOT/rec['svg'];png=ROOT/'assets/leo/png'/(svg.stem+'-raster-v2.png')
  assert not png.exists()
  width,height=rec['size'];image=render(svg,png,width,height)
  alpha=image.getchannel('A');bbox=alpha.getbbox();assert alpha.getextrema()==(0,255)
  if rec['state']=='neutral' and rec['view']=='front':
   # Pants, sleeve, and tail: strokes were missing in the rejected MSVG raster.
   for x,y in [(196,500),(142,330),(387,515)]:assert alpha.getpixel((round(x*1.5),round(y*1.5)))>0
  new.append({**rec,'png':str(png.relative_to(ROOT)),'png_sha256':hashlib.sha256(png.read_bytes()).hexdigest(),'alpha_extrema':[0,255],'bbox':bbox,'rasterizer':'Local Pillow geometry authoring renderer v2; existing library; not a browser'})
  image.close()
 report={'initial_raster_result':'REJECTED: ImageMagick MSVG omitted strokes and mispositioned transformed shapes; not delivered','correction':'Exported new raster-v2 files with the same valid vector sources and an isolated authoring renderer. No old file overwritten.','active_assets':new,'geometric_fixture_checks':'PASS for tested transforms and selected stroke occupancy','browser_svg_rendering':'NOT TESTED','native_rig':'NOT IMPLEMENTED'}
 with (ROOT/'evidence/LEO_RASTER_VALIDATION_v2.json').open('x') as f:json.dump(report,f,ensure_ascii=False,indent=2)
 print('Created',len(new),'corrected transparent design PNGs; initial MSVG PNGs rejected and excluded from delivery.')
