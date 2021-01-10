FROM node:current-alpine

WORKDIR /user/app
CMD ["npm", "start"]

COPY package*.json ./

ENV NODE_ENV=dev

RUN npm install

COPY . .
