var express = require('express');
const { randomUUID } = require('crypto');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var logger = require('./logger');

require('dotenv').config();
require('./db');

// Inicializamos Redis al arrancar la app
const { initRedis } = require('./redisClient');
initRedis();

var indexRouter = require('./routes/index');
var cardsRouter = require('./routes/cards');

var app = express();

//Middleware para requestId con log estructurado
//Middleware = software que hace de puente entre diferentes aplicaciones, bases de datos... Permitiendo su comunicación.
//En este caso comunica el microservicio con el logger.

app.use((req, res, next) => { // Se ejecuta para todas las peticiones
  // Tiempo de inicio de la petición
  const start = process.hrtime.bigint();

  const requestId = req.headers['x-request-id'] || randomUUID(); //si tiene un request-id se lo mantenemos, si no lo tiene se lo ponemos nosotros.
  req.requestId = requestId; // lo guardamos para usarlo en las rutas
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => { //cuando termina la respuesta, añadimos el log.
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1e6; //guardamos la duración.

    // time, level, service y env se añaden en logger.js automáticamente al llamar a logger.info, logger.error...
    logger.info('HTTP request', { //msg
      requestId,//id
      http: {
        method: req.method,//método http
        path: req.originalUrl,//path api
        status: res.statusCode,//Código de estado de la respuesta
        durationMs: Math.round(durationMs),//duración en Ms
      },
    });
  });

  next(); //pasar al siguiente middleware
});

// log con Morgan
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/v1/cards', cardsRouter);

module.exports = app;
