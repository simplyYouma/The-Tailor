/**
 * 🧵 ID Generator — UUID v4 frontend-only
 * Remplace l'appel invoke('generate_id') pour éviter de modifier le backend Rust.
 */

export function generateId(): string {
  // Use crypto.randomUUID if available (modern browsers + Tauri)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
