#!/usr/bin/env bash
# アクセス制御（RLS）のテストを、使い捨ての PostgreSQL で実行する。
#   使い方:  bash supabase/test.sh
# 本番のデータには一切触れない（一時ディレクトリに新しいクラスタを作って消す）。
set -euo pipefail
# パイプの途中で失敗したら、全体を失敗にする（下の sed で握りつぶさないため）

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
PORT="${PGPORT:-55432}"
RUN_AS=""
# root では initdb が動かないため、postgres ユーザーで実行する
if [ "$(id -u)" = "0" ]; then
  chown postgres "$TMP"
  RUN_AS="runuser -u postgres --"
fi

cleanup() { $RUN_AS "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

$RUN_AS "$PGBIN/initdb" -D "$TMP/data" -A trust -U postgres >/dev/null
$RUN_AS "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null

PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
$RUN_AS "${PSQL[@]}" -c "create database test" >/dev/null
PSQL+=(-d test)

# ソケット・テスト用ファイルを postgres ユーザーが読めるようにする
chmod -R a+rX "$HERE"

$RUN_AS "${PSQL[@]}" -f "$HERE/tests/00_supabase_stub.sql"
$RUN_AS "${PSQL[@]}" -f "$HERE/migrations/001_member_area.sql"
$RUN_AS "${PSQL[@]}" -f "$HERE/tests/rls_test.sql" 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +//'
