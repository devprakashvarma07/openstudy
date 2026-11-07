import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import path from 'path';

function loadSnapshot(name: string): any | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'snapshots', `${name}.json`), 'utf-8'));
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '50', 10);
  const search = ((req.query.search as string) || '').toLowerCase();

  const snap = loadSnapshot('batches');
  const all: any[] = Array.isArray(snap?.data) ? snap.data : [];
  if (!all.length) return res.status(500).json({ success: false, message: 'batches snapshot unavailable' });

  const filtered = search
    ? all.filter((b) =>
        (b.name || '').toLowerCase().includes(search) ||
        (b.slug || '').toLowerCase().includes(search) ||
        (b.class || '').toLowerCase().includes(search)
      )
    : all;

  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  const total = filtered.length;
  res.json({
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: items,
  });
}
