interface ProgressBarProps {
  current: number
  goal: number
}

export default function ProgressBar({ current, goal }: ProgressBarProps) {
  if (goal <= 0) return null
  const pct = Math.min((current / goal) * 100, 100)
  const color = pct >= 100 ? '#4caf50' : pct >= 50 ? '#fe2c55' : '#ff9800'

  return (
    <div className="mt-2">
      <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-right text-xs text-gray-500 mt-1">
        {current.toLocaleString()} / {goal.toLocaleString()}
      </div>
    </div>
  )
}
