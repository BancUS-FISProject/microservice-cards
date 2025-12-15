
const fetchFn = global.fetch;

const BASE_URL = process.env.CARDS_BASE_URL || '';
const API_PREFIX = '/v1/cards';

if (!BASE_URL) {
 
  console.warn(
    'Saltando tests externos de Cards: define CARDS_BASE_URL para ejecutarlos (ej.: http://localhost:3000)'
  );

  describe.skip('Cards API – tests externos (servicio real)', () => {});
} else {
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

    return { res, body: json, rawBody: text };
  }

  describe('Cards API – tests externos (servicio real)', () => {
    let createdCardId = null;
    let createdPAN = null;
    const holderName = 'TestUserExternal';

    it('POST /v1/cards crea una tarjeta nueva', async () => {
      const { res, body } = await http('POST', `${API_PREFIX}`, {
        cardholderName: holderName,
      });

      expect(res.status).toBe(201);
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('PAN');
      expect(body).toHaveProperty('cardholderName', holderName);

      createdCardId = body._id;
      createdPAN = body.PAN;
    });

    it('GET /v1/cards devuelve 200 y un array que incluye la tarjeta creada', async () => {
      const { res, body } = await http('GET', `${API_PREFIX}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((c) => c._id === createdCardId);
      expect(found).toBeDefined();
    });

    it('GET /v1/cards/holder/:name devuelve las tarjetas del titular', async () => {
      const { res, body } = await http(
        'GET',
        `${API_PREFIX}/holder/${encodeURIComponent(holderName)}`
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('PUT /v1/cards/status/:id/frozen cambia el estado a Frozen', async () => {
      const { res, body } = await http(
        'PUT',
        `${API_PREFIX}/status/${createdCardId}/frozen`
      );

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('cardFreeze', 'Frozen');
    });

    it('PUT /v1/cards/status/:id/active vuelve a poner la tarjeta en Active', async () => {
      const { res, body } = await http(
        'PUT',
        `${API_PREFIX}/status/${createdCardId}/active`
      );

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('cardFreeze', 'Active');
    });

    it('DELETE /v1/cards/pan/:PAN borra la tarjeta por PAN', async () => {
      const { res } = await http('DELETE', `${API_PREFIX}/pan/${createdPAN}`);

      expect(res.status).toBe(200);
    });

    it('GET /v1/cards/:id devuelve 404 después del borrado', async () => {
      const { res } = await http('GET', `${API_PREFIX}/${createdCardId}`);

      expect(res.status).toBe(404);
    });
  });
}
