export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
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

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = createServerClient()
  const params = await searchParams

  // 利用可能な期間一覧
  const { data: periodsRaw } = await supabase
    .from('monthly_stats')
    .select('period')
  const periods = [...new Set((periodsRaw ?? []).map((r: { period: string }) => r.period))].sort().reverse() as string[]

  const today = new Date()
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const selectedPeriod = params.period ?? periods[0] ?? currentPeriod

  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // 月間目標
  const { data: goalData } = await supabase
    .from('monthly_goals')
    .select('*')
    .eq('period', currentPeriod)
    .maybeSingle()
  const currentGoal = goalData?.target_diamonds ?? 0
  const currentRevenue = goalData?.target_revenue ?? 0

  // 今月の日次ダイヤ
  const { data: dailyRaw } = await supabase
    .from('daily_diamonds')
    .select('date, diamonds')
    .like('date', `${currentPeriod}%`)
    .order('date')
  const dailyData = (dailyRaw ?? []).map((r: { date: string; diamonds: number }) => ({
    day: parseInt(r.date.split('-')[2], 10),
    diamonds: r.diamonds,
  }))
  const monthTotal = dailyData.reduce((s, d) => s + d.diamonds, 0)
  const latestDate = dailyRaw && dailyRaw.length > 0 ? dailyRaw[dailyRaw.length - 1].date : null
  const asOfLabel = latestDate
    ? `${parseInt(latestDate.split('-')[1])}月${parseInt(latestDate.split('-')[2])}日時点`
    : 'データなし'

  // 前月の日次ダイヤ
  const { data: prevDailyRaw } = await supabase
    .from('daily_diamonds')
    .select('date, diamonds')
    .like('date', `${prevPeriod}%`)
    .order('date')
  const prevDailyData = (prevDailyRaw ?? []).map((r: { date: string; diamonds: number }) => ({
    day: parseInt(r.date.split('-')[2], 10),
    diamonds: r.diamonds,
  }))

  // 今月イベント（ガントバー用）
  const daysInCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const monthStart = `${currentPeriod}-01`
  const monthEnd = `${currentPeriod}-${String(daysInCurrent).padStart(2, '0')}`
  const { data: eventsRaw } = await supabase
    .from('events')
    .select('name, category, start_date, end_date, event_date')
    .lte('start_date', monthEnd)
    .gte('end_date', monthStart)
    .order('start_date')
  const eventsForGantt = (eventsRaw ?? []).map((e: { name: string; category: string; start_date: string | null; end_date: string | null; event_date: string }) => ({
    name: e.name,
    category: e.category ?? 'tiktok',
    start_date: e.start_date ?? e.event_date,
    end_date: e.end_date ?? e.event_date,
  }))

  // 選択月のKPI
  const { data: kpiRaw } = await supabase
    .from('monthly_stats')
    .select('diamonds, live_time_min, live_count, pk_count, new_followers, liver_id')
    .eq('period', selectedPeriod)
  const kpiRows = kpiRaw ?? []
  const totalDiamonds = kpiRows.reduce((s: number, r: { diamonds: number }) => s + (r.diamonds ?? 0), 0)
  const totalLiveMin  = kpiRows.reduce((s: number, r: { live_time_min: number }) => s + (r.live_time_min ?? 0), 0)
  const totalLives    = kpiRows.reduce((s: number, r: { live_count: number }) => s + (r.live_count ?? 0), 0)
  const totalPk       = kpiRows.reduce((s: number, r: { pk_count: number }) => s + (r.pk_count ?? 0), 0)
  const totalFollowers = kpiRows.reduce((s: number, r: { new_followers: number }) => s + (r.new_followers ?? 0), 0)
  const activeLivers  = new Set(kpiRows.filter((r: { live_count: number; diamonds: number }) => (r.live_count ?? 0) > 0 || (r.diamonds ?? 0) > 0).map((r: { liver_id: number }) => r.liver_id)).size
  const avgMin = activeLivers > 0 ? Math.floor(totalLiveMin / activeLivers) : 0

  // 総ライバー数
  const { count: totalLivers } = await supabase
    .from('livers')
    .select('id', { count: 'exact', head: true })

  // 新規登録人数
  const { data: newRegData } = await supabase
    .from('monthly_goals')
    .select('new_registrations')
    .eq('period', selectedPeriod)
    .maybeSingle()
  const newRegistrations = newRegData?.new_registrations ?? 0

  // 月別ダイヤ推移
  const { data: monthlyTrendRaw } = await supabase
    .from('monthly_stats')
    .select('period, diamonds, pk_diamonds')
  const monthlyMap: Record<string, { period: string; diamonds: number; pk_diamonds: number }> = {}
  for (const r of (monthlyTrendRaw ?? [])) {
    if (!monthlyMap[r.period]) monthlyMap[r.period] = { period: r.period, diamonds: 0, pk_diamonds: 0 }
    monthlyMap[r.period].diamonds += r.diamonds ?? 0
    monthlyMap[r.period].pk_diamonds += r.pk_diamonds ?? 0
  }
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.period.localeCompare(b.period))

  // ランクステータス分布
  const rankMap: Record<string, number> = {}
  for (const r of kpiRows) {
    const rs = (r as { rank_status?: string }).rank_status
    if (rs) rankMap[rs] = (rankMap[rs] ?? 0) + 1
  }
  const rankData = Object.entries(rankMap).map(([rank_status, count]) => ({ rank_status, count }))

  // 稼働ライバー数推移
  const activeTrendMap: Record<string, Set<number>> = {}
  for (const r of (monthlyTrendRaw ?? [])) {
    const row = r as { period: string; liver_id?: number; live_count?: number; diamonds?: number }
    if (!activeTrendMap[row.period]) activeTrendMap[row.period] = new Set()
    if ((row.live_count ?? 0) > 0 || (row.diamonds ?? 0) > 0) {
      activeTrendMap[row.period].add(row.liver_id ?? 0)
    }
  }
  // monthly_statsにliver_idも含むようにRe-fetch
  const { data: activeTrendFull } = await supabase
    .from('monthly_stats')
    .select('period, liver_id, live_count, diamonds')
  const activeByPeriod: Record<string, Set<number>> = {}
  for (const r of (activeTrendFull ?? [])) {
    const row = r as { period: string; liver_id: number; live_count: number; diamonds: number }
    if (!activeByPeriod[row.period]) activeByPeriod[row.period] = new Set()
    if ((row.live_count ?? 0) > 0 || (row.diamonds ?? 0) > 0) activeByPeriod[row.period].add(row.liver_id)
  }
  const activeTrend = Object.entries(activeByPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, set]) => ({ period, active_livers: set.size }))

  // 新規ライバー獲得ダイヤ推移
  const { data: newLiversRaw } = await supabase
    .from('monthly_stats')
    .select('period, liver_id, diamonds, livers!inner(joined_date)')
  const newLiversMap: Record<string, { diamonds: number; count: number }> = {}
  for (const r of (newLiversRaw ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = r as any
    const liver = Array.isArray(row.livers) ? row.livers[0] : row.livers
    const jd = liver?.joined_date as string | undefined
    if (jd && jd.startsWith(row.period)) {
      if (!newLiversMap[row.period]) newLiversMap[row.period] = { diamonds: 0, count: 0 }
      newLiversMap[row.period].diamonds += row.diamonds ?? 0
      newLiversMap[row.period].count += 1
    }
  }
  const { data: goalsForPeriods } = await supabase
    .from('monthly_goals')
    .select('period, new_registrations')
  const goalsMap: Record<string, number> = {}
  for (const g of (goalsForPeriods ?? [])) {
    const gr = g as { period: string; new_registrations: number }
    goalsMap[gr.period] = gr.new_registrations ?? 0
  }
  const newLiversTrend = Object.entries(newLiversMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      diamonds: v.diamonds,
      new_livers: v.count,
      new_registrations: goalsMap[period] ?? 0,
    }))

  // TOP10 ライバー
  const { data: top10Raw } = await supabase
    .from('monthly_stats')
    .select('diamonds, liver_id, livers(display_name, username)')
    .eq('period', selectedPeriod)
    .order('diamonds', { ascending: false })
    .limit(10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const top10 = (top10Raw ?? []).map((r: any) => {
    const liver = Array.isArray(r.livers) ? r.livers[0] : r.livers
    return {
      name: (liver?.display_name ?? liver?.username ?? '不明') as string,
      diamonds: (r.diamonds ?? 0) as number,
    }
  })

  // グループ別集計
  const { data: groupRaw } = await supabase
    .from('monthly_stats')
    .select('diamonds, live_count, diamond_achieve, liver_id, livers(group_name)')
    .eq('period', selectedPeriod)
  const groupMap: Record<string, { count: number; diamonds: number; lives: number; achieveSum: number }> = {}
  for (const r of (groupRaw ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = r as any
    const liver = Array.isArray(row.livers) ? row.livers[0] : row.livers
    const g = (liver?.group_name ?? '(未設定)') as string
    if (!groupMap[g]) groupMap[g] = { count: 0, diamonds: 0, lives: 0, achieveSum: 0 }
    groupMap[g].count += 1
    groupMap[g].diamonds += (row.diamonds ?? 0) as number
    groupMap[g].lives += (row.live_count ?? 0) as number
    groupMap[g].achieveSum += (row.diamond_achieve ?? 0) as number
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

        {eventsForGantt.length > 0 && (
          <div className="mt-3">
            <EventGanttChart
              events={eventsForGantt}
              year={today.getFullYear()}
              month={today.getMonth() + 1}
            />
          </div>
        )}

        <div className="mt-4">
          <DailyDiamondsChart
            currentData={dailyData}
            prevData={prevDailyData}
            currentPeriod={currentPeriod}
            prevPeriod={prevPeriod}
          />
        </div>
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
