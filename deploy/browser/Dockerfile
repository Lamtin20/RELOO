FROM mcr.microsoft.com/playwright:v1.64.0-noble
WORKDIR /lookup
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY service.mjs ./
ENV HOME=/tmp
USER 1000:1000
CMD ["node", "service.mjs"]
