/**
 * @file server.js
 * @brief Punto de entrada del backend: carga variables de entorno y arranca el servidor HTTP.
 *
 * No contiene configuración de Express (eso vive en src/app.js) — este archivo solo se
 * encarga de levantar el proceso: cargar .env y poner al servidor a escuchar en un puerto.
 */

import 'dotenv/config';
import app from './src/app.js';

/** @brief Puerto en el que escucha el servidor HTTP. Viene de la variable de entorno PORT, o 5000 por defecto. */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
