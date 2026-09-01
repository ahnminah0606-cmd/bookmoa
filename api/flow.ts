import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateThoughtFlow, toPublicOpenAIError } from '../server/openai';
import { verifyFirebaseToken } from '../server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await verifyFirebaseToken(req.headers.authorization, process.env.FIREBASE_PROJECT_ID);
    const result = await updateThoughtFlow(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const publicError = toPublicOpenAIError(error);
    return res.status(publicError.status).json({ error: publicError.message });
  }
}
