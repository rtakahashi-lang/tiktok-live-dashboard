'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface PeriodSelectorProps {
  periods: string[]
  paramName?: string
}

export default function PeriodSelector({ periods, paramName = 'period' }: PeriodSelectorProps) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get(paramName) ?? periods[0] ?? ''

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams(params.toString())
    newParams.set(paramName, e.target.value)
    router.push(`?${newParams.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#fe2c55]"
    >
      {periods.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  )
}
