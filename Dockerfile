# Usa Node.js LTS
FROM node:22-bullseye

# Evita prompts de apt
ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências do sistema para o Puppeteer/WPPConnect
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /usr/src/app

# Copia ficheiros de dependências primeiro
COPY package*.json ./

# Instala dependências Node.js
RUN npm install --legacy-peer-deps

# Copia resto do projeto
COPY . .

# Expõe porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]