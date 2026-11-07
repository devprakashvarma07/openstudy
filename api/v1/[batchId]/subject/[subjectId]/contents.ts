import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import path from 'path';

// batchId -> snapshot file prefix (from data/snapshots/*.json)
const BATCH_SNAPSHOT_MAP: Record<string, string> = {
  '6a86ce9141c8c3630248cf70': 'jee-360',
  '68e66d8605d777b144ab65f4': 'arjuna-neet',
  '68e36ef824e961b6c51887df': 'safalta-uppsc',
  '68ed0a7345c2f03b29963dea': '10th-board',
  '68dfb42e2a945cdea79b67d6': 'sarv-pratham',
};

function loadSnapshot(name: string): any | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'snapshots', `${name}.json`), 'utf-8'));
  } catch {
    return null;
  }
}

async function liveFetch(urlPath: string): Promise<any | null> {
  try {
    const res = await fetch(`https://a.pimaxer.in${urlPath}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const batchId = req.query.batchId as string;
  const subjectId = req.query.subjectId as string;
  if (!batchId || !subjectId) return res.status(400).json({ success: false, message: 'batchId and subjectId required' });

  const prefix = BATCH_SNAPSHOT_MAP[batchId];
  const snap = prefix ? loadSnapshot(`${prefix}-contents`) : null;
  if (snap?.data) return res.json({ success: true, data: snap.data });

  // No snapshot: bridge to the live PiMaxer gateway (penpencil-style v2 contents)
  const contentType = encodeURIComponent((req.query.contentType as string) || 'videos');
  const tag = encodeURIComponent((req.query.tag as string) || '');
  const page = encodeURIComponent((req.query.page as string) || '1');
  const live = await liveFetch(`/v2/batches/${batchId}/subject/${subjectId}/contents?tag=${tag}&contentType=${contentType}&page=${page}`);
  if (live?.data) return res.json({ success: true, data: live.data });

  res.status(404).json({ success: false, message: 'No contents for this batch' });
}
