// tests/cards.external.test.js
// Tests EXTERNOS: el servicio debe estar arrancado en http://localhost:3000
// (o en la URL que pongas en EXTERNAL_BASE_URL)

// Base URL del microservicio (puedes cambiarla con la variable de entorno)
const BASE_URL = process.env.EXTERNAL_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/v1/cards';

// Usamos fetch. En Node 20 ya es global; si no existiera, tiramos de node-fetch.
const fetchFn = global.fetch || require('node-fetch');

// Helper para hacer peticiones HTTP y parsear JSON de forma segura
async function http(method, path, body) {
  const res = await fetchFn(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, body: json, raw: res };
}

describe('Cards API – tests externos (servicio real)', () => {
  // Damos un poco más de tiempo porque hablamos con un servicio real
  jest.setTimeout(20000);

  const holderName = `TestUserExternal_${Date.now()}`;
  let createdCardId = null;
  let createdPAN = null;

  it('POST /v1/cards crea una tarjeta nueva', async () => {
    const res = await http('POST', `${API_PREFIX}`, {
      cardholderName: holderName,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('PAN');
    expect(res.body).toHaveProperty('cardholderName', holderName);
    expect(res.body).toHaveProperty('cardFreeze');

    createdCardId = res.body._id;
    createdPAN = res.body.PAN;
  });

  it('GET /v1/cards devuelve 200 y un array que incluye la tarjeta creada', async () => {
    const res = await http('GET', `${API_PREFIX}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find(c => c._id === createdCardId);
    expect(found).toBeDefined();
    expect(found.PAN).toBe(createdPAN);
  });

  it('GET /v1/cards/holder/:name devuelve las tarjetas del titular', async () => {
    const res = await http(
      'GET',
      `${API_PREFIX}/holder/${encodeURIComponent(holderName)}`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const found = res.body.find(c => c._id === createdCardId);
    expect(found).toBeDefined();
  });

  it('PUT /v1/cards/status/:id/frozen cambia el estado a Frozen', async () => {
    const res = await http(
      'PUT',
      `${API_PREFIX}/status/${createdCardId}/frozen`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cardFreeze', 'Frozen');
  });

  it('PUT /v1/cards/status/:id/active vuelve a poner la tarjeta en Active', async () => {
    const res = await http(
      'PUT',
      `${API_PREFIX}/status/${createdCardId}/active`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cardFreeze', 'Active');
  });

  it('DELETE /v1/cards/pan/:PAN borra la tarjeta por PAN', async () => {
    const res = await http(
      'DELETE',
      `${API_PREFIX}/pan/${createdPAN}`
    );

    // Tu API devuelve 200 con la tarjeta borrada
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id', createdCardId);
  });

  it('GET /v1/cards/:id devuelve 404 después del borrado', async () => {
    const res = await http('GET', `${API_PREFIX}/${createdCardId}`);
    expect(res.status).toBe(404);
  });
});
