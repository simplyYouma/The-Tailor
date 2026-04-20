/**
 * THE TAILOR - Domain Model
 * Conformément au AI Vibe Coding Standard §3.1 : Domain Layer isolé.
 * Conformément au TypeScript Pro Skill : Interfaces strictes, pas de `any`.
 */

// --- Client (CRM Couture) -------------------------------------------

export type Gender = 'Homme' | 'Femme';

export interface Settings {
  id?: number;
  atelier_name: string;
  atelier_tagline?: string;
  atelier_phone?: string;
  atelier_address?: string;
  atelier_logo?: string | null;
  ticket_logo?: string | null;
  ticket_primary_color?: string;
  ticket_tagline?: string;
  platform_name?: string;
  platform_logo?: string | null;
  platform_logo_theme?: 'dark' | 'light';
  platform_tagline?: string;
  ticket_logo_theme?: 'dark' | 'light';
  maintenance_mode: boolean;
  role_permissions: string; // JSON string of RolePermissions
  session_timeout: number; // In minutes
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  gender: Gender;
  portrait_path: string | null;
  created_at: string;
}

export interface ClientCreatePayload {
  name: string;
  phone: string;
  address?: string;
  gender: Gender;
  portrait_path?: string | null;
}

// ─── Catalog (Vitrine Artisan) ──────────────────────────────────────

export interface CatalogModel {
  id: string;
  name: string;
  description: string;
  category: ModelCategory;
  gender: Gender;
  price_ref: number;
  image_paths: string[];
  created_at: string;
}

export interface CatalogModelCreatePayload {
  name: string;
  description?: string;
  category: ModelCategory;
  gender: Gender;
  price_ref: number;
  image_paths?: string[];
}

export type ModelCategory =
  | 'Boubou'
  | 'Bazin'
  | 'Costume'
  | 'Robe'
  | 'Robe de Mariée'
  | 'Ligne Homme'
  | 'Abaya'
  | 'Chemise'
  | 'Pantalon'
  | 'Jupe'
  | 'Ensemble'
  | 'Autre';

// ─── Measurements (Cabinet de Mesures) ──────────────────────────────

export interface MeasurementType {
  id: number;
  label: string;
  key_name: string;
  category: MeasurementCategory;
  sequence: number;
}

export type MeasurementCategory = 'Haut' | 'Bas' | 'Complet';

export interface OrderMeasurement {
  id?: number;
  order_id: string;
  type_id: number;
  value: number; // Always in CM
}

export interface ClientMeasurement {
  id?: number;
  client_id: string;
  type_id: number;
  value: number; // Always in CM
}

/** Flattened measurement for UI display. */
export interface MeasurementEntry {
  type_id: number;
  label: string;
  key_name: string;
  value: number;
}

// ─── Orders (Confection & Suivi) ────────────────────────────────────

export type OrderStatus =
  | 'Réception'
  | 'Coupe'
  | 'Couture'
  | 'Finition'
  | 'Prêt'
  | 'Livré'
  | 'Annulé';

// ─── Fabrics (Gestion des Tissus) ───────────────────────────────────

export interface Fabric {
  id: string;
  name: string;
  type: string; // Ex: Bazin, Wax, Soie, Lin
  price_per_meter: number;
  stock_quantity: number; // En mètres
  image_path: string | null;
  created_at: string;
}

export interface FabricCreatePayload {
  name: string;
  type: string;
  price_per_meter: number;
  stock_quantity: number;
  image_path?: string | null;
}

export interface Order {
  id: string;
  client_id: string;
  model_id: string | null;
  fabric_id: string | null; // Lien vers le stock (si applicable)
  fabric_amount_used: number; // Mètres utilisés
  fabric_photo_path: string | null; // Photo du tissu client (si hors stock)
  audio_note_path: string | null; // Note vocale stockée en base64 via blobs
  reference_images?: string[]; // Models supplied visually for order
  description: string;
  status: OrderStatus;
  total_price: number;
  advance_paid: number;
  delivery_date: string | null;
  tracking_id: string;
  sync_status: SyncStatus;
  created_at: string;
  fabric_image?: string | null;
  // Joined Fields (UI Only)
  client_name?: string;
  model_name?: string;
  model_category?: string;
  model_images?: string[];
}

export interface OrderCreatePayload {
  client_id: string;
  model_id?: string | null;
  fabric_id?: string | null;
  fabric_amount_used?: number;
  fabric_photo_path?: string | null;
  audio_note_path?: string | null;
  reference_images?: string[];
  description?: string;
  total_price: number;
  advance_paid?: number;
  delivery_date?: string | null;
}

