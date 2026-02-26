# Usa Node.js LTS
FROM node:22

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia apenas os ficheiros de dependências primeiro
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o resto do projeto
COPY . .

# Expõe a porta que o teu app usa
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]