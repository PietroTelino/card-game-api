import 'dotenv/config';

const e = process.env;
export const databaseUrl = () =>
  e.DATABASE_URL ?? `postgresql://${e.DB_USER ?? 'postgres'}:${e.DB_PASSWORD ?? 'root'}@${e.DB_HOST ?? 'localhost'}:${e.DB_PORT ?? 5432}/${e.DB_NAME ?? 'card_game'}?schema=public`;

export const env = {
  port: Number(e.PORT ?? 3333),
  frontendUrl: e.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret: e.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: Number(e.JWT_EXPIRES_IN_SECONDS ?? 900),
  refreshSecret: e.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  refreshExpiresIn: Number(e.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 604800),
};
