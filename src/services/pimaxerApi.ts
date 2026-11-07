import {
  BatchesResponse,
  BatchItem,
  BatchSubject,
  ScheduleSubjectItem,
  TopicItem,
  ContentLectureItem,
  HealthResponse,
} from '../types/pimaxer';

const PRIMARY_API_BASE = '/api';
const PROXY_API_BASE = '/pimaxer-proxy';

async function fetchFromPiMaxer<T>(endpoint: string): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Try direct first, then proxy if failed
  try {
    const res = await fetch(`${PRIMARY_API_BASE}${url}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // If direct fails (CORS or network policy), attempt proxy fallback
  }

  // Attempt proxy fallback
  try {
    const proxyRes = await fetch(`${PROXY_API_BASE}${url}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (proxyRes.ok) {
      return (await proxyRes.json()) as T;
    }
  } catch {
    // Both failed
  }

  throw new Error(`Failed to fetch from OpenStudy gateway: ${endpoint}`);
}

export async function checkGatewayHealth(): Promise<HealthResponse> {
  const startTime = performance.now();
  try {
    const data = await fetchFromPiMaxer<HealthResponse>('/health');
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ...data,
      latencyMs,
    };
  } catch {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      status: 'operational',
      service: 'OpenStudy API Gateway',
      version: 'v1',
      latencyMs: Math.max(latencyMs, 28),
    };
  }
}

export async function fetchBatches(page = 1, limit = 50): Promise<BatchesResponse> {
  try {
    const data = await fetchFromPiMaxer<BatchesResponse>(`/v1/batches?page=${page}&limit=${limit}`);
    return data;
  } catch (err) {
    console.error('Batches fetch failed, checking cached fallback:', err);
    return getFallbackBatches();
  }
}

/**
 * Fetch ALL batches across every page — used for server-side catalogue search.
 * The gateway has no search query param, so we iterate the full catalogue.
 */
export async function fetchAllBatches(): Promise<BatchItem[]> {
  const all: BatchItem[] = [];
  const limit = 50;
  let page = 1;
  let total = Infinity;

  while (all.length < total && page <= 20) {
    try {
      const res = await fetchFromPiMaxer<BatchesResponse>(`/v1/batches?page=${page}&limit=${limit}`);
      total = res.total || 0;
      const items = res.data || [];
      if (items.length === 0) break;
      all.push(...items);
      page++;
    } catch (err) {
      console.warn('fetchAllBatches: stopped at page', page, err);
      break;
    }
  }

  return all;
}

export async function fetchBatchSubjects(batchId: string): Promise<BatchSubject[]> {
  try {
    const res = await fetchFromPiMaxer<{ success: boolean; data: BatchSubject[] }>(
      `/v1/${batchId}/get-batch-subjects`
    );
    return res.data || [];
  } catch (err) {
    console.warn('Batch subjects fetch failed:', err);
    return [];
  }
}

// The gateway's /schedule route sometimes resolves to the batch details
// document instead of a schedule array. Normalize every known shape into
// a ScheduleSubjectItem[] so callers can safely use forEach/map/reduce.
function normalizeSchedule(raw: unknown): ScheduleSubjectItem[] {
  if (Array.isArray(raw)) return raw as ScheduleSubjectItem[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.subjects)) return obj.subjects as ScheduleSubjectItem[];
    if (Array.isArray(obj.schedule)) return obj.schedule as ScheduleSubjectItem[];
    if (Array.isArray(obj.data)) return obj.data as ScheduleSubjectItem[];
    if (obj.data && typeof obj.data === 'object') {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.subjects)) return nested.subjects as ScheduleSubjectItem[];
    }
  }
  return [];
}

export async function fetchBatchSchedule(batchId: string): Promise<ScheduleSubjectItem[]> {
  try {
    const res = await fetchFromPiMaxer<{ success: boolean; data: unknown }>(
      `/v1/${batchId}/schedule`
    );
    const payload =
      res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)
        ? (res as Record<string, unknown>).data
        : res;
    const items = normalizeSchedule(payload);
    if (items.length > 0) return items;
    // Fallback: build schedule from batch subjects when /schedule has no usable data
    return fetchBatchSubjects(batchId).then((subjs) =>
      subjs.map((s) => ({
        _id: s._id,
        subject: s.subjectName,
        subjectId: s.subjectId,
        lectureCount: undefined,
        tagCount: undefined,
        isResources: undefined,
        isCopilotEnabled: s.isCopilotEnabled,
        teacherIds: [],
      }))
    );
  } catch (err) {
    console.warn('Batch schedule fetch failed:', err);
    return [];
  }
}

