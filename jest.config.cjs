//Indicamos donde se encuentran los test.
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  //Time out por si tarda el arranque de redis
  testTimeout: 30000
};