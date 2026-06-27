# ERP SaaS — PME Africaines

Un ERP SaaS modulaire, multi-tenant, conçu spécifiquement pour les PME d'Afrique subsaharienne et du Maghreb.

## Modules

| Module | Description |
|--------|-------------|
| 🔐 **Auth & Utilisateurs** | Authentification JWT, rôles & permissions |
| 📊 **Comptabilité** | Plan SYSCOHADA, journaux, bilans, Grand Livre |
| 🧾 **Facturation** | Devis, factures, avoirs, suivi paiements |
| 📦 **Stocks** | Produits, entrepôts, mouvements, alertes |
| 👥 **RH & Paie** | Employés, contrats, bulletins de paie, congés |
| 🤝 **CRM** | Prospects, opportunités, pipeline de vente |
| 📋 **Projets** | Gestion de projets, tâches, jalons |
| 📈 **Dashboard** | KPIs, graphiques, rapports |

## Spécificités africaines

- 💰 **Devises** : XOF (FCFA Ouest), XAF (FCFA Centre), GNF, MAD, NGN, KES
- 📱 **Mobile Money** : Orange Money, Wave, MTN Money, Free Money, Moov Money
- 📚 **Comptabilité** : Plan SYSCOHADA (UEMOA/CEMAC)
- 🌍 **Langues** : Français / Anglais
- 📶 **Offline-first** : Fonctionne avec une faible connexion

## Stack technique

- **Backend** : Node.js 20 + Express + TypeScript + Prisma
- **Base de données** : PostgreSQL 15
- **Cache** : Redis 7
- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Auth** : JWT (access + refresh tokens)
- **Architecture** : Multi-tenant (isolation par organisation)

## Démarrage rapide

### Prérequis
- Node.js 20+
- Docker & Docker Compose
- Git

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/ahmadoubambandaw/erp-saas.git
cd erp-saas

# Démarrer les services (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (dans un autre terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Accès
- **Frontend** : http://localhost:5173
- **API** : http://localhost:3000/api/v1
- **Compte admin** : admin@demo.com / Admin123!

## Structure du projet

```
erp-saas/
├── backend/               # API REST Node.js
│   ├── prisma/            # Schéma & migrations DB
│   └── src/
│       ├── config/        # Configuration
│       ├── middleware/    # Auth, tenant, erreurs
│       ├── modules/       # Modules métier
│       └── utils/         # Utilitaires
└── frontend/              # React SPA
    └── src/
        ├── components/    # Composants UI
        ├── pages/         # Pages par module
        ├── services/      # Appels API
        ├── store/         # État global (Zustand)
        └── i18n/          # Traductions
```

## Licence

MIT — Voir [LICENSE](LICENSE)
