FROM node:latest

WORKDIR /usr/src/app

# cache deps in a layer for speedier rebuilds
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
