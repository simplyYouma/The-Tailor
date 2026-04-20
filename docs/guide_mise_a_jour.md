# 📖 Guide Ultime de Mise à Jour : Architecture & Procédures - The Tailor

Ce guide définit la stratégie professionnelle pour mettre à jour l'application **The Tailor** sans jamais risquer de perdre les données cruciales du client (mesures, commandes, tissus).

---

## 🧠 Philosophie : Séparer "Le Cerveau" de "La Mémoire"

En ingénierie logicielle moderne, on sépare strictement le programme (le code) des données (la base de données). C'est ce qui rend les mises à jour simples et sûres.

| Composant | Emplacement Windows | Nature | Impact mise à jour |
| :--- | :--- | :--- | :--- |
| **Logiciel (Cerveau)** | `C:\Program Files\the-tailor\` | Fichiers `.exe`, `.dll` | Remplacés par l'installeur |
| **Donnée (Mémoire)** | `%APPDATA%\com.thetailor.app\` | Fichier `.db` | **Intouchés et préservés** |

---

## 🛠️ Côté Développeur (Vous) : Préparer la Mise à Jour

Lorsque vous souhaitez livrer de nouvelles fonctionnalités :

1.  **Incrémenter la Version** :
    *   Ouvrez `src-tauri/tauri.conf.json`.
    *   Changez `"version": "0.1.0"` vers `"0.1.1"` (ou supérieur).
2.  **Gérer les changements de structure (Migrations)** :
    *   Si vous ajoutez une table ou une colonne, utilisez `tauri-plugin-sql` avec des migrations incrémentales.
    *   *Fichier :* `src-tauri/src/lib.rs` (vecteur `migrations`).
3.  **Compiler le package** :
    ```bash
    npm run tauri build
    ```
    Cela génère un nouvel installateur intelligent (fichier `.msi`) dans `src-tauri\target\release\bundle\msi\`.

> [!IMPORTANT]
> **L'Identité est sacrée :** Pour que Windows reconnaisse qu'il s'agit d'une mise à jour et non d'un nouveau logiciel, vous ne devez **JAMAIS** changer le `productName` (`The Tailor`) ou l' `identifier` (`com.thetailor.app`) dans `tauri.conf.json`.

---

## 💻 Côté Client : Installer la Mise à Jour

L'installateur `.msi` est conçu pour gérer le remplacement automatique.

### Méthode Recommandée (La plus propre) :
1.  **Fermer l'application** si elle est ouverte.
2.  **Lancer le nouveau `.msi`** (double-clic).
3.  Windows Installer détecte l'ancienne version, remplace les fichiers du programme dans `Program Files`, mais **conserve intact** le dossier des données dans `AppData`.
4.  Relancer l'application : toutes les données sont là !

### ❌ Ce qu'il ne faut JAMAIS faire :
*   Copier/coller manuellement un nouveau fichier `.exe` par-dessus l'ancien.
*   Manipuler manuellement les fichiers dans `C:\Program Files\`.
*   Demander au client de supprimer manuellement le dossier dans `AppData`.

---

## 🔐 Gestion de la Base de Données & Sauvegardes

Le fichier de données s'appelle `the_tailor_v2.db`.

### 📂 Où se trouve le fichier exact ?
Pour le trouver rapidement sur n'importe quel PC Windows :
1.  Appuyez sur `Windows + R`.
2.  Tapez `%appdata%` et faites `Entrée`.
3.  Cherchez le dossier `com.thetailor.app`.
4.  Votre fichier `.db` est là.

### 💾 Sauvegarde automatique
L'application effectue une sauvegarde quotidienne dans le dossier `backups` situé dans le même répertoire `AppData`.

### 🔄 Comment restaurer ?
Si vous changez d'ordinateur ou si un problème survient :
1.  Installez l'application sur le nouveau PC.
2.  Allez dans `%appdata%\com.thetailor.app\`.
3.  Collez votre fichier de sauvegarde à cet endroit (renommez-le exactement en `the_tailor_v2.db`).

---

## 🛡️ Protection & Sécurité (Rappel Critique)

**Algorithme Ed25519** :
*   La sécurité repose sur une paire de clés. Seule la **Clé Publique** est présente dans le logiciel.
*   La **Clé Privée** (dans le Hub) ne doit jamais être partagée.
*   Si le client change de machine, il devra vous fournir son nouvel **ID Terminal (HWID)** pour générer une nouvelle clé.

---

> [!TIP]
> Un bon déploiement est un déploiement invisible pour le client. En respectant cette structure, vous garantissez une expérience "Premium" où le client gagne des fonctionnalités sans jamais craindre pour ses mesures précieuses.
