import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from '../server/auth.js';
import { quoteError } from '../server/bookQuotes.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    await verifyFirebaseToken(req.headers.authorization, process.env.FIREBASE_PROJECT_ID);
    return res.status(410).json({ error: '자동 문장 검색은 사용하지 않습니다. 책에서 문장을 직접 추가해 주세요.' });
  } catch (error) {
    console.error('Book quote lookup failed', error instanceof Error ? { name: error.name, message: error.message } : 'Unknown error');
    const failure = quoteError(error);
    return res.status(failure.status).json({ error: failure.error });
  }
}
