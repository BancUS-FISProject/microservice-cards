const { createClient } = require('redis'); //Importamos redis.
const logger = require('./logger');

const url = process.env.REDIS_URL || 'redis://localhost:6379'; //usamos la variable de entorno para conectarnos a REDIS


//Inicializamos
const client = createClient({ url });

//Loggeamos error si está instalado o ha dado error
client.on('error', (err) => {
  logger.error('Error en Redis', { error: err.message });
});

// Nos conectamos a redis.
async function initRedis() {
  if (!client.isOpen) {
    await client.connect();
    logger.info('Conectado a Redis', { url });
  }
}

module.exports = { client, initRedis };
