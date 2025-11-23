// Este archivo se usa para definir cómo debe crearse una tarjeta en la base de datos.

//Los datos que se guardarán son:

// {
//     "card_id": Número de tarjeta del usuario. 1 si tiene 1, 2 si tiene 2...
//     "cardholderName": Nombre de usuario, lo tomamos del servicio
//     "PAN": Número PAN de la tarjeta,
//     "expirationDate": Fecha de expiración de la tarjeta,
//     "CVC": Código de seguridad,
//     "cardFreeze": Tarjeta activa,
//     "_id": id de la tarjeta,
//     "createdAt": fecha y hora de creación,
//     "updatedAt": fecha y hora de la última actualización,
//     "__v": 0
// }
const mongoose = require('../db');

//Esquema de una tarjeta
const cardSchema = new mongoose.Schema(
  {
    card_id: {
      type: String,
      required: true,//Obligatorio
    },
    cardholderName: {
      type: String,
      required: true,
      trim: true,
    },
    PAN: {
      type: String,
      required: true,
      unique: true, //No puede estar repetido
    },
    expirationDate: {
      type: String,
      required: true,
    },
    CVC: {
      type: String,
      required: true,
    },
    cardFreeze: {
      type: String,
      default: 'Active',//Por defecto activa
    },
  },
  {
    collection: 'cards', //La colección que tenemos en Atlas para acceder a ella
    timestamps: true, // Fecha y hora de creación y actualización.
  }
);

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
