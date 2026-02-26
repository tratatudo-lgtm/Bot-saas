# --- Usa Node.js LTS ---
FROM node:22

# --- Diretório de trabalho ---
WORKDIR /usr/src/app

# --- Copia apenas package.json e package-lock.json ---
COPY package*.json ./

# --- Instala dependências sem erros de peer ---
RUN npm install --legacy-peer-deps

# --- Copia todo o resto do projeto ---
COPY . .

# --- Expõe a porta que o app usa ---
EXPOSE 3000

# --- Comando para iniciar o servidor ---
CMD ["node", "server.js"]