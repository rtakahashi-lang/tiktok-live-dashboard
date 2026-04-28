export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getAllTrendData } from '@/lib/cached-queries'
import { Suspense } from 'react'
import PeriodSelector from '@/components/ui/PeriodSelector'
import ManagerPieChart from '@/components/charts/ManagerPieChart'
import RankingBarChart  from '@/components/charts/RankingBarChart'

function SectionTitle({ label, color = '#fe2c55' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded" style={{ background: color }} />
      <span className="font-bold text-base text-gray-800">{label}</span>
    </div>
  )
}

export default async function ManagersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; manager?: string }>
}) {
  const supabase = createServerClient()
  const params = await searchParams

  // キャッシュ済みデータから期間リスト導出 → 並列取得
  const cachedTrend = await getAllTrendData()
  const periods = [...new Set(cachedTrend.map((r: { period: string }) => r.period))].sort().reverse()
  const selectedPeriod = params.period ?? periods[0] ?? ''

  const [{ data: statsRaw }, { data: allLiversRaw }] = await Promise.all([
    supabase
      .from('monthly_stats')
      .select('liver_id, diamonds, live_count, valid_live_days, new_followers, pk_count, diamond_achieve, livers(id, manager_id, managers(id, name, email))')
      .eq('period', selectedPeriod)
      .limit(2000),
    supabase.from('livers').select('id, manager_id'),
  ])

  type ManagerAgg = {
    manager_id: number
    manager_name: string
    total_livers: number
    active_livers: number
    total_diamonds: number
    total_lives: number
    valid_days: number
    followers: number
    pk_count: number
    avg_achieve: number
  }

  // manager_idごとの総担当ライバー数
  const totalLiversByMgr: Record<number, number> = {}
  for (const l of (allLiversRaw ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = l as any
    if (row.manager_id) totalLiversByMgr[row.manager_id] = (totalLiversByMgr[row.manager_id] ?? 0) + 1
  }

  const mgrMap: Record<number, ManagerAgg & { achieveArr: number[] }> = {}
  for (const r of (statsRaw ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = r as any
    const liver = Array.isArray(row.livers) ? row.livers[0] : row.livers
    const manager = Array.isArray(liver?.managers) ? liver?.managers[0] : liver?.managers
    if (!manager) continue
    const mid = manager.id as number
    if (!mgrMap[mid]) {
      mgrMap[mid] = {
        manager_id: mid,
        manager_name: (manager.name ?? manager.email ?? '不明') as string,
        total_livers: totalLiversByMgr[mid] ?? 0,
        active_livers: 0,
        total_diamonds: 0,
        total_lives: 0,
        valid_days: 0,
        followers: 0,
        pk_count: 0,
        avg_achieve: 0,
        achieveArr: [],
      }
    }
    const d = row.diamonds ?? 0
    const lc = row.live_count ?? 0
    mgrMap[mid].total_diamonds += d
    mgrMap[mid].total_lives    += lc
    mgrMap[mid].valid_days     += row.valid_live_days ?? 0
    mgrMap[mid].followers      += row.new_followers ?? 0
    mgrMap[mid].pk_count       += row.pk_count ?? 0
    if (d > 0 || lc > 0) mgrMap[mid].active_livers += 1
    if ((row.diamond_achieve ?? 0) > 0) mgrMap[mid].achieveArr.push(row.diamond_achieve)
  }

  const mgrData: ManagerAgg[] = Object.values(mgrMap).map((m) => {
    const avg = m.achieveArr.length > 0
      ? m.achieveArr.reduce((s, v) => s + v, 0) / m.achieveArr.length
      : 0
    return { ...m, avg_achieve: parseFloat(avg.toFixed(1)) }
  })
  mgrData.sort((a, b) => b.total_diamonds - a.total_diamonds)

  const chartData = mgrData.filter((m) => m.total_diamonds >= 1)
  const activeMgrData = chartData.map((m) => ({ name: m.manager_name, value: m.active_livers }))
    .sort((a, b) => b.value - a.value)

  // 選択マネージャーの担当ライバー詳細
  const selectedMgr = params.manager ?? (mgrData[0]?.manager_name ?? '')
  const selectedMgrRow = mgrData.find((m) => m.manager_name === selectedMgr)
  const selectedMgrId = selectedMgrRow?.manager_id

  let liverDetail: {
    username: string; joined_date: string; diamonds: number; live_count: number;
    valid_live_days: number; live_hours: string; pk_count: number; new_followers: number;
    rank_status: string; diamond_achieve: number; streamer_revenue: number; agency_payout: number
  }[] = []

  if (selectedMgrId) {
    const { data: detailRaw } = await supabase
      .from('livers')
      .select('username, joined_date, monthly_stats(period, diamonds, live_count, valid_live_days, live_time_min, pk_count, new_followers, rank_status, diamond_achieve), agency_revenue(period, streamer_revenue, agency_total_payout)')
      .eq('manager_id', selectedMgrId)
      .limit(200)
    const daysInMonth = new Date(
      parseInt(selectedPeriod.split('-')[0]),
      parseInt(selectedPeriod.split('-')[1]),
      0
    ).getDate()
    liverDetail = (detailRaw ?? []).map((l: { username: string; joined_date: string; monthly_stats: { period: string; diamonds: number; live_count: number; valid_live_days: number; live_time_min: number; pk_count: number; new_followers: number; rank_status: string | null; diamond_achieve: number }[]; agency_revenue: { period: string; streamer_revenue: number; agency_total_payout: number }[] }) => {
      const ms = l.monthly_stats?.find((s) => s.period === selectedPeriod)
      const ar = l.agency_revenue?.find((s) => s.period === selectedPeriod)
      return {
        username: l.username ?? '',
        joined_date: l.joined_date ?? '',
        diamonds: ms?.diamonds ?? 0,
        live_count: ms?.live_count ?? 0,
        valid_live_days: ms?.valid_live_days ?? 0,
        live_hours: ((ms?.live_time_min ?? 0) / 60).toFixed(1),
        pk_count: ms?.pk_count ?? 0,
        new_followers: ms?.new_followers ?? 0,
        rank_status: ms?.rank_status ?? '-',
        diamond_achieve: ms?.diamond_achieve ?? 0,
        broadcast_rate: ms ? ((ms.valid_live_days / daysInMonth) * 100).toFixed(1) : '0',
        streamer_revenue: ar?.streamer_revenue ?? 0,
        agency_payout: ar?.agency_total_payout ?? 0,
      }
    }).sort((a, b) => b.diamonds - a.diamonds)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle label="🗂 マネージャー別集計" />
        <Suspense>
          <PeriodSelector periods={periods} />
        </Suspense>
      </div>

      {/* マネージャー一覧テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs">
              {['マネージャー','担当数','稼働数','総ダイヤ','LIVE回数','有効日数','フォロワー','PK回数','平均達成率'].map((h) => (
                <th key={h} className="text-left px-2 py-2 border-b whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mgrData.map((m, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1.5">
                  <a
                    href={`?period=${selectedPeriod}&manager=${encodeURIComponent(m.manager_name)}`}
                    className="text-[#fe2c55] hover:underline"
                  >
                    {m.manager_name}
                  </a>
                </td>
                <td className="px-2 py-1.5 text-right">{m.total_livers}</td>
                <td className="px-2 py-1.5 text-right">{m.active_livers}</td>
                <td className="px-2 py-1.5 text-right">{m.total_diamonds.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right">{m.total_lives}</td>
                <td className="px-2 py-1.5 text-right">{m.valid_days}</td>
                <td className="px-2 py-1.5 text-right">{m.followers}</td>
                <td className="px-2 py-1.5 text-right">{m.pk_count}</td>
                <td className="px-2 py-1.5 text-right">{m.avg_achieve}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle label="ダイヤ占有率" color="#fe2c55" />
          {chartData.length > 0 ? (
            <ManagerPieChart data={chartData.map((m) => ({ manager_name: m.manager_name, total_diamonds: m.total_diamonds }))} />
          ) : <p className="text-gray-400 text-sm">データなし</p>}
        </div>
        <div>
          <SectionTitle label="稼働ライバー数" color="#2196f3" />
          {activeMgrData.length > 0 ? (
            <RankingBarChart data={activeMgrData} label="稼働ライバー数" color="#2196f3" />
          ) : <p className="text-gray-400 text-sm">データなし</p>}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* 担当ライバー詳細 */}
      <div>
        <div className="flex items-center gap-4 mb-3">
          <SectionTitle label="担当ライバー詳細" color="#ff9500" />
          <form method="get">
            {params.period && <input type="hidden" name="period" value={selectedPeriod} />}
            <select
              name="manager"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
              defaultValue={selectedMgr}
            >
              {mgrData.map((m) => (
                <option key={m.manager_id} value={m.manager_name}>{m.manager_name}</option>
              ))}
            </select>
            <button type="submit" className="ml-2 px-3 py-1.5 bg-[#fe2c55] text-white text-sm rounded-lg">表示</button>
          </form>
        </div>

        {liverDetail.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  {['TikTok ID','入会日','ダイヤ','LIVE回数','有効日数','LIVE時間','PK回数','フォロワー','ランク','達成率(%)','ライバー報酬','事務所収益'].map((h) => (
                    <th key={h} className="text-left px-2 py-2 border-b whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liverDetail.map((l, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5">{l.username}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{l.joined_date}</td>
                    <td className="px-2 py-1.5 text-right">{l.diamonds.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right">{l.live_count}</td>
                    <td className="px-2 py-1.5 text-right">{l.valid_live_days}</td>
                    <td className="px-2 py-1.5 text-right">{l.live_hours}</td>
                    <td className="px-2 py-1.5 text-right">{l.pk_count}</td>
                    <td className="px-2 py-1.5 text-right">{l.new_followers}</td>
                    <td className="px-2 py-1.5">{l.rank_status}</td>
                    <td className="px-2 py-1.5 text-right">{l.diamond_achieve.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{l.streamer_revenue.toFixed(4)}</td>
                    <td className="px-2 py-1.5 text-right">{l.agency_payout.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
