const { client } = require('./redisClient');
const logger = require('./logger');

//Redis usa un diccionario con claves que tienen como valor JSON para almacenamiento.
//Definimos funciones para crear el JSON y para parsear el JSON que nos traigamos de redis.
async function getJSON(key) {
  const data = await client.get(key);//Nos traemos el JSON a partir de su clave
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (err) {
    //loggeamos error
    logger.warn('Error parseando JSON desde Redis', { key, error: err.message });
    return null;
  }
}

//Podemos dar un tiempo de vida  al JSON que guardamos en redis, para optimizar el uso de redis.
async function setJSON(key, value, ttlSeconds) {
  const payload = JSON.stringify(value);

  //especificamos el tiempo de vida
  if (ttlSeconds) {
    await client.set(key, payload, { EX: ttlSeconds });
  } else {
    await client.set(key, payload);
  }
}

//En redis  vamos a guardar muchas claves del tipo --> cards:all, cards:holder:pablo, cards:reuu32423oi43op2
//Cuando hagamos un cambio (POST/PUT) en la base de datos, vamos a borrar todas las claves relacionadas. Por ejemplo: todas las que empiezan por cards:holder:pablo
//En redis no existe una función para borrar todas las claves que empiecen por X, sino que tiene una función para borrar claves dando su nombre completo
//Así que, vamos a recorrer las claves y borrar aquellas que coincidadn con un patrón (el inicio de la clave). Esto es lo que hace esta función.
async function deleteBypatron(patron) {
  const iter = client.scanIterator({ MATCH: patron, COUNT: 100 });//iteramos 100 y nos quedamos con las que hagan match con el patrón
  for await (const key of iter) {
    await client.del(key);//Borramos todas las que hemos recopilado antes.
  }
}

module.exports = {
  getJSON,
  setJSON,
  deleteBypatron,
};
