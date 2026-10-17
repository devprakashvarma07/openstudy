import type { VercelRequest, VercelResponse } from '@vercel/node';

const PW_API_BASE = 'https://api.penpencil.co';
const PW_TOKEN = process.env.PW_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTIyMzgzOTMsImV4cCI6MTc5Mjg0MzE5My42ODMsImRhdGEiOnsiX2lkIjoiNjY3YzJlNWQyODM4ZjgzNmVmZjhkODIyIiwidXNlcm5hbWUiOiI4NDM0OTY1MTk0IiwiZmlyc3ROYW1lIjoiRGV2IiwibGFzdE5hbWUiOiJWZXJtYSIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJlbWFpbCI6ImRldnByYWthc2h2YXJtYTIwMDdAZ21haWwuY29tIiwicm9sZXMiOlsiNWIyN2JkOTY1ODQyZjk1MGE3NzhjNmVmIl0sImNvdW50cnlHcm91cCI6IklOIiwib25lUm9sZXMiOltdLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJ3ZE1zWjlsRVM5dWx2RjJsUThWMnZnXzY2N2MyZTVkMjgzOGY4MzZlZmY4ZDgyMiJ9.hl4tQ0M6mk8RO4RXg0gkdq2S_UcanyGTkLyHlNEVjfY';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const page = (req.query.page as string) || '1';
  const limit = (req.query.limit as string) || '50';
  try {
    const pwRes = await fetch(`${PW_API_BASE}/v1/batches/list?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${PW_TOKEN}`, Accept: 'application/json', 'organizationid': '5eb393ee95fab7468a79d189' },
    });
    const data = await pwRes.json();
    res.status(pwRes.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
