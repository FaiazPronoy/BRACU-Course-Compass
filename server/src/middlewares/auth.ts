import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import User from '../modules/user/user.model';

const tokenFrom = (req: Request) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.authToken;
};

const userFrom = async (token?: string) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, config.jwt_access_secret!) as JwtPayload;
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
};

const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await userFrom(tokenFrom(req));
    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Please sign in first.');
    }

    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to do that.');
    }

    req.user = user;
    next();
  });
};

export const optionalAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await userFrom(tokenFrom(req));
  if (user) req.user = user;
  next();
});

export default auth;
