import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export async function verifyFirebaseToken(authorization: string | undefined, projectId?: string) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !projectId) throw new Error('UNAUTHORIZED');

  if (getApps().length === 0) initializeApp({ projectId });

  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}
