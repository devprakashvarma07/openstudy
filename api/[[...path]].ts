import type { VercelRequest, VercelResponse } from '@vercel/node';

const PW_API_BASE = 'https://api.penpencil.co';
const PW_TOKEN = process.env.PW_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTIyMzgzOTMsImV4cCI6MTc5Mjg0MzE5My42ODMsImRhdGEiOnsiX2lkIjoiNjY3YzJlNWQyODM4ZjgzNmVmZjhkODIyIiwidXNlcm5hbWUiOiI4NDM0OTY1MTk0IiwiZmlyc3ROYW1lIjoiRGV2IiwibGFzdE5hbWUiOiJWZXJtYSIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJlbWFpbCI6ImRldnByYWthc2h2YXJtYTIwMDdAZ21haWwuY29tIiwicm9sZXMiOlsiNWIyN2JkOTY1ODQyZjk1MGE3NzhjNmVmIl0sImNvdW50cnlHcm91cCI6IklOIiwib25lUm9sZXMiOltdLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJ3ZE1zWjlsRVM5dWx2RjJsUThWMnZnXzY2N2MyZTVkMjgzOGY4MzZlZmY4ZDgyMiJ9.hl4tQ0M6mk8RO4RXg0gkdq2S_UcanyGTkLyHlNEVjfY';

// CORS headers for all responses
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
}

// Fetch from PW API with token
async function fetchFromPW(endpoint: string): Promise<{ status: number; data: unknown }> {
  const url = `${PW_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PW_TOKEN}`,
      Accept: 'application/json',
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

// Health check
function handleHealth(res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    service: 'OpenStudy API',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
}

// GET /v1/batches?page=1&limit=50
async function handleBatches(req: VercelRequest, res: VercelResponse) {
  const page = (req.query.page as string) || '1';
  const limit = (req.query.limit as string) || '50';
  const { status, data } = await fetchFromPW(`/v3/batches?page=${page}&limit=${limit}`);
  res.status(status).json(data);
}

// GET /v1/{batchId}/get-batch-subjects
async function handleBatchSubjects(req: VercelRequest, res: VercelResponse, batchId: string) {
  const { status, data } = await fetchFromPW(`/v1/batches/${batchId}/subjects`);
  res.status(status).json(data);
}

// GET /v1/{batchId}/schedule
async function handleBatchSchedule(req: VercelRequest, res: VercelResponse, batchId: string) {
  const { status, data } = await fetchFromPW(`/v2/batches/${batchId}/schedule`);
  res.status(status).json(data);
}

// GET /v1/{batchId}/subject/{subjectId}/topics
async function handleSubjectTopics(req: VercelRequest, res: VercelResponse, batchId: string, subjectId: string) {
  const { status, data } = await fetchFromPW(`/v2/batches/${batchId}/subject/${subjectId}/topics`);
  res.status(status).json(data);
}

// GET /v1/{batchId}/subject/{subjectId}/contents
async function handleSubjectContents(req: VercelRequest, res: VercelResponse, batchId: string, subjectId: string) {
  const page = (req.query.page as string) || '1';
  const contentType = (req.query.contentType as string) || 'videos';
  const { status, data } = await fetchFromPW(`/v2/batches/${batchId}/subject/${subjectId}/contents?page=${page}&contentType=${contentType}`);
  res.status(status).json(data);
}

// GET /v1/videos/{videoId}
async function handleVideoDetails(req: VercelRequest, res: VercelResponse, videoId: string) {
  const { status, data } = await fetchFromPW(`/v1/videos/${videoId}`);
  res.status(status).json(data);
}

// GET /stream/{uuid}/video.mp4 — proxy video stream
async function handleStream(req: VercelRequest, res: VercelResponse, uuid: string) {
  const range = req.headers.range;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${PW_TOKEN}`,
  };
  if (range) headers.Range = range;

  const url = `${PW_API_BASE}/stream/${uuid}/video.mp4`;
  const upstream = await fetch(url, { headers });

  // Forward status and headers
  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type');
  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');
  const acceptRanges = upstream.headers.get('accept-ranges');

  if (contentType) res.setHeader('Content-Type', contentType);
  if (contentLength) res.setHeader('Content-Length', contentLength);
  if (contentRange) res.setHeader('Content-Range', contentRange);
  if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');

  // Stream the body
  if (upstream.body) {
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract path from URL (handles both /api/health and /api/v1/batches)
  const urlPath = req.url || '';
  // Remove /api prefix if present
  const fullPath = urlPath.replace(/^\/api/, '') || '/';
  // Also handle Vercel's query-based path routing
  const queryPath = (req.query.path as string[]) || [];
  const altPath = '/' + queryPath.join('/');
  // Use whichever gives a more specific path
  const finalPath = (altPath !== '/' && !urlPath.includes(altPath)) ? altPath : fullPath;

  try {
    // Health check
    if (finalPath === '/health') {
      return handleHealth(res);
    }

    // Batches listing
    if (finalPath.startsWith('/v1/batches')) {
      return await handleBatches(req, res);
    }

    // Stream proxy: /stream/{uuid}/video.mp4
    const streamMatch = finalPath.match(/^\/stream\/([^/]+)\/video\.mp4$/);
    if (streamMatch) {
      return await handleStream(req, res, streamMatch[1]);
    }

    // Video details: /v1/videos/{videoId}
    const videoMatch = finalPath.match(/^\/v1\/videos\/([^/]+)$/);
    if (videoMatch) {
      return await handleVideoDetails(req, res, videoMatch[1]);
    }

    // Batch subjects: /v1/{batchId}/get-batch-subjects
    const subjectsMatch = finalPath.match(/^\/v1\/([^/]+)\/get-batch-subjects$/);
    if (subjectsMatch) {
      return await handleBatchSubjects(req, res, subjectsMatch[1]);
    }

    // Batch schedule: /v1/{batchId}/schedule
    const scheduleMatch = finalPath.match(/^\/v1\/([^/]+)\/schedule$/);
    if (scheduleMatch) {
      return await handleBatchSchedule(req, res, scheduleMatch[1]);
    }

    // Subject topics: /v1/{batchId}/subject/{subjectId}/topics
    const topicsMatch = finalPath.match(/^\/v1\/([^/]+)\/subject\/([^/]+)\/topics$/);
    if (topicsMatch) {
      return await handleSubjectTopics(req, res, topicsMatch[1], topicsMatch[2]);
    }

    // Subject contents: /v1/{batchId}/subject/{subjectId}/contents
    const contentsMatch = finalPath.match(/^\/v1\/([^/]+)\/subject\/([^/]+)\/contents$/);
    if (contentsMatch) {
      return await handleSubjectContents(req, res, contentsMatch[1], contentsMatch[2]);
    }

    // 404 — route not found
    res.status(404).json({
      success: false,
      message: `Route not found: ${fullPath}`,
      availableRoutes: [
        '/health',
        '/v1/batches?page=1&limit=50',
        '/v1/{batchId}/get-batch-subjects',
        '/v1/{batchId}/schedule',
        '/v1/{batchId}/subject/{subjectId}/topics',
        '/v1/{batchId}/subject/{subjectId}/contents',
        '/v1/videos/{videoId}',
        '/stream/{uuid}/video.mp4',
      ],
    });
  } catch (err) {
    console.error('Gateway error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: String(err),
    });
  }
}
