FROM node:22-alpine

WORKDIR /app

COPY package.json ./package.json
COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/bin.cjs"]