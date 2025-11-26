//Definimos las acciones a realizar con la caché redis
const { client } = require('./redisClient');
const logger = require('./logger');

//Para traernos un JSON de la caché
async function getJSON(key) {
  
  try {
    //Comprobamos que el cliente con la caché está abierto
    if (!client.isOpen) {
      return null;
    }
    //Nos traemos el JSON
    const data = await client.get(key);

    if (!data) return null;
    //Parseamos el JSON
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
  //Añadimos TTL.  
  await client.set(key, payload, { EX: ttlSeconds });
    } else {
      await client.set(key, payload);
    }

  } catch (err) {
    logger.error('Error cache setJSON', { key, error: err.message });
  }
}


async function deleteByPattern(pattern) {
  //Cuando borramos, debemos borrar todos los datos que tengan un mismo patrón.
  //Esto se debe a que, cuando cambiamos un dato de un usuario, debemos borrar todos los datos de ese usuario.
  //Lo mismo cuando cambiamos los datos de una tarjeta por su id.
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