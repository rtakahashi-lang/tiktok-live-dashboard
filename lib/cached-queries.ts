/**
 * Supabaseクエリのキャッシュ層（5分間キャッシュ）
 * unstable_cache により Vercel Data Cache に保存される
 */
import { unstable_cache } from 'next/cache'
import { createServerClient } from './supabase-server'

/** 全期間トレンドデータ（月次集計・稼働数・新規ライバー用） */
export const getAllTrendData = unstable_cache(
  async () => {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('monthly_stats')
      .select('period, liver_id, diamonds, pk_diamonds, live_count, livers(joined_date)')
      .limit(5000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[]
  },
  ['all_trend_data'],
  { revalidate: 300 }
)

/** 特定期間の月次統計（KPI・TOP10・グループ・ランキング用） */
export const getPeriodStats = unstable_cache(
  async (period: string) => {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('monthly_stats')
      .select('diamonds, live_time_min, live_count, pk_count, new_followers, diamond_achieve, pk_diamonds, rank_status, liver_id, livers(display_name, username, group_name, managers(name, email), agency_revenue(period, streamer_revenue, agency_total_payout))')
      .eq('period', period)
      .limit(2000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[]
  },
  ['period_stats'],
  { revalidate: 300 }
)

/** 当月のイベント一覧（Gantt用） */
export const getMonthEvents = unstable_cache(
  async (monthStart: string, monthEnd: string) => {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('events')
      .select('name, category, start_date, end_date, event_date')
      .lte('start_date', monthEnd)
      .gte('end_date', monthStart)
      .order('start_date')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[]
  },
  ['month_events'],
  { revalidate: 300 }
)

/** 月次ダイヤ日次データ */
export const getDailyDiamonds = unstable_cache(
  async (period: string) => {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('daily_diamonds')
      .select('date, diamonds')
      .like('date', `${period}%`)
      .order('date')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[]
  },
  ['daily_diamonds'],
  { revalidate: 120 }  // 日次は2分キャッシュ
)

/** 月次目標 */
export const getMonthlyGoals = unstable_cache(
  async () => {
    const supabase = createServerClient()
    const { data } = await supabase.from('monthly_goals').select('period, target_diamonds, target_revenue, new_registrations')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[]
  },
  ['monthly_goals'],
  { revalidate: 300 }
)

/** ライバー総数 */
export const getLiversCount = unstable_cache(
  async () => {
    const supabase = createServerClient()
    const { count } = await supabase.from('livers').select('id', { count: 'exact', head: true })
    return count ?? 0
  },
  ['livers_count'],
  { revalidate: 300 }
)
