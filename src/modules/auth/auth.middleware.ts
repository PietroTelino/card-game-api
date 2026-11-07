import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';
import { langOf, tr } from '../../i18n';

declare global {
  namespace Express { interface Request { user?: { id: string; name: string } } }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) { res.status(401).json({ error: tr(langOf(req), 'auth.loginRequired') }); return; }
  try {
    const p = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = { id: String(p.sub), name: String(p.name ?? '') };
    next();
  } catch {
    res.status(401).json({ error: tr(langOf(req), 'auth.sessionExpired') });
  }
}
