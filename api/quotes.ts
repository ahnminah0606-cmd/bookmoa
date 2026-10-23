import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from '../server/auth.js';
import { findBookQuotes, quoteError } from '../server/bookQuotes.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    await verifyFirebaseToken(req.headers.authorization, process.env.FIREBASE_PROJECT_ID);
    return res.status(200).json({ quotes: await findBookQuotes(req.body || {}) });
  } catch (error) {
    const failure = quoteError(error);
    return res.status(failure.status).json({ error: failure.error });
  }
}
