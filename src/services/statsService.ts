/**
 * 🧵 Stats Service — Dashboard Analytique
 */
import { getDb } from '@/lib/db';
import type { DashboardStats } from '@/types';

/**
 * 🧵 getDashboardStats — Retourne les stats globales filtrées par période
 */
/**
 * 🧵 getDashboardStats — Retourne les stats globales filtrées par période (Réelles)
 */
export async function getDashboardStats(filter: { days?: number; year?: number } = { days: 30 }): Promise<DashboardStats> {
  const db = await getDb();
  
  let dateFilter = "";
  let prevDateFilter = "";
  let params: any[] = [];
  let prevParams: any[] = [];
  
  if (filter.year) {
    const y = filter.year;
    dateFilter = "strftime('%Y', created_at) = $1";
    prevDateFilter = "strftime('%Y', created_at) = $1";
    params = [String(y)];
    prevParams = [String(y - 1)];
  } else {
    const d = filter.days || 30;
    dateFilter = "created_at >= DATE('now', '-' || $1 || ' days')";
    prevDateFilter = "created_at >= DATE('now', '-' || ($1 * 2) || ' days') AND created_at < DATE('now', '-' || $1 || ' days')";
    params = [d];
    prevParams = [d];
  }

  const paymentDateFilter = dateFilter.replace(/created_at/g, 'payment_date');

  // Helper for trend calculation
  const getTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return { value: Math.abs(Math.round(diff)), positive: diff >= 0 };
  };

  // Financials
  const revenueRows = await db.select<[{ total: number }]>(`SELECT COALESCE(SUM(advance_paid), 0) as total FROM orders o WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);
  const pendingRows = await db.select<[{ total: number }]>(`SELECT COALESCE(SUM(total_price - advance_paid), 0) as total FROM orders o WHERE o.status != 'Livré' AND o.status != 'Annulé' AND ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);
  const activeRows = await db.select<[{ count: number }]>(`SELECT COUNT(*) as count FROM orders o WHERE o.status != 'Livré' AND o.status != 'Annulé' AND ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);

  // Pro Analytics & Trends
  const periodRevenueRows = await db.select<[{ total: number }]>(`SELECT COALESCE(SUM(ph.amount), 0) as total FROM payments_history ph WHERE ${paymentDateFilter.replace(/payment_date/g, 'ph.payment_date')}`, params);
  
  // Avg Order Value Trend
  const avgOrderRows = await db.select<[{ avg: number }]>(`SELECT COALESCE(AVG(o.total_price), 0) as avg FROM orders o WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);
  const prevAvgOrderRows = await db.select<[{ avg: number }]>(`SELECT COALESCE(AVG(o.total_price), 0) as avg FROM orders o WHERE ${prevDateFilter.replace(/created_at/g, 'o.created_at')}`, prevParams);
  const avgOrderValue = Math.round(avgOrderRows[0]?.avg || 0);
  const avgOrderValueTrend = getTrend(avgOrderValue, Math.round(prevAvgOrderRows[0]?.avg || 0));

  // Conversion / Delivery
  const totalOrdersRows = await db.select<[{ count: number }]> (`SELECT COUNT(*) as count FROM orders o WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);
  const deliveredOrdersRows = await db.select<[{ count: number }]> (`SELECT COUNT(*) as count FROM orders o WHERE o.status = 'Livré' AND ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);
  const totalOrders = totalOrdersRows[0]?.count || 1;
  const deliveredOrders = deliveredOrdersRows[0]?.count || 0;
  const conversionRate = (deliveredOrders / totalOrders) * 100;

  const topPayMethodRows = await db.select<[{ method: string }]> (
    `SELECT ph.method FROM payments_history ph WHERE ${paymentDateFilter.replace(/payment_date/g, 'ph.payment_date')} GROUP BY ph.method ORDER BY COUNT(*) DESC LIMIT 1`, params
  );

  const statusDistRows = await db.select<{ status: string; count: number }[]>(`SELECT o.status, COUNT(o.id) as count FROM orders o WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} GROUP BY o.status`, params);
  const statusDistribution: Record<string, number> = {};
  statusDistRows.forEach(row => { statusDistribution[row.status] = row.count; });

  // Gender Distribution
  const genderDistRows = await db.select<{ gender: string; count: number }[]>(
    `SELECT c.gender, COUNT(o.id) as count FROM orders o JOIN clients c ON o.client_id = c.id WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} GROUP BY c.gender`, params
  );
  const genderDistribution: Record<string, number> = {};
  genderDistRows.forEach(r => { genderDistribution[r.gender || 'Autre'] = r.count; });

  // Category Distribution
  const catDistRows = await db.select<{ category: string; count: number }[]>(
    `SELECT cm.category, COUNT(o.id) as count FROM orders o JOIN catalog_models cm ON o.model_id = cm.id WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} GROUP BY cm.category`, params
  );
  const categoryDistribution: Record<string, number> = {};
  catDistRows.forEach(r => { categoryDistribution[r.category || 'Autre'] = r.count; });

  // Fabric Distribution
  const fabDistRows = await db.select<{ type: string; count: number }[]>(
    `SELECT f.type, COUNT(o.id) as count FROM orders o JOIN fabrics f ON o.fabric_id = f.id WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} GROUP BY f.type`, params
  );
  const fabricDistribution: Record<string, number> = {};
  fabDistRows.forEach(r => { fabricDistribution[r.type || 'Autre'] = r.count; });

  // Active Clients (Impact)
  const activeClientsRows = await db.select<[{ count: number }]> (
    `SELECT COUNT(DISTINCT client_id) as count FROM orders WHERE ${dateFilter.replace(/created_at/g, 'created_at')}`, params
  );

  // New Clients (Registration)
  const newClientsRows = await db.select<[{ count: number }]> (
    `SELECT COUNT(*) as count FROM clients WHERE ${dateFilter.replace(/created_at/g, 'created_at')}`, params
  );

  // Top Clients (By Total Revenue) with Portrait
  const topClientsRows = await db.select<{ name: string; total: number; portrait_path: string | null }[]>(
    `SELECT c.name, c.portrait_path, SUM(o.total_price) as total 
     FROM orders o JOIN clients c ON o.client_id = c.id 
     WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} 
     GROUP BY c.id ORDER BY total DESC LIMIT 5`, params
  );

  // Top Models for the period with Images
  const topModelsPeriodRows = await db.select<{ name: string; image_paths: string | null; count: number; price_ref: number }[]>(
    `SELECT cm.name, cm.image_paths, COUNT(o.id) as count, cm.price_ref
     FROM orders o JOIN catalog_models cm ON o.model_id = cm.id 
     WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} 
     GROUP BY cm.id ORDER BY count DESC LIMIT 3`, params
  );

  // Loyalty Distribution (Filtered by active clients in period)
  const loyaltyRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(o.id) as count 
     FROM orders o 
     WHERE o.client_id IN (SELECT DISTINCT client_id FROM orders WHERE ${dateFilter})
     GROUP BY o.client_id`, params
  );
  const loyalty = { new: 0, regular: 0, elite: 0 };
  loyaltyRows.forEach(r => {
    if (r.count === 1) loyalty.new++;
    else if (r.count <= 5) loyalty.regular++;
    else loyalty.elite++;
  });
  const loyaltyDistribution = [
    { label: 'Nouveaux', count: loyalty.new },
    { label: 'Habitués', count: loyalty.regular },
    { label: 'Ambassadeurs', count: loyalty.elite }
  ];

  // Speed Trend
  const avgDeliveryRows = await db.select<[{ avg: number }]>(`SELECT COALESCE(AVG(JULIANDAY(o.delivery_date) - JULIANDAY(o.created_at)), 0) as avg FROM orders o WHERE o.status = 'Livré' AND o.delivery_date IS NOT NULL AND ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params);
  const prevAvgDeliveryRows = await db.select<[{ avg: number }]>(`SELECT COALESCE(AVG(JULIANDAY(o.delivery_date) - JULIANDAY(o.created_at)), 0) as avg FROM orders o WHERE o.status = 'Livré' AND o.delivery_date IS NOT NULL AND ${prevDateFilter.replace(/created_at/g, 'o.created_at')}`, prevParams);
  const avgDeliveryDays = Math.round(avgDeliveryRows[0]?.avg || 0);
  const speedTrendRaw = getTrend(avgDeliveryDays, Math.round(prevAvgDeliveryRows[0]?.avg || 0));
  const avgDeliveryDaysTrend = speedTrendRaw ? { value: speedTrendRaw.value, positive: !speedTrendRaw.positive } : null;

  // Real Alerts (Strictly period focused OR Current Status)
  const oosFabricRows = await db.select<[{ count: number }]> (`SELECT COUNT(*) as count FROM fabrics WHERE stock_quantity <= 0`);
  const lateOrdersRows = await db.select<[{ count: number }]> (
    `SELECT COUNT(*) as count FROM orders o
     WHERE o.status != 'Livré' AND o.status != 'Annulé' 
       AND o.delivery_date < DATE('now')
       AND o.delivery_date IS NOT NULL
       AND ${dateFilter.replace(/created_at/g, 'o.created_at')}`, params
  );

  // Today specific - only show if today is in the range
  let completedToday = 0;
  if (!filter.year || filter.year === new Date().getFullYear()) {
    const todayRows = await db.select<[{ count: number }]>(`SELECT COUNT(*) as count FROM orders WHERE status = 'Livré' AND DATE(created_at) = DATE('now')`);
    completedToday = todayRows[0]?.count || 0;
  }

  return {
    totalRevenue: revenueRows[0]?.total || 0,
    totalPending: pendingRows[0]?.total || 0,
    activeOrders: activeRows[0]?.count || 0,
    completedToday,
    totalRevenuePeriod: periodRevenueRows[0]?.total || 0,
    avgOrderValue,
    avgOrderValueTrend,
    conversionRate: Math.round(conversionRate),
    topPaymentMethod: topPayMethodRows[0]?.method || 'Cash',
    statusDistribution,
    avgDeliveryDays,
    avgDeliveryDaysTrend,
    outOfStockFabrics: oosFabricRows[0]?.count || 0,
    lateOrders: lateOrdersRows[0]?.count || 0,
    genderDistribution,
    categoryDistribution,
    fabricDistribution,
    totalClientsPeriod: activeClientsRows[0]?.count || 0,
    newClientsPeriod: newClientsRows[0]?.count || 0,
    topClients: topClientsRows,
    topModelsPeriod: topModelsPeriodRows,
    loyaltyDistribution,
  };
}

