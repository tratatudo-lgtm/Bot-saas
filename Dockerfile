# Dockerfile

# Usa Node.js LTS
FROM node:22-bullseye

# Instala dependências do sistema necessárias para Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libxss1 \
    libgtk-3-0 \
    ca-certificates \
    fonts-liberation \
    wget \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define diretório de trabalho
WORKDIR /usr/src/app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências npm
RUN npm install --legacy-peer-deps

# Copia todo o resto do projeto
COPY . .

# Define variável de ambiente para Chromium
ENV CHROMIUM_PATH=/usr/bin/chromium

# Expõe a porta usada pelo servidor
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]