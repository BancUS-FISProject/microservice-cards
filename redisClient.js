// redisClient.js
const { createClient } = require('redis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

logger.info('Configurando cliente Redis', { redisUrl });

const client = createClient({ url: redisUrl });

client.on('connect', () => {
  logger.info('Conectado a Redis', { url: redisUrl });
});

client.on('error', (err) => {
  logger.error('Error en Redis', { error: err.message, url: redisUrl });
});

// Esta función la usaremos desde app.js para asegurarnos de que se conecta
async function initRedis() {
  try {
    if (!client.isOpen) {
      logger.info('Inicializando conexión con Redis', { url: redisUrl });
      await client.connect();
      logger.info('Conexión a Redis establecida', { url: redisUrl });
    }
  } catch (err) {
    logger.error('No se ha podido conectar a Redis', { error: err.message, url: redisUrl });
  }
}

module.exports = {
  client,
  initRedis,
};
