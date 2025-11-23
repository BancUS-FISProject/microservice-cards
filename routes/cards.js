// Detalles importantes.
// -Cada tarjeta tiene un identificador único global y identificador para indicar si es su primera tarjeta, segunda tarjeta...
// - AÑADIMOS TARJETAS DE CRÉDITO Y DÉBITO O SOLO DE DÉBITO????
// -El nombre de la tarjeta debe ser el nombre del usuario
// -El PAN debe generarse según el estándar de los bancos
// -El código de seguridad debe generarse aleatoriamente
// -La fecha de expiración debe ser el mes en el que se crea la tarjeta y el año el año del momento añadiendo 7 años más de validez.
// -Dos tarjetas no pueden tener el mismo PAN.
// -El PAN identifica a la tarjeta


// API
// -Listar todas las tarjetas
// -Listar todas las tarjetas de un usuario
// -Crear una tarjeta para un usuario
// -Borrar la tarjeta de un usuario
// -Bloquear la tarjeta de un usuario
// -Desbloquear la tarjeta de un usuario

// Para hacer llamadas en la API con espacios y tildes tenemos dos opciones: traducir directamente o añadir guiones en lugar de espacios y no permitir usas tildes.
// Empezamos con la traducción directa


//Formato de la caché
// -Listar todas las tarjetas --> cards:all
// -Listar las tarjetas de un usuario --> cards:holder:<name>
// -Listar una tarjeta por su id --> cards:id:<id>

//Cambios en la caché
// - Al actualizar un elemento por Id, hacemos el cambio también en la caché porque no es necesario hacer una llamada a la base de datos.
// - Para mantener cards:all y cards:holder:name, en cada cambio de POST/PUT, tendríamos que leer la caché, aplicar el cambio y volver a guardarlo. El 
//   problema es que eso es practicamente lo mismo que invalidar la caché y dejar que el próximo get guarde todo. 
// - Por tanto, lo que realmente nos merece la pena es solo actualizar pequeños valores.
const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const logger = require('../logger');
const cache = require('../cache');

// Helper para normalizar el estado de la tarjeta. Lo usamos por si obtenemos un valor que no es válido.
function normalizarFreezeStatus(status) {
  if (!status) return undefined;
  const s = status.toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'frozen') return 'Frozen';
  return null; // inválido
}

//Método GET: Listar tarjetas

//Listar TODAS las tarjetas
//GET /api/v1/cards
router.get('/', async (req, res) => {
  const cacheKey  = 'cards:all';
  try{
    //Intentamos traer de la caché las tarjetas
    let cached = null;
    try {
      cached = await cache.getJSON(cacheKey);
    } catch (cacheErr) {
      logger.error('Error leyendo caché en GET /cards', { error: cacheErr.message });
    }
    if(cached){
      logger.debug('GET /cards desde caché Redis',{count:cached.length});
      return res.json(cached);
    }
    //Si hay nada en la caché, hacemos el GET a la base de datos
    logger.info('Listado de todas las tarjetas')
    const cards = await Card.find();
    try {
      await cache.setJSON(cacheKey ,cards); //Guardamos las tarjetas en la caché.
    } catch (cacheErr) {
      logger.error('Error escribiendo caché en GET /cards', { error: cacheErr.message });
    }
    res.json(cards);
  } catch (err) {
    logger.error('Error en GET /cards:', {err:err});
    res.sendStatus(500);
  }
});

//Listar todas las tarjetas de un usuario por nombre
//GET /api/v1/cards/holder/:cardholderName
router.get('/holder/:cardholderName', async (req, res) => {
  const cardholderName = req.params.cardholderName;

  try {
    //Definimos la clave e intentamos traernos las tarjetas del usuario de la caché
    const cacheKey = `cards:holder:${cardholderName}`;
    let cached = null;
    try {
      cached = await cache.getJSON(cacheKey);
    } catch (cacheErr) {
      logger.error('Error leyendo caché en GET /cards/holder', { error: cacheErr.message });
    }

    if (cached) {//Si está, no necesitamos hacer una petición a la base de datos
      logger.debug('GET /cards/holder desde caché', {
        cardholderName,
        count: cached.length,
      });
      return res.json(cached);
    }
    //Si no está, tenemos que hacer la petición a la base de datos.
    const cards = await Card.find({ cardholderName });

    //Si no hay tarjetas, lanzamos error
    if (!cards || cards.length === 0) {
      return res.sendStatus(404);
    }

    //Guardamos en la base de datos las tarjetas
    try {
      await cache.setJSON(cacheKey, cards);
    } catch (cacheErr) {
      logger.error('Error escribiendo caché en GET /cards/holder', { error: cacheErr.message });
    }
    logger.info('GET /cards/holder desde BD', {
      cardholderName,
      count: cards.length,
    });
    res.json(cards);
  } catch (err) {
    logger.error('Error en GET /cards/holder', { error: err.message });
    res.sendStatus(500);
  }
});

