import {
  CONTENT_EVENT_TYPE_UPLOAD_REQUEST,
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";

export type MediaUploadPhase = "init" | "append" | "finalize" | "processing";

export interface MediaUploadProgress {
  requestId: string;
  phase: MediaUploadPhase;
  uploadedBytes: number;
  totalBytes: number;
  progress: number;
  chunkIndex?: number;
  chunkCount?: number;
  checkAfterSecs?: number;
  processingState?: string;
}

export interface MediaUploadResult {
  mediaId: string;
  mediaIdString: string;
  mediaKey?: string;
  size?: number;
  expiresAfterSecs?: number;
  image?: {
    w?: number;
    h?: number;
    imageType?: string;
  } | null;
  video?: {
    videoType?: string;
  } | null;
  processingInfo?: {
    state?: string;
    progressPercent?: number;
  } | null;
}

interface UploadSuccessPayload {
  requestId: string;
  data: MediaUploadResult;
}

interface UploadErrorPayload {
  requestId: string;
  error?: string;
}

interface UploadProgressPayload {
  requestId: string;
  data: MediaUploadProgress;
}

interface PendingUpload {
  resolve: (value: MediaUploadResult) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (progress: MediaUploadProgress) => void;
}

const pendingUploads = new Map<string, PendingUpload>();

const generateRequestId = () =>
  `media-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const inferMediaCategory = (mimeType: string | undefined) => {
  if (!mimeType) return "tweet_image";
  if (mimeType.startsWith("video/")) return "tweet_video";
  if (mimeType === "image/gif") return "tweet_gif";
  return "tweet_image";
};

export interface UploadMediaOptions {
  mediaType?: string;
  mediaCategory?: string;
  fileName?: string;
  chunkSizeBytes?: number;
  additionalOwners?: string[];
  onProgress?: (progress: MediaUploadProgress) => void;
}

export const handleUploadSuccess = (payload: UploadSuccessPayload) => {
  const pending = pendingUploads.get(payload.requestId);
  if (!pending) return;
  pendingUploads.delete(payload.requestId);
  pending.resolve(payload.data);
};

export const handleUploadError = (payload: UploadErrorPayload) => {
  const pending = pendingUploads.get(payload.requestId);
  if (!pending) return;
  pendingUploads.delete(payload.requestId);
  pending.reject(new Error(payload.error ?? "上传失败"));
};

export const handleUploadProgress = (payload: UploadProgressPayload) => {
  const pending = pendingUploads.get(payload.requestId);
  if (!pending) return;
  if (pending.onProgress) {
    pending.onProgress(payload.data);
  }
};

/**
 * Upload a media attachment to X and receive the media id for subsequent tweet mutations.
 */
export const uploadMedia = (
  file: Blob,
  options: UploadMediaOptions = {}
): Promise<MediaUploadResult> => {
  const requestId = generateRequestId();
  const mediaType = options.mediaType ?? (file.type || "application/octet-stream");
  const mediaCategory = options.mediaCategory ?? inferMediaCategory(file.type);
  const fileName =
    options.fileName ?? (file instanceof File && file.name ? file.name : "media");

  const payload = {
    requestId,
    file,
    mediaType,
    mediaCategory,
    fileName,
    chunkSizeBytes: options.chunkSizeBytes,
    additionalOwners: options.additionalOwners,
  } satisfies {
    requestId: string;
    file: Blob;
    mediaType: string;
    mediaCategory: string;
    fileName: string;
    chunkSizeBytes?: number;
    additionalOwners?: string[];
  };

  const uploadPromise = new Promise<MediaUploadResult>((resolve, reject) => {
    pendingUploads.set(requestId, {
      resolve,
      reject,
      onProgress: options.onProgress,
    });
  });

  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_TO_INTERCEPTOR,
      type: CONTENT_EVENT_TYPE_UPLOAD_REQUEST,
      payload,
    },
    "*"
  );

  return uploadPromise;
};
