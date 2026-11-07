import type { VercelRequest, VercelResponse } from '@vercel/node';

// Single catch-all topic so BatchDetail lists every lecture under "All Lectures".
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const subjectId = (req.query.subjectId as string) || '';
  res.json({
    success: true,
    data: [{ _id: `${subjectId}_all`, name: 'All Lectures', slug: 'all-lectures' }],
  });
}
