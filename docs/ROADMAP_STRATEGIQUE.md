# 🗺️ Yumi Strategic Roadmap — Vision Multi-Plateforme (The Tailor)

Ce document définit la stratégie de déploiement et d'évolution de **The Tailor** pour supporter les tablettes POS et les versions Cloud.

---

## 1. Vision Mobile & Tablettes POS (Couture)

L'écosystème Yumi utilise **Tauri v2**, ce qui permet une compilation native vers Android.

### 🧵 Cas d'usage Tailleur :
- **Mesures sur Tablette** : Le tailleur prend les mesures directement près du client avec la tablette.
- **Photos Modèles** : Utilisation de la caméra de la tablette pour associer un modèle ou un tissu à une commande.
- **Base de données** : SQLite local pour une rapidité sans faille.

---

## 2. Architecture Hybride (Local vs Cloud)

### 💾 Mode A : Client Lourd (Atelier)
- **Cible** : Utilisation quotidienne en boutique.
- **Stockage** : SQLite Local.
- **Avantage** : Confidentialité totale et rapidité.

### ☁️ Mode B : Cloud SaaS (Hébergé)
- **Cible** : Accès aux mesures et au carnet de commandes depuis n'importe quel appareil.
- **Stockage** : Supabase / API Distante.

---

## 3. Stratégie de Synchronisation

1.  **Saisie Locale** : Les commandes sont prises sur la tablette.
2.  **Backup Hub** : Synchronisation automatique des mesures vers le Hub pour ne jamais rien perdre.
3.  **Accès Client** : Possibilité pour le client de voir l'état de sa commande (`En couture`, `Prêt`) via une interface web générée.

---

## 4. Sécurité Unifiée (Elite Pro)

- **Ed25519** : Signature cryptographique sur tous les supports.
- **Anti-Fraude** : Détection d'horloge maintenue sur tablette.

---
*Yumi Strategic Roadmap — Moderniser l'artisanat avec The Tailor.*
