import { getDb, type AppDatabase } from '@/lib/db';
import { useUIStore } from '@/store/uiStore';
import type { Fabric, Order } from '@/types';

/**
 * 🧵 Notification Service — Atelier Vigilance
 * Surveille les stocks et les délais de production.
 */

interface NotificationOrder extends Order {
  client_name: string;
  model_name?: string;
  model_image_paths?: string;
}

/**
 * 🧵 Helper: Extraire l'image d'affichage pour une notification
 */
function getDisplayImage(o: NotificationOrder): string | null {
  let displayImage = o.fabric_photo_path;
  if (o.model_image_paths) {
    try {
      const imgs = JSON.parse(o.model_image_paths);
      if (Array.isArray(imgs) && imgs.length > 0) {
        displayImage = imgs[0];
      }
    } catch (e) {}
  }
  return displayImage;
}

export async function checkSystemAlerts() {
  const db = await getDb();
  
  // Exécuter toutes les vérifications d'élite
  await checkStockAlerts(db);
  await checkOrderAlerts(db);
  await checkFinancialAlerts(db);
  await checkCRMAlerts(db);
  await checkWorkflowStallAlerts(db);
}

/**
 * 🧵 1. Alertes Stocks
 */
async function checkStockAlerts(db: AppDatabase) {
  const { addNotification, notifications } = useUIStore.getState();
  const lowStockFabrics = await db.select<Fabric[]>(
    'SELECT * FROM fabrics WHERE stock_quantity < 2'
  );

  for (const f of lowStockFabrics) {
    const stableId = `stock-${f.id}`;
    if (!notifications.some(n => n.id === stableId)) {
      addNotification({
        id: stableId,
        type: 'stock',
        severity: f.stock_quantity <= 0 ? 'high' : 'medium',
        title: f.stock_quantity <= 0 ? 'Rupture de Stock' : 'Stock Faible',
        message: `${f.name} (${f.type}) : il reste seulement ${f.stock_quantity}m.`,
        link: { view: 'fabrics' },
        image_path: f.image_path
      });
    }
  }
}

/**
 * 🧵 2. Alertes Délais (Proche & Retard)
 */
async function checkOrderAlerts(db: AppDatabase) {
  const { addNotification, notifications } = useUIStore.getState();
  const allAlertOrders = await db.select<NotificationOrder[]>(
    `SELECT o.*, c.name as client_name, m.name as model_name, m.image_paths as model_image_paths
     FROM orders o
     JOIN clients c ON o.client_id = c.id
     LEFT JOIN catalog_models m ON o.model_id = m.id
     WHERE o.status != 'Livré' AND o.status != 'Annulé'`
  );

  const now = new Date();
  const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));

  for (const o of allAlertOrders) {
    if (!o.delivery_date) continue;
    
    const dueDate = new Date(o.delivery_date);
    const isOverdue = dueDate < now;
    const isUpcoming = dueDate >= now && dueDate <= fortyEightHoursFromNow;

    if (!isOverdue && !isUpcoming) continue;

    const prefix = isOverdue ? 'overdue' : 'deadline';
    const id = `${prefix}-${o.id}`;

    if (!notifications.some(n => n.id === id)) {
      addNotification({
        id: id,
        type: 'order',
        severity: isOverdue ? 'high' : 'medium',
        title: isOverdue ? 'Commande en Retard' : 'Livraison Proche',
        message: `${o.client_name}${o.model_name ? ' - ' + o.model_name : ''} : due le ${dueDate.toLocaleDateString('fr-FR')}.`,
        link: { view: 'kanban' },
        image_path: getDisplayImage(o)
      });
    }
  }
}

/**
 * 🧵 3. Alertes Financières (Solde & Bilan)
 */
