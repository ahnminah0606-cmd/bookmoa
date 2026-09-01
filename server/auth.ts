import { createRemoteJWKSet, jwtVerify } from 'jose';

const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export async function verifyFirebaseToken(authorization: string | undefined, projectId?: string) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !projectId) throw new Error('UNAUTHORIZED');

  try {
    const { payload } = await jwtVerify(token, firebaseKeys, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    if (!payload.sub) throw new Error('Missing subject');
    return payload;
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}
