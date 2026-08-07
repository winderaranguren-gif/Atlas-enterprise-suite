FROM node:22-alpine
WORKDIR /app
COPY server.js ./server.js
COPY providers.js ./providers.js
USER node
EXPOSE 4280
CMD ["node", "server.js"]
