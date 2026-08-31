// Punto de entrada del backend: carga variables de entorno y arranca el servidor HTTP.

import 'dotenv/config';
import app from './src/app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
