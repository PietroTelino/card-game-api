import { Router } from 'express';
import { authMiddleware } from './auth.middleware';
import * as auth from './auth.service';

export const authRouter = Router();
authRouter.post('/register', async (req, res) => { res.status(201).json(await auth.register(req.body?.name, req.body?.email, req.body?.password)); });
authRouter.post('/login', async (req, res) => { res.json(await auth.login(req.body?.email, req.body?.password)); });
authRouter.post('/refresh', async (req, res) => { res.json(await auth.refresh(req.body?.refreshToken)); });
authRouter.post('/logout', async (req, res) => { await auth.logout(req.body?.refreshToken); res.status(204).end(); });
authRouter.get('/me', authMiddleware, async (req, res) => { res.json(await auth.me(req.user!.id)); });
