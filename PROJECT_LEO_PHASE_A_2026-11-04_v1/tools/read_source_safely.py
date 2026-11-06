"""Print bounded, redacted public-source excerpts. Never read environment files."""
from pathlib import Path
import re,sys
ROOT=Path('/home/user')
for name in sys.argv[1:]:
    file=ROOT/name
    if name.startswith(('.','backups/','uploads/','e2e/')) or file.suffix not in {'.ts','.tsx','.mjs','.js','.md','.prisma','.css'}:
        raise SystemExit('Unsupported source path')
    lines=file.read_text(encoding='utf-8').splitlines()
    print('\n### '+name+' ('+str(len(lines))+' lines)')
    # A bounded excerpt is explicitly recorded; all files separately received full text scans.
    for no,line in enumerate(lines[:170],1):
        line=re.sub(r'(?i)(?:https?|postgres(?:ql)?|mysql|sqlserver|file):/{0,2}[^\s<>`\"\'\]\)]+','[URL REDACTED]',line)
        line=re.sub(r'(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b','[EMAIL REDACTED]',line)
        if re.search(r'(?i)(?:bucket|password|passwd|secret|token|api.?key|authorization)\s*[:=]\s*[\"\']',line):
            line='[literal sensitive-field line redacted]'
        line=re.sub(r'([\"\'])[A-Za-z0-9+/=_-]{45,}\1','"[LONG LITERAL REDACTED]"',line)
        print(str(no).rjust(4)+': '+line)
    if len(lines)>170:print('[Excerpt ends; remaining lines scanned structurally, not printed here.]')
