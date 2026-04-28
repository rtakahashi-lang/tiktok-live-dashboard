export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { unstable_cache } from 'next/cache'
import { Suspense } from 'react'

const getAllTrendData = unstable_cache(
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
import PeriodSelector from '@/components/ui/PeriodSelector'
import RankingBarChart from '@/components/charts/RankingBarChart'

function SectionTitle({ label, color = '#fe2c55' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded" style={{ background: color }} />
      <span className="font-bold text-base text-gray-800">{label}</span>
    </div>
  )
}

const TABS = [
  { key: 'diamonds',   label: '💎 ダイヤ',    field: 'diamonds',        fieldLabel: 'ダイヤ数' },
  { key: 'hours',      label: '⏱ 配信時間',   field: 'live_hours',      fieldLabel: 'LIVE時間（時間）' },
  { key: 'days',       label: '📅 有効配信日数',field: 'valid_live_days', fieldLabel: '有効配信日数' },
  { key: 'pk',         label: '⚔️ PK回数',    field: 'pk_count',        fieldLabel: 'PK回数' },
  { key: 'manager',    label: '📊 マネージャー比較', field: null, fieldLabel: '' },
]

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>
}) {
  const supabase = createServerClient()
  const params = await searchParams

  const activeTab = params.tab ?? 'diamonds'

  // キャッシュ済みトレンドから期間リスト導出 → 全クエリ並列
  const cachedTrend = await getAllTrendData()
  const periods = [...new Set(cachedTrend.map((r: { period: string }) => r.period))].sort().reverse()
  const selectedPeriod = params.period ?? periods[0] ?? ''

  const [{ data: rankRaw }, { data: goalsRaw }] = await Promise.all([
    supabase
      .from('monthly_stats')
      .select('liver_id, diamonds, live_count, valid_live_days, live_time_min, pk_count, new_followers, diamond_achieve, rank_status, livers(display_name, username, group_name, managers(name, email), agency_revenue(period, streamer_revenue, agency_total_payout))')
      .eq('period', selectedPeriod)
      .limit(2000),
    supabase
      .from('goals')
      .select('id, liver_id, manager_id, metric, target, livers(display_name, username), managers(name, email)')
      .eq('period', selectedPeriod),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rankData = (rankRaw ?? []).map((r: any) => {
    const liver = Array.isArray(r.livers) ? r.livers[0] : r.livers
    const manager = Array.isArray(liver?.managers) ? liver?.managers[0] : liver?.managers
    const arList: { period: string; streamer_revenue: number; agency_total_payout: number }[] = liver?.agency_revenue ?? []
    const ar = arList.find((a) => a.period === selectedPeriod)
    return {
      liver_id: r.liver_id as number,
      name: (liver?.display_name ?? liver?.username ?? '不明') as string,
      manager: (manager?.name ?? manager?.email ?? '-') as string,
      group_name: (liver?.group_name ?? '-') as string,
      diamonds: (r.diamonds ?? 0) as number,
      live_count: (r.live_count ?? 0) as number,
      valid_live_days: (r.valid_live_days ?? 0) as number,
      live_hours: parseFloat(((r.live_time_min ?? 0) / 60).toFixed(1)),
      pk_count: (r.pk_count ?? 0) as number,
      new_followers: (r.new_followers ?? 0) as number,
      diamond_achieve: (r.diamond_achieve ?? 0) as number,
      rank_status: (r.rank_status ?? '-') as string,
      streamer_revenue: ar?.streamer_revenue ?? 0,
      agency_payout: ar?.agency_total_payout ?? 0,
    }
  })



  // ソート
  const sortedByDiamonds    = [...rankData].sort((a, b) => b.diamonds - a.diamonds)
  const sortedByHours       = [...rankData].sort((a, b) => b.live_hours - a.live_hours)
  const sortedByDays        = [...rankData].sort((a, b) => b.valid_live_days - a.valid_live_days)
  const sortedByPk          = [...rankData].sort((a, b) => b.pk_count - a.pk_count)

  // マネージャー別集計
  const mgrMap: Record<string, { diamonds: number; lives: number; days: number; pk: number; followers: number; count: number }> = {}
  for (const r of rankData) {
    const key = r.manager
    if (!mgrMap[key]) mgrMap[key] = { diamonds: 0, lives: 0, days: 0, pk: 0, followers: 0, count: 0 }
    mgrMap[key].diamonds += r.diamonds
    mgrMap[key].lives    += r.live_count
    mgrMap[key].days     += r.valid_live_days
    mgrMap[key].pk       += r.pk_count
    mgrMap[key].followers += r.new_followers
    mgrMap[key].count    += 1
  }
  const mgrRanking = Object.entries(mgrMap)
    .filter(([, v]) => v.diamonds >= 1)
    .sort(([, a], [, b]) => b.diamonds - a.diamonds)
    .map(([manager, v]) => ({ manager, ...v }))

  function RankTable({ rows, field, fieldLabel }: { rows: typeof rankData; field: keyof typeof rankData[0]; fieldLabel: string }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs">
              <th className="text-left px-2 py-2 border-b w-12">順位</th>
              <th className="text-left px-2 py-2 border-b">ライバー</th>
              <th className="text-left px-2 py-2 border-b">マネージャー</th>
              <th className="text-left px-2 py-2 border-b">グループ</th>
              <th className="text-right px-2 py-2 border-b">{fieldLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1.5 font-bold text-gray-400">{i + 1}</td>
                <td className="px-2 py-1.5">{r.name}</td>
                <td className="px-2 py-1.5">{r.manager}</td>
                <td className="px-2 py-1.5">{r.group_name}</td>
                <td className="px-2 py-1.5 text-right font-medium">{(r[field] as number).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle label="🏆 ランキング・目標管理" />
        <Suspense>
          <PeriodSelector periods={periods} />
        </Suspense>
      </div>

      {/* タブナビ */}
      <div className="flex gap-2 flex-wrap mb-4">
        {TABS.map(({ key, label }) => (
          <a
            key={key}
            href={`?period=${selectedPeriod}&tab=${key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#fe2c55] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {activeTab === 'diamonds' && (
        <>
          <RankingBarChart data={sortedByDiamonds.slice(0, 15).map((r) => ({ name: r.name, value: r.diamonds }))} label="ダイヤ数" />
          <RankTable rows={sortedByDiamonds} field="diamonds" fieldLabel="ダイヤ数" />
        </>
      )}
      {activeTab === 'hours' && (
        <>
          <RankingBarChart data={sortedByHours.slice(0, 15).map((r) => ({ name: r.name, value: r.live_hours }))} label="LIVE時間（時間）" />
          <RankTable rows={sortedByHours} field="live_hours" fieldLabel="LIVE時間（時間）" />
        </>
      )}
      {activeTab === 'days' && (
        <>
          <RankingBarChart data={sortedByDays.slice(0, 15).map((r) => ({ name: r.name, value: r.valid_live_days }))} label="有効配信日数" />
          <RankTable rows={sortedByDays} field="valid_live_days" fieldLabel="有効配信日数" />
        </>
      )}
      {activeTab === 'pk' && (
        <>
          <RankingBarChart data={sortedByPk.slice(0, 15).map((r) => ({ name: r.name, value: r.pk_count }))} label="PK回数" />
          <RankTable rows={sortedByPk} field="pk_count" fieldLabel="PK回数" />
        </>
      )}
      {activeTab === 'manager' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
            <div>
              <SectionTitle label="マネージャー別 総ダイヤ" color="#fe2c55" />
              <RankingBarChart data={mgrRanking.map((m) => ({ name: m.manager, value: m.diamonds }))} label="総ダイヤ" />
            </div>
            <div>
              <SectionTitle label="マネージャー別 稼働ライバー数" color="#2196f3" />
              <RankingBarChart data={mgrRanking.map((m) => ({ name: m.manager, value: m.count }))} label="稼働ライバー数" color="#2196f3" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  {['マネージャー','稼働数','総ダイヤ','LIVE回数','有効日数','PK回数','フォロワー'].map((h) => (
                    <th key={h} className="text-left px-2 py-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mgrRanking.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5">{m.manager}</td>
                    <td className="px-2 py-1.5 text-right">{m.count}</td>
                    <td className="px-2 py-1.5 text-right">{m.diamonds.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right">{m.lives}</td>
                    <td className="px-2 py-1.5 text-right">{m.days}</td>
                    <td className="px-2 py-1.5 text-right">{m.pk}</td>
                    <td className="px-2 py-1.5 text-right">{m.followers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 目標達成状況 */}
      {(goalsRaw ?? []).length > 0 && (
        <>
          <hr className="border-gray-200" />
          <div>
            <SectionTitle label={`目標達成状況（${selectedPeriod}）`} color="#4caf50" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs">
                    {['対象','指標','目標値','現在値','達成率(%)'].map((h) => (
                      <th key={h} className="text-left px-2 py-2 border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(goalsRaw ?? []).map((g: any, i: number) => {
                    const liver   = Array.isArray(g.livers)   ? g.livers[0]   : g.livers
                    const manager = Array.isArray(g.managers) ? g.managers[0] : g.managers
                    const targetName = g.liver_id
                      ? (liver?.display_name ?? liver?.username ?? '不明')
                      : (manager?.name ?? manager?.email ?? '不明')
                    const matchedStats = g.liver_id
                      ? rankData.find((r) => r.liver_id === g.liver_id)
                      : null
                    const current = matchedStats ? ((matchedStats as Record<string, unknown>)[g.metric] as number ?? 0) : 0
                    const pct = g.target > 0 ? (current / g.target * 100).toFixed(1) : '0'
                    return (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1.5">{targetName}</td>
                        <td className="px-2 py-1.5">{g.metric}</td>
                        <td className="px-2 py-1.5 text-right">{g.target.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right">{(current as number).toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
