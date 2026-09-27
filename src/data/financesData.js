/* ─────────────────────────────────────────────────────────────────
   financesData.js — Módulo Finanzas de Aurum
   ───────────────────────────────────────────────────────────────── */

export const DAILY_SALES = []

export const SALES_KPIS = {
  today:        { amount: 0, orders: 0, customers: 0, avg: 0 },
  week:         { amount: 0, orders: 0, customers: 0, avg: 0 },
  month:        { amount: 0, orders: 0, customers: 0, avg: 0 },
  year:         { amount: 0, orders: 0, customers: 0, avg: 0 },
  growthDay:    '0%',
  growthWeek:   '0%',
  growthMonth:  '0%',
}

export const PEAK_HOURS = []

export const TOP_DISHES = []

export const TOP_CATEGORIES = []

export const PAYMENTS_KPIS = {
  total:      0,
  cash:       0,
  card:       0,
  transfer:   0,
  online:     0,
  pending:    0,
}

export const PAYMENTS = []

export const TOP_CUSTOMERS = []

export const DELIVERY_REPORT = {
  totalOrders:    0,
  avgTime:        0,
  onTime:         0,
  topDrivers: [],
}

export const RESERVATIONS_REPORT = {
  total:      0,
  completed:  0,
  cancelled:  0,
  cancelRate: 0,
  topHours: [],
}

export const COSTS_KPIS = {
  total:      0,
  ingredients:0,
  waste:       0,
  labor:      0,
  other:       0,
  revenue:   0,
  grossProfit:0,
  margin:      0,
}

export const COSTS_BY_CATEGORY = []

export const COSTS_TREND = []

export const PROFITABILITY = []
