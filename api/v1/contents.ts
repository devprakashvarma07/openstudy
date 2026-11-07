import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BATCH_SNAPSHOT_MAP, loadSnapshot, liveFetch } from '../_snapshots';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const batchId = req.query.batchId as string;
  const subjectId = req.query.subjectId as string;
  if (!batchId || !subjectId) return res.status(400).json({ success: false, message: 'batchId and subjectId required' });

  const prefix = BATCH_SNAPSHOT_MAP[batchId];
  const snap = prefix ? loadSnapshot(`${prefix}-contents`) : null;
  if (snap?.data) {
    return res.json({ success: true, data: snap.data });
  }

  // No snapshot: bridge to the live PiMaxer gateway (penpencil-style v2 contents)
  const contentType = encodeURIComponent((req.query.contentType as string) || 'videos');
  const tag = encodeURIComponent((req.query.tag as string) || '');
  const page = encodeURIComponent((req.query.page as string) || '1');
  const live = await liveFetch(`/v2/batches/${batchId}/subject/${subjectId}/contents?tag=${tag}&contentType=${contentType}&page=${page}`);
  if (live?.data) return res.json({ success: true, data: live.data });

  res.status(404).json({ success: false, message: 'No contents for this batch' });
}
