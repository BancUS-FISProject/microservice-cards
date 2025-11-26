//Importamos supertest para hacer los test. También usaremos jest.
const request = require("supertest");
const app = require("../app"); 
const mongoose = require('mongoose'); 
const { client: redisClient } = require('../redisClient');

//Estos test se centran en comprobar que la API funciona correctamente
describe("Cards service API", () => {
    //Con cada it hacemos una prueba.
    //La primera prueba consiste en que responde con 200 OK en /
  it("responde en la ruta raíz con 200 OK", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  });

  //En el endpoint /health obtenemos información sobre si el estado de la API
  //En esta prueba comprobamos si está funcionando correctamente
  it("expone un endpoint de salud /health o similar", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });
});

