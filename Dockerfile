FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos solo package.json y package-lock.json primero para aprovechar la cache de Docker
COPY package*.json ./

# Instalamos dependencias (sin dev para producción; si te falta algo, cambia a `npm install`)
RUN npm ci --omit=dev

# Copiamos el resto del código
COPY . .

# Puerto en el que escucha tu app (bin/www usa 3000 por defecto)
EXPOSE 3000

# Comando de arranque
CMD ["node", "./bin/www"]
