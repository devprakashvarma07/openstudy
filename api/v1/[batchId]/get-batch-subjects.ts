import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BATCH_SNAPSHOT_MAP, loadSnapshot, liveFetch } from '../_snapshots';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const batchId = (req.query.batchId as string) || '';

  const prefix = BATCH_SNAPSHOT_MAP[batchId];
  const snap = prefix ? loadSnapshot(`${prefix}-subjects`) : null;
  if (snap?.data) return res.json({ success: true, data: snap.data });

  // No snapshot: bridge to the live PiMaxer gateway
  const live = await liveFetch(`/v1/${batchId}/get-batch-subjects`);
  if (live?.data) return res.json({ success: true, data: live.data });

  res.status(404).json({ success: false, message: 'No subjects for this batch' });
}
