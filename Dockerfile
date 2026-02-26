# Usa Node.js LTS
FROM node:22

# Diretório de trabalho
WORKDIR /usr/src/app

# Copia apenas ficheiros de dependências
COPY package*.json ./

# Instala dependências
RUN npm install --legacy-peer-deps

# Copia todo o resto do projeto
COPY . .

# Expõe a porta usada pelo server
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]