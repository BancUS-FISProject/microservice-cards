var express = require('express');
var router = express.Router();
const cache = require('../cache');

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get('/ping-cache', async function (req, res, next) {
  try {
    const key = 'test:ping';
    const value = {
      ok: true,
      time: new Date().toISOString(),
    };

    await cache.setJSON(key, value, 30); // 30 segundos

    const fromCache = await cache.getJSON(key);

    res.json({
      source: fromCache ? 'redis' : 'none',
      value: fromCache,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
