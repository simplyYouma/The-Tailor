# 🏗️ Yumi Hub : Spécifications Techniques - The Tailor

Ce document décrit le cœur du système **Yumi Hub** appliqué au projet **The Tailor** pour l'administration et la sécurité.

## 💾 Infrastructure & Données
Le backend est géré par **Supabase** et **Yumi Hub API**.
Les tables clés sont :
- `projects` : Liste des logiciels gérés (The Tailor ID: `37061ff8-d5d7-4176-b176-5b15678b106f`).
- `clients` : Détenteurs de licences.
- `licenses` : Relation entre un projet, un client et un matériel (HWID).
  - Champs : `status` (active, revoked), `expires_at`, `license_key`.

## 🔑 Cryptographie (Ed25519)
Le Hub utilise l'algorithme **Ed25519** (Standard de l'industrie) pour signer les licences.
- **Clé Privée** : Stockée secrètement dans le Hub. Génère la signature.
- **Clé Publique** : `eef17a2365fe4e7d9fbad5d87741f79979e00055108be650d57ece534d53360a`.
  - Intégrée dans `src-tauri/src/lib.rs`.
  - Sert à vérifier l'authenticité de la licence localement, même hors ligne.

## 📊 Dashboard de Gestion
L'interface d'administration calcule :
- **Validité temporelle** : Alerte de synchronisation à J-2.
- **Révocation à distance** : Blocage instantané en cas de fraude.
- **HWID Pairing** : Verrouillage d'une clé sur une machine physique unique.

## 🛠️ Diagnostics & Logs
- **Sync Status** : Stocké dans le `localStorage` (`yumi_last_sync`).
- **Machine ID** : Récupéré via `wmic` ou PowerShell (Windows) / `machine-id` (Linux).
- **Grace Period** : 30 jours autorisés sans connexion Internet avant blocage strict.

---
*Yumi Hub - L'architecture du SaaS moderne.*
