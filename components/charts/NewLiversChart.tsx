'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LabelList, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: {
    period: string
    diamonds: number
    new_livers: number
    new_registrations: number
  }[]
}

function fmtLabel(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

export default function NewLiversChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 28, right: 40, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Legend iconSize={12} />
        <Bar yAxisId="left" dataKey="diamonds" name="獲得ダイヤ" fill="#4caf50" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="diamonds" position="top" formatter={(v: unknown) => fmtLabel(Number(v))} style={{ fontSize: 10, fill: '#333' }} />
        </Bar>
        <Line
          yAxisId="right"
          dataKey="new_registrations"
          name="新規登録者数"
          stroke="#ff9500"
          strokeWidth={2}
          dot={{ r: 5, fill: '#ff9500' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
