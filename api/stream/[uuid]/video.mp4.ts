import type { VercelRequest, VercelResponse } from '@vercel/node';

const DELTA_API_BASE = 'https://pw.deltaverse.site';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { uuid } = req.query;
  const range = req.headers.range;
  const headers: Record<string, string> = {};
  if (range) headers.Range = range;

  try {
    const upstream = await fetch(`${DELTA_API_BASE}/stream/${uuid}/video.mp4`, { headers });
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    const cl = upstream.headers.get('content-length');
    const cr = upstream.headers.get('content-range');
    const ar = upstream.headers.get('accept-ranges');
    if (ct) res.setHeader('Content-Type', ct);
    if (cl) res.setHeader('Content-Length', cl);
    if (cr) res.setHeader('Content-Range', cr);
    if (ar) res.setHeader('Accept-Ranges', ar);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
