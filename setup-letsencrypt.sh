#!/bin/bash

echo "🔒 Configuration Let's Encrypt pour un vrai certificat SSL"
echo "========================================================"

echo "⚠️  ATTENTION: Cette solution nécessite un nom de domaine public"
echo "   Si vous n'avez pas de domaine, utilisez la solution temporaire"
echo ""

read -p "Avez-vous un nom de domaine pointant vers 10.100.9.40 ? (y/n): " has_domain

if [ "$has_domain" != "y" ]; then
    echo ""
    echo "❌ Sans nom de domaine, Let's Encrypt ne peut pas fonctionner"
    echo ""
    echo "💡 Solutions alternatives :"
    echo "1. Utilisez le certificat auto-signé (acceptez l'avertissement)"
    echo "2. Configurez un nom de domaine (ex: myjourney.votredomaine.com)"
    echo "3. Utilisez un service comme ngrok pour un tunnel HTTPS"
    echo ""
    echo "🔧 Pour continuer avec le certificat auto-signé :"
    echo "   ./fix-ssl-certificate.sh"
    exit 1
fi

read -p "Entrez votre nom de domaine (ex: myjourney.example.com): " domain_name

if [ -z "$domain_name" ]; then
    echo "❌ Nom de domaine requis"
    exit 1
fi

echo ""
echo "🔧 Installation de Certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo "🔄 Arrêt temporaire de Nginx..."
sudo systemctl stop nginx

echo ""
echo "🔑 Génération du certificat Let's Encrypt..."
sudo certbot certonly --standalone -d "$domain_name" --email admin@"$domain_name" --agree-tos --no-eff-email

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificat Let's Encrypt généré avec succès !"
    
    # Mettre à jour la configuration Nginx
    echo "🔧 Mise à jour de la configuration Nginx..."
    sudo sed -i "s|server_name _;|server_name $domain_name;|g" /etc/nginx/sites-available/myjourney
    sudo sed -i "s|ssl_certificate /etc/nginx/ssl/myjourney.crt;|ssl_certificate /etc/letsencrypt/live/$domain_name/fullchain.pem;|g" /etc/nginx/sites-available/myjourney
    sudo sed -i "s|ssl_certificate_key /etc/nginx/ssl/myjourney.key;|ssl_certificate_key /etc/letsencrypt/live/$domain_name/privkey.pem;|g" /etc/nginx/sites-available/myjourney
    
    # Redémarrer Nginx
    sudo systemctl start nginx
    
    # Configurer le renouvellement automatique
    echo "🔄 Configuration du renouvellement automatique..."
    sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -
    
    echo ""
    echo "🎉 Configuration terminée !"
    echo "🌐 Votre site est maintenant accessible via : https://$domain_name"
    
else
    echo ""
    echo "❌ Échec de la génération du certificat Let's Encrypt"
    echo "🔧 Redémarrage de Nginx avec l'ancien certificat..."
    sudo systemctl start nginx
    
    echo ""
    echo "💡 Vérifiez que :"
    echo "1. Le domaine $domain_name pointe bien vers 10.100.9.40"
    echo "2. Les ports 80 et 443 sont accessibles depuis Internet"
    echo "3. Aucun firewall ne bloque les connexions"
fi