var express = require('express');
const { randomUUID } = require('crypto');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var logger = require('./logger');
const pingRouter = require("./routes/ping"); //Para hacer ping a la API en los tests
const swaggerUi = require("swagger-ui-express");//Para swagger.
const swaggerJsdoc = require("swagger-jsdoc");
var cors = require('cors'); //Para poder ver el frontend y conectarlo con la API

require('dotenv').config();
require('./db');

// Inicializamos Redis al arrancar la app
const { initRedis } = require('./redisClient');
initRedis();

var indexRouter = require('./routes/index');
var cardsRouter = require('./routes/cards');

var app = express();

// /health para saber si la API está funcionando correctamente
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint simple para probar la caché desde el frontend o tests
app.get('/ping/cache', async (req, res) => {
  res.status(200).json({ ok: true });
});

// Open API Specification
const swaggerDefinition = {
  openapi: "3.0.0", //versión 3.0.0
  info: {
    title: "Cards Service API",
    version: "1.0.0",
    description: "API para la gestión de tarjetas (cards-service)",
  },
  servers: [
    {
      url: "/v1",          // <-- coherente con app.use('/v1/...', ...)
      description: "API v1",
    },
  ],
};

//Opciones swagger, se indica donde están las anotaciones.
const swaggerOptions = {
  swaggerDefinition,
  apis: ["./routes/cards.js"], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
// en /api-docs se visualizará la la especificación OpenAPI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

//Definimos en cors donde está el frontend y lo que puede hacer
app.use(
  cors({
    origin: 'http://localhost:5173',       
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

//Para responder correctamente a cualquier options
app.options('*', cors());

// log con Morgan
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/v1/cards', cardsRouter); //Primero entra aquí
app.use("/v1", pingRouter);
app.use('/', indexRouter);

module.exports = app;