//Listar todas las tarjetas de un usuario por su id
//GET /api/v1/cards/:id
router.get('/:id', async (req, res) => {
  //Tomamos los parámetros de la URL
  const id = req.params.id;

  try {
    //Definimos la clave (card_<id>) y buscamos en la caché
    const cacheKey = `cards:id:${id}`;
    let cached = null;
    try {
      cached = await cache.getJSON(cacheKey);
    } catch (cacheErr) {
      logger.error('Error leyendo caché en GET /cards/:id', { error: cacheErr.message, id });
    }

    if (cached) {
      //Si está en la caché, lo devolvemos
      logger.debug('GET /cards/:id desde caché', { id });
      return res.json(cached);
    }

    //Si no está en la caché, hacemos la petición a la base de datos
    const card = await Card.findById(id);
    if (!card) {
      return res.sendStatus(404);
    }
    //Guardamos en la caché
    try {
      await cache.setJSON(cacheKey, card);
    } catch (cacheErr) {
      logger.error('Error escribiendo caché en GET /cards/:id', { error: cacheErr.message, id });
    }
    logger.info('GET /cards/:id desde BD', { id });
    res.json(card);
  } catch (err) {
    logger.error('Error en GET /cards/:id', { error: err.message, id });
    res.sendStatus(500);
  }
});


//Método POST: rear una tarjeta

//Helpers
//Genera un PAN de 16 dígitos tipo "4XXXXXXXXXXXXXXX" y comprueba que no exista
async function generarPanÚnico() {
  while (true) {
    let pan = '4'; //Indicamos con el primer dígito que es una tarjeta de débito
    for (let i = 0; i < 15; i++) {
      pan += Math.floor(Math.random() * 10);
    }

    //Nos aseguramos de que no existe otra tarjeta con ese PAN.
    const exists = await Card.exists({ PAN: pan });
    if (!exists) {
      return pan;
    }
    //Si existe, repetimos el bucle. Así, añadimos robustez.
  }
}

//Generamos el CVC con 3 digitos numéricos random
function generarCVC() {
  return String(Math.floor(100 + Math.random() * 900)); 
}

// Genera la fecha de caducidad (MM/YY) con +7 años
function generarFechaExpiracion() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String((now.getFullYear() + 7) % 100).padStart(2, '0');
  return `${month}/${year}`;
}

// Crear una tarjeta (equivalente al push del array)
// POST /api/v1/cards
// POST /api/v1/cards -> crear tarjeta
// Solo necesita cardholderName; el resto se genera automáticamente
router.post('/', async (req, res) => {
  const { cardholderName } = req.body;
  const requestId = req.requestId; //Tomamos el id de la petición para el logger

  logger.info('Petición para crear una tarjeta', {requestId, cardholderName});

  try {//Validamos que tenemos el nombre en el cuerpo de la petición, es el único valor externo que necesitamos.
    if (!cardholderName) {
      logger.warn('Falta cardholderName al crear tarjeta', {
        requestId,
        bodyKeys: Object.keys(req.body),
      });
      return res
        .status(400)
        .json({error: 'Falta el campo obligatorio cardholderName'});
    }

    //Contamos cuantas tarjetas tiene el usuario para generar el cardId
    const currentCount = await Card.countDocuments({cardholderName});
    const card_id = String(currentCount + 1); //1,2,3...

    //Generamos PAN, CVC y fecha de expiración según lo establecido en los helpers
    const PAN = await generarPanÚnico();
    const CVC = generarCVC();
    const expirationDate = generarFechaExpiracion();

    //Por defecto la tarjeta se crea activa
    const cardFreeze = 'Active';

    //Creamos la tarjeta
    const newCard = new Card({
      card_id,
      cardholderName,
      PAN,
      expirationDate,
      CVC,
      cardFreeze,
    });
    //Guardamos la tarjeta
    const savedCard = await newCard.save();
    //Guardamos la tarjeta
    try {
      await cache.setJSON(`cards:id:${savedCard._id}`, savedCard, 60);

      //Borramos las listas que están desactualizadas
      await cache.deleteByPattern('cards:all');
      await cache.deleteByPattern(`cards:holder:${cardholderName}`);
    } catch (cacheErr) {
      logger.error('Error actualizando caché tras crear tarjeta', {
        error: cacheErr.message,
        cardholderName,
      });
    }


    logger.info('Tarjeta creada con éxito', {
      requestId,
      cardholderName,
      card_id,
      id: savedCard._id.toString(),
      card: { PAN, CVC }, //PAN y CVC censurados
    });

    res.status(201).json(savedCard);
  } catch (err) {
    logger.error('Error creating card', { requestId, error: err.message });

    if (err.code === 11000) {
      //PAN duplicado por si acaso
      return res
        .status(400)
        .json({ error: 'Ya existe una tarjeta con ese PAN' });
    }

    res.sendStatus(500);
  }
});


