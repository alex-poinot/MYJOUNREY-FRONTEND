#!/bin/bash

echo "🔍 Guide pour vérifier les erreurs JavaScript dans le navigateur"
echo "================================================================"

echo ""
echo "📋 Étapes à suivre :"
echo "1. Ouvrez votre navigateur et allez sur http://10.100.9.40"
echo "2. Appuyez sur F12 pour ouvrir les outils de développement"
echo "3. Allez dans l'onglet 'Console'"
echo "4. Rechargez la page (F5 ou Ctrl+R)"
echo "5. Regardez s'il y a des erreurs en rouge"

echo ""
echo "🔍 Erreurs courantes à rechercher :"
echo "- CORS errors (Cross-Origin Resource Sharing)"
echo "- Module loading errors"
echo "- Azure AD authentication errors"
echo "- Network errors (failed to load resources)"

echo ""
echo "📊 Informations de diagnostic :"
echo "- URL de l'application: http://10.100.9.40"
echo "- Environnement: staging"
echo "- Mode authentification: Azure AD activé"

echo ""
echo "🚀 Si vous voyez des logs de démarrage :"
echo "- '🚀 Démarrage de l'application MyJourney'"
echo "- '📊 Environnement: staging'"
echo "- '🔑 Initialisation MSAL...'"
echo "Alors l'application se charge mais il y a un problème d'authentification"

echo ""
echo "❌ Si vous ne voyez aucun log :"
echo "Il y a probablement une erreur JavaScript qui empêche le démarrage"

echo ""
echo "💡 Solutions possibles :"
echo "1. Vérifier les erreurs CORS"
echo "2. Vérifier la connectivité réseau"
echo "3. Vider le cache du navigateur (Ctrl+Shift+R)"
echo "4. Essayer en navigation privée"

echo ""
echo "📞 Une fois que vous avez identifié l'erreur, partagez-la pour que je puisse vous aider à la corriger."