import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'TikTok LIVE 管理ダッシュボード',
  description: 'TikTok LIVE ライバー・マネージャー管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="flex h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <header className="bg-gradient-to-r from-[#fe2c55] to-[#ff9500] px-6 py-4 text-white text-lg font-bold shadow-sm flex-shrink-0">
            TikTok LIVE 管理ダッシュボード
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