// Ejemplo de log {"time":"2025-11-19T22:10:03.421Z","level":"info","service":"cards-service","env":"dev","msg":"Card created","requestId":"9b4c4a6c-96bb-4de3-b664-4c9a196dc0ab","cardholderName":"PruebaHost","card_id":"2","id":"67401234abcd5678ef901234","card":{"PAN":"**** **** **** 4444"}}

  

//Método PUT.

//Bloquear o desbloquear una tarjeta por id
// PUT /api/v1/cards/status/:id/:cardFreeze
router.put('/status/:id/:cardFreeze', async (req, res) => {
  logger.info('PUT /api/v1/cards/status/', {req: req.params.id});
  try {
    const id = req.params.id;
    const status = normalizarFreezeStatus(req.params.cardFreeze); //Nos aseguramos de haber obtenido un valor correcto

    if (!status) { //Si el valor no es correcto, devolvemos un error
      return res.status(400).json({error:'Status debe ser "active" o "frozen"'});
    }

    const updated = await Card.findByIdAndUpdate(
      id, //Encontramos por ID
      {$set: { cardFreeze: status }},//Actualizamos su valor
      {new: true}
    );

    if (!updated) { //Si no se puede actualizar el valor, devolvemos error
      return res.sendStatus(404);
    }
    //Hacemos lo mismo que en POST, actualizamos la tarjeta...
    try {
      await cache.setJSON(`cards:id:${id}`, updated, 60);

      //Borramos listas desactualizadas
      await cache.deleteByPattern('cards:all');
      await cache.deleteByPattern(`cards:holder:${updated.cardholderName}`);
    } catch (cacheErr) {
      logger.error('Error actualizando caché en PUT /cards/status', {
        error: cacheErr.message,
        id,
      });
    }

    res.json(updated);
  } catch (err) {
    logger.error('Error en PUT /cards/status:', {err:err});
    res.sendStatus(500);
  }
});


// Actualizar tarjeta por nombre + card_id
// PUT /api/v1/cards/user/:cardholderName/:cardId
router.put('/:cardholderName/:id', async (req, res) => {
  logger.info('PUT /api/v1/cards/', {cardholderName:req.params.cardholderName, id:req.params.id});
  try {
    const cardholderName = req.params.cardholderName;
    const id = req.params.id; 

    const updateData = { ...req.body };

    //Normalizamos valores en caso de que se vayan a actualizar
    if (updateData.card_id) updateData.card_id = String(updateData.card_id);
    if (updateData.PAN) updateData.PAN = String(updateData.PAN);
    if (updateData.CVC) updateData.CVC = String(updateData.CVC);
    if (updateData.cardFreeze) {
      const norm = normalizarFreezeStatus(updateData.cardFreeze);
      if (!norm) {
        return res.status(400).json({ error: 'cardFreeze debe ser "active" o "frozen"' });
      }
      updateData.cardFreeze = norm;
    }

    //Buscamos la tarjeta y la actualizamos
    const updated = await Card.findOneAndUpdate(
      { _id: id, cardholderName },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.sendStatus(404);
    }
    //Actualizamos caché
    try {
      await cache.setJSON(`cards:id:${id}`, updated, 60);

      //Borramos listas desactualizadas
      await cache.deleteByPattern('cards:all');
      await cache.deleteByPattern(`cards:holder:${updated.cardholderName}`);
    } catch (cacheErr) {
      logger.error('Error actualizando caché en PUT /cards/:cardholderName/:id', {
        error: cacheErr.message,
        id,
        cardholderName,
      });
    }

    res.json(updated);
  } catch (err) {
    logger.error('Error en PUT /cards/:cardholderName/:id:', {err:err});
    res.sendStatus(500);
  }
});


