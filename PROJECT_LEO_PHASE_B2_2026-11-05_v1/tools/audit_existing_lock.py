"""Read-only npm lock-tree advisory query in a verified isolated copy.
No installation, update, fix, lifecycle script, application, API server or migration.
Original app files and user npm configuration are never used as writable targets.
"""
from pathlib import Path
import json,hashlib,subprocess,os,signal,csv
R=Path('/home/user');O=R/'PROJECT_LEO_PHASE_B2_2026-11-05_v1'
W=O/'evidence/security_web_lock_query';W.mkdir()
for sub in ['home','.cache']:(W/sub).mkdir()
protected={}
for name in ['package.json','package-lock.json']:
 data=(R/name).read_bytes();protected[name]=hashlib.sha256(data).hexdigest()
 with (W/name).open('xb') as f:f.write(data)
 assert (W/name).read_bytes()==data
for name in ['empty-user-npmrc','empty-global-npmrc']:
 with (W/name).open('x') as f:f.write('')
lock=json.loads((W/'package-lock.json').read_text());manifest=json.loads((W/'package.json').read_text())
lockrows=[]
for loc,p in lock.get('packages',{}).items():
 if not loc:continue
 name=loc.rsplit('node_modules/',1)[-1]
 lockrows.append({'package':name,'lock_location':loc,'locked_version':p.get('version',''),'installed_version':'UNAVAILABLE: no node_modules evidence','direct_scope':'runtime declaration' if name in manifest.get('dependencies',{}) else 'development declaration' if name in manifest.get('devDependencies',{}) else 'transitive','dev_flag':p.get('dev',False)})
with (O/'registers/WEB_LOCKED_PACKAGES.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(lockrows[0]));w.writeheader();w.writerows(lockrows)
cmd=['npm','audit','--package-lock-only','--ignore-scripts','--json','--no-fund','--registry=https://registry.npmjs.org','--userconfig='+str(W/'empty-user-npmrc'),'--globalconfig='+str(W/'empty-global-npmrc'),'--cache='+str(W/'.cache'),'--fetch-retries=0','--fetch-timeout=30000']
env={'PATH':os.environ.get('PATH','/usr/bin:/bin'),'HOME':str(W/'home'),'LANG':'C.UTF-8','CI':'true','NO_COLOR':'1'}
proc=subprocess.Popen(cmd,cwd=W,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
timed_out=False
try:stdout,stderr=proc.communicate(timeout=70)
except subprocess.TimeoutExpired:
 timed_out=True;os.killpg(proc.pid,signal.SIGTERM)
 try:stdout,stderr=proc.communicate(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);stdout,stderr=proc.communicate()
try:data=json.loads(stdout)
except Exception:data={}
# Export selected advisory fields only, never resolved private URLs or raw command logs.
normalized={}
for name,v in data.get('vulnerabilities',{}).items():
 via=[]
 for x in v.get('via',[]):
  if isinstance(x,str):via.append({'dependency':x})
  elif isinstance(x,dict):
   url=x.get('url','')
   safe_url=url if url.startswith(('https://github.com/advisories/','https://www.npmjs.com/advisories/','https://nvd.nist.gov/')) else '[reference omitted]'
   via.append({k:x.get(k) for k in ['name','title','severity','range','cwe','cvss'] if k in x}|{'url':safe_url})
 normalized[name]={'severity':v.get('severity'),'range':v.get('range'),'isDirect':v.get('isDirect'),'via':via,'effects':v.get('effects',[]),'nodes':v.get('nodes',[]),'fixAvailable':v.get('fixAvailable'),'locked_occurrences':[x for x in lockrows if x['package']==name],'installed_occurrences':'UNAVAILABLE; audit is lock-only'}
errors=data.get('error') or {}
report={'date':'2026-11-05','scope':'Original Next.js LMS lockfile ONLY, not the Expo/Windows installed tree','command':'npm audit --package-lock-only --ignore-scripts --json; public registry; isolated empty npm config/cache','runtime':'Node 20.20.2 / npm 10.8.2 used only for advisory query, not a supported application runtime claim','exit_code':proc.returncode,'timeout':timed_out,'query_status':'BLOCKED' if timed_out or errors or not data.get('metadata') else 'COMPLETED_LOCK_ONLY','error_code':errors.get('code') if isinstance(errors,dict) else 'unknown','raw_stderr_retained':False,'raw_logs_note':'Raw outputs not exported to avoid paths/config/credential leakage; selected public advisory fields retained.','metadata':data.get('metadata',{}),'vulnerabilities':normalized,'installed_tree_proven':False,'native_tree_audited':False,'packages_installed':False,'lifecycle_scripts_executed':False,'fix_update_or_override_applied':False,'original_hashes':protected}
for name,h in protected.items():
 assert hashlib.sha256((R/name).read_bytes()).hexdigest()==h
 assert hashlib.sha256((W/name).read_bytes()).hexdigest()==h
report['original_and_copy_package_lock_unchanged']=True
report['node_modules_created']=(W/'node_modules').exists();assert not report['node_modules_created']
with (O/'evidence/WEB_LOCK_AUDIT.json').open('x') as f:json.dump(report,f,indent=2)
print('Query status:',report['query_status'],'exit:',report['exit_code'],'timeout:',timed_out)
print('Advisory metadata:',json.dumps(report['metadata']))
print('Vulnerable lock entries:',[(n,v['severity'],[x['locked_version'] for x in v['locked_occurrences']]) for n,v in normalized.items()])
print('No installs/fixes/updates; original and copied manifests/lock unchanged. Native installed versions remain unproven.')
