'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { period: string; active_livers: number }[]
}

export default function ActiveLiversChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.active_livers), 1)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, max * 1.3]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar dataKey="active_livers" name="稼働ライバー数" fill="#fe2c55" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="active_livers" position="top" style={{ fontSize: 11, fill: '#333' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
