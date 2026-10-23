import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from '../server/auth.js';
import { analyzeFlowImport, flowImportError } from '../server/flowImport.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await verifyFirebaseToken(req.headers.authorization, process.env.FIREBASE_PROJECT_ID);
    return res.status(200).json(await analyzeFlowImport(req.body || {}));
  } catch (error) {
    const failure = flowImportError(error);
    return res.status(failure.status).json({ error: failure.error });
  }
}
