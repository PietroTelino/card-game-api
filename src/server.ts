import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';
const port = env.port;
app.listen(port, () => console.log(`API do jogo de cartas em http://localhost:${port}`));
