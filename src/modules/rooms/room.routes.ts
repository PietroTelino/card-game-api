import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware';
import { requireTutorial } from '../auth/tutorial.guard';
import * as rooms from './room.service';

export const roomRouter = Router();
roomRouter.use(authMiddleware);
const seat = (req: { user?: { id: string; name: string } }) => ({ userId: req.user!.id, name: req.user!.name });

roomRouter.get('/', (req, res) => { res.json(rooms.listRooms(req.user!.id)); });
roomRouter.post('/', async (req, res) => { await requireTutorial(req.user!.id); res.status(201).json(rooms.createRoom(seat(req))); });
roomRouter.get('/:code', (req, res) => { res.json(rooms.getRoom(req.params.code, req.user!.id)); });
roomRouter.post('/:code/join', async (req, res) => { await requireTutorial(req.user!.id); res.json(rooms.joinRoom(req.params.code, seat(req))); });
roomRouter.post('/:code/leave', (req, res) => { rooms.leaveRoom(req.params.code, req.user!.id); res.status(204).end(); });
roomRouter.post('/:code/start', async (req, res) => { res.json(await rooms.startRoom(req.params.code, req.user!.id)); });
