"""
SQLite → Supabase (PostgreSQL) データ移行スクリプト
ローカル実行専用。Vercel にはデプロイしない。

使用方法:
    pip install supabase
    SUPABASE_URL=https://xxx.supabase.co \
    SUPABASE_SERVICE_KEY=eyJ... \
    python scripts/migrate_to_supabase.py
"""
import sqlite3
import os
import sys
from pathlib import Path

try:
    from supabase import create_client
except ImportError:
    print("supabase パッケージをインストールしてください: pip install supabase")
    sys.exit(1)

# ─── 設定 ─────────────────────────────────────────────
DB_PATH = Path(__file__).parent.parent.parent / "tiktok-live-manager" / "data.db"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BATCH_SIZE = 500

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください。")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def dict_rows(cursor, query, params=()):
    cursor.execute(query, params)
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def upsert_batches(table: str, rows: list, on_conflict: str = "id"):
    if not rows:
        print(f"  {table}: スキップ（データなし）")
        return
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table(table).upsert(batch, on_conflict=on_conflict).execute()
    print(f"  {table}: {len(rows)} 件移行完了")


def main():
    print(f"SQLite DB: {DB_PATH}")
    if not DB_PATH.exists():
        print("data.db が見つかりません。パスを確認してください。")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    # 1. managers
    managers = dict_rows(c, "SELECT id, name, email FROM managers")
    upsert_batches("managers", managers)

    # 2. livers （active: 1/0 → True/False）
    livers = dict_rows(c, "SELECT id, tiktok_id, username, display_name, group_name, manager_id, joined_date, active FROM livers")
    for r in livers:
        r["active"] = bool(r["active"])
    upsert_batches("livers", livers)

    # 3. monthly_stats
    monthly_stats = dict_rows(c, """
        SELECT id, liver_id, period, diamonds, live_time_min, valid_live_days,
               new_followers, live_count, pk_count, pk_diamonds, rank_status,
               avg_viewers, peak_viewers, total_viewers, comments, gifters,
               diamond_achieve, live_achieve, days_achieve
        FROM monthly_stats
    """)
    upsert_batches("monthly_stats", monthly_stats)

    # 4. agency_revenue
    agency_revenue = dict_rows(c, """
        SELECT id, liver_id, period, streamer_revenue, agency_revenue,
               agency_total_payout, streamed_days, total_hours, contract_status
        FROM agency_revenue
    """)
    upsert_batches("agency_revenue", agency_revenue)

    # 5. events
    try:
        events = dict_rows(c, """
            SELECT id, name, event_date, start_date, end_date, description,
                   COALESCE(category, 'tiktok') AS category
            FROM events
        """)
    except Exception:
        events = dict_rows(c, "SELECT id, name, event_date, description FROM events")
        for e in events:
            e["start_date"] = e["event_date"]
            e["end_date"] = e["event_date"]
            e["category"] = "tiktok"
    upsert_batches("events", events)

    # 6. event_participants
    ep = dict_rows(c, "SELECT id, event_id, liver_id, rank, diamonds, result FROM event_participants")
    upsert_batches("event_participants", ep)

    # 7. monthly_goals
    try:
        monthly_goals = dict_rows(c, """
            SELECT id, period, target_diamonds, target_revenue, new_registrations
            FROM monthly_goals
        """)
    except Exception:
        monthly_goals = dict_rows(c, "SELECT id, period, target_diamonds FROM monthly_goals")
        for g in monthly_goals:
            g.setdefault("target_revenue", 0)
            g.setdefault("new_registrations", 0)
    upsert_batches("monthly_goals", monthly_goals)

    # 8. daily_diamonds
    daily = dict_rows(c, "SELECT id, date, diamonds, notes FROM daily_diamonds")
    upsert_batches("daily_diamonds", daily)

    # 9. goals
    try:
        goals = dict_rows(c, "SELECT id, liver_id, manager_id, metric, target, period FROM goals")
        upsert_batches("goals", goals)
    except Exception:
        print("  goals: テーブルなし（スキップ）")

    conn.close()
    print("\n✅ 移行完了！")


if __name__ == "__main__":
    main()
