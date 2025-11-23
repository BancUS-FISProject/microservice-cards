// cache.js
const { client } = require('./redisClient');
const logger = require('./logger');

// Leer JSON desde Redis
async function getJSON(key) {
  try {
    if (!client.isOpen) {
      logger.warn('cache.getJSON: cliente Redis no está conectado', { key });
      return null;
    }

    const data = await client.get(key);
    const hit = !!data;
    logger.debug('cache.getJSON', { key, hit });

    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    logger.error('Error cache getJSON', { key, error: err.message });
    return null;
  }
}

// Guardar JSON en Redis
async function setJSON(key, value, ttlSeconds) {
  try {
    if (!client.isOpen) {
      logger.warn('cache.setJSON: cliente Redis no está conectado', { key });
      return;
    }

    const payload = JSON.stringify(value);

    if (ttlSeconds) {
      await client.set(key, payload, { EX: ttlSeconds });
    } else {
      await client.set(key, payload);
    }

    logger.debug('cache.setJSON', { key, ttlSeconds: ttlSeconds || null });
  } catch (err) {
    logger.error('Error cache setJSON', { key, error: err.message });
  }
}

// Borrar claves por patrón, ej: 'cards:all' o 'cards:holder:*'
async function deleteByPattern(pattern) {
  try {
    if (!client.isOpen) {
      logger.warn('cache.deleteByPattern: cliente Redis no está conectado', { pattern });
      return;
    }

    const keys = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }

    if (keys.length === 0) {
      logger.debug('cache.deleteByPattern: no hay claves que borrar', { pattern });
      return;
    }

    await client.del(keys);
    logger.debug('cache.deleteByPattern: claves borradas', { pattern, count: keys.length });
  } catch (err) {
    logger.error('Error cache deleteByPattern', { pattern, error: err.message });
  }
}

module.exports = {
  getJSON,
  setJSON,
  deleteByPattern,
};
