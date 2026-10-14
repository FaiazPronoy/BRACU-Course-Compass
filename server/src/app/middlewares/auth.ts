import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import User from '../modules/User/User.model';

const tokenFrom = (req: Request) => {
  // the token is sent as a Bearer header, and also set as a cookie at login
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

// Middleware for protected routes. Pass roles to restrict further, e.g. auth('admin').
const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await userFrom(tokenFrom(req));
    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Please sign in first.');
    }

    // the role is read from the database rather than the token, so changing
    // someone's role takes effect without waiting for their token to expire
    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to do that.');
    }

    req.user = user;
    next();
  });
};

// for pages anyone can read, where a signed-in reader sees a little more
// (their own vote, whether they saved a course)
export const optionalAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await userFrom(tokenFrom(req));
  if (user) req.user = user;
  next();
});

export default auth;
