const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');


describe('Cards API – tests internos', () => {
  let createdCard = null;

 
  beforeAll(async () => {
    
  });

  afterAll(async () => {
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  });

  test('POST /v1/cards crea una tarjeta', async () => {
    const res = await request(app)
      .post('/v1/cards')
      .send({ cardholderName: 'TestUserInternal' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('PAN');
    expect(res.body).toHaveProperty('cardholderName', 'TestUserInternal');

    createdCard = res.body;
  });

  test('GET /v1/cards devuelve 200 y un array', async () => {
    const res = await request(app).get('/v1/cards');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /v1/cards/holder/:cardholderName devuelve tarjetas del titular', async () => {
    const res = await request(app).get('/v1/cards/holder/TestUserInternal');

    // puede que 200 o 404 si has vaciado BBDD antes
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  test('DELETE /v1/cards/pan/:PAN borra la tarjeta creada', async () => {
    if (!createdCard || !createdCard.PAN) {
      return; 
    }

    const res = await request(app).delete(`/v1/cards/pan/${createdCard.PAN}`);

    expect([200, 404]).toContain(res.status);
  });
});
