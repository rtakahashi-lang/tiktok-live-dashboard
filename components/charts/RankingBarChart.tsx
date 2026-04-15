'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { name: string; value: number }[]
  label: string
  color?: string
}

const REDS = ['#fe2c55','#f03350','#e23a4b','#d44146','#c64841','#b84f3c','#aa5637','#9c5d32','#8e642d','#806b28','#727228','#645928','#566028','#486728','#3a6e28']

export default function RankingBarChart({ data, label, color }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data.slice(0, 15)} margin={{ top: 10, right: 20, bottom: 44, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          angle={-30}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [Number(v).toLocaleString(), label]} />
        <Bar dataKey="value" name={label} radius={[3, 3, 0, 0]}>
          {data.slice(0, 15).map((_, i) => (
            <Cell key={i} fill={color ?? REDS[i % REDS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
