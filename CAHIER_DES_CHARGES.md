# 🧵 CAHIER DES CHARGES — THE TAILOR : L'ATELIER CONNECTÉ ELITE (ÉDITION MALI)

**Version** : 3.0.0 (Spécialiste Confection Artisanale)
**Statut** : Cahier de charges validé & définitif

---

## 1. 🎯 VISION DU PROJET
**The Tailor** est un système de gestion (POS) local pour les ateliers de couture artisanaux. Il privilégie la personnalisation, la gestion des tissus clients et le suivi en temps réel via un "Magic Link" QR Code, offrant une expérience de luxe inaccessible aux logiciels classiques.

---

## 2. 🏛️ LES 7 PILIERS DE LA GESTION (Édition Artisanale)

### 👤 Module 1 : CRM Couture & Réception Tissu
Adapté au flux réel de l'atelier :
- **Fiche Client Elite** : Photo de profil et historique visuel des tenues confectionnées.
- **Dossier Tissu Client** : Prise de photo immédiate du tissu apporté par le client (Bazin, Wax, Soie) pour éviter toute confusion.
- **Association Modèle** : Liaison directe entre le tissu du client et un modèle choisi dans le catalogue.

### 👗 Module 2 : Catalogue de Modèles "Artisan"
La vitrine numérique du tailleur :
- **Gestion du Catalogue** : Galerie de photos des propres créations du tailleur (ex: Modèles 2024, Tabaski, Mariage).
- **Fiche Technique Modèle** : Détails du modèle (difficulté, temps estimé, métrage de tissu nécessaire).

### 👗 Module 3 : Cabinet de Mesures & Miroir Virtuel 3D
L'innovation majeure en boutique :
- **Saisie en CM** : Interface tactile optimisée pour la prise de mesures rapide.
- **Miroir Virtuel (Sims-Style)** : Un mannequin 3D technique (Three.js) s'ajuste selon les mesures pour valider la silhouette avec le client.

### 📅 Module 4 : Kanban de Production "Atelier"
Le tableau de bord de l'artisan :
- **Étapes de Production** : `Réception` → `Coupe` → `Couture` → `Essayage` → `Finition` → `Prêt`.
- **Fiche de Coupe** : Impression ou affichage des mesures spécifiques pour le coupeur.

### 📡 Module 5 : Suivi Client "Magic Link" (Le Relais Hub)
Le suivi en temps réel pour une application locale :
- **Sync Status Hub** : L'app locale envoie une notification au Yumi Hub lors de chaque changement de statut.
- **QR Code Tracking** : Le client scanne son ticket et voit l'avancement de sa tenue sur son téléphone, même s'il est chez lui.

### 💰 Module 6 : Caisse & Smart Tickets
- **Gestion des Acomptes** : Calcul automatique du reste à payer (ex: 70% à la commande).
- **Ticket Hybride** : Impression thermique (POS) ou génération de Ticket QR (Digital) si aucune imprimante n'est présente.

### 📊 Module 7 : Dashboard d'Atelier
- **Revenus & Dépenses** : Suivi des rentrées (acomptes) et des dépenses (mercerie, fils).
- **Statistiques** : Quel modèle du catalogue est le plus demandé ? Quel tailleur est le plus rapide ?

---

## 🛠️ SPÉCIFICATIONS TECHNIQUES
- **Core** : React 19 + Tauri v2 (Bureau/Tablette).
- **BDD** : SQLite locale (Performance maximale).
- **Sync** : API REST sécurisée vers le Yumi Hub pour le suivi distant.
- **3D** : Three.js pour le miroir virtuel.

---

## 🗺️ MODULE 0 : ARCHITECTURE BDD
Le schéma SQL sera conçu pour supporter :
- `catalog_models` (Photos, noms, prix de base).
- `orders` (Référence tissu, statut, prix total, acompte).
- `measurements` (Historique par client et par commande).

---
*Ce document valide la vision finale du projet The Tailor.*
