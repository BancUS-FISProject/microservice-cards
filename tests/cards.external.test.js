
const fetchFn =
  global.fetch ||
  ((...args) => import('node-fetch').then(m => m.default(...args)));


const BASE_URL = process.env.CARDS_BASE_URL || 'http://127.0.0.1:3000';
const API_PREFIX = '/v1/cards';
const holderName = 'TestUserExternal';
let createdCardId = null;
let createdPAN = null;
let apiAvailable = true;

//Damos tiempo al servidor para que responda
jest.setTimeout(20000);

// Helper para hacer peticiones HTTP y parsear JSON de forma segura
async function http(method, path, body) {
  if (!apiAvailable) {
    // Si ya sabemos que no hay API, devolvemos un objeto vacío.
    return { status: 0, json: async () => ({}) };
  }

  try {
    const res = await fetchFn(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  } catch (err) {
    apiAvailable = false;
    //Como ya  ha fallado por la URL, mandamos este aviso 
    console.warn(
      `\n[EXTERNAL TESTS] No se ha podido conectar con ${BASE_URL}. ` +
        'Se omiten los tests externos (solo se ejecutan los internos).\n' +
        `Error: ${err}`
    );
    return { status: 0, json: async () => ({}) };
  }
}


function skipIfNoApi() {
  if (!apiAvailable) {
    console.warn(
      '[EXTERNAL TESTS] Servicio no disponible, este test externo se omite.'
    );
    return true;
  }
  return false;
}

describe('Cards API – tests externos (servicio real)', () => {
  it('POST /v1/cards crea una tarjeta nueva', async () => {
    const res = await http('POST', API_PREFIX, {
      cardholderName: holderName,
    });

    if (skipIfNoApi()) return;

    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body).toHaveProperty('_id');
    expect(body).toHaveProperty('PAN');
    expect(body).toHaveProperty('cardholderName', holderName);

    createdCardId = body._id;
    createdPAN = body.PAN;
  });

  it('GET /v1/cards devuelve 200 y un array que incluye la tarjeta creada', async () => {
    const res = await http('GET', API_PREFIX);

    if (skipIfNoApi()) return;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    const found = body.find(c => c._id === createdCardId);
    expect(found).toBeDefined();
  });

  it('GET /v1/cards/holder/:name devuelve las tarjetas del titular', async () => {
    const res = await http(
      'GET',
      `${API_PREFIX}/holder/${encodeURIComponent(holderName)}`
    );

    if (skipIfNoApi()) return;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some(c => c.cardholderName === holderName)).toBe(true);
  });

  it('PUT /v1/cards/status/:PAN/frozen cambia el estado a Frozen', async () => {
  const res = await http(
    'PUT',
    `${API_PREFIX}/status/${createdPAN}/frozen`
  );

  if (skipIfNoApi()) return;

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.cardFreeze).toBe('Frozen');
});

  it('PUT /v1/cards/status/:PAN/active vuelve a poner la tarjeta en Active', async () => {
    const res = await http(
      'PUT',
      `${API_PREFIX}/status/${createdPAN}/active`
    );

    if (skipIfNoApi()) return;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cardFreeze).toBe('Active');
});
  it('DELETE /v1/cards/pan/:PAN borra la tarjeta por PAN', async () => {
    const res = await http('DELETE', `${API_PREFIX}/pan/${createdPAN}`);

    if (skipIfNoApi()) return;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.PAN).toBe(createdPAN);
  });

  it('GET /v1/cards/:id devuelve 404 después del borrado', async () => {
    const res = await http('GET', `${API_PREFIX}/${createdCardId}`);

    if (skipIfNoApi()) return;

    expect(res.status).toBe(404);
  });
});
