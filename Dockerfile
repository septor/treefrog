FROM node:latest AS builder

WORKDIR /usr/src/app

# cache deps in a layer for speedier rebuilds
COPY package*.json .
RUN npm install

COPY . .

RUN npm run build

FROM node:latest

WORKDIR /usr/src/app

COPY package*.json .

RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "--enable-source-maps", "dist/index.js"]
