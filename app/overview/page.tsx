export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { unstable_cache } from 'next/cache'
import { Suspense } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import ProgressBar from '@/components/ui/ProgressBar'
import PeriodSelector from '@/components/ui/PeriodSelector'
import DailyDiamondsChart   from '@/components/charts/DailyDiamondsChart'
import MonthlyDiamondsChart  from '@/components/charts/MonthlyDiamondsChart'
import RankPieChart          from '@/components/charts/RankPieChart'
import ActiveLiversChart     from '@/components/charts/ActiveLiversChart'
import NewLiversChart        from '@/components/charts/NewLiversChart'
import Top10Chart            from '@/components/charts/Top10Chart'
import EventGanttChart       from '@/components/charts/EventGanttChart'

function SectionTitle({ label, color = '#fe2c55' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded" style={{ background: color }} />
      <span className="font-bold text-base text-gray-800">{label}</span>
    </div>
  )
}

// 全期間トレンドデータ（5分キャッシュ）
const getAllTrendData = unstable_cache(
  async () => {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('monthly_stats')
      .select('period, liver_id, diamonds, pk_diamonds, live_count, livers(joined_date)')
      .limit(5000)
    return data ?? []
  },
  ['all_trend_data'],
  { revalidate: 300 }
)

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = createServerClient()
  const params = await searchParams

  const today = new Date()
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const daysInCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const monthStart = `${currentPeriod}-01`
  const monthEnd   = `${currentPeriod}-${String(daysInCurrent).padStart(2, '0')}`

  // ── 全クエリを完全並列実行（1ラウンド）───────────────────────────────
  // getAllTrendDataはキャッシュ済みなので期間リストの導出に利用
  // params.periodがあればそのまま使い、なければtrendから最新期間を算出
  const [
    { data: goalData },
    { data: dailyRaw },
    { data: prevDailyRaw },
    { data: eventsRaw },
    { count: totalLivers },
    { data: goalsForPeriods },
    allTrendRaw,
  ] = await Promise.all([
    supabase.from('monthly_goals').select('*').eq('period', currentPeriod).maybeSingle(),
    supabase.from('daily_diamonds').select('date, diamonds').like('date', `${currentPeriod}%`).order('date'),
    supabase.from('daily_diamonds').select('date, diamonds').like('date', `${prevPeriod}%`).order('date'),
    supabase.from('events').select('name, category, start_date, end_date, event_date')
      .lte('start_date', monthEnd).gte('end_date', monthStart).order('start_date'),
    supabase.from('livers').select('id', { count: 'exact', head: true }),
    supabase.from('monthly_goals').select('period, new_registrations'),
    getAllTrendData(),
  ])

  // trendデータから期間リストを導出（DBクエリ不要）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trendRows = allTrendRaw as any[]
  const periods = [...new Set(trendRows.map((r) => r.period as string))].sort().reverse()
  const selectedPeriod = params.period ?? periods[0] ?? currentPeriod

  // 選択期間の月次データのみ追加取得（期間確定後に1クエリ）
  const [{ data: periodStatsRaw }, { data: newRegData }] = await Promise.all([
    supabase
      .from('monthly_stats')
      .select('diamonds, live_time_min, live_count, pk_count, new_followers, diamond_achieve, pk_diamonds, rank_status, liver_id, livers(display_name, username, group_name)')
      .eq('period', selectedPeriod)
      .limit(2000),
    supabase.from('monthly_goals').select('new_registrations').eq('period', selectedPeriod).maybeSingle(),
  ])

  // ── 今月の進捗 ────────────────────────────────────────────────────
  const currentGoal   = goalData?.target_diamonds ?? 0
  const currentRevenue = goalData?.target_revenue ?? 0

  const dailyData = (dailyRaw ?? []).map((r: { date: string; diamonds: number }) => ({
    day: parseInt(r.date.split('-')[2], 10),
    diamonds: r.diamonds,
  }))
  const prevDailyData = (prevDailyRaw ?? []).map((r: { date: string; diamonds: number }) => ({
    day: parseInt(r.date.split('-')[2], 10),
    diamonds: r.diamonds,
  }))
  const monthTotal = dailyData.reduce((s, d) => s + d.diamonds, 0)
  const latestDate = dailyRaw && dailyRaw.length > 0 ? dailyRaw[dailyRaw.length - 1].date : null
  const asOfLabel = latestDate
    ? `${parseInt(latestDate.split('-')[1])}月${parseInt(latestDate.split('-')[2])}日時点`
    : 'データなし'

  const eventsForGantt = (eventsRaw ?? []).map((e: { name: string; category: string; start_date: string | null; end_date: string | null; event_date: string }) => ({
    name: e.name,
    category: e.category ?? 'tiktok',
    start_date: e.start_date ?? e.event_date,
    end_date: e.end_date ?? e.event_date,
  }))

  // ── 選択月KPI（periodStatsRaw から派生）─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kpiRows = (periodStatsRaw ?? []) as any[]
  const totalDiamonds  = kpiRows.reduce((s, r) => s + (r.diamonds ?? 0), 0)
  const totalLiveMin   = kpiRows.reduce((s, r) => s + (r.live_time_min ?? 0), 0)
  const totalLives     = kpiRows.reduce((s, r) => s + (r.live_count ?? 0), 0)
  const totalPk        = kpiRows.reduce((s, r) => s + (r.pk_count ?? 0), 0)
  const totalFollowers = kpiRows.reduce((s, r) => s + (r.new_followers ?? 0), 0)
  const activeLivers   = new Set(kpiRows.filter((r) => (r.live_count ?? 0) > 0 || (r.diamonds ?? 0) > 0).map((r) => r.liver_id)).size
  const avgMin         = activeLivers > 0 ? Math.floor(totalLiveMin / activeLivers) : 0
  const newRegistrations = newRegData?.new_registrations ?? 0

  // TOP10
  const top10 = [...kpiRows]
    .sort((a, b) => (b.diamonds ?? 0) - (a.diamonds ?? 0))
    .slice(0, 10)
    .map((r) => {
      const liver = Array.isArray(r.livers) ? r.livers[0] : r.livers
      return { name: (liver?.display_name ?? liver?.username ?? '不明') as string, diamonds: r.diamonds ?? 0 }
    })

  // ランクステータス分布
  const rankMap: Record<string, number> = {}
  for (const r of kpiRows) {
    const rs = r.rank_status
    if (rs) rankMap[rs] = (rankMap[rs] ?? 0) + 1
  }
  const rankData = Object.entries(rankMap).map(([rank_status, count]) => ({ rank_status, count }))

  // グループ別集計
  const groupMap: Record<string, { count: number; diamonds: number; lives: number; achieveSum: number }> = {}
  for (const r of kpiRows) {
    const liver = Array.isArray(r.livers) ? r.livers[0] : r.livers
    const g = (liver?.group_name ?? '(未設定)') as string
    if (!groupMap[g]) groupMap[g] = { count: 0, diamonds: 0, lives: 0, achieveSum: 0 }
    groupMap[g].count    += 1
    groupMap[g].diamonds += (r.diamonds ?? 0)
    groupMap[g].lives    += (r.live_count ?? 0)
    groupMap[g].achieveSum += (r.diamond_achieve ?? 0)
  }
  const groupData = Object.entries(groupMap)
    .sort(([, a], [, b]) => b.diamonds - a.diamonds)
    .map(([g, v]) => ({
      group: g,
      count: v.count,
      diamonds: v.diamonds,
      lives: v.lives,
      avgAchieve: v.count > 0 ? (v.achieveSum / v.count).toFixed(1) : '0',
    }))

  // ── トレンド（キャッシュ済み全期間データから派生）────────────────────

  // 月別ダイヤ推移
  const monthlyMap: Record<string, { period: string; diamonds: number; pk_diamonds: number }> = {}
  for (const r of trendRows) {
    if (!monthlyMap[r.period]) monthlyMap[r.period] = { period: r.period, diamonds: 0, pk_diamonds: 0 }
    monthlyMap[r.period].diamonds    += r.diamonds    ?? 0
    monthlyMap[r.period].pk_diamonds += r.pk_diamonds ?? 0
  }
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.period.localeCompare(b.period))

  // 稼働ライバー数推移
  const activeByPeriod: Record<string, Set<number>> = {}
  for (const r of trendRows) {
    if (!activeByPeriod[r.period]) activeByPeriod[r.period] = new Set()
    if ((r.live_count ?? 0) > 0 || (r.diamonds ?? 0) > 0) activeByPeriod[r.period].add(r.liver_id)
  }
  const activeTrend = Object.entries(activeByPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, set]) => ({ period, active_livers: set.size }))

  // 新規ライバー獲得ダイヤ推移
  const goalsMap: Record<string, number> = {}
  for (const g of (goalsForPeriods ?? [])) {
    const gr = g as { period: string; new_registrations: number }
    goalsMap[gr.period] = gr.new_registrations ?? 0
  }
  const newLiversMap: Record<string, { diamonds: number; count: number }> = {}
  for (const r of trendRows) {
    const liver = Array.isArray(r.livers) ? r.livers[0] : r.livers
    const jd = liver?.joined_date as string | undefined
    if (jd && jd.startsWith(r.period)) {
      if (!newLiversMap[r.period]) newLiversMap[r.period] = { diamonds: 0, count: 0 }
      newLiversMap[r.period].diamonds += r.diamonds ?? 0
      newLiversMap[r.period].count    += 1
    }
  }
  const newLiversTrend = Object.entries(newLiversMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      diamonds: v.diamonds,
      new_livers: v.count,
      new_registrations: goalsMap[period] ?? 0,
    }))

  const achievePct = currentGoal > 0 ? Math.min((monthTotal / currentGoal) * 100, 100) : 0
  const diff = monthTotal - currentGoal

  return (
    <div className="space-y-6">
      {/* 今月の進捗 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded bg-[#fe2c55]" />
          <span className="font-bold text-base text-gray-800">📈 今月の進捗（{currentPeriod}）</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
          <KpiCard label={`📊 今月の累計（${asOfLabel}）`} value={monthTotal.toLocaleString()} color="#fe2c55" />
          <KpiCard label="🎯 今月の目標ダイヤ" value={currentGoal.toLocaleString()} color="#ff9500" />
          <KpiCard
            label="✅ 達成率"
            value={`${achievePct.toFixed(1)}%`}
            color={diff >= 0 ? '#4caf50' : '#fe2c55'}
            sub={diff >= 0 ? `超過 +${diff.toLocaleString()}` : `残り ${Math.abs(diff).toLocaleString()}`}
          />
          <KpiCard label="💰 目標レベニュー" value={`${currentRevenue}%`} color="#2196f3" />
        </div>

        <ProgressBar current={monthTotal} goal={currentGoal} />

        <div className="mt-4">
          <DailyDiamondsChart
            currentData={dailyData}
            prevData={prevDailyData}
            currentPeriod={currentPeriod}
            prevPeriod={prevPeriod}
          />
        </div>

        {eventsForGantt.length > 0 && (
          <div className="mt-3">
            <EventGanttChart
              events={eventsForGantt}
              year={today.getFullYear()}
              month={today.getMonth() + 1}
            />
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* 月次サマリー */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle label={`📅 月次サマリー（${selectedPeriod}）`} color="#2196f3" />
          <Suspense>
            <PeriodSelector periods={periods} />
          </Suspense>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="💎 総ダイヤ数" value={totalDiamonds.toLocaleString()} color="#fe2c55" />
          <KpiCard
            label="⏱ 総配信時間"
            value={`${Math.floor(totalLiveMin / 60).toLocaleString()}時間 ${totalLiveMin % 60}分`}
            color="#ff9500"
          />
          <KpiCard
            label="🎙 稼働ライバー数"
            value={`${activeLivers}`}
            sub={`全体 ${totalLivers ?? 0}人`}
            color="#2196f3"
          />
          <KpiCard label="🆕 新規登録人数" value={`${newRegistrations}人`} color="#4caf50" />
          <KpiCard label="📡 LIVE回数" value={totalLives.toLocaleString()} color="#9c27b0" />
          <KpiCard label="⚔️ PK回数" value={totalPk.toLocaleString()} color="#ff5722" />
          <KpiCard
            label="⏱ 平均配信時間/人"
            value={`${Math.floor(avgMin / 60)}時間 ${avgMin % 60}分`}
            color="#00bcd4"
          />
          <KpiCard label="👥 新規フォロワー" value={totalFollowers.toLocaleString()} color="#8bc34a" />
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* チャート群 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle label="月別ダイヤ推移" color="#fe2c55" />
          <MonthlyDiamondsChart data={monthlyTrend} />
        </div>
        <div>
          <SectionTitle label="ランクステータス分布" color="#9c27b0" />
          {rankData.length > 0 ? <RankPieChart data={rankData} /> : <p className="text-gray-400 text-sm">データなし</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle label="稼働ライバー数推移" color="#2196f3" />
          <ActiveLiversChart data={activeTrend} />
        </div>
        <div>
          <SectionTitle label="新規ライバー獲得ダイヤ推移" color="#4caf50" />
          {newLiversTrend.length > 0 ? <NewLiversChart data={newLiversTrend} /> : <p className="text-gray-400 text-sm">データなし</p>}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* TOP10 */}
      <div>
        <SectionTitle label={`🏆 ライバー別ダイヤ TOP10（${selectedPeriod}）`} color="#ff9500" />
        {top10.length > 0 ? <Top10Chart data={top10} /> : <p className="text-gray-400 text-sm">データなし</p>}
      </div>

      <hr className="border-gray-200" />

      {/* グループ別集計 */}
      <div>
        <SectionTitle label={`📂 グループ別集計（${selectedPeriod}）`} color="#00bcd4" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-3 py-2 border-b">グループ</th>
                <th className="text-right px-3 py-2 border-b">人数</th>
                <th className="text-right px-3 py-2 border-b">ダイヤ合計</th>
                <th className="text-right px-3 py-2 border-b">LIVE回数</th>
                <th className="text-right px-3 py-2 border-b">平均達成率</th>
              </tr>
            </thead>
            <tbody>
              {groupData.map((g, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{g.group}</td>
                  <td className="text-right px-3 py-2">{g.count}</td>
                  <td className="text-right px-3 py-2">{g.diamonds.toLocaleString()}</td>
                  <td className="text-right px-3 py-2">{g.lives.toLocaleString()}</td>
                  <td className="text-right px-3 py-2">{g.avgAchieve}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
