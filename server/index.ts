import express from 'express';
import cors from 'cors';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Load data from JSON files
function loadData(filename: string) {
  try {
    const data = JSON.parse(readFileSync(path.join(__dirname, '..', 'data', 'deltaverse', filename), 'utf-8'));
    return data;
  } catch {
    return { success: false, error: 'Data not found' };
  }
}

// AllBatches?page=1&limit=50
app.get('/api/AllBatches', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const data = loadData('allbatches.json');
  if (!data.data) return res.status(404).json(data);
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = data.data.slice(start, end);
  res.json({
    success: true,
    currentPage: page,
    totalPages: Math.ceil(data.data.length / limit),
    totalItems: data.data.length,
    data: items,
  });
});

// BatchInfo?BatchId=...&Type=details
app.get('/api/BatchInfo', (req, res) => {
  const batchId = req.query.BatchId as string;
  const type = req.query.Type as string || 'details';
  // Try individual file first, then batch_details.json
  let data = loadData(`batch_${batchId}.json`);
  if (!data._id) {
    const allDetails = loadData('batch_details.json');
    if (allDetails.data) {
      const found = allDetails.data.find((b: { _id: string }) => b._id === batchId);
      if (found) data = found;
    }
  }
  if (!data._id) return res.status(404).json({ success: false, error: 'Batch not found' });
  res.json({ success: true, data });
});

// Schedule?BatchId=...&SubjectId=...&ContentId=...
app.get('/api/Schedule', (req, res) => {
  const { BatchId, SubjectId, ContentId } = req.query;
  if (ContentId) {
    const data = loadData(`content_${ContentId}.json`);
    if (!data._id) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.json({ success: true, data });
  }
  if (BatchId && SubjectId) {
    const data = loadData(`schedule_${BatchId}_${SubjectId}.json`);
    if (!data.length) return res.status(404).json({ success: false, error: 'Schedule not found' });
    return res.json({ success: true, data });
  }
  if (BatchId) {
    const data = loadData(`schedule_${BatchId}.json`);
    if (!data.length) return res.status(404).json({ success: false, error: 'Schedule not found' });
    return res.json({ success: true, data });
  }
  res.status(400).json({ success: false, error: 'BatchId required' });
});

// ---- OpenStudy PiMaxer-style endpoints (snapshot-backed) ----
import { existsSync } from 'fs';

const SNAPDIR = path.join(__dirname, '..', 'data', 'snapshots');

// batchId -> snapshot file prefix (from data/snapshots/*.json)
const BATCH_SNAPSHOT_MAP: Record<string, string> = {
  '6a86ce9141c8c3630248cf70': 'jee-360',
  '68e66d8605d777b144ab65f4': 'arjuna-neet',
  '68e36ef824e961b6c51887df': 'safalta-uppsc',
  '68ed0a7345c2f03b29963dea': '10th-board',
  '68dfb42e2a945cdea79b67d6': 'sarv-pratham',
};

function loadSnapshot<T = any>(name: string): T | null {
  try {
    const file = path.join(SNAPDIR, `${name}.json`);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

let batchesCache: any[] | null = null;
function getBatches(): any[] {
  if (!batchesCache) {
    const snap = loadSnapshot<{ data?: any[] }>('batches');
    batchesCache = Array.isArray(snap?.data) ? snap!.data : [];
  }
  return batchesCache;
}

// GET /api/v1/batches?page=&limit=&search=
app.get('/api/v1/batches', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = ((req.query.search as string) || '').toLowerCase();
  const all = getBatches();
  const filtered = search
    ? all.filter(
        (b) =>
          (b.name || '').toLowerCase().includes(search) ||
          (b.slug || '').toLowerCase().includes(search) ||
          (b.class || '').toLowerCase().includes(search)
      )
    : all;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  res.json({
    success: true,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit) || 1,
    data: items,
  });
});

