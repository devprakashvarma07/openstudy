export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  latencyMs?: number;
}

export interface PreviewImage {
  baseUrl?: string;
  key?: string;
  name?: string;
}

export interface BatchItem {
  _id: string;
  class: string;
  completed_lectures_count?: number;
  total_lectures?: number;
  name: string;
  slug: string;
  status: string;
  byName?: string;
  language?: string;
  previewImage?: PreviewImage;
  streamtape_download_url?: string;
  price?: Record<string, unknown>;
}

export interface BatchesResponse {
  success: boolean;
  message?: string;
  total: number;
  page: number;
  limit: number;
  data: BatchItem[];
}

export interface TeacherInfo {
  _id: string;
  firstName: string;
  lastName: string;
  experience?: string;
  qualification?: string;
  featuredLine?: string;
  subject?: string;
  email?: string;
  imageId?: PreviewImage;
}

export interface BatchSubject {
  _id: string;
  subjectId: string;
  subjectName: string;
  status: string;
  teacherIds?: string[];
  isCopilotEnabled?: boolean;
}

export interface ScheduleSubjectItem {
  _id: string;
  subject: string;
  subjectId: string;
  description?: string;
  slug?: string;
  lectureCount?: number;
  tagCount?: number;
  isResources?: boolean;
  isCopilotEnabled?: boolean;
  teacherIds?: TeacherInfo[];
  imageId?: PreviewImage;
}

export interface TopicItem {
  _id: string;
  name: string;
  slug?: string;
}

export interface ContentLectureItem {
  _id: string;
  topic: string;
  urlType?: string;
  isLocked?: boolean;
  isFree?: boolean;
  url?: string;
  videoDetails?: {
    _id: string;
    id: string;
    name: string;
    videoUrl: string;
  };
}

export interface LectureNote {
  lectureId: string;
  batchId: string;
  batchName?: string;
  subjectId: string;
  subjectName?: string;
  lectureTitle: string;
  content: string;
  updatedAt: string;
}

export interface BookmarkItem {
  lectureId: string;
  batchId: string;
  batchName: string;
  subjectId: string;
  subjectName: string;
  lectureTitle: string;
  videoUrl: string;
  savedAt: string;
}
