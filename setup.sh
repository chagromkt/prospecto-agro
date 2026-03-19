#!/bin/bash
# ProspectAgro — Script de Setup Automático no VPS
# Execute como root: bash setup.sh

set -e
echo "🌱 Iniciando setup do ProspectAgro..."

# 1. Instala Node.js 20 se não tiver
if ! command -v node &> /dev/null; then
  echo "📦 Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node $(node -v)"

# 2. Instala git se não tiver
if ! command -v git &> /dev/null; then
  apt-get install -y git
fi

# 3. Cria pasta do site
SITE_DIR="/www/wwwroot/prospectar.chaagromkt.com.br"
mkdir -p $SITE_DIR

# 4. Clona ou atualiza o repositório
if [ -d "$SITE_DIR/.git" ]; then
  echo "🔄 Atualizando repositório..."
  cd $SITE_DIR && git pull origin main
else
  echo "📥 Clonando repositório..."
  # SUBSTITUA pela URL do seu repositório GitHub:
  git clone https://github.com/SEU_USUARIO/prospecto-agro.git $SITE_DIR
  cd $SITE_DIR
fi

# 5. Instala dependências e compila
echo "📦 Instalando dependências..."
npm install

echo "🔨 Compilando..."
npm run build

# 6. Copia build para a raiz (aaPanel serve de lá)
cp -r dist/* $SITE_DIR/

echo ""
echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://prospectar.chaagromkt.com.br"
