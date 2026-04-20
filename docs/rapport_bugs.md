# Rapport des Bugs et Solutions - The Tailor

Ce document répertorie les problèmes techniques rencontrés lors du développement de **The Tailor** et leurs solutions pour maintenir la stabilité du système.

## 1. Configuration du Backend (Rust/Tauri)

### ❌ Problème : "No database driver enabled"
- **Cause** : Le plugin `tauri-plugin-sql` était installé sans spécifier le driver `sqlite` dans les features.
- **Solution** : Dans `src-tauri/Cargo.toml`, modifier la dépendance :
  ```toml
  tauri-plugin-sql = { version = "2.3.2", features = ["sqlite"] }
  ```

### ❌ Problème : Permissions SQL refusées (Tauri v2)
- **Cause** : Les commandes SQL sont bloquées par défaut pour la sécurité.
- **Solution** : Ajouter les permissions dans `src-tauri/capabilities/default.json` :
  ```json
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select"
  ]
  ```

---

## 2. Interface Utilisateur (React/Security)

### ❌ Problème : "ID Terminal" tronqué ou illisible
- **Cause** : Certains HWID longs débordaient du conteneur sur les petits écrans.
- **Solution** : Utilisation de `text-sm`, `font-mono` et `tracking-tight` pour assurer une lisibilité parfaite de l'identifiant machine.

### ❌ Problème : Conflit de Polices (Google Fonts vs System)
- **Cause** : Mauvaise priorité d'importation dans `index.css`.
- **Solution** : Centralisation des imports CSS `@import url(...)` en haut du fichier pour garantir que `Outfit` et `Inter` sont chargés avant le rendu.

---

## 3. Système Yumi Hub

### ❌ Problème : Échec de Synchronisation (Cors/Network)
- **Cause** : API locale du Hub renvoyait des erreurs CORS car le domaine Tauri n'était pas autorisé.
- **Solution** : Configuration de `tauri.conf.json` avec les CSP adéquates et vérification de `navigator.onLine` avant l'appel API.

### ❌ Problème : "Clock Fraud" injustifiée
- **Cause** : Comparaison trop stricte entre l'heure système et le dernier `yumi_last_sync`.
- **Solution** : Ajout d'une marge de tolérance de 5 minutes pour compenser les micro-dérives d'horloge.

---

*Ce document est mis à jour à chaque résolution de bug critique.*
