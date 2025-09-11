# Configuration Azure AD Portal

## 🔧 Étapes à suivre dans Azure AD Portal

### 1. Connexion au portail Azure
- Allez sur https://portal.azure.com
- Connectez-vous avec vos identifiants administrateur

### 2. Navigation vers App Registrations
- Cliquez sur "Azure Active Directory" dans le menu de gauche
- Cliquez sur "App registrations"
- Recherchez et cliquez sur votre application MyJourney

### 3. Configuration Authentication
- Dans le menu de gauche, cliquez sur "Authentication"
- Dans la section "Redirect URIs", vous devriez voir :
  - Type: Single-page application (SPA)
  - URI: anciennes URLs (à modifier)

### 4. Mise à jour des URLs
**Modifiez les URLs suivantes :**

**Redirect URIs :**
- ❌ Supprimez toutes les anciennes URLs
- ✅ Ajoutez : `https://myjourney-test.grant-thornton.fr/myjourney/`

**Logout URL :**
- ❌ Supprimez les anciennes URLs
- ✅ Ajoutez : `https://myjourney-test.grant-thornton.fr/myjourney/`

### 5. URLs exactes à configurer

**Dans la section "Redirect URIs" (Type: Single-page application) :**
```
https://myjourney-test.grant-thornton.fr/myjourney/
```

**Dans la section "Front-channel logout URL" :**
```
https://myjourney-test.grant-thornton.fr/myjourney/
```

**⚠️ IMPORTANT :**
- L'URL doit se terminer par `/` (slash final obligatoire)
- Utilisez exactement `https://` (pas http)
- Le chemin complet `/myjourney/` est requis
### 5. Configuration avancée
Dans la section "Advanced settings" :
- ✅ Cochez "Allow public client flows" : **Yes**
- ✅ "Supported account types" : **Accounts in this organizational directory only**

### 6. API Permissions
Vérifiez que ces permissions sont accordées :
- ✅ Microsoft Graph > User.Read (Delegated)
- ✅ Microsoft Graph > profile (Delegated)
- ✅ Microsoft Graph > openid (Delegated)
- ✅ Microsoft Graph > email (Delegated)

### 7. Sauvegarde
- Cliquez sur "Save" en haut de la page
- Attendez la confirmation "Successfully updated"

## ⚠️ Points importants

1. **HTTPS obligatoire** : MSAL ne fonctionne qu'en HTTPS
2. **URLs exactes** : Les URLs doivent correspondre exactement
3. **Type SPA** : Assurez-vous que c'est bien "Single-page application"
4. **Permissions** : Toutes les permissions doivent être accordées

## 🧪 Test de la configuration

Après avoir sauvegardé :
1. Attendez 5-10 minutes pour la propagation
2. Testez l'accès à https://10.100.9.40
3. Vérifiez que la page de connexion Azure apparaît