//Importamos supertest para hacer los test. También usaremos jest.
const request = require("supertest");

const app = require("../app"); 
/**
 * Estos test se realizan para comprobar el correcto funcionamiento de todos los endpoints de la API
 */

describe("Cards API - tests de integración de todos los endpoints", () => {
  let createdCardId;
  let createdCardholderName = "UserTest";
  let secondCardId;

  //Solo necesitamos el nombre del usuario para crear una tarjeta
  const cardPayload = {
    cardholderName: createdCardholderName,
  };

  const secondCardPayload = {
    cardholderName: "UserTestDelete",
  };


  //Creación de tarjeta. Probar POST.
  // POST /api/v1/cards
  describe("POST /api/v1/cards", () => {
    it("Crear tarjeta (201) y devolver el objeto creado", async () => {
      const res = await request(app)
        .post("/api/v1/cards")
        .send(cardPayload)
        .set("Accept", "application/json");
      //Esperamos recibir 200 OK y 201 Created
      expect([200, 201]).toContain(res.statusCode);

      //Comprobamos que tiene _id y que coincide el cardholdername
      expect(res.body).toHaveProperty("_id");
      expect(res.body).toHaveProperty("cardholderName", cardPayload.cardholderName);

      //Guardamos el id de la tarjeta para usar para realizar pruebas
      createdCardId = res.body._id;
    });

    it("Crear una segunda tarjeta para probar DELETE", async () => {
      const res = await request(app)
        .post("/api/v1/cards")
        .send(secondCardPayload)
        .set("Accept", "application/json");
      
      //Igual que con la anterior tarjeta
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("_id");
      expect(res.body).toHaveProperty("cardholderName", secondCardPayload.cardholderName);

      secondCardId = res.body._id;
    });

    it("Devolver 400 si falta el campo obligatorio cardholderName", async () => {
      const res = await request(app)
        .post("/api/v1/cards")
        .send({})
        .set("Accept", "application/json");

      expect(res.statusCode).toBe(400);
    });
  });


  //Listamos las tarjetas.
  //Probamos GET /api/v1/cards
  describe("GET /api/v1/cards", () => {
    it("Devolver la lista de tarjetas (200 OK) con un array", async () => {
      const res = await request(app).get("/api/v1/cards");
      
      //El código de estado debe ser el 200
      expect(res.statusCode).toBe(200);
      //Debe devolver un array
      expect(Array.isArray(res.body)).toBe(true);
      //El array debe contener, como mínimo, las dos tarjetas
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });


  //Listar todas las tarjetas de un usuario
  //GET /api/v1/cards/holder/:cardholderName
  describe("GET /api/v1/cards/holder/:cardholderName", () => {
    it("Devolver las tarjetas asociadas a un cardholderName concreto (200 OK)", async () => {
      const res = await request(app).get(
        `/api/v1/cards/holder/${encodeURIComponent(createdCardholderName)}`
      );

      //Debe devolver 200OK
      expect(res.statusCode).toBe(200);

      //Un usuario puede tener una tarjeta o varias
      //Tenemos que tener en cuenta que puede devolver un array
      if (Array.isArray(res.body)) {
        //Si es un array debe tener al menos 1 tarjeta
        expect(res.body.length).toBeGreaterThan(0);
        res.body.forEach(card => {
          if (card.cardholderName) {
            //Cada tarjeta listada debe tener el mismo cardholdername (el enviado en la petición)
            expect(card.cardholderName).toBe(createdCardholderName);
          }
        });
      } else {
        //Si es una única tarjeta, debe tener el mismo cardholderName
        expect(res.body).toHaveProperty("cardholderName", createdCardholderName);
      }
    });

    it("Devolver 404 si el usuario no tiene tarjetas", async () => {
      const res = await request(app).get(
        `/api/v1/cards/holder/${encodeURIComponent("NoUserHere")}`
      );
      expect(res.statusCode).toBe(404);
    });
  });


  //Listar una tarjeta dada su id
  //GET /api/v1/cards/:id
  describe("GET /api/v1/cards/:id", () => {
    it("Devolver la tarjeta dado su id (200)", async () => {
      const res = await request(app).get(`/api/v1/cards/${createdCardId}`);
      
      //Debe devolver 200 OK
      expect(res.statusCode).toBe(200);
      //Debe coincidir el id
      expect(res.body).toHaveProperty("_id", createdCardId);

    });

    it("debe devolver 404 o 400 si el id no existe", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app).get(`/api/v1/cards/${fakeId}`);

      expect([404, 400]).toContain(res.statusCode);
    });
  });


  //Actualizar una tarjeta por su id
  //PUT /api/v1/cards/:id  
  describe("PUT /api/v1/cards/:id", () => {
    it("Actualizar algunos campos de la tarjeta (200 o 204)", async () => {
      //Probamos a actualizar el estado de la tarjeta
      const updatedData = {
        cardFreeze: "frozen",  // La API lo normaliza a 'Frozen'
      };

      const res = await request(app)
        .put(`/api/v1/cards/${createdCardId}`)
        .send(updatedData)
        .set("Accept", "application/json");
      //Podemos recibir 200OK o 204 si solo tiene cuerpo.
      expect([200, 204]).toContain(res.statusCode);

      //Después de hacer la actualización, hacemos un get para comprobar que funciona
      const getRes = await request(app).get(`/api/v1/cards/${createdCardId}`);
      //Debe devolver 200 OK
      expect(getRes.statusCode).toBe(200);
      if (getRes.body.cardFreeze) {
        //Debe coincidir el estado modificado (normalizado)
        expect(getRes.body.cardFreeze).toBe("Frozen");
      }
    });
  });

  //Actualizar una tarjeta por su id
  //PUT /api/v1/cards/:cardholderName/:id
  describe("PUT /api/v1/cards/:cardholderName/:id", () => {
    it("Actualizar la tarjeta cuando coinciden nombre e id", async () => {
      const newStatus = "active";

      const res = await request(app)
        .put(
          `/api/v1/cards/${encodeURIComponent(createdCardholderName)}/${createdCardId}`
        )
        .send({ cardFreeze: newStatus })
        .set("Accept", "application/json");
      //Podemos recibir 200 OK o 204 si solo tiene cuerpo.
      expect([200, 204]).toContain(res.statusCode);
      //Después de hacer la actualización, hacemos un get para comprobar que funciona
      const getRes = await request(app).get(`/api/v1/cards/${createdCardId}`);
      expect(getRes.statusCode).toBe(200);
      if (getRes.body.cardFreeze) {
        //La API normaliza a 'Active'
        expect(getRes.body.cardFreeze).toBe("Active");
      }
    });

    it("Devolver 404 o 400 si el nombre no coincide con el id", async () => {
      const res = await request(app)
        .put(`/api/v1/cards/nombreFalso/${createdCardId}`)
        .send({ cardFreeze: "frozen" });

      expect([400, 404]).toContain(res.statusCode);
    });
  });

  //Actualizar status de una tarjeta
  // PUT /api/v1/cards/status/:id/:cardFreeze
  describe("PUT /api/v1/cards/status/:id/:cardFreeze", () => {
    it("Activar o desactivar el estado de la tarjeta", async () => {
      const res = await request(app)
        .put(`/api/v1/cards/status/${createdCardId}/frozen`)
        .set("Accept", "application/json");

      //Al hacer la llamada a la API devuelve la tarjeta, así que devemos recibir un código 200 OK
      expect([200, 204]).toContain(res.statusCode);

      //Podemos recibir 200OK o 204 si solo tiene cuerpo.
      const getRes = await request(app).get(`/api/v1/cards/${createdCardId}`);
      expect(getRes.statusCode).toBe(200);

      //Comprobamos que se ha guardado bien el valor normalizado
      if (getRes.body.cardFreeze !== undefined) {
        expect(getRes.body.cardFreeze).toBe("Frozen");
      }
    });

    it("Devolver 400 si se pasa un estado inválido", async () => {
      const res = await request(app)
        .put(`/api/v1/cards/status/${createdCardId}/badStatus`)
        .set("Accept", "application/json");

      expect(res.statusCode).toBe(400);
    });
  });

  //Eliminar una tarjeta por su id
  // DELETE /api/v1/cards/:id
  describe("DELETE /api/v1/cards/:id", () => {
    it("Eliminar la tarjeta secondCardId por id", async () => {
      const res = await request(app).delete(`/api/v1/cards/${secondCardId}`);
      //Al eliminar también recibimos 200 OK o 204.
      expect([200, 204]).toContain(res.statusCode);
    });
    //Probamos a eliminar de  nuevo la misma tarjeta
    it("Devolver 404 o 400 si se intenta borrar de nuevo por el mismo id", async () => {
      const res = await request(app).delete(`/api/v1/cards/${secondCardId}`);
      //Recibimos 404 o 400 si se intenta borrar la misma tarjeta
      expect([404, 400]).toContain(res.statusCode);
    });
  });

  //Eliminar una tarjeta por su id y nombre 
  // DELETE /api/v1/cards/:cardholderName/:id
  describe("DELETE /api/v1/cards/:cardholderName/:id", () => {
    it("Eliminar la tarjeta principal usando nombre e id", async () => {
      const res = await request(app).delete(
        `/api/v1/cards/${encodeURIComponent(createdCardholderName)}/${createdCardId}`
      );
      //Al eliminar también recibimos 200 OK o 204.
      expect([200, 204]).toContain(res.statusCode);
    });
    //Recibimos 404 o 400 si se intenta borrar la misma tarjeta
    it("Devolver 404 o 400 si el nombre no coincide con el id o ya está borrada", async () => {
      const res = await request(app).delete(
        `/api/v1/cards/${encodeURIComponent(createdCardholderName)}/${createdCardId}`
      );

      expect([404, 400]).toContain(res.statusCode);
    });
  });

  // GET /api/v1/ping/cache
    describe("GET /ping/cache", () => {
    it("Responder 200 OK si el servicio y la caché están OK", async () => {
      const res = await request(app).get("/ping/cache");

      expect([200, 204]).toHaveProperty("ok",true);

    });
  });
});
