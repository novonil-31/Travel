/**
 * ACCESS — Notifications Router
 * GET /notifications
 * POST /notifications/:id/read
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/response.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    sendSuccess(res, notifications, 200, {
      count: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true },
    });
    sendSuccess(res, { message: 'Marked as read' });
  } catch (e) {
    next(e);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, { markedRead: count });
  } catch (e) {
    next(e);
  }
});

export default router;
