'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#fe2c55', '#ff9500', '#2196f3', '#4caf50', '#9c27b0', '#00bcd4', '#ff5722', '#8bc34a']

interface Props {
  data: { rank_status: string; count: number }[]
}

export default function RankPieChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="rank_status"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [Number(v), '人数']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
