/**
 * THE TAILOR — Business Constants
 * Source unique de vérité pour les valeurs métier.
 */
import type { OrderStatus, PaymentMethod, ModelCategory, Gender } from './index';

/** Étapes de production ordonnées pour le Kanban. */
export const ORDER_STATUSES: OrderStatus[] = [
  'Réception',
  'Coupe',
  'Couture',
  'Finition',
  'Prêt',
  'Livré',
  'Annulé',
];

/** Couleurs associées à chaque statut pour le Kanban. */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  'Réception': '#6366F1',  // Indigo
  'Coupe': '#F59E0B',  // Amber
  'Couture': '#3B82F6',  // Blue
  'Finition': '#EC4899',  // Pink
  'Prêt': '#10B981',  // Emerald
  'Livré': '#6B7280',  // Gray
  'Annulé': '#D1D5DB',  // Light Gray
};

/** Méthodes de paiement disponibles au Mali. */
export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Orange Money',
  'Moov Money',
  'Wave',
  'Carte',
  'Autre',
];

/** Catégories de modèles pour le catalogue. */
export const MODEL_CATEGORIES: ModelCategory[] = [
  'Boubou',
  'Bazin',
  'Costume',
  'Robe',
  'Robe de Mariée',
  'Ligne Homme',
  'Abaya',
  'Chemise',
  'Pantalon',
  'Jupe',
  'Ensemble',
  'Autre',
];

export const MODEL_GENDERS: Gender[] = ['Homme', 'Femme'];

/** Devise par défaut. */
export const CURRENCY = 'FCFA';

/** Types de tissus gérés par l'Atelier. */
export const FABRIC_TYPES = [
  'Bazin Riche',
  'Wax',
  'Brode',
  'Brocart',
  'Lépi',
  'Soie',
  'Lin',
  'Laine',
  'Coton',
  'Dentelle',
  'Autre'
];

/** Seuils de stock pour les alertes. */
export const FABRIC_STOCK_LIMITS = {
  LOW: 5,   // Alert if <= 5m
  CRITICAL: 2 // Alert if <= 2m
};

/** Paramètres de pagination par défaut. */
export const PAGINATION = {
  FABRICS: 12,
  CATALOG: 12,
  CLIENTS: 20
};

/** Nombre de jours de rétention des backups. */
export const BACKUP_RETENTION_DAYS = 7;

/** Palette de couleurs premium pour les commandes individuelles. */
export const ITEM_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#78350F', // Brown
];

/** Retourne une couleur stable basée sur l'ID de l'item. */
export const getItemColor = (id: string): string => {
  if (!id) return ITEM_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ITEM_PALETTE.length;
  return ITEM_PALETTE[index];
};
