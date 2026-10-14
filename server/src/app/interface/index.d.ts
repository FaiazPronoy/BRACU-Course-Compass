import { IUser } from '../modules/User/User.model';

declare global {
  namespace Express {
    interface Request {
      // set by the auth middleware; optionalAuth leaves it undefined for visitors
      user: IUser;
    }
  }
}
