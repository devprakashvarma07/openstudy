import type { VercelRequest, VercelResponse } from '@vercel/node';

// Snapshots hold a flat lecture list, so the frontend builds the schedule
// from subjects (its documented fallback path).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ success: true, data: [] });
}
