const express = require("express");
const router = express.Router();
const logger = require("../logger");
const cache = require("../cache");
const Card = require("../models/Card");

//Hacemos ping al servicio para comprobar que la API está funcionando correctamente.
//GET /api/v1/ready
//Solo comprueba que el proceso este activo
router.get("/ready", (req, res) => {
  return res.status(200).json({
    ok: true,
    status: "UP",
  });
});



//Hacemos ping a la caché
//GET /api/v1/ping/cache


router.get("/ping/cache", async (req, res) => {
  const key = "health:cache:test";

  try {
    // Escribimos en caché y si podemos leerlo, entonces está funcionando correctamente
    await cache.setJSON(key, { ok: true, ts: Date.now() }, 5);
    const value = await cache.getJSON(key);

    // Si el valor no coincide significa que algo ha ido mal
    if (!value || value.ok !== true) {
      logger.error("PING /ping/cache valor inesperado en caché", { value });
      return res.status(500).json({ ok: false, cache: "error" });
    }

    // Si todo ha ido bien, devolvemos 200 OK
    logger.info("PING /ping/cache OK");
    return res.status(200).json({ ok: true, cache: "ok" });
  } catch (err) {
    // Devolvemos error en caso de que haya habido un error
    logger.error("Error en PING /ping/cache", { error: err.message });
    return res.status(500).json({ ok: false, cache: "error" });
  }
});



//Hacemos ping a /health para comprobar la salud de la API.
//GET /api/v1/health
//Se usa para saber si el pod puede recibir tráfico 
router.get("/health", async (req, res) => {
  // Para ello, comprobamos que la base de datos y la caché funcionan correctamente
  let dbOk = false;
  let cacheOk = false;

  // Comprobamos el estado de la base de datos
  try {
    await Card.estimatedDocumentCount().exec();
    dbOk = true;
  } catch (err) {
    logger.error("Error comprobando salud de MongoDB en /health", {
      error: err.message,
    });
  }

  // Comprobamos que la caché funciona bien
  // Hacemos lo mismo que en el anterior endpoint
  const key = "health:cache:healthcheck";
  try {
    await cache.setJSON(key, { ok: true, ts: Date.now() }, 5);
    const value = await cache.getJSON(key);

    if (value && value.ok === true) {
      cacheOk = true;
    } else {
      logger.error("Valor inesperado en caché en /health", { value });
    }
  } catch (err) {
    logger.error("Error comprobando salud de caché en /health", {
      error: err.message,
    });
  }

  // Si funcionan ambos --> 200 OK
  // En caso contrario --> 500
  const allOk = dbOk && cacheOk;
  const statusCode = allOk ? 200 : 500;

  return res.status(statusCode).json({
    ok: allOk,
    db: dbOk ? "ok" : "error",
    cache: cacheOk ? "ok" : "error",
  });
});

module.exports = router;
