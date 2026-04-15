export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
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

  const { data: periodsRaw } = await supabase.from('monthly_stats').select('period')
  const periods = [...new Set((periodsRaw ?? []).map((r: { period: string }) => r.period))].sort().reverse() as string[]
  const selectedPeriod = params.period ?? periods[0] ?? ''

  // マネージャー別集計
  const { data: managersRaw } = await supabase
    .from('managers')
    .select('id, name, email, livers(id, monthly_stats(period, diamonds, live_count, valid_live_days, new_followers, pk_count, diamond_achieve, liver_id, agency_revenue(period, streamer_revenue, agency_total_payout)))')

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

  const mgrData: ManagerAgg[] = []
  for (const m of (managersRaw ?? [])) {
    const mgr = m as { id: number; name: string; email: string | null; livers: { id: number; monthly_stats: { period: string; diamonds: number; live_count: number; valid_live_days: number; new_followers: number; pk_count: number; diamond_achieve: number; liver_id: number }[] }[] }
    const allStats = mgr.livers.flatMap((l) =>
      l.monthly_stats.filter((s) => s.period === selectedPeriod)
    )
    const totalDiamonds = allStats.reduce((s, r) => s + (r.diamonds ?? 0), 0)
    const totalLives    = allStats.reduce((s, r) => s + (r.live_count ?? 0), 0)
    const validDays     = allStats.reduce((s, r) => s + (r.valid_live_days ?? 0), 0)
    const followers     = allStats.reduce((s, r) => s + (r.new_followers ?? 0), 0)
    const pk            = allStats.reduce((s, r) => s + (r.pk_count ?? 0), 0)
    const achieveArr    = allStats.map((r) => r.diamond_achieve ?? 0).filter((v) => v > 0)
    const avgAchieve    = achieveArr.length > 0 ? achieveArr.reduce((s, v) => s + v, 0) / achieveArr.length : 0
    const activeLivers  = allStats.filter((r) => (r.live_count ?? 0) > 0 || (r.diamonds ?? 0) > 0).length
    mgrData.push({
      manager_id: mgr.id,
      manager_name: mgr.name ?? mgr.email ?? '不明',
      total_livers: mgr.livers.length,
      active_livers: activeLivers,
      total_diamonds: totalDiamonds,
      total_lives: totalLives,
      valid_days: validDays,
      followers,
      pk_count: pk,
      avg_achieve: parseFloat(avgAchieve.toFixed(1)),
    })
  }
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
