// Shared helpers for snapshot-backed Vercel serverless endpoints.
// Files under data/snapshots are uploaded with the deployment,
// so serverless functions can read them from the lambda filesystem.

import { readFileSync } from 'fs';
import path from 'path';

export const BATCH_SNAPSHOT_MAP: Record<string, string> = {
  '6a86ce9141c8c3630248cf70': 'jee-360',
  '68e66d8605d777b144ab65f4': 'arjuna-neet',
  '68e36ef824e961b6c51887df': 'safalta-uppsc',
  '68ed0a7345c2f03b29963dea': '10th-board',
  '68dfb42e2a945cdea79b67d6': 'sarv-pratham',
};

export function loadSnapshot(name: string): any | null {
  try {
    const file = path.join(process.cwd(), 'data', 'snapshots', `${name}.json`);
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

export async function liveFetch(urlPath: string): Promise<any | null> {
  try {
    const res = await fetch(`https://a.pimaxer.in${urlPath}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
