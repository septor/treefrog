FROM node:latest

WORKDIR /usr/src/app

# cache deps in a layer for speedier rebuilds
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
