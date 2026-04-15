'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { name: string; diamonds: number }[]
}

const REDS = [
  '#fe2c55','#f03350','#e23a4b','#d44146','#c64841','#b84f3c','#aa5637','#9c5d32','#8e642d','#806b28',
]

export default function Top10Chart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
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
        <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'ダイヤ']} />
        <Bar dataKey="diamonds" name="ダイヤ数" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={REDS[i % REDS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