async function checkFinancialAlerts(db: AppDatabase) {
  const { addNotification, notifications } = useUIStore.getState();
  
  // A. Commandes PRÊTES avec solde dû
  const readyWithBalance = await db.select<NotificationOrder[]>(
    `SELECT o.*, c.name as client_name, m.name as model_name, m.image_paths as model_image_paths
     FROM orders o
     JOIN clients c ON o.client_id = c.id
     LEFT JOIN catalog_models m ON o.model_id = m.id
     WHERE o.status = 'Prêt' AND (o.total_price - o.advance_paid) > 0`
  );

  for (const o of readyWithBalance) {
    const id = `balance-${o.id}`;
    if (!notifications.some(n => n.id === id)) {
      const balance = o.total_price - o.advance_paid;
      addNotification({
        id: id,
        type: 'info',
        severity: 'medium',
        title: 'Solde à Percevoir',
        message: `${o.client_name} : La commande est prête. Reste à payer : ${(balance || 0).toLocaleString()} CFA.`,
        link: { view: 'kanban' },
        image_path: getDisplayImage(o)
      });
    }
  }

  // B. Bilan Journalier (Chiffre d'affaires du jour)
  const today = new Date().toISOString().split('T')[0];
  const dailyTotal = await db.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments_history 
     WHERE DATE(payment_date) = DATE('now')`
  );

  if (dailyTotal[0].total > 0) {
    const id = `daily-report-${today}`;
    if (!notifications.some(n => n.id === id)) {
      addNotification({
        id: id,
        type: 'info',
        severity: 'low',
        title: 'Bilan Journalier',
        message: `Félicitations ! Vous avez encaissé ${(dailyTotal[0]?.total || 0).toLocaleString()} CFA aujourd'hui.`,
        link: { view: 'finance' }
      });
    }
  }
}

/**
 * 🧵 4. Alertes CRM (Relance VIP)
 */
async function checkCRMAlerts(db: AppDatabase) {
  const { addNotification, notifications } = useUIStore.getState();

  // Identifier les clients VIP (ayant dépensé > 100k) n'ayant rien commandé depuis 90 jours
  const inactiveVIPs = await db.select<{ id: string, name: string, last_order: string, total_spent: number, portrait_path: string }[]>(
    `SELECT c.id, c.name, MAX(o.created_at) as last_order, SUM(o.total_price) as total_spent, c.portrait_path
     FROM clients c
     JOIN orders o ON c.id = o.client_id
     GROUP BY c.id
     HAVING total_spent > 100000 
     AND DATE(last_order) < DATE('now', '-90 days')
     LIMIT 5`
  );

  for (const vip of inactiveVIPs) {
    const id = `crm-relance-${vip.id}`;
    if (!notifications.some(n => n.id === id)) {
      // Logic Guard: Double check the date and name in code
      if (!vip.name || !vip.last_order) continue;
      
      const lastOrderDate = new Date(vip.last_order);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      if (lastOrderDate > ninetyDaysAgo) continue;

      addNotification({
        id: id,
        type: 'info',
        severity: 'low',
        title: 'Client VIP à Relancer',
        message: `${vip.name} n'a pas passé de commande depuis 3 mois. Un petit message ?`,
        link: { view: 'client_detail', payload: vip.id },
        image_path: vip.portrait_path
      });
    }
  }
}

/**
 * 🧵 5. Alertes Workflow (Étape Bloquée)
 */
async function checkWorkflowStallAlerts(db: AppDatabase) {
  const { addNotification, notifications } = useUIStore.getState();

  // Commandes bloquées dans le même statut depuis > 3 jours (72h)
  const stalledOrders = await db.select<NotificationOrder[]>(
    `SELECT o.*, c.name as client_name, m.name as model_name, m.image_paths as model_image_paths
     FROM orders o
     JOIN clients c ON o.client_id = c.id
     LEFT JOIN catalog_models m ON o.model_id = m.id
     WHERE o.status NOT IN ('Livré', 'Annulé', 'Réception')
     AND o.status_updated_at < DATETIME('now', '-3 days')`
  );

  for (const o of stalledOrders) {
    const id = `stall-${o.status}-${o.id}`;
    if (!notifications.some(n => n.id === id)) {
      addNotification({
        id: id,
        type: 'order',
        severity: 'medium',
        title: 'Étape Bloquée',
        message: `La commande de ${o.client_name} est en phase "${o.status}" depuis 3 jours.`,
        link: { view: 'kanban' },
        image_path: getDisplayImage(o)
      });
    }
  }
}

/**
 * Démarre le cycle de surveillance
 */
export function startNotificationWatcher(): () => void {
  // Premier check immédiat
  checkSystemAlerts();

  // Puis toutes les 5 minutes (300 000 ms)
  const interval = setInterval(() => {
    checkSystemAlerts();
  }, 300_000);

  return () => clearInterval(interval);
}
