FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm prune --production

RUN addgroup -g 1001 -S mcp && adduser -S mcp -u 1001
USER mcp

EXPOSE 3001

CMD ["node", "dist/index.js"]
