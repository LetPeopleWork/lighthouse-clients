FROM node:22-alpine
WORKDIR /app
COPY package.json ./package.json
COPY dist ./dist
RUN npm install --omit=dev
EXPOSE 3333
CMD ["node", "dist/bin.js"]