export async function getRevenueByPeriod(days: number): Promise<{ date: string; amount: number }[]> {
  const db = await getDb();
  return db.select<{ date: string; amount: number }[]>(
    `SELECT DATE(payment_date) as date, SUM(amount) as amount 
     FROM payments_history 
     WHERE payment_date >= DATE('now', '-' || $1 || ' days')
     GROUP BY DATE(payment_date)
     ORDER BY date ASC`,
    [days]
  );
}

/**
 * 🧵 getRevenueComparison — Retourne les données actuelles et celles de la période précédente
 */
export async function getRevenueComparison(days: number): Promise<{
  current: { date: string; amount: number }[];
  previous: { date: string; amount: number }[];
}> {
  const db = await getDb();
  
  // Current Period
  const current = await db.select<{ date: string; amount: number }[]>(
    `SELECT DATE(payment_date) as date, SUM(amount) as amount 
     FROM payments_history 
     WHERE payment_date >= DATE('now', '-' || $1 || ' days')
     GROUP BY DATE(payment_date) ORDER BY date ASC`,
    [days]
  );

  // Previous Period (same length, offset by 'days')
  const previous = await db.select<{ date: string; amount: number }[]>(
    `SELECT DATE(payment_date) as date, SUM(amount) as amount 
     FROM payments_history 
     WHERE payment_date >= DATE('now', '-' || ($1 * 2) || ' days')
       AND payment_date < DATE('now', '-' || $1 || ' days')
     GROUP BY DATE(payment_date) ORDER BY date ASC`,
    [days]
  );

  return { current, previous };
}