export interface OrderNote {
  id: string;
  order_id: string;
  type: 'text' | 'audio' | 'image' | 'mixed';
  content: string;
  created_at: string;
}

/** Order enriched with relations for detail views. */
export interface OrderDetail extends Order {
  client: Client;
  model: CatalogModel | null;
  measurements: MeasurementEntry[];
  payments: Payment[];
  notes: OrderNote[];
  balance: number;
}

// ─── Payments (Caisse & Acomptes) ───────────────────────────────────

export type PaymentMethod =
  | 'Cash'
  | 'Orange Money'
  | 'Moov Money'
  | 'Carte'
  | 'Autre';

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  client_name?: string; // Optional field for joins
  model_image?: string; // Optional field for model thumbnail
}

export interface PaymentCreatePayload {
  order_id: string;
  amount: number;
  method: PaymentMethod;
}

// ─── Sync (Magic Link / Hub) ────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced';

export interface SyncQueueItem {
  id: number;
  order_id: string;
  status_to_sync: string;
  attempted_at: string | null;
  is_synced: boolean;
}

// ─── Dashboard (Statistiques) ───────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;        // Total des acomptes perçus
  totalPending: number;        // Total des restes à payer
  activeOrders: number;        // Commandes non livrées
  completedToday: number;      // Livraisons du jour
  // Nouveaux champs Analytics Pro
  // Nouveaux champs Analytics Pro (Réels)
  totalRevenuePeriod: number;  // Revenu sur la période sélectionnée
  avgOrderValue: number;       // Panier moyen
  avgOrderValueTrend: { value: number; positive: boolean } | null;
  conversionRate: number;      // Taux de complétion/livraison
  topPaymentMethod: string;    // Méthode de paiement favorite
  statusDistribution: Record<string, number>; // Distribution par statut (Kanban)
  avgDeliveryDays: number;     // Délai moyen de confection (jours)
  avgDeliveryDaysTrend: { value: number; positive: boolean } | null;
  outOfStockFabrics: number;   // Nombre de tissus en rupture
  lateOrders: number;         // Commandes en retard
  
  // Intelligence Business & CRM (Nouveauté V2.35)
  genderDistribution: Record<string, number>;    // Homme/Femme
  categoryDistribution: Record<string, number>;  // Boubou, Costume...
  fabricDistribution: Record<string, number>;    // Bazin, Wax...
  totalClientsPeriod: number;                    // Clients Actifs (Impact)
  newClientsPeriod: number;                      // Nouveaux inscrits
  topClients: { name: string; total: number; portrait_path?: string | null }[]; // 5 Meilleurs dossiers
  topModelsPeriod: { name: string; image_paths?: string | null; count: number; price_ref: number }[]; // Galerie Tendances
  loyaltyDistribution: { label: string; count: number }[]; // Fidélité
}

export interface TopModel {
  model: CatalogModel;
  orderCount: number;
}

export interface AppNotification {
  id: string;
  type: 'stock' | 'order' | 'info';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: { view: AppView; payload?: any };
  image_path?: string | null;
}

// ─── UI State ───────────────────────────────────────────────────────

export type AppView =
  | 'dashboard'
  | 'orders'
  | 'new_order'
  | 'clients'
  | 'client_detail'
  | 'catalog'
  | 'kanban'
  | 'finance'
  | 'fabrics'
  | 'agenda'
  | 'settings';

export interface CatalogPickerPayload {
    onSelect: (model: CatalogModel) => void;
    currentModelId?: string | null;
}

// ─── Users & Auth (Securité Atelier) ───────────────────────────────

export type UserRole = 'admin' | 'manager' | 'employee';

export type AppModule = 
  | 'dashboard'
  | 'clients'
  | 'kanban'
  | 'fabrics'
  | 'catalog'
  | 'agenda'
  | 'finance'
  | 'settings';

export type RolePermissions = Record<UserRole, AppModule[]>;

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  avatar_path?: string | null;
  is_blocked: boolean;
  created_at: string;
}

export type ModalType =
  | 'client_form'
  | 'model_form'
  | 'payment_form'
  | 'fabric_form'
  | 'user_form'
  | 'order_detail'
  | 'measurement_form'
  | 'ticket_preview'
  | 'model_detail'
  | 'catalog_picker'
  | 'login_form'
  | null;
