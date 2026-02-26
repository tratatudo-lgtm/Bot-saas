# Node LTS
FROM node:22-bullseye

# Diretório de trabalho
WORKDIR /usr/src/app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do projeto
COPY . .

# Expõe a porta do app
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]