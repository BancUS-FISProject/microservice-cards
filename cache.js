const { client } = require('./redisClient');
const logger = require('./logger');


async function getJSON(key) {
  try {
    if (!client.isOpen) {

      return null;
    }

    const data = await client.get(key);


    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    logger.error('Error cache getJSON', { key, error: err.message });
    return null;
  }
}


async function setJSON(key, value, ttlSeconds) {
  try {
    if (!client.isOpen) {

      return;
    }

    const payload = JSON.stringify(value);

 if (ttlSeconds) {
      await client.set(key, payload, { EX: ttlSeconds });
    } else {
      await client.set(key, payload);
    }


  } catch (err) {
    logger.error('Error cache setJSON', { key, error: err.message });
  }
}


async function deleteByPattern(pattern) {
  try {
    if (!client.isOpen) {
      logger.warn('cache.deleteByPattern: cliente Redis no está conectado', { pattern });
      return;
    }

    const keys = await client.keys(pattern);

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