// GET /api/v1/:batchId/get-batch-subjects
app.get('/api/v1/:batchId/get-batch-subjects', (req, res) => {
  const prefix = BATCH_SNAPSHOT_MAP[req.params.batchId];
  const snap = prefix ? loadSnapshot<{ data?: any[] }>(`${prefix}-subjects`) : null;
  if (!snap?.data) return res.status(404).json({ success: false, error: 'No subjects snapshot for this batch' });
  res.json({ success: true, data: snap.data });
});

// GET /api/v1/:batchId/schedule — snapshots hold a flat lecture list, so let the
// frontend build the schedule from subjects (its documented fallback path).
app.get('/api/v1/:batchId/schedule', (_req, res) => {
  res.json({ success: true, data: [] });
});

// GET /api/v1/:batchId/subject/:subjectId/topics — single catch-all topic so
// BatchDetail shows every lecture under "All Lectures".
app.get('/api/v1/:batchId/subject/:subjectId/topics', (req, res) => {
  res.json({
    success: true,
    data: [{ _id: `${req.params.subjectId}_all`, name: 'All Lectures', slug: 'all-lectures' }],
  });
});

// GET /api/v1/contents?batchId=&subjectId=&page=&contentType=
app.get('/api/v1/contents', async (req, res) => {
  const batchId = req.query.batchId as string;
  const subjectId = req.query.subjectId as string;
  const prefix = BATCH_SNAPSHOT_MAP[batchId];
  const snap = prefix ? loadSnapshot<{ data?: any[] }>(`${prefix}-contents`) : null;
  if (snap?.data) {
    const search = ((req.query.search as string) || '').toLowerCase();
    const all = search ? snap.data.filter((c) => (c.topic || '').toLowerCase().includes(search)) : snap.data;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 500;
    return res.json({
      success: true,
      data: all.slice((page - 1) * limit, page * limit),
      paginate: { totalCount: all.length, page, limit },
    });
  }
  // No snapshot: bridge to the live PiMaxer gateway (penpencil-style v2 contents)
  if (batchId && subjectId) {
    try {
      const live = await fetch(
        `https://a.pimaxer.in/v2/batches/${batchId}/subject/${subjectId}/contents?tag=${encodeURIComponent(req.query.tag as string || '')}&contentType=${encodeURIComponent(req.query.contentType as string || 'videos')}&page=${req.query.page as string || '1'}`,
        { headers: { Accept: 'application/json' } }
      );
      if (live.ok) return res.json(await live.json());
    } catch { /* fall through to 404 */ }
  }
  res.status(404).json({ success: false, error: 'No contents snapshot for this batch' });
});

// ---- Legacy DeltaVerse endpoints ----
// ban-status
app.get('/api/ban-status', (_req, res) => {
  res.json({ success: true, banned: false, message: 'User is not banned' });
});

// guest/check-session
app.get('/api/guest/check-session', (_req, res) => {
  res.json({ success: true, loggedIn: false, message: 'No active session' });
});

// guest/create
app.post('/api/guest/create', (req, res) => {
  const { username, deviceId } = req.body;
  const guestId = `guest_${Date.now()}`;
  res.json({ success: true, guestId, message: 'Guest session created' });
});

// profile
app.get('/api/profile', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Guest User',
      email: '',
      phone: '',
      avatar: '',
    },
  });
});

// progress
app.get('/api/progress', (_req, res) => {
  res.json({ success: true, data: { completedLectures: 0, totalLectures: 0 } });
});

// todays-schedule
app.get('/api/todays-schedule', (_req, res) => {
  const data = loadData('todays_schedule.json');
  res.json({ success: true, data: data || [] });
});

// auth/serverInfo
app.get('/api/auth/serverInfo', (_req, res) => {
  res.json({
    success: true,
    server: 'Delta Verse Clone',
    version: '1.0.0',
    auth: 'guest',
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Delta Verse Clone API',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Delta Verse Clone API running on http://localhost:${PORT}`);
});