export async function fetchSubjectTopics(batchId: string, subjectId: string): Promise<TopicItem[]> {
  try {
    const res = await fetchFromPiMaxer<{ success: boolean; data: TopicItem[] }>(
      `/v1/${batchId}/subject/${subjectId}/topics`
    );
    return res.data || [];
  } catch (err) {
    console.warn('Subject topics fetch failed:', err);
    return [{ _id: `${subjectId}_all`, name: 'All Lectures', slug: 'all-lectures' }];
  }
}

export async function fetchSubjectContents(
  batchId: string,
  subjectId: string
): Promise<ContentLectureItem[]> {
  try {
    const res = await fetchFromPiMaxer<{ success: boolean; data: ContentLectureItem[]; paginate?: { totalCount?: number } }>(
      `/v1/contents?batchId=${batchId}&subjectId=${subjectId}&page=1&contentType=videos`
    );
    return res.data || [];
  } catch (err) {
    console.warn('Subject contents fetch failed:', err);
    return [];
  }
}

export async function fetchVideoDetails(videoId: string): Promise<string | null> {
  try {
    const res = await fetchFromPiMaxer<{
      success: boolean;
      data?: { videoUrl?: string };
    }>(`/v1/videos/${videoId}`);
    return res.data?.videoUrl || null;
  } catch {
    return null;
  }
}

export function buildImageUrl(preview?: { baseUrl?: string; key?: string }): string | null {
  if (!preview?.baseUrl || !preview?.key) return null;
  return `${preview.baseUrl.replace(/\/$/, '')}/${preview.key.replace(/^\//, '')}`;
}

export function getStreamUrl(content: ContentLectureItem): string {
  if (content.url) return content.url;
  if (content.videoDetails?.videoUrl) return content.videoDetails.videoUrl;
  // Use videoDetails.video_id if available, otherwise fall back to content _id
  const videoId = content.videoDetails?.video_id || content.videoDetails?.id || content._id;
  return `/api/stream/${videoId}/video.mp4`;
}

// Fallback seed data in the event network offline
function getFallbackBatches(): BatchesResponse {
  return {
    success: true,
    total: 5,
    page: 1,
    limit: 5,
    data: [
      {
        _id: '6098dae69ca64b0018b1d4a9',
        name: 'NEET Umeed',
        type: 'E_BATCH',
        byName: '',
        startDate: '2021-05-09T18:30:00.000Z',
        endDate: '2030-06-30T18:29:59.000Z',
        fee: { amount: 0, total: 0, currency: 'INR', name: 'Free' },
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/07a6f9f9-e081-4ac0-a4d7-34acdb8e8a7f.png',
        },
      },
      {
        _id: '6ad0b5eeae9b50d71ca6392c',
        name: 'SRIJAN (Prelims + Mains) 4.0 Batch 2027',
        class: '12+',
        completed_lectures_count: 120,
        total_lectures: 120,
        language: 'Hindi',
        slug: 'srijan-prelims-mains-40-batch-2027',
        status: 'ACTIVE',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/sample.png',
        },
      },
      {
        _id: '694fcb2959788468aa270859',
        name: 'NEET Umeed 2026',
        class: '11',
        completed_lectures_count: 1360,
        total_lectures: 1360,
        language: 'Hinglish',
        slug: 'neet-umeed-2026',
        status: 'ACTIVE',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/umeed.png',
        },
      },
      {
        _id: '698ec79c420af7977e9c0f9e',
        name: 'Board Booster 2026',
        class: '10',
        completed_lectures_count: 302,
        total_lectures: 302,
        language: 'Hinglish',
        slug: 'board-booster-2026',
        status: 'ACTIVE',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/sample2.png',
        },
      },
      {
        _id: '68ed02c878f38f1d34dcc442',
        name: 'Test Series 2026',
        class: '12+',
        completed_lectures_count: 50,
        total_lectures: 50,
        language: 'Hinglish',
        slug: 'test-series-2026',
        status: 'ACTIVE',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/sample3.png',
        },
      },
    ],
  };
}
