// db.js
require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./logger');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'cards_db'; //Si no tenemos el nombre de la base de datos, la añadimos nosotros

// if (!uri) {//Si no tenemos definida la uri, lanzamos error y cerramos el proceso
//   console.error('MONGODB_URI no está definida en .env');
//   process.exit(1);
// }

mongoose
  .connect(uri, { dbName })//Nos conectamos a la base de datos de tarjetas
  .then(() => {
    logger.info("Conectados a MongoDB Atlas", {dbName}) //Hacemos un log de conexión establecida
  })
  .catch((err) => { //En caso de error, informamos
    logger.error("No se ha podido establecer la conexión con MongoDB Atlas", {error:err.message})
    process.exit(1);
  });

//logs para saber qué base de datos y que colecciones se están usando.
mongoose.connection.on('connected', async () => { // Cuando nos conectamos...
  logger.info('Base de datos conectada', { //conexión establecida
    dbName: mongoose.connection.name,
  });

  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name); //listamos las colecciones.

    logger.info('Colecciones de la base de datos', {
      collections: collectionNames,
    });
  } catch (err) {
    logger.error('No se ha podido listar las colecciones', { //error al listar las conexiones.
      error: err.message,
    });
  }
});

module.exports = mongoose;
