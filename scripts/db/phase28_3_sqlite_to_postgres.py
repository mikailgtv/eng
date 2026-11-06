#!/usr/bin/env python3
"""Controlled, resumable SQLite-to-PostgreSQL ETL for the LMS staging rehearsal.

Reads the SQLite source and the required backup in read-only mode. Uses standard
libpq PG* environment configuration for psql; never logs connection strings or
row values. This script is staging-only and intentionally requires an explicit
validated backup path.
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Any

PROGRESS_SCHEMA = "phase28_meta"
PROGRESS_TABLE = "import_progress"
BATCH_DEFAULT = 500


def qi(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_lit(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def ro_sqlite(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.execute("PRAGMA query_only=ON")
    return conn


def tagged(value: Any) -> list[Any]:
    if value is None:
        return ["null", None]
    if isinstance(value, bytes):
        return ["blob", base64.b64encode(value).decode("ascii")]
    if isinstance(value, bool):
        return ["integer", "1" if value else "0"]
    if isinstance(value, int):
        return ["integer", str(value)]
    if isinstance(value, float):
        return ["real", value.hex()]
    return ["text", value]


def schema_fingerprint(conn: sqlite3.Connection) -> str:
    objects = conn.execute(
        "SELECT type,name,tbl_name,sql FROM sqlite_master "
        "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name"
    ).fetchall()
    payload = json.dumps(objects, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def ordered_query(table: str, columns: list[str], pk: list[str]) -> str:
    order = pk or columns
    suffix = " ORDER BY " + ", ".join(qi(col) for col in order) if order else ""
    return f"SELECT * FROM {qi(table)}{suffix}"


def table_fingerprint(conn: sqlite3.Connection, table: str, columns: list[str], pk: list[str]) -> tuple[int, str]:
    cur = conn.execute(ordered_query(table, columns, pk))
    digest = hashlib.sha256()
    digest.update(json.dumps(columns, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    digest.update(b"\n")
    count = 0
    while True:
        batch = cur.fetchmany(500)
        if not batch:
            break
        for row in batch:
            digest.update(json.dumps([tagged(v) for v in row], ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            digest.update(b"\n")
            count += 1
    return count, digest.hexdigest()


def verify_backup(source: Path, backup: Path) -> dict[str, Any]:
    if not backup.is_file():
        raise RuntimeError("BLOCKED: required verified backup file is missing")
    src_stat = source.stat()
    source_hash_before = hashlib.sha256(source.read_bytes()).hexdigest()
    src = ro_sqlite(source)
    bak = ro_sqlite(backup)
    try:
        for label, conn in (("source", src), ("backup", bak)):
            integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
            violations = conn.execute("PRAGMA foreign_key_check").fetchall()
            if integrity != "ok" or violations:
                raise RuntimeError(f"BLOCKED: {label} SQLite validation failed")
        src_tables = [r[0] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        bak_tables = [r[0] for r in bak.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        if src_tables != bak_tables:
            raise RuntimeError("BLOCKED: source/backup table inventories differ")
        if schema_fingerprint(src) != schema_fingerprint(bak):
            raise RuntimeError("BLOCKED: source/backup schema fingerprints differ")
        counts: dict[str, int] = {}
        total = 0
        for table in src_tables:
            src_info = src.execute(f"PRAGMA table_info({qi(table)})").fetchall()
            bak_info = bak.execute(f"PRAGMA table_info({qi(table)})").fetchall()
            src_cols = [r[1] for r in src_info]
            bak_cols = [r[1] for r in bak_info]
            if src_cols != bak_cols:
                raise RuntimeError(f"BLOCKED: source/backup column inventory differs for {table}")
            pk = [r[1] for r in sorted(src_info, key=lambda x: x[5]) if r[5]]
            sc, sh = table_fingerprint(src, table, src_cols, pk)
            bc, bh = table_fingerprint(bak, table, bak_cols, pk)
            if sc != bc or sh != bh:
                raise RuntimeError(f"BLOCKED: source/backup data differs for {table}")
            counts[table] = sc
            total += sc
        source_hash_after = hashlib.sha256(source.read_bytes()).hexdigest()
        now = source.stat()
        if (source_hash_before != source_hash_after or source_hash_before != hashlib.sha256(source.read_bytes()).hexdigest()
                or src_stat.st_size != now.st_size or src_stat.st_mtime_ns != now.st_mtime_ns):
            raise RuntimeError("BLOCKED: source changed during read-only backup verification")
        return {
            "source_sha256": source_hash_before,
            "backup_sha256": hashlib.sha256(backup.read_bytes()).hexdigest(),
            "schema_fingerprint": schema_fingerprint(src),
            "tables": src_tables,
            "row_counts": counts,
            "total_rows": total,
            "source_size": src_stat.st_size,
        }
    finally:
        src.close()
        bak.close()


def fk_graph(conn: sqlite3.Connection, tables: list[str]) -> tuple[dict[str, set[str]], list[list[str]]]:
    graph: dict[str, set[str]] = {t: set() for t in tables}
    for table in tables:
        for fk in conn.execute(f"PRAGMA foreign_key_list({qi(table)})"):
            graph[table].add(fk[2])
    index = 0
    stack: list[str] = []
    on_stack: set[str] = set()
    indices: dict[str, int] = {}
    low: dict[str, int] = {}
    components: list[list[str]] = []

    def visit(v: str) -> None:
        nonlocal index
        indices[v] = low[v] = index
        index += 1
        stack.append(v)
        on_stack.add(v)
        for w in graph[v]:
            if w not in indices:
                visit(w)
                low[v] = min(low[v], low[w])
            elif w in on_stack:
                low[v] = min(low[v], indices[w])
        if low[v] == indices[v]:
            comp: list[str] = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                comp.append(w)
                if w == v:
                    break
            components.append(comp)

    for table in tables:
        if table not in indices:
            visit(table)
    component_of = {table: i for i, comp in enumerate(components) for table in comp}
    outgoing: dict[int, set[int]] = defaultdict(set)
    indegree = [0] * len(components)
    # Edges are parent-component -> child-component for parent-first loading.
    for child, parents in graph.items():
        for parent in parents:
            a, b = component_of[parent], component_of[child]
            if a != b and b not in outgoing[a]:
                outgoing[a].add(b)
                indegree[b] += 1
    ready = sorted((i for i, d in enumerate(indegree) if d == 0), key=lambda i: sorted(components[i])[0])
    comp_order: list[int] = []
    while ready:
        i = ready.pop(0)
        comp_order.append(i)
        for j in sorted(outgoing[i], key=lambda x: sorted(components[x])[0]):
            indegree[j] -= 1
            if indegree[j] == 0:
                ready.append(j)
                ready.sort(key=lambda x: sorted(components[x])[0])
    if len(comp_order) != len(components):
        raise RuntimeError("dependency graph topological sort failed")
    order = [t for i in comp_order for t in sorted(components[i])]
    cycles = [sorted(c) for c in components if len(c) > 1 or any(t in graph[t] for t in c)]
    if len(order) != len(tables):
        raise RuntimeError("dependency graph did not cover every source table")
    return order, cycles


def psql(args: list[str], sql: str | None = None, file: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    cmd = ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-F", "\t"]
    if file is not None:
        cmd += ["-f", str(file)]
    elif sql is not None:
        cmd += ["-c", sql]
    else:
        raise ValueError("sql or file required")
    result = subprocess.run(cmd, text=True, capture_output=True, env=os.environ.copy())
    if check and result.returncode:
        raise RuntimeError("PostgreSQL operation failed; database diagnostics suppressed")
    return result


def target_columns() -> tuple[dict[str, list[str]], dict[tuple[str, str], tuple[str, str, str, str]]]:
    result = psql([], "SELECT table_name,column_name,data_type,udt_name,is_nullable,COALESCE(column_default,'') FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations' ORDER BY table_name,ordinal_position")
    cols: dict[str, list[str]] = defaultdict(list)
    types: dict[tuple[str, str], tuple[str, str, str, str]] = {}
    for line in result.stdout.splitlines():
        table, col, data_type, udt, nullable, default = line.split("\t", 5)
        cols[table].append(col)
        types[(table, col)] = (data_type, udt, nullable, default)
    return dict(cols), types


def to_target(value: Any, target_type: tuple[str, str, str, str], stats: dict[str, int], table: str, col: str) -> str | None:
    data_type, udt, _nullable, _default = target_type
    if value is None:
        return None
    if data_type == "boolean":
        if value not in (0, 1, False, True):
            raise RuntimeError(f"non-binary SQLite Boolean value found in {table}.{col}; no coercion performed")
        stats["boolean"] += 1
        return "true" if bool(value) else "false"
    if data_type.startswith("timestamp"):
        if isinstance(value, (int, float)):
            stats["epoch_ms_to_timestamp"] += 1
            instant = dt.datetime.fromtimestamp(float(value) / 1000, tz=dt.timezone.utc).replace(tzinfo=None)
            return instant.isoformat(sep=" ", timespec="milliseconds")
        if isinstance(value, str):
            instant = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
            if instant.tzinfo is not None:
                instant = instant.astimezone(dt.timezone.utc).replace(tzinfo=None)
            return instant.isoformat(sep=" ", timespec="milliseconds")
        raise RuntimeError(f"unsupported SQLite DateTime representation in {table}.{col}")
    if udt == "bytea":
        if not isinstance(value, bytes):
            raise RuntimeError(f"non-binary SQLite value found in BLOB field {table}.{col}; no coercion performed")
        stats["blob_to_bytea"] += 1
        return r"\x" + value.hex()
    if data_type in ("json", "jsonb"):
        try:
            parsed = json.loads(value)
        except Exception as exc:
            raise RuntimeError(f"invalid JSON text in {table}.{col}; no value skipped") from exc
        stats["json_text_to_json"] += 1
        return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, bytes):
        raise RuntimeError(f"binary SQLite value found in non-binary target {table}.{col}")
    text = str(value)
    if "\x00" in text:
        raise RuntimeError(f"NUL character cannot be represented in PostgreSQL text field {table}.{col}")
    return text


def csv_field(value: str | None) -> str:
    if value is None:
        return r"\N"
    return '"' + value.replace('"', '""') + '"'


def scalar_count(table: str) -> int:
    result = psql([], f"SELECT count(*) FROM public.{qi(table)}")
    return int(result.stdout.strip() or "0")


def import_source(args: argparse.Namespace) -> dict[str, Any]:
    source = Path(args.source).resolve()
    backup = Path(args.backup).resolve()
    verified = verify_backup(source, backup)
    print(f"BACKUP_VERIFICATION=PASS tables={len(verified['tables'])} rows={verified['total_rows']} source_hash={verified['source_sha256']} backup_hash={verified['backup_sha256']}")
    src = ro_sqlite(source)
    try:
        tables = verified["tables"]
        order, cycles = fk_graph(src, tables)
        target_cols, target_types = target_columns()
        if set(target_cols) != set(tables):
            raise RuntimeError("source/target table inventory mismatch; import stopped")
        source_cols: dict[str, list[str]] = {}
        source_pk: dict[str, list[str]] = {}
        for table in tables:
            info = src.execute(f"PRAGMA table_info({qi(table)})").fetchall()
            cols = [r[1] for r in info]
            source_cols[table] = cols
            source_pk[table] = [r[1] for r in sorted(info, key=lambda x: x[5]) if r[5]]
            if set(cols) != set(target_cols[table]):
                raise RuntimeError(f"source/target column inventory mismatch for {table}; import stopped")
        psql([], f"CREATE SCHEMA IF NOT EXISTS {qi(PROGRESS_SCHEMA)}; CREATE TABLE IF NOT EXISTS {qi(PROGRESS_SCHEMA)}.{qi(PROGRESS_TABLE)} (table_name text PRIMARY KEY, source_rows bigint NOT NULL, source_fingerprint text NOT NULL, status text NOT NULL, completed_at timestamptz NOT NULL DEFAULT now())")
        with tempfile.TemporaryDirectory(prefix="phase28_3_etl_", dir=args.temp_dir) as tmp:
            work = Path(tmp)
            stats = defaultdict(int)
            progress_log = Path(args.progress_log) if args.progress_log else None
            if progress_log:
                progress_log.parent.mkdir(parents=True, exist_ok=True)
                progress_log.write_text("")
                os.chmod(progress_log, 0o600)
            imported = skipped = 0
            for number, table in enumerate(order, start=1):
                cols = source_cols[table]
                dest_cols = target_cols[table]
                pos = {name: i for i, name in enumerate(cols)}
                pk = source_pk[table]
                cur = src.execute(ordered_query(table, cols, pk))
                digest = hashlib.sha256()
                digest.update(json.dumps(cols, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
                digest.update(b"\n")
                row_count = 0
                batch_num = 0
                batch_rows = 0
                first_csv_line: str | None = None
                files: list[Path] = []
                current_path: Path | None = None
                current_file = None
                while True:
                    rows = cur.fetchmany(args.batch_size)
                    if not rows:
                        break
                    batch_num += 1
                    current_path = work / f"{number:03d}_{hashlib.sha256(table.encode()).hexdigest()[:14]}_{batch_num:05d}.csv"
                    current_file = current_path.open("w", encoding="utf-8", newline="")
                    os.chmod(current_path, 0o600)
                    files.append(current_path)
                    batch_rows = 0
                    for row in rows:
                        digest.update(json.dumps([tagged(v) for v in row], ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
                        digest.update(b"\n")
                        converted = [to_target(row[pos[col]], target_types[(table, col)], stats, table, col) for col in dest_cols]
                        line = ",".join(csv_field(v) for v in converted) + "\n"
                        if first_csv_line is None:
                            first_csv_line = line
                        current_file.write(line)
                        row_count += 1
                        batch_rows += 1
                    current_file.close()
                    current_file = None
                source_hash = digest.hexdigest()
                if row_count != verified["row_counts"][table]:
                    raise RuntimeError(f"source row count changed during export for {table}")
                existing = psql([], f"SELECT source_rows::text || E'\\t' || source_fingerprint || E'\\t' || status FROM {qi(PROGRESS_SCHEMA)}.{qi(PROGRESS_TABLE)} WHERE table_name={sql_lit(table)}")
                if existing.stdout.strip():
                    parts = existing.stdout.strip().split("\t")
                    if len(parts) != 3 or parts[0] != str(row_count) or parts[1] != source_hash or parts[2] != "complete":
                        raise RuntimeError(f"resume fingerprint/status mismatch for {table}; no overwrite performed")
                    if scalar_count(table) != row_count:
                        raise RuntimeError(f"completed table count differs for {table}; no overwrite performed")
                    status = "verified-skip"
                    skipped += 1
                else:
                    if scalar_count(table) != 0:
                        raise RuntimeError(f"table {table} has rows but no progress record; no overwrite performed")
                    sql_lines = ["BEGIN;", "SET LOCAL session_replication_role = replica;"]
                    for path in files:
                        sql_lines.append(f"\\copy public.{qi(table)} ({', '.join(qi(c) for c in dest_cols)}) FROM '{path}' WITH (FORMAT csv, NULL '\\N')")
                    if args.inject_failure_at == number:
                        synthetic = work / f"{number:03d}_synthetic_failure.csv"
                        if row_count:
                            synthetic.write_text(first_csv_line or "", encoding="utf-8")
                        else:
                            synthetic.write_text(",".join(r"\N" for _ in dest_cols) + "\n", encoding="utf-8")
                        os.chmod(synthetic, 0o600)
                        sql_lines.append(f"\\copy public.{qi(table)} ({', '.join(qi(c) for c in dest_cols)}) FROM '{synthetic}' WITH (FORMAT csv, NULL '\\N')")
                    sql_lines.append(f"DO $phase28$ BEGIN IF (SELECT count(*) FROM public.{qi(table)}) <> {row_count} THEN RAISE EXCEPTION 'row count check failed'; END IF; END $phase28$;")
                    sql_lines.append(f"INSERT INTO {qi(PROGRESS_SCHEMA)}.{qi(PROGRESS_TABLE)} (table_name,source_rows,source_fingerprint,status) VALUES ({sql_lit(table)},{row_count},{sql_lit(source_hash)},'complete');")
                    sql_lines.append("COMMIT;")
                    sqlfile = work / f"{number:03d}_table.sql"
                    sqlfile.write_text("\n".join(sql_lines) + "\n", encoding="utf-8")
                    os.chmod(sqlfile, 0o600)
                    result = psql([], file=sqlfile, check=False)
                    if result.returncode:
                        if args.inject_failure_at == number:
                            print(f"TABLE {number}/{len(order)} {table} rows={row_count} status=INJECTED_FAILURE_ROLLED_BACK")
                            raise RuntimeError(f"injected failure recovered at table boundary {number}; per-table transaction rolled back")
                        raise RuntimeError(f"import failed at table {number}/{len(order)} ({table}); diagnostics suppressed; current table transaction rolled back")
                    if scalar_count(table) != row_count:
                        raise RuntimeError(f"post-commit table count mismatch for {table}")
                    status = "imported"
                    imported += 1
                entry = {"position": number, "table": table, "rows": row_count, "fingerprint": source_hash, "status": status}
                if progress_log:
                    with progress_log.open("a", encoding="utf-8") as f:
                        f.write(json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n")
                print(f"TABLE {number}/{len(order)} {table} rows={row_count} status={status}")
            prog = psql([], f"SELECT count(*) FROM {qi(PROGRESS_SCHEMA)}.{qi(PROGRESS_TABLE)} WHERE status='complete'")
            complete = int(prog.stdout.strip() or "0")
            if complete != len(order):
                raise RuntimeError(f"completion manifest has {complete} of {len(order)} tables")
            print(f"ETL_COMPLETE tables={len(order)} imported_this_run={imported} already_verified={skipped} batch_size={args.batch_size} transformed_epoch_ms={stats['epoch_ms_to_timestamp']} booleans={stats['boolean']} blobs={stats['blob_to_bytea']} json={stats['json_text_to_json']}")
            return {"tables": len(order), "imported_this_run": imported, "verified_skipped": skipped, "row_counts": verified["row_counts"], "cycles": cycles, "stats": dict(stats), "source_sha256": verified["source_sha256"], "backup_sha256": verified["backup_sha256"], "progress_table": f"{PROGRESS_SCHEMA}.{PROGRESS_TABLE}"}
    finally:
        src.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="SQLite source file; opened read-only")
    parser.add_argument("--backup", required=True, help="Phase 28.1R-validated SQLite backup; opened read-only")
    parser.add_argument("--batch-size", type=int, default=BATCH_DEFAULT)
    parser.add_argument("--temp-dir", default=None, help="temporary directory outside the repository")
    parser.add_argument("--progress-log", default=None, help="optional JSONL progress log; contains metadata only")
    parser.add_argument("--inject-failure-at", type=int, default=None, help="TEST ONLY: inject one synthetic invalid batch at table position; staging only")
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("batch size must be positive")
    if args.inject_failure_at is not None and args.inject_failure_at < 1:
        parser.error("failure injection position must be positive")
    try:
        import_source(args)
        return 0
    except Exception as exc:
        # All psql diagnostics and row values are intentionally suppressed.
        message = str(exc)
        print(f"ETL_STOPPED: {message}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
