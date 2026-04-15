export interface Manager {
  id: number
  name: string
  email: string | null
}

export interface Liver {
  id: number
  tiktok_id: string | null
  username: string | null
  display_name: string | null
  group_name: string | null
  manager_id: number | null
  joined_date: string | null
  active: boolean
}

export interface MonthlyStats {
  id: number
  liver_id: number
  period: string
  diamonds: number
  live_time_min: number
  valid_live_days: number
  new_followers: number
  live_count: number
  pk_count: number
  pk_diamonds: number
  rank_status: string | null
  avg_viewers: number
  peak_viewers: number
  total_viewers: number
  comments: number
  gifters: number
  diamond_achieve: number
  live_achieve: number
  days_achieve: number
}

export interface AgencyRevenue {
  id: number
  liver_id: number
  period: string
  streamer_revenue: number
  agency_revenue: number
  agency_total_payout: number
  streamed_days: number
  total_hours: number
  contract_status: string | null
}

export interface Event {
  id: number
  name: string
  event_date: string
  start_date: string | null
  end_date: string | null
  description: string | null
  category: string
}

export interface EventParticipant {
  id: number
  event_id: number
  liver_id: number
  rank: number | null
  diamonds: number
  result: string | null
}

export interface MonthlyGoal {
  id: number
  period: string
  target_diamonds: number
  target_revenue: number
  new_registrations: number
}

export interface DailyDiamond {
  id: number
  date: string
  diamonds: number
  notes: string | null
}

export interface Goal {
  id: number
  liver_id: number | null
  manager_id: number | null
  metric: string
  target: number
  period: string
}

// ジョイン済みビュー型
export interface LiverMonthly extends MonthlyStats {
  liver_name: string
  username: string | null
  group_name: string | null
  manager_name: string | null
  manager_id_val: number | null
}

export interface ManagerMonthly {
  period: string
  manager_name: string
  manager_id: number
  total_livers: number
  active_livers: number
  total_diamonds: number
  total_lives: number
  total_pk: number
  total_followers: number
  avg_achievement: number
}
