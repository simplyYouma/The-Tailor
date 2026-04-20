# 🚀 Guide d'Intégration Yumi Hub - The Tailor

Ce guide explique comment connecter l'application **The Tailor** (React/Tauri) au système central de licences **Yumi Hub**.

## 1. Dans le Yumi Hub (Admin)
1. Ouvrez le Hub ([http://localhost:4000/admin](http://localhost:4000/admin)).
2. Allez dans **Logiciels & Projets**.
3. Recherchez ou créez le projet **The Tailor**.
4. Copiez l'**ID du Projet** (UUID) généré : `37061ff8-d5d7-4176-b176-5b15678b106f`.

## 2. Configuration Technique
### Fichier `.env`
Assurez-vous que le fichier `.env` à la racine contient :
```env
VITE_YUMI_HUB_URL=http://localhost:4000/api/verify
VITE_YUMI_PROJECT_ID=37061ff8-d5d7-4176-b176-5b15678b106f
VITE_PROJECT_NAME="The Tailor"
```

### Composant de Sécurité
Le dossier `src/components/Guard` contient :
- `LicenseGuard.tsx` : Le gardien "Elite Pro" qui interroge le Hub et gère localement la validité Ed25519.

### Activation dans App.tsx
L'application est enveloppée par le `LicenseGuard` :
```tsx
import { LicenseGuard } from './components/Guard/LicenseGuard';

function App() {
  return (
    <LicenseGuard>
      {/* Contenu de The Tailor */}
    </LicenseGuard>
  );
}
```

## 3. Déploiement & Sécurité
Lors du passage en production :
1. Déployez le Yumi Hub sur un serveur public (LWS/CFA).
2. Mettez à jour `VITE_YUMI_HUB_URL` avec l'URL réelle.
3. Vérifiez la **CSP** dans `src-tauri/tauri.conf.json` pour autoriser le domaine de l'API.

---
*Yumi Hub - La sécurité au service de la croissance.*
