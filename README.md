# card-game-api

API do jogo de cartas cooperativo (modo PVE solo e multiplayer de até 4 jogadores), seguindo as **Regras - revisão 2**.

## Rodar

Precisa de um PostgreSQL rodando (o mesmo do based-turn-game serve, com outro banco).

```bash
npm install                 # também gera o cliente do Prisma
cp .env.example .env        # ajuste DB_* e os segredos JWT
npx prisma migrate dev --name init   # cria o banco card_game e as tabelas
npm run dev                 # http://localhost:3333
npm test         # simula 200 partidas completas e verifica as regras
```

## Rotas (todas em `/api`)

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/auth/register` | Cadastro (`name`, `email`, `password`) |
| POST | `/auth/login` | Login, devolve `accessToken` e `refreshToken` |
| POST | `/auth/refresh` | Troca o refresh token por tokens novos |
| POST | `/auth/logout` | Revoga o refresh token |
| GET | `/auth/me` | Conta logada |
| GET | `/catalog` | Heróis, cartas, criaturas e eventos |
| POST | `/games` | PVE solo |
| GET | `/games/:id` | Estado da partida (só para quem está nela) |
| POST | `/games/:id/actions` | Ação do jogador da vez (`pickHero` aceita `deckId`; sem ele usa o deck padrão) |
| GET | `/decks` | Decks do jogador |
| POST | `/decks` | Cria deck (`name`, `cards`: 10 ids; máx. 10 decks, 2 cópias, só cartas iniciais) |
| PUT | `/decks/:id` | Edita deck |
| DELETE | `/decks/:id` | Apaga deck |
| GET | `/rooms` | Salas abertas com vaga |
| POST | `/rooms` | Cria sala (código de 6 letras) |
| GET | `/rooms/:code` | A sala |
| POST | `/rooms/:code/join` | Entra (máximo 4) |
| POST | `/rooms/:code/leave` | Sai (se o anfitrião sair, o próximo vira anfitrião) |
| POST | `/rooms/:code/start` | Anfitrião começa a partida PVE com todos da sala |

As rotas de jogo e salas exigem `Authorization: Bearer <accessToken>`.
Contas ficam no banco; salas e partidas ficam em memória (reiniciar a API apaga as partidas em andamento).
Sem WebSocket: a tela consulta a sala e a partida a cada 1,5 s, como no based-turn-game.
Cada acontecimento da partida tem um número (`fx[].id`), e assim todos os jogadores veem as animações das jogadas dos outros.

## Onde mexer

- `src/game/data.ts`: todos os heróis, cartas, criaturas e eventos. Balanceamento é aqui.
- `src/game/engine.ts`: regras (draft, aparição pela ameaça, rodada, combate, recompensas, vitória e derrota).
