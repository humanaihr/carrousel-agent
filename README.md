# 🤖 Agent Prospection B2B — Groupe Carrousel
### Déploiement GitHub Actions · Cron autonome · Zéro serveur

---

## 📁 Structure du repo

```
carrousel-agent/
├── .github/
│   └── workflows/
│       └── agent.yml        ← Cron GitHub Actions
├── src/
│   ├── agent.js             ← Logique agent + email + Slack
│   └── package.json
└── README.md
```

---

## 🚀 Déploiement en 5 minutes

### Étape 1 — Créer le repo GitHub
1. Va sur **github.com** → **New repository**
2. Nom: `carrousel-prospection-agent`
3. Visibilité: **Private** (recommandé)
4. Crée le repo

### Étape 2 — Push les fichiers
```bash
# Sur ton PC, dans le dossier téléchargé
git init
git add .
git commit -m "init agent prospection carrousel"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/carrousel-prospection-agent.git
git push -u origin main
```

### Étape 3 — Configurer les Secrets GitHub
Va dans ton repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret       | Valeur                          | Usage            |
|--------------|---------------------------------|------------------|
| `EMAIL_TO`   | `toi@email.com`                 | Destinataire mail |
| `SMTP_HOST`  | `smtp.gmail.com`                | Serveur SMTP     |
| `SMTP_USER`  | `ton@gmail.com`                 | Login SMTP       |
| `SMTP_PASS`  | `xxxx xxxx xxxx xxxx`           | App Password Gmail|
| `SLACK_WEBHOOK` | `https://hooks.slack.com/...` | (optionnel) Slack|

> **Gmail App Password** : myaccount.google.com/apppasswords → créer un mot de passe pour "Mail"

### Étape 4 — Vérifier que ça tourne
- Va dans ton repo → onglet **Actions**
- Tu vois le workflow `Agent Prospection Carrousel`
- Clique **Run workflow** pour tester manuellement

---

## ⏰ Cadence cron

Par défaut : **lundi–vendredi à 8h et 14h UTC** (= 9h/15h Paris en hiver, 10h/16h en été)

Pour modifier, édite `.github/workflows/agent.yml` :
```yaml
schedule:
  - cron: '0 7 * * 1-5'    # 8h Paris (hiver)
  - cron: '0 7,12 * * *'   # 8h et 13h tous les jours
  - cron: '0 */4 * * *'    # toutes les 4h
  - cron: '*/30 * * * *'   # toutes les 30 min (test)
```

---

## 📧 Ce que tu reçois par email

Un rapport HTML formaté avec :
- **Résumé** : total leads, leads chauds, score moyen, top secteur
- **Tableau leads** : entreprise, contact, email, score ICP, signal d'achat, lien LinkedIn
- **Signaux d'achat** : événements déclencheurs détectés

---

## 🔧 Déclencher manuellement

Dans l'onglet **Actions** → `Agent Prospection Carrousel` → **Run workflow**

Tu peux personnaliser :
- **Requête** : `DSI banque Paris`, `CTO assurance ETI`, etc.
- **Score minimum** : `80` pour leads chauds uniquement

---

## ➕ Ajouter tes propres leads

Édite `src/agent.js`, tableau `LEADS` — ajoute tes prospects réels :

```js
{
  id: 'custom_01',
  company: "Ma Cible SA",
  sector: "Banque",
  size: "500 sal., ETI",
  city: "Lyon",
  contact_name: "Jean Dupont",
  contact_title: "DSI",
  contact_email: "j.dupont@macible.fr",
  contact_linkedin: "https://linkedin.com/in/jean-dupont",
  icp_score: 85,
  pain_points: ["SI legacy", "dette technique"],
  buy_signal: "Recrutement architecte SI",
  case_type: "legacy",
  priority: "chaud",
  tags: ["Banque", "Legacy"]
}
```

---

## 📊 Artifacts GitHub

Chaque run sauvegarde un fichier `rapport-YYYY-MM-DD-runN.json` téléchargeable depuis l'onglet Actions → ton run → **Artifacts**.

---

*Groupe Carrousel · Faveod Designer® · +650 projets · BNP · SNCF · EDF · CNP*