/**
 * 🧵 getRevenueByYear — Retourne le CA par mois pour une année donnée
 */
export async function getRevenueByYear(year: number): Promise<{ month: number; amount: number }[]> {
  const db = await getDb();
  return db.select<{ month: number; amount: number }[]>(
    `SELECT strftime('%m', payment_date) as month, SUM(amount) as amount
     FROM payments_history
     WHERE strftime('%Y', payment_date) = $1
     GROUP BY month ORDER BY month ASC`,
    [String(year)]
  );
}

/**
 * 🧵 getRevenueComparisonByYear — Retourne les données de l'année choisie et celles de l'année précédente
 */
export async function getRevenueComparisonByYear(year: number): Promise<{
  current: { month: number; amount: number }[];
  previous: { month: number; amount: number }[];
}> {
  const current = await getRevenueByYear(year);
  const previous = await getRevenueByYear(year - 1);
  return { current, previous };
}

/**
 * 🧵 getAvailableYears — Liste des années ayant des transactions
 */
export async function getAvailableYears(): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ year: string }[]>(
    `SELECT DISTINCT strftime('%Y', payment_date) as year FROM payments_history ORDER BY year DESC`
  );
  return rows.map(r => parseInt(r.year)).filter(y => !isNaN(y));
}

export async function getTopModels(limit: number = 5): Promise<{ name: string; count: number; price_ref: number; image_paths: string }[]> {
  const db = await getDb();
  return db.select<any[]>(
    `SELECT cm.name, COUNT(o.id) as count, cm.price_ref, cm.image_paths
     FROM orders o
     JOIN catalog_models cm ON o.model_id = cm.id
     GROUP BY cm.id
     ORDER BY count DESC
     LIMIT $1`,
    [limit]
  );
}
