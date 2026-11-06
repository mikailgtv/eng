#!/usr/bin/env python3
"""Non-destructive local SQLite snapshot restore check; never touches the source DB."""
from __future__ import annotations
import argparse
import json
import os
import sqlite3
import subprocess
import tempfile
import socket
import time
import urllib.error
import urllib.request
from pathlib import Path

CRITICAL = ["users", "organizations", "learning_groups", "levels", "courses", "books", "lessons", "student_lesson_progress", "student_learning_profiles", "xp_transactions"]

def snapshot(path: Path) -> tuple[str, list[str], dict[str, int]]:
    db = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
    violations = db.execute("PRAGMA foreign_key_check").fetchall()
    tables = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    counts = {name: db.execute(f'SELECT count(*) FROM "{name}"').fetchone()[0] for name in CRITICAL if name in tables}
    db.close()
    if integrity != "ok" or violations:
        raise RuntimeError(f"Integrity failed: {integrity}; FK violations: {len(violations)}")
    return integrity, tables, counts

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("backup", type=Path)
    parser.add_argument("--prisma", action="store_true", help="also open the restored copy through the generated Prisma client")
    parser.add_argument("--app-health", action="store_true", help="start the built Next.js app against the temporary copy and request /health")
    args = parser.parse_args()
    source = args.backup.resolve(strict=True)
    before_integrity, before_tables, before_counts = snapshot(source)
    with tempfile.TemporaryDirectory(prefix="englishbridge-restore-check-") as temp:
        restored = Path(temp) / "restored.sqlite"
        src = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
        dst = sqlite3.connect(restored)
        src.backup(dst)
        dst.commit()
        dst.close()
        src.close()
        after_integrity, after_tables, after_counts = snapshot(restored)
        if before_tables != after_tables or before_counts != after_counts:
            raise RuntimeError("Restored schema inventory or critical table row counts differ from the backup")
        prisma_counts = None
        app_health_result = None
        if args.prisma:
            code = 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); Promise.all([p.user.count(),p.course.count(),p.lesson.count(),p.lessonProgress.count()]).then(([users,courses,lessons,progress])=>console.log(JSON.stringify({users,courses,lessons,progress}))).catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>p.$disconnect())'
            env = os.environ.copy()
            env["DATABASE_URL"] = f"file:{restored}"
            result = subprocess.run(["node", "-e", code], env=env, capture_output=True, text=True, check=False)
            if result.returncode != 0:
                raise RuntimeError(f"Prisma restore smoke failed: {result.stderr.strip()}")
            prisma_counts = json.loads(result.stdout.strip().splitlines()[-1])
            expected = {"users": before_counts.get("users"), "courses": before_counts.get("courses"), "lessons": before_counts.get("lessons"), "progress": before_counts.get("student_lesson_progress")}
            if prisma_counts != expected:
                raise RuntimeError(f"Prisma reads from restored DB do not match SQLite counts: {prisma_counts} != {expected}")
        if args.app_health:
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            env = os.environ.copy()
            env["DATABASE_URL"] = f"file:{restored}"
            log_path = Path(temp) / "next-start.log"
            with log_path.open("w+") as log:
                proc = subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", str(port)], env=env, stdout=log, stderr=subprocess.STDOUT, cwd=Path(__file__).resolve().parents[2])
                try:
                    response_body = None
                    for _ in range(60):
                        if proc.poll() is not None:
                            break
                        try:
                            with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as response:
                                response_body = response.read().decode("utf-8")
                                response_headers = response.headers
                                if response.status != 200:
                                    raise RuntimeError(f"Restored app /health returned {response.status}: {response_body}")
                                break
                        except (urllib.error.URLError, TimeoutError, ConnectionError):
                            time.sleep(0.5)
                    if response_body is None:
                        log.seek(0)
                        raise RuntimeError(f"Restored app health endpoint did not become ready. Process={proc.poll()}, log={log.read()[-2000:]}")
                    if json.loads(response_body).get("status") != "healthy":
                        raise RuntimeError(f"Unexpected restored app health response: {response_body}")
                    security_headers = {key: response_headers.get(key) for key in ["x-content-type-options", "referrer-policy", "x-frame-options"]}
                    if security_headers != {"x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN"}:
                        raise RuntimeError(f"Unexpected security headers on /health: {security_headers}")
                    api_request = urllib.request.Request(f"http://127.0.0.1:{port}/api/books", headers={"Accept": "application/json"})
                    try:
                        with urllib.request.urlopen(api_request, timeout=3) as response:
                            api_status = response.status
                            api_headers = response.headers
                            api_body = response.read().decode("utf-8")
                    except urllib.error.HTTPError as exc:
                        api_status = exc.code
                        api_headers = exc.headers
                        api_body = exc.read().decode("utf-8")
                    parsed_api = json.loads(api_body)
                    if api_status != 401 or parsed_api.get("success") is not False or parsed_api.get("errorCode") != "HTTP_401" or not api_headers.get("x-request-id"):
                        raise RuntimeError(f"Unexpected unauthenticated API response: status={api_status}, body={api_body}, requestId={api_headers.get('x-request-id')}")
                    app_health_result = {"httpStatus": 200, "body": response_body, "unauthenticatedBookApi": {"httpStatus": api_status, "errorCode": parsed_api.get("errorCode"), "requestIdHeader": bool(api_headers.get("x-request-id"))}}
                finally:
                    proc.terminate()
                    try:
                        proc.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        proc.kill(); proc.wait(timeout=5)
        print(json.dumps({"ok": True, "source": str(source), "restoredToTemporaryDatabase": True, "temporaryCopyDeletedOnExit": True, "integrity": after_integrity, "foreignKeyViolations": 0, "tableCount": len(after_tables), "criticalCounts": after_counts, "prismaReadback": prisma_counts, "appHealth": app_health_result}, indent=2))

if __name__ == "__main__":
    main()
