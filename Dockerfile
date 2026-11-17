FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# dockers logs are not a terminal => colored logs have to be forced
ENV LOG_COLORS=true

CMD ["npm", "run", "start"]