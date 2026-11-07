import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../errors';
import { prisma } from '../../prisma';

type DbUser = { id: string; name: string; email: string; password: string };
const publicUser = (u: DbUser) => ({ id: u.id, name: u.name, email: u.email });

async function issueTokens(u: DbUser) {
  const accessToken = jwt.sign({ name: u.name }, env.jwtSecret, { subject: u.id, expiresIn: env.jwtExpiresIn });
  const refreshToken = jwt.sign({}, env.refreshSecret, { subject: u.id, expiresIn: env.refreshExpiresIn });
  await prisma.refreshToken.create({ data: { userId: u.id, token: refreshToken, expiresAt: new Date(Date.now() + env.refreshExpiresIn * 1000) } });
  return { user: publicUser(u), accessToken, refreshToken };
}

export async function register(name: unknown, email: unknown, password: unknown) {
  const n = String(name ?? '').trim(), em = String(email ?? '').trim().toLowerCase(), pw = String(password ?? '');
  if (n.length < 2 || n.length > 30) throw new HttpError(400, 'auth.nameLength');
  if (!/^\S+@\S+\.\S+$/.test(em)) throw new HttpError(400, 'auth.emailInvalid');
  if (pw.length < 6) throw new HttpError(400, 'auth.passwordShort');
  if (await prisma.user.findUnique({ where: { email: em } })) throw new HttpError(409, 'auth.emailTaken');
  const user = await prisma.user.create({ data: { name: n, email: em, password: await bcrypt.hash(pw, 10) } });
  return issueTokens(user);
}

export async function login(email: unknown, password: unknown) {
  const user = await prisma.user.findUnique({ where: { email: String(email ?? '').trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(String(password ?? ''), user.password))) throw new HttpError(401, 'auth.invalidCredentials');
  return issueTokens(user);
}

export async function refresh(token: unknown) {
  const t = String(token ?? '');
  try { jwt.verify(t, env.refreshSecret); } catch { throw new HttpError(401, 'auth.sessionExpired'); }
  const rec = await prisma.refreshToken.findUnique({ where: { token: t }, include: { user: true } });
  if (!rec || rec.revoked || rec.expiresAt < new Date()) throw new HttpError(401, 'auth.sessionExpired');
  await prisma.refreshToken.update({ where: { token: t }, data: { revoked: true } });
  return issueTokens(rec.user);
}

export async function logout(token: unknown) {
  await prisma.refreshToken.updateMany({ where: { token: String(token ?? '') }, data: { revoked: true } });
}

export async function me(id: string) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw new HttpError(404, 'auth.accountNotFound');
  return publicUser(u);
}
