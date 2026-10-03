FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
