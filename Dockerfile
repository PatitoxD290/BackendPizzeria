# Usar una imagen oficial de Node.js (versión 18 es estable)
FROM node:18

# Crear el directorio de trabajo en la nube
WORKDIR /usr/src/app

# Copiar el package.json y el package-lock.json
COPY package*.json ./

# Instalar las dependencias (solo las de producción para que sea ligero)
RUN npm install --only=production

# Copiar el resto del código de tu proyecto
COPY . .

# Exponer el puerto (aunque Cloud Run lo maneja automático, es buena práctica)
EXPOSE 3000

# El comando para iniciar tu app (debe coincidir con tu package.json)
CMD ["npm", "start"]