// Actualizar tarjeta por _id (equivalente al id global de antes)
// PUT /api/v1/cards/:id
router.put('/:id', async (req, res) => {
  logger.info('PUT /api/v1/cards/', {req:req.params.id});
  try {
    const id = req.params.id;
    const updateData = { ...req.body };
    //Hacemos lo mismo que en la anterior función
    if (updateData.card_id) updateData.card_id = String(updateData.card_id);
    if (updateData.PAN) updateData.PAN = String(updateData.PAN);
    if (updateData.CVC) updateData.CVC = String(updateData.CVC);
    if (updateData.cardFreeze) {
      const norm = normalizarFreezeStatus(updateData.cardFreeze);
      if (!norm) {
        return res.status(400).json({ error: 'cardFreeze debe ser "active" o "frozen"' });
      }
      updateData.cardFreeze = norm;
    }

    const updated = await Card.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.sendStatus(404);
    }
    //Actualizamos caché
    try {
      await cache.setJSON(`cards:id:${id}`, updated, 60);

      //Borramos listas desactualizadas
      await cache.deleteByPattern('cards:all');
      await cache.deleteByPattern(`cards:holder:${updated.cardholderName}`);
    } catch (cacheErr) {
      logger.error('Error actualizando caché en PUT /cards/:id', {
        error: cacheErr.message,
        id,
      });
    }

    res.json(updated);
  } catch (err) {
    logger.error('Error en PUT /cards/:id:', {err:err});
    res.sendStatus(500);
  }
});


//Método DELETE: borrado de tarjetas por id y por nombre + id

//Borrar la tarjeta de un usuario por nombre + card_id
//DELETE /api/v1/cards/:cardholderName/:cardId
router.delete('/:cardholderName/:id', async (req, res) => {
  logger.info(
    'DELETE /api/v1/cards/',{
      cardholderName:req.params.cardholderName,
      id:req.params.id}
  );

  try {
    const cardholderName = req.params.cardholderName;
    const id = req.params.id; //el id utilizado es el de mongoDB

    //Borramos la tarjeta si existe alguna con esos datos.
    const deleted = await Card.findOneAndDelete({ _id: id, cardholderName });

    //Devolvemos código de estado 404 si no se encuentra la tarjeta buscada
    if (!deleted) {
      return res.sendStatus(404);
    }
    //Borramos 
    try {
      await cache.deleteByPattern(`cards:id:${id}`);
      //Borramos las listas al no estar al día
      await cache.deleteByPattern('cards:all');
      await cache.deleteByPattern(`cards:holder:${deleted.cardholderName}`);
    } catch (cacheErr) {
      logger.error('Error actualizando caché en DELETE /cards/:cardholderName/:id', {
        error: cacheErr.message,
        id,
        cardholderName,
      });
    }
    res.json(deleted);
  } catch (err) {
    logger.error('Error en DELETE /cards/:cardholderName/:id:', {err:err});
    res.sendStatus(500);
  }
});



//Borrar tarjeta por _id 
//DELETE /api/v1/cards/:id
router.delete('/:id', async (req, res) => {
  logger.info('DELETE /api/v1/cards/',{req:req.params.id});
  try {
    const id = req.params.id;
    const deleted = await Card.findByIdAndDelete(id);
    //hacemos exactamente lo mismo que en la anterior función
    if (!deleted) {
      return res.sendStatus(404);
    }
    //Borramos 
    try {
      await cache.deleteByPattern(`cards:id:${id}`);
      //Borramos las listas al no estar al día
      await cache.deleteByPattern('cards:all');
      await cache.deleteByPattern(`cards:holder:${deleted.cardholderName}`);
    } catch (cacheErr) {
      logger.error('Error actualizando caché en DELETE /cards/:id', {
        error: cacheErr.message,
        id,
      });
    }
    res.json(deleted);
  } catch (err) {
    console.error('❌ Error en DELETE /cards/:id:', err);
    res.sendStatus(500);
  }
});


module.exports = router;
