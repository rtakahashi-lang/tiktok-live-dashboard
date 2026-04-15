'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts'

interface MonthlyRow {
  period: string
  diamonds: number
  pk_diamonds: number
}

function fmtWan(v: number) {
  return `${(v / 10000).toFixed(0)}万`
}

function fmtLabel(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

export default function MonthlyDiamondsChart({ data }: { data: MonthlyRow[] }) {
  const chartData = data.map((r) => {
    const pk = r.pk_diamonds ?? 0
    const other = Math.max((r.diamonds ?? 0) - pk, 0)
    return {
      period: r.period,
      通常ダイヤ: Math.round(other / 10000),
      PKダイヤ: Math.round(pk / 10000),
      totalLabel: fmtLabel(r.diamonds ?? 0),
    }
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 28, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `${v}万`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [`${Number(v)}万`, '']} />
        <Legend iconSize={12} />
        <Bar dataKey="通常ダイヤ" stackId="a" fill="#fe2c55" />
        <Bar dataKey="PKダイヤ" stackId="a" fill="#ff9500" radius={[3, 3, 0, 0]}>
          <LabelList
            dataKey="totalLabel"
            position="top"
            style={{ fontSize: 11, fill: '#333' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
