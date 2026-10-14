import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification from './notification.model';

type Kind = 'review_comment' | 'answer' | 'accepted' | 'helpful';

// tell someone that another person replied to them; nobody is told about their own actions
export async function notify(
  to: mongoose.Types.ObjectId | string,
  from: { _id: mongoose.Types.ObjectId; name: string },
  kind: Kind,
  subject: string,
  link: string
) {
  if (String(to) === String(from._id)) return;
  await Notification.create({ user: to, actor: from.name, kind, subject, link });
}

export const listNotifications = async (req: Request, res: Response) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ items, unread });
};

export const readAll = async (req: Request, res: Response) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ unread: 0 });
};
