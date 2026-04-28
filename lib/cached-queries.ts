/**
 * Supabaseクエリ層（キャッシュなし・常に最新データ）
 */
import { createServerClient } from './supabase-server'

/** 全期間トレンドデータ（月次集計・稼働数・新規ライバー用） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllTrendData(): Promise<any[]> {
  const supabase = createServerClient()
  const PAGE = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('monthly_stats')
      .select('period, liver_id, diamonds, pk_diamonds, live_count, livers(joined_date)')
      .order('id')
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

/** 特定期間の月次統計（KPI・TOP10・グループ・ランキング用） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPeriodStats(period: string): Promise<any[]> {
  const supabase = createServerClient()
  const PAGE = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('monthly_stats')
      .select('diamonds, live_time_min, live_count, pk_count, new_followers, diamond_achieve, pk_diamonds, rank_status, liver_id, livers(display_name, username, group_name, managers(name, email), agency_revenue(period, streamer_revenue, agency_total_payout))')
      .eq('period', period)
      .order('id')
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

/** 当月のイベント一覧（Gantt用） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMonthEvents(monthStart: string, monthEnd: string): Promise<any[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('events')
    .select('name, category, start_date, end_date, event_date')
    .lte('start_date', monthEnd)
    .gte('end_date', monthStart)
    .order('start_date')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any[]
}

/** 月次ダイヤ日次データ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDailyDiamonds(period: string): Promise<any[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('daily_diamonds')
    .select('date, diamonds')
    .like('date', `${period}%`)
    .order('date')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any[]
}

/** 月次目標 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMonthlyGoals(): Promise<any[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('monthly_goals')
    .select('period, target_diamonds, target_revenue, new_registrations')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any[]
}

/** ライバー総数 */
export async function getLiversCount(): Promise<number> {
  const supabase = createServerClient()
  const { count } = await supabase
    .from('livers')
    .select('id', { count: 'exact', head: true })
  return count ?? 0
}
