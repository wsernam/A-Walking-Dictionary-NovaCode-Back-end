import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import deckRoutes from './routes/deckRoutes.js';
import tarjetaRoutes from './routes/tarjetaRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', routes);

// Rutas de mazos y tarjetas
app.use('/api/v1/decks', deckRoutes);
app.use('/api/v1/tarjetas', tarjetaRoutes);

export default app;