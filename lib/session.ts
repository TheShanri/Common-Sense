import { redirect } from 'next/navigation';
import { getSessionTokenFromCookies, verifySessionToken } from './auth';
import { getUserById } from './storage';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload?.userId) {
    return null;
  }

  const user = await getUserById(payload.userId);
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
