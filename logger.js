/*
Vamos a crear un log con este formato.
{
  "time": "2025-11-19T22:05:13.421Z",
  "level": "info",
  "service": "cards-service",
  "requestId": "9b4c4a6c-96bb-4de3-b664-4c9a196dc0ab",
  "msg": "Card created",
  "http": {
    "method": "POST",
    "path": "/api/v1/cards",
    "status": 201,
    "durationMs": 32
  },
  "user": {
    "id": "user-123"
  }
}

- Este formato es bastante útil para poder filtrar por servicio, level, user...
- No se incluyen en el log datos sensibles: PAN (solo 4 últimos dígitos), CVC...
*/

//definimos niveles
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const levelName = process.env.LOG_LEVEL || 'info'; //Tomamos info por defecto
const currentLevel = levels[levelName] ?? levels.info; //Tomamos info por defecto

const serviceName = process.env.SERVICE_NAME || 'cards-service';//Tomamos cards-service por defecto

// Tenemos que usar una máscara para cuando se muestre PAN y NUNCA mostrar CVC
function mascara_datos_sensibles(datos = {}) {
  const clon = { ...datos };

  //Enmascaramos PAN si se obtiene como parametro
  //Solo mostramos los 4 últimos digitos
  if (clon.PAN) {
    const s = String(clon.PAN);
    clon.PAN = '**** **** **** ' + s.slice(-4);
  }
  //Si no recibo directamente la tarjeta...
  if (clon.card && clon.card.PAN) {
    const s = String(clon.card.PAN);
    clon.card = {
      ...clon.card,
      PAN: '**** **** **** ' + s.slice(-4),
    };
  }

  // Nunca logueamos CVC
  if ('CVC' in clon) {
    delete clon.CVC;
  }
  //Si no recibo directamente la tarjeta...
  if (clon.card && 'CVC' in clon.card) {
    const { CVC, ...rest } = clon.card;
    clon.card = rest;
  }

  return clon;
}

//Creación de un log
function log(level, msg, meta) {
  if (levels[level] > currentLevel) return;

  //Cuando creamos un log no damos todos los datos.
  //Creamos automáticamente los datos de tiempo, nivel, servicio y mensaje
  const time = new Date().toISOString();
  const base = {
    time,
    level,
    service: serviceName,
    msg,
  };
  //tenemos que enmascarar los datos sensibles (PAN y CVC)
  const maskedMeta = meta ? mascara_datos_sensibles(meta) : undefined;
  const entry = maskedMeta ? { ...base, ...maskedMeta } : base; //añadimos los datos enmascarados a la base si los hay

  //Nuestro log será una única línea en JSON
  const line = JSON.stringify(entry); 

  //diferenciamos entre error/warn e info/debug
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
