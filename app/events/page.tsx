export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import RankingBarChart from '@/components/charts/RankingBarChart'

function SectionTitle({ label, color = '#fe2c55' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded" style={{ background: color }} />
      <span className="font-bold text-base text-gray-800">{label}</span>
    </div>
  )
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>
}) {
  const supabase = createServerClient()
  const params = await searchParams

  const { data: eventsRaw } = await supabase
    .from('events')
    .select('id, name, event_date, start_date, end_date, description, category')
    .order('event_date', { ascending: false })

  type EventRow = { id: number; name: string; event_date: string; start_date: string | null; end_date: string | null; description: string | null; category: string }
  const events = (eventsRaw ?? []) as EventRow[]

  const selectedEventId = params.event_id ? parseInt(params.event_id, 10) : events[0]?.id ?? null

  let participants: {
    rank: number | null; liver_name: string; manager: string; diamonds: number; result: string | null
  }[] = []

  if (selectedEventId) {
    const { data: partRaw } = await supabase
      .from('event_participants')
      .select('rank, diamonds, result, livers(display_name, username, managers(name, email))')
      .eq('event_id', selectedEventId)
      .order('rank')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    participants = (partRaw ?? []).map((p: any) => {
      const liver = Array.isArray(p.livers) ? p.livers[0] : p.livers
      const manager = Array.isArray(liver?.managers) ? liver?.managers[0] : liver?.managers
      return {
        rank: p.rank as number | null,
        liver_name: liver?.display_name ?? liver?.username ?? '不明',
        manager: manager?.name ?? manager?.email ?? '-',
        diamonds: (p.diamonds ?? 0) as number,
        result: p.result as string | null,
      }
    })
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <div className="space-y-6">
      <SectionTitle label="🎯 イベント管理" />

      {/* イベント一覧 */}
      <div>
        <SectionTitle label="イベント一覧" color="#2196f3" />
        {events.length === 0 ? (
          <p className="text-gray-400 text-sm">イベントがまだ登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  {['イベント名','開催日','開始日','終了日','カテゴリ','概要'].map((h) => (
                    <th key={h} className="text-left px-2 py-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5">
                      <a href={`?event_id=${e.id}`} className="text-[#fe2c55] hover:underline font-medium">{e.name}</a>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{e.event_date}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{e.start_date ?? '-'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{e.end_date ?? '-'}</td>
                    <td className="px-2 py-1.5">{e.category ?? 'tiktok'}</td>
                    <td className="px-2 py-1.5">{e.description ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* イベント詳細 */}
      {selectedEvent && (
        <>
          <hr className="border-gray-200" />
          <div>
            <div className="flex items-center gap-4 mb-3">
              <SectionTitle label="イベント詳細・結果" color="#ff9500" />
              <form method="get">
                <select
                  name="event_id"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                  defaultValue={selectedEventId ?? ''}
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button type="submit" className="ml-2 px-3 py-1.5 bg-[#fe2c55] text-white text-sm rounded-lg">表示</button>
              </form>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-700">
              <div className="font-bold text-base mb-1">{selectedEvent.name}</div>
              <div className="text-gray-500">{selectedEvent.description ?? '概要なし'}</div>
              <div className="mt-2 text-xs text-gray-400">
                {selectedEvent.start_date ?? selectedEvent.event_date} 〜 {selectedEvent.end_date ?? selectedEvent.event_date}
              </div>
            </div>

            {participants.length === 0 ? (
              <p className="text-gray-400 text-sm">このイベントの参加記録がありません。</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs">
                        {['順位','ライバー名','マネージャー','ダイヤ数','結果'].map((h) => (
                          <th key={h} className="text-left px-2 py-2 border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-1.5 font-bold text-gray-400">{p.rank ?? '-'}</td>
                          <td className="px-2 py-1.5">{p.liver_name}</td>
                          <td className="px-2 py-1.5">{p.manager}</td>
                          <td className="px-2 py-1.5 text-right">{p.diamonds.toLocaleString()}</td>
                          <td className="px-2 py-1.5">{p.result ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <RankingBarChart
                  data={participants.slice(0, 15).map((p) => ({ name: p.liver_name, value: p.diamonds }))}
                  label="ダイヤ数"
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
