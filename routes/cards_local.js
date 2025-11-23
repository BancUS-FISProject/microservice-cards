// var express = require('express');
// var router = express.Router();

// // Detalles importantes.
// // -Cada tarjeta tiene un identificador único global y identificador para indicar si es su primera tarjeta, segunda tarjeta...
// // - AÑADIMOS TARJETAS DE CRÉDITO Y DÉBITO O SOLO DE DÉBITO????
// // -El nombre de la tarjeta debe ser el nombre del usuario
// // -El PAN debe generarse según el estándar de los bancos
// // -El código de seguridad debe generarse aleatoriamente
// // -La fecha de expiración debe ser el mes en el que se crea la tarjeta y el año el año del momento añadiendo 7 años más de validez.
// // -Dos tarjetas no pueden tener el mismo PAN.
// // -El PAN identifica a la tarjeta


// // API
// // -Listar todas las tarjetas
// // -Listar todas las tarjetas de un usuario
// // -Crear una tarjeta para un usuario
// // -Borrar la tarjeta de un usuario
// // -Bloquear la tarjeta de un usuario
// // -Desbloquear la tarjeta de un usuario

// // Para hacer llamadas en la API con espacios y tildes tenemos dos opciones: traducir directamente o añadir guiones en lugar de espacios y no permitir usas tildes.
// // Empezamos con la traducción directa
// cards=[
//   {"id":1, 
//   "cardId":1, 
//   "cardholderName":"Pablo Medinilla Mejías", 
//   "cardNumber (PAN)":1234567891234567,
//   "expirationDate":"11/32",
//   "securityCode (CVC)":123,
//   "cardFreeze":"Active"},

//   {"id":2,
//   "cardId":1,
//   "cardholderName":"Manolo", 
//   "cardNumber (PAN)":1234567891234567,
//   "expirationDate":"11/32",
//   "securityCode (CVC)":123,
//   "cardFreeze":"Active"},

//   {"id":3,
//     "cardId":1,
//   "cardholderName":"Alvaro Vigara Suárez", 
//   "cardNumber (PAN)":4839243298473294,
//   "expirationDate":"12/32",
//   "securityCode (CVC)":456,
//   "cardFreeze":"Active"},

//   {"id":4,
//   "cardId":2,
//   "cardholderName":"Manolo", 
//   "cardNumber (PAN)":9984838438438493,
//   "expirationDate":"3/33",
//   "securityCode (CVC)":789,
//   "cardFreeze":"Frozen"}
// ]

// //Acceder a los datos de las tarjetas.
// router.get('/', function(req,res,next){
//   res.send(cards)
// })

// router.get('/:name', function(req,res,next){
//   var cardholderName = req.params.name;
//   var card = cards.filter(c => {
//      return c.cardholderName === cardholderName
//   });

//   if (card){
//     res.send(card)
//   }else{
//     res.sendStatus(404)
//   }
// });
// //Creación de tarjetas

// router.post('/', function(req,res,next){
//   var card = req.body;
//   cards.push(card);
//   res.sendStatus(201);
// })

// //Borrado de tarjetas
// router.delete('/:id', function(req,res,next){
//   const id = parseInt(req.params.id, 10);
//   const index = cards.findIndex(c => c.id === id);

//   if(index === -1 || Number.isNaN(id)){
//     return res.sendStatus(404)
//   }

//   const deleted = cards.splice(index,1)[0];
//   res.send(deleted);
// });

// router.delete('/:cardholderName/:cardId', function(req,res,next){
//   const cardholderName = req.params.cardholderName;
//   const cardId = parseInt(req.params.cardId, 10);
//   const index = cards.findIndex(c => c.cardId === cardId && c.cardholderName===cardholderName);

//   if(index === -1 || Number.isNaN(cardId)){
//     return res.sendStatus(404)
//   }

//   const deleted = cards.splice(index,1)[0];
//   res.send(deleted);
// });
// //Actualizado de tarjetas
// router.put('/:id', function(req,res,next){
//   const id = parseInt(req.params.id, 10);
//   const index = cards.findIndex(c => c.id === id)

//   if(index ===-1 || Number.isNaN(id)){
//     return res.sendStatus(404)

//   }

//   cards[index] = {
//     ...cards[index],
//     ...req.body
//   }

//   res.send(cards[index])
// });


// router.put('/:cardholderName/:cardId', function(req,res,next){
//   const cardholderName = req.params.cardholderName;
//   const cardId = parseInt(req.params.cardId, 10);
//   const index = cards.findIndex(c => c.cardId === cardId && c.cardholderName === cardholderName)

//   if(index ===-1 || Number.isNaN(cardId)){
//     return res.sendStatus(404)

//   }

//   cards[index] = {
//     ...cards[index],
//     ...req.body
//   }

//   res.send(cards[index])
// });
// //Bloquear o desbloquear tarjetas
// router.put('/status/:id/:cardFreeze',function(req,res,next){
//   const id = parseInt(req.params.id,10)
//   const cardFreeze = (req.params.cardFreeze).toLowerCase()

//   if(Number.isNaN(id)){
//     return res.sendStatus(404)
//   }

//   if (cardFreeze !== 'active' && cardFreeze !== 'frozen'){
//     res.status(400).send({error:'Status must be "active" or "frozen"'})
//   }

//   const index = cards.findIndex(c=> c.id === id)

//   if(index===-1){
//     return res.sendStatus(404);
//   }

//   cards[index].cardFreeze=cardFreeze

//   res.send(cards[index]);
// })
// //Gestionar el límite de gasto de la tarjeta

// //Recibir una notificación a aceptar antes de hacer la compra y que pase a transacciones.
// /* GET users listing. */

// module.exports = router;
