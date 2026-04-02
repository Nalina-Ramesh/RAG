import { verifyJwt } from '../utils/jwt.js';
import { ApiError } from '../utils/api-error.js';
import { User } from '../models/user.model.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw new ApiError(401, 'Unauthorized');

  const payload = verifyJwt(token);
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user) throw new ApiError(401, 'Invalid token user');

  req.user = user;
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, 'Forbidden');
  }
  next();
};

