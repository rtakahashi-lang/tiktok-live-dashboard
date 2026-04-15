'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/overview',  icon: '📊', label: '全体概要' },
  { href: '/livers',    icon: '👤', label: 'ライバー管理' },
  { href: '/managers',  icon: '🗂',  label: 'マネージャー' },
  { href: '/rankings',  icon: '🏆', label: 'ランキング' },
  { href: '/events',    icon: '🎯', label: 'イベント' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-52 min-h-screen bg-gray-900 text-white flex flex-col pt-6 flex-shrink-0">
      <div className="px-4 mb-8">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">TikTok LIVE</div>
        <div className="text-sm font-bold text-white">管理ダッシュボード</div>
      </div>
      <nav className="flex-1 px-2">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#fe2c55] text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
