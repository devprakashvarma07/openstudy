import type { VercelRequest, VercelResponse } from '@vercel/node';

const DELTA_API_BASE = 'https://pw.deltaverse.site';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const res2 = await fetch(`${DELTA_API_BASE}/api/ban-status`);
    const data = await res2.json();
    res.status(200).json({
      status: 'ok',
      service: 'OpenStudy API',
      version: 'v1',
      backend: 'Delta Verse',
      deltaStatus: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(200).json({
      status: 'ok',
      service: 'OpenStudy API',
      version: 'v1',
      backend: 'Delta Verse',
      timestamp: new Date().toISOString(),
    });
  }
}
