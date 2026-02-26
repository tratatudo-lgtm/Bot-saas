# Usa Node.js LTS
FROM node:22

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia apenas ficheiros de dependências
COPY package*.json ./

# Instala dependências e libs necessárias para WPPConnect headless
RUN apt-get update && apt-get install -y \
    wget curl gnupg ca-certificates \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 libnspr4 \
    && npm install --legacy-peer-deps \
    && apt-get clean

# Copia todo o resto do projeto (server.js, etc.)
COPY . .

# Expõe a porta do servidor
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]