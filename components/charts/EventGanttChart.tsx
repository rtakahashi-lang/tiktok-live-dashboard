'use client'

interface EventRow {
  name: string
  category: string
  start_date: string
  end_date: string
}

interface Props {
  events: EventRow[]
  year: number
  month: number
}

const COLORS = ['#fe2c55','#ff9500','#4caf50','#2196f3','#9c27b0','#00bcd4','#ff5722']

export default function EventGanttChart({ events, year, month }: Props) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const categories = ['tiktok', '321']

  let colorIdx = 0
  return (
    <div className="overflow-x-auto">
      {categories.map((cat) => {
        const catEvents = events.filter((e) => e.category === cat)
        if (catEvents.length === 0) return null
        return (
          <div key={cat} className="flex items-center mb-1 gap-2">
            <div className="text-xs text-gray-500 w-14 text-right flex-shrink-0">{cat}</div>
            <div className="flex-1 relative h-8 bg-gray-100 rounded overflow-hidden">
              {catEvents.map((ev) => {
                const s = parseInt(ev.start_date?.split('-')[2] ?? '1', 10) - 1
                const e = parseInt(ev.end_date?.split('-')[2] ?? String(daysInMonth), 10) - 1
                const left = (s / daysInMonth) * 100
                const width = ((e - s + 1) / daysInMonth) * 100
                const color = COLORS[colorIdx++ % COLORS.length]
                return (
                  <div
                    key={ev.name}
                    className="absolute top-1 bottom-1 rounded flex items-center justify-center text-white text-xs font-medium overflow-hidden whitespace-nowrap px-1"
                    style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: 0.9 }}
                    title={`${ev.name}\n${ev.start_date} 〜 ${ev.end_date}`}
                  >
                    {ev.name}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {/* 日付軸 */}
      <div className="flex ml-16 mt-1">
        {Array.from({ length: daysInMonth }, (_, i) => (
          <div key={i} className="text-center" style={{ width: `${100 / daysInMonth}%` }}>
            {(i + 1) % 5 === 1 || i === 0 ? (
              <span className="text-gray-400" style={{ fontSize: 9 }}>{i + 1}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
