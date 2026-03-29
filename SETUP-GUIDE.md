# FORGE — Guide de Configuration Backend

## 1. Supabase (Base de données cloud)

### Étape 1 : Créer un projet Supabase
1. Va sur [supabase.com](https://supabase.com) et crée un compte gratuit
2. Clique "New Project"
3. Nom : `forge-app` / Mot de passe : génère un mdp fort / Région : `West EU (Paris)`
4. Attends 2 min que le projet soit provisionné

### Étape 2 : Créer les tables
1. Dans le dashboard Supabase, va dans **SQL Editor** (menu gauche)
2. Clique **New Query**
3. Copie-colle le contenu du fichier `supabase-setup.sql` (à la racine du projet)
4. Clique **Run** — tu devrais voir "Success. No rows returned" pour chaque commande

### Étape 3 : Récupérer les clés API
1. Va dans **Settings** → **API** (menu gauche)
2. Note ces 3 valeurs :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon (public) key** : `eyJhbGciOi...` (sous "Project API keys")
   - **service_role (secret) key** : `eyJhbGciOi...` (clique "Reveal" — NE PARTAGE JAMAIS cette clé)

### Étape 4 : Ajouter les variables dans Vercel
1. Va sur [vercel.com](https://vercel.com) → ton projet `rise-app`
2. **Settings** → **Environment Variables**
3. Ajoute ces 3 variables :

| Nom | Valeur |
|-----|--------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` (anon key) |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOi...` (service_role key) |

4. Clique **Save** puis **Redeploy** (Deployments → ... → Redeploy)

---

## 2. Stripe (Paiements et abonnements)

### Étape 1 : Créer un compte Stripe
1. Va sur [stripe.com](https://stripe.com) et crée un compte
2. Active ton compte (vérification d'identité + coordonnées bancaires)

### Étape 2 : Créer les produits et prix
1. Dans le Dashboard Stripe, va dans **Produits** → **Ajouter un produit**
2. Crée le produit **FORGE Premium** :
   - Nom : `FORGE Premium`
   - Prix : `9,99 €/mois` (récurrent, mensuel)
   - Clique **Enregistrer**
   - Note le **Price ID** : il ressemble à `price_1Abc123...` (visible dans les détails du prix)
3. Crée le produit **FORGE Elite** :
   - Nom : `FORGE Elite`
   - Prix : `19,99 €/mois` (récurrent, mensuel)
   - Clique **Enregistrer**
   - Note le **Price ID**

### Étape 3 : Récupérer la clé API
1. Va dans **Développeurs** → **Clés API**
2. Note la **Clé secrète** : `sk_live_...` (ou `sk_test_...` pour tester)

### Étape 4 : Ajouter les variables dans Vercel
1. Retourne dans Vercel → ton projet → **Settings** → **Environment Variables**
2. Ajoute ces 4 variables :

| Nom | Valeur |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` ou `sk_test_...` |
| `STRIPE_PRICE_PREMIUM` | `price_...` (Price ID du plan Premium) |
| `STRIPE_PRICE_ELITE` | `price_...` (Price ID du plan Elite) |
| `NEXT_PUBLIC_APP_URL` | `https://rise-app-mu.vercel.app` |

3. **Save** puis **Redeploy**

### Mode Test vs Live
- Utilise les clés `sk_test_...` et les Price IDs de test pendant le développement
- Quand tu es prêt à accepter de vrais paiements, bascule sur les clés `sk_live_...`
- Les deux environnements sont séparés dans le dashboard Stripe

---

## 3. Anthropic / OpenAI (Coach IA)

L'API du coach est déjà configurée. Vérifie juste que cette variable existe dans Vercel :

| Nom | Valeur |
|-----|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (ta clé Claude) |

Alternative : `OPENAI_API_KEY` = `sk-...` (si tu préfères GPT)

---

## Checklist finale

- [ ] Supabase : projet créé, SQL exécuté, 3 clés dans Vercel
- [ ] Stripe : 2 produits créés, 4 clés dans Vercel
- [ ] Anthropic : 1 clé dans Vercel
- [ ] Redeploy Vercel après ajout des variables
- [ ] Tester : ouvrir l'app → créer un compte → vérifier que le sync cloud fonctionne
- [ ] Tester : landing page → clic "7 jours gratuits" → vérifier la redirection Stripe
