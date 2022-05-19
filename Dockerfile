# install dependencies
FROM node:16-alpine
RUN npm i -g pnpm

WORKDIR /app-src

COPY package.json pnpm-lock.yaml ./
COPY app ./app
RUN pnpm install --production

USER node

CMD ["pnpm", "run", "start"]
