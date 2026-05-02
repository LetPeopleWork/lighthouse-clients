FROM node:22-alpine
RUN corepack enable
WORKDIR /app

COPY packages/mcp-http/package.json ./packages/mcp-http/package.json
COPY packages/mcp-http/dist ./packages/mcp-http/dist
COPY packages/client/package.json ./packages/client/package.json
COPY packages/client/dist ./packages/client/dist
COPY packages/mcp-core/package.json ./packages/mcp-core/package.json
COPY packages/mcp-core/dist ./packages/mcp-core/dist

COPY pnpm-workspace.yaml ./
COPY package.json ./

RUN pnpm install --prod --ignore-scripts

WORKDIR /app/packages/mcp-http
CMD ["node", "dist/bin.js"]