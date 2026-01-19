# 🌍 Passworld - Voyage Surprise

Projet Next.js pour la plateforme Passworld de voyages surprises.

## 🚀 Déploiement rapide

### 1. Installation locale (optionnel)
```bash
npm install
npm run dev
```

### 2. Déploiement sur Vercel

#### A. Via GitHub (recommandé)
1. Créez un nouveau repository GitHub
2. Poussez ce projet:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/passworld.git
   git push -u origin main
   ```
3. Allez sur [Vercel](https://vercel.com)
4. Cliquez sur "Import Project"
5. Sélectionnez votre repo GitHub
6. Ajoutez les variables d'environnement:
   - `NEXT_PUBLIC_DEMO_MODE` = `true`
   - `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` = votre clé Stripe
   - `AIRTABLE_API_KEY` = votre API key Airtable
   - `AIRTABLE_BASE_ID` = votre Base ID Airtable
7. Cliquez sur "Deploy"

#### B. Via Vercel CLI
```bash
npm i -g vercel
vercel
```

## 📦 Technologies utilisées

- **Next.js 14** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **Lucide React** - Icônes
- **Stripe** - Paiements
- **Airtable** - Base de données

## 🎨 Features

- ✅ Design moderne avec dégradés
- ✅ Animations fluides
- ✅ Module de réservation complet
- ✅ Gestion des groupes
- ✅ Formulaire en 10 étapes
- ✅ Menu debug pour tester
- ✅ Mode démo intégré

## 📝 Structure du projet

```
passworld/
├── src/
│   └── app/
│       ├── globals.css          # Styles globaux + Tailwind
│       ├── layout.tsx           # Layout Next.js
│       ├── page.tsx             # Page d'accueil
│       └── passworld-module.tsx # Module principal
├── package.json                 # Dépendances
├── tailwind.config.js          # Config Tailwind
├── postcss.config.js           # Config PostCSS
├── next.config.js              # Config Next.js
└── tsconfig.json               # Config TypeScript
```

## 🔧 Configuration

Les variables d'environnement sont gérées via Vercel.

En local, créez un fichier `.env.local`:
```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
```

## 📞 Support

Pour toute question, contactez l'équipe Passworld.

---

Made with ❤️ by Passworld Team
