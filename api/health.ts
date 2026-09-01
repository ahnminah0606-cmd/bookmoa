import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = { runtime: 'ok' };

  try {
    await import('openai');
    checks.openai = 'ok';
  } catch (error) {
    checks.openai = error instanceof Error ? error.message : 'failed';
  }

  try {
    await import('jose');
    checks.jose = 'ok';
  } catch (error) {
    checks.jose = error instanceof Error ? error.message : 'failed';
  }

  try {
    await import('../server/openai');
    checks.openaiModule = 'ok';
  } catch (error) {
    checks.openaiModule = error instanceof Error ? error.message : 'failed';
  }

  try {
    await import('../server/auth');
    checks.authModule = 'ok';
  } catch (error) {
    checks.authModule = error instanceof Error ? error.message : 'failed';
  }

  checks.openaiKey = process.env.OPENAI_API_KEY ? 'configured' : 'missing';
  checks.firebaseProject = process.env.FIREBASE_PROJECT_ID ? 'configured' : 'missing';
  return res.status(200).json(checks);
}
