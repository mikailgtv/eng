import sqlite3, sys, hashlib

path = sys.argv[1] if len(sys.argv) > 1 else "prisma/dev.db"
ro = len(sys.argv) > 2 and sys.argv[2] == "--ro"
uri = f"file:{path}?mode=ro" if ro else path
c = sqlite3.connect(uri, uri=ro)
tabs = [r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")]
print(f"db={path} tables={len(tabs)} has_prisma_migrations={' _prisma_migrations' in tabs or '_prisma_migrations' in tabs}")
for tbl in ["users","organizations","learning_groups","user_roles","roles","permissions","courses","modules","lessons",
            "class_assignments","assignment_submissions","assessments","assessment_attempts","class_sessions",
            "attendance_records","messages","message_attachments","content_media","audit_logs","user_organizations"]:
    try:
        print(f"  {tbl:24s} {c.execute(f'select count(*) from \"{tbl}\"').fetchone()[0]}")
    except Exception as e:
        print(f"  {tbl:24s} ERR {str(e)[:60]}")
if ro is False:
    print("integrity_check:", c.execute("pragma integrity_check").fetchone()[0])
    fk = c.execute("pragma foreign_key_check").fetchall()
    print("foreign_key_violations:", len(fk))
