# Dockerfile
FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]