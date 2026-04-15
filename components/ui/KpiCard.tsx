interface KpiCardProps {
  label: string
  value: string
  color?: string
  sub?: string
}

export default function KpiCard({ label, value, color = '#fe2c55', sub }: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-3 border-l-4"
      style={{ background: color + '12', borderLeftColor: color }}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}
