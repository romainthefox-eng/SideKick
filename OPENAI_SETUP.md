# Configuration OpenAI pour SideKick

## 🚀 Activation de l'IA OpenAI

Le système **Demande** de SideKick utilise maintenant une approche hybride intelligente:

### Fonctionnement:

1. **Questions simples** → Logique locale (instantané, gratuit)
   - Statistiques ("Combien de locations?")
   - Recherches ("Qui habite où?")
   - Création rapide ("Ajoute une location")
   - Listes ("Mes logements")

2. **Questions complexes** → OpenAI GPT-4o-mini (plus intelligent)
   - "Pourquoi ma location se loue mal?"
   - "Comment optimiser mon revenu?"
   - "Quels conseils pour améliorer ma gestion?"
   - Questions longues ou naturelles

## ⚙️ Installation

### 1. Obtenez une clé API OpenAI

1. Allez sur https://platform.openai.com/account/api-keys
2. Créez une nouvelle clé secrète
3. Copiez-la (vous ne pourrez plus la voir après)

### 2. Configurez la clé dans `.env.local`

Éditez le fichier `.env.local` à la racine du projet:

```
# OpenAI API Configuration
OPENAI_API_KEY=sk_votre_clé_api_vraie
```

### 3. Redémarrez votre serveur

```bash
npm run dev
```

## 📊 Avantages du système hybride

| Aspect | Local | OpenAI |
|--------|-------|--------|
| **Vitesse** | ⚡ Instant | 🚀 1-2s |
| **Coût** | 💰 Gratuit | 💵 ~0.001€/req |
| **Compréhension** | ✓ Basique | ✓✓ Avancée |
| **Utilisation** | Requêtes structurées | Langage naturel |

## 🔒 Sécurité

- `.env.local` est ignorée de git (voir `.gitignore`)
- Ne commit JAMAIS votre clé API
- Utilisez `.env.example` pour la structure

## 🛠️ Dépannage

**"L'IA ne comprend pas ma question"**
- Essayez d'être plus clair et précis
- L'IA OpenAI active automatiquement pour les questions complexes

**"Erreur API"**
- Vérifiez votre clé API
- Vérifiez votre quota OpenAI sur la console
- Vérifiez la variable `.env.local`

**"Trop lent"**
- Les questions simples restent rapides (local)
- OpenAI prend 1-2s (temps réseau inclus)
