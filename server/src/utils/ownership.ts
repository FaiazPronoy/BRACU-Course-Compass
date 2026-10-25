import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../errors/AppError';
import { IUser } from '../modules/user/user.model';

export const mustBeId = (id: string, what = 'That') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(httpStatus.NOT_FOUND, `${what} does not exist.`);
  }
};

export const isOwner = (doc: { author?: unknown; owner?: unknown }, user?: IUser) =>
  !!user && String(doc.author ?? doc.owner) === String(user._id);

export const assertCanEdit = (doc: { author?: unknown }, user: IUser) => {
  if (!isOwner(doc, user)) throw new AppError(httpStatus.FORBIDDEN, 'You can only edit what you wrote.');
};

export const assertCanDelete = (doc: { author?: unknown }, user: IUser) => {
  if (!isOwner(doc, user) && user.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only remove what you wrote.');
  }
};
