#!/bin/bash

# Script pour installer Docker en résolvant les conflits de dépendances
set -e

echo "🔧 Résolution des conflits Docker et installation"

# Supprimer les anciennes versions et paquets en conflit
echo "🧹 Suppression des anciennes versions de Docker..."
sudo apt-get remove -y docker docker-engine docker.io containerd runc containerd.io 2>/dev/null || true

# Nettoyer les paquets cassés
echo "🔧 Nettoyage des paquets cassés..."
sudo apt-get autoremove -y
sudo apt-get autoclean
sudo dpkg --configure -a

# Mettre à jour les paquets
echo "📦 Mise à jour des paquets..."
sudo apt-get update

# Installer les prérequis
echo "📋 Installation des prérequis..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Ajouter la clé GPG officielle de Docker
echo "🔑 Ajout de la clé GPG Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajouter le dépôt Docker
echo "📂 Ajout du dépôt Docker..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Mettre à jour avec le nouveau dépôt
echo "🔄 Mise à jour avec le dépôt Docker..."
sudo apt-get update

# Installer Docker Engine
echo "🐳 Installation de Docker Engine..."
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Démarrer et activer Docker
echo "🚀 Démarrage de Docker..."
sudo systemctl start docker
sudo systemctl enable docker

# Ajouter l'utilisateur au groupe docker
echo "👤 Ajout de l'utilisateur au groupe docker..."
sudo usermod -aG docker $USER

# Vérifier l'installation
echo "✅ Vérification de l'installation..."
sudo docker --version
sudo docker compose version

echo ""
echo "🎉 Installation terminée avec succès!"
echo ""
echo "⚠️  IMPORTANT: Vous devez vous déconnecter et vous reconnecter"
echo "   (ou exécuter 'newgrp docker') pour que les permissions"
echo "   du groupe docker prennent effet."
echo ""
echo "🧪 Pour tester Docker:"
echo "   docker run hello-world"
echo ""
echo "🚀 Pour déployer votre application:"
echo "   ./build-and-deploy.sh"