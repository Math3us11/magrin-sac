import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user.type.js';

export type AuthenticatedSession = {
  sessionId: number;
  user: AuthenticatedUser;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthenticatedSession;
};
