import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BATCH_SNAPSHOT_MAP, loadSnapshot, liveFetch } from '../_snapshots';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ success: false, message: 'videoId required' });

  // Look through every contents snapshot for this video id
  for (const prefix of Object.values(BATCH_SNAPSHOT_MAP)) {
    const snap = loadSnapshot(`${prefix}-contents`);
    const item = (snap?.data || []).find((c: any) => c._id === videoId || c.videoDetails?._id === videoId);
    if (item) return res.json({ success: true, data: { ...item.videoDetails, ...item, _id: item._id, videoUrl: item.videoDetails?.videoUrl || item.url } });
  }

  // Live fallback
  const live = await liveFetch(`/v1/videos/${videoId}`);
  if (live) return res.json(live);

  res.status(404).json({ success: false, message: 'Video not found' });
}
