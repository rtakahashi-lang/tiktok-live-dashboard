export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { Suspense } from 'react'
import PeriodSelector from '@/components/ui/PeriodSelector'
import KpiCard from '@/components/ui/KpiCard'
import { DiamondTrendChart, ActivityTrendChart } from '@/components/charts/LiverTrendChart'

function SectionTitle({ label, color = '#fe2c55' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded" style={{ background: color }} />
      <span className="font-bold text-base text-gray-800">{label}</span>
    </div>
  )
}

export default async function LiversPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; liver_id?: string; tab?: string }>
}) {
  const supabase = createServerClient()
  const params = await searchParams

  // Round 1: 期間リスト
  const { data: periodsRaw } = await supabase.from('monthly_stats').select('period').limit(500)
  const periods = [...new Set((periodsRaw ?? []).map((r: { period: string }) => r.period))].sort().reverse() as string[]
  const selectedPeriod = params.period ?? periods[0] ?? ''
  const selectedLiverId = params.liver_id ? parseInt(params.liver_id, 10) : null
  const activeTab = params.tab ?? 'diamonds'

  // Round 2: 一覧 + 履歴を並列取得
  const [{ data: liversRaw }, { data: historyRaw }] = await Promise.all([
    supabase
      .from('monthly_stats')
      .select('liver_id, diamonds, live_count, valid_live_days, live_time_min, pk_count, new_followers, rank_status, livers(username, display_name, joined_date, managers(name, email))')
      .eq('period', selectedPeriod)
      .order('diamonds', { ascending: false })
      .limit(2000),
    selectedLiverId
      ? supabase
          .from('monthly_stats')
          .select('period, diamonds, pk_diamonds, live_count, valid_live_days, pk_count')
          .eq('liver_id', selectedLiverId)
          .order('period')
      : Promise.resolve({ data: null }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liversList = (liversRaw ?? []).map((r: any) => {
    const liver = Array.isArray(r.livers) ? r.livers[0] : r.livers
    const manager = Array.isArray(liver?.managers) ? liver?.managers[0] : liver?.managers
    return {
      liver_id: r.liver_id as number,
      name: (liver?.display_name ?? liver?.username ?? '不明') as string,
      username: (liver?.username ?? '') as string,
      manager: (manager?.name ?? manager?.email ?? '-') as string,
      joined_date: (liver?.joined_date ?? '') as string,
      diamonds: (r.diamonds ?? 0) as number,
      live_count: (r.live_count ?? 0) as number,
      valid_live_days: (r.valid_live_days ?? 0) as number,
      live_hours: ((r.live_time_min ?? 0) / 60).toFixed(1),
      pk_count: (r.pk_count ?? 0) as number,
      pk_rate: r.live_count > 0 ? ((r.pk_count / r.live_count) * 100).toFixed(1) : '0',
      new_followers: (r.new_followers ?? 0) as number,
      rank_status: (r.rank_status ?? '-') as string,
    }
  })

  // 選択ライバー（URLになければ先頭）
  const resolvedLiverId = selectedLiverId ?? liversList[0]?.liver_id ?? null
  const latestStats = liversList.find((l) => l.liver_id === resolvedLiverId)

  const history = (historyRaw ?? []).map((r: { period: string; diamonds: number; pk_diamonds: number; live_count: number; valid_live_days: number; pk_count: number }) => ({
    period: r.period,
    diamonds: r.diamonds ?? 0,
    pk_diamonds: r.pk_diamonds ?? 0,
    live_count: r.live_count ?? 0,
    valid_live_days: r.valid_live_days ?? 0,
    pk_count: r.pk_count ?? 0,
  }))
  return (
    <div className="space-y-6">
      {/* ライバー詳細 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle label="👤 ライバー詳細・月次推移" />
          <Suspense>
            <PeriodSelector periods={periods} />
          </Suspense>
        </div>

        {/* ライバー選択 */}
        <form method="get" className="mb-4">
          {params.period && <input type="hidden" name="period" value={selectedPeriod} />}
          <select
            name="liver_id"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#fe2c55]"
            defaultValue={resolvedLiverId ?? ''}
          >
            {liversList.map((l) => (
              <option key={l.liver_id} value={l.liver_id}>
                {l.username}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="ml-2 px-3 py-1.5 bg-[#fe2c55] text-white text-sm rounded-lg hover:bg-[#d42047]"
          >
            表示
          </button>
        </form>

        {latestStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-4">
            <KpiCard label="💎 ダイヤ" value={latestStats.diamonds.toLocaleString()} color="#fe2c55" />
            <KpiCard label="📡 LIVE回数" value={String(latestStats.live_count)} color="#2196f3" />
            <KpiCard label="📅 有効配信日数" value={String(latestStats.valid_live_days)} color="#ff9500" />
            <KpiCard label="⚔️ PK回数" value={String(latestStats.pk_count)} color="#9c27b0" />
            <KpiCard label="🌱 新規フォロワー" value={latestStats.new_followers.toLocaleString()} color="#4caf50" />
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'diamonds', label: '💎 ダイヤ推移' },
            { key: 'activity', label: '📡 配信推移' },
          ].map(({ key, label }) => (
            <a
              key={key}
              href={`?period=${selectedPeriod}&liver_id=${resolvedLiverId}&tab=${key}`}
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

        {history.length > 0 ? (
          activeTab === 'diamonds' ? (
            <DiamondTrendChart data={history} />
          ) : (
            <ActivityTrendChart data={history} />
          )
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">このライバーの月次データがありません。</p>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* ライバー一覧 */}
      <div>
        <SectionTitle label={`一覧（${selectedPeriod}）`} color="#2196f3" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                {['TikTok ID','マネージャー','入会日','ダイヤ','LIVE回数','有効日数','LIVE時間','PK回数','PK率(%)','フォロワー','ランク'].map((h) => (
                  <th key={h} className="text-left px-2 py-2 border-b whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liversList.map((l, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1.5">
                    <a href={`?period=${selectedPeriod}&liver_id=${l.liver_id}`} className="text-[#fe2c55] hover:underline">
                      {l.username}
                    </a>
                  </td>
                  <td className="px-2 py-1.5">{l.manager}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{l.joined_date}</td>
                  <td className="px-2 py-1.5 text-right">{l.diamonds.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">{l.live_count}</td>
                  <td className="px-2 py-1.5 text-right">{l.valid_live_days}</td>
                  <td className="px-2 py-1.5 text-right">{l.live_hours}</td>
                  <td className="px-2 py-1.5 text-right">{l.pk_count}</td>
                  <td className="px-2 py-1.5 text-right">{l.pk_rate}</td>
                  <td className="px-2 py-1.5 text-right">{l.new_followers}</td>
                  <td className="px-2 py-1.5">{l.rank_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
