import { buildGraphqlHeaders } from "./headerUtils";
import { postToContent } from "./messaging";
import {
  INTERCEPTOR_EVENT_TYPE_UPLOAD_ERROR,
  INTERCEPTOR_EVENT_TYPE_UPLOAD_PROGRESS,
  INTERCEPTOR_EVENT_TYPE_UPLOAD_RESPONSE,
} from "@/common/bridge";

const UPLOAD_ENDPOINT = "https://upload.x.com/i/media/upload.json";
const DEFAULT_CHUNK_BYTES = 5 * 1024 * 1024;

interface MediaUploadRequestPayload {
  requestId: string;
  file: Blob;
  mediaType: string;
  mediaCategory: string;
  fileName: string;
  chunkSizeBytes?: number;
  additionalOwners?: string[];
}

interface ProcessingInfo {
  state?: string;
  check_after_secs?: number;
  progress_percent?: number;
  error?: {
    message?: string;
  };
}

interface FinalizeResponse {
  media_id?: number;
  media_id_string?: string;
  media_key?: string;
  size?: number;
  expires_after_secs?: number;
  image?: {
    w?: number;
    h?: number;
    image_type?: string;
  } | null;
  video?: {
    video_type?: string;
  } | null;
  processing_info?: ProcessingInfo | null;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const buildUploadHeaders = () => {
  const source = buildGraphqlHeaders();
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key || !value) continue;
    if (key.toLowerCase() === "content-type") continue;
    headers[key] = value;
  }
  return headers;
};

const makeHeaders = (base: Record<string, string>) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(base)) {
    headers.set(key, value);
  }
  return headers;
};

const notifyProgress = (
  requestId: string,
  data: {
    phase: "init" | "append" | "finalize" | "processing";
    uploadedBytes: number;
    totalBytes: number;
    progress: number;
    chunkIndex?: number;
    chunkCount?: number;
    checkAfterSecs?: number;
    processingState?: string;
  }
) => {
  postToContent(INTERCEPTOR_EVENT_TYPE_UPLOAD_PROGRESS, {
    requestId,
    data,
  });
};

const notifyError = (requestId: string, message: string) => {
  postToContent(INTERCEPTOR_EVENT_TYPE_UPLOAD_ERROR, {
    requestId,
    error: message,
  });
};

const notifySuccess = (requestId: string, data: FinalizeResponse) => {
  const normalizedMediaId =
    data.media_id_string ?? (data.media_id ? String(data.media_id) : "");
  if (!normalizedMediaId) {
    notifyError(requestId, "FINALIZE 响应缺少 media_id");
    return;
  }
  postToContent(INTERCEPTOR_EVENT_TYPE_UPLOAD_RESPONSE, {
    requestId,
    data: {
      mediaId: normalizedMediaId,
      mediaIdString: normalizedMediaId,
      mediaKey: data.media_key,
      size: data.size,
      expiresAfterSecs: data.expires_after_secs,
      image: data.image ? {
        w: data.image.w,
        h: data.image.h,
        imageType: data.image.image_type,
      } : null,
      video: data.video ? { videoType: data.video.video_type } : null,
      processingInfo: data.processing_info
        ? {
            state: data.processing_info.state,
            progressPercent: data.processing_info.progress_percent,
          }
        : null,
    },
  });
};

const performInit = async (
  payload: MediaUploadRequestPayload,
  headers: Record<string, string>,
  totalBytes: number
) => {
  notifyProgress(payload.requestId, {
    phase: "init",
    uploadedBytes: 0,
    totalBytes,
    progress: totalBytes === 0 ? 1 : 0,
  });
  const url = new URL(UPLOAD_ENDPOINT);
  url.searchParams.set("command", "INIT");
  url.searchParams.set("media_type", payload.mediaType);
  url.searchParams.set("total_bytes", String(totalBytes));
  url.searchParams.set("media_category", payload.mediaCategory);
  if (payload.additionalOwners?.length) {
    url.searchParams.set(
      "additional_owners",
      payload.additionalOwners.join(",")
    );
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: makeHeaders(headers),
  });

  if (!response.ok) {
    throw new Error(`INIT 请求失败，状态码 ${response.status}`);
  }

  const result = (await response.json()) as {
    media_id?: number;
    media_id_string?: string;
  };

  const mediaIdString = result.media_id_string
    ? result.media_id_string
    : result.media_id
    ? String(result.media_id)
    : null;

  if (!mediaIdString) {
    throw new Error("INIT 响应缺少 media_id");
  }

  return mediaIdString;
};

const uploadChunk = async (
  payload: MediaUploadRequestPayload,
  headers: Record<string, string>,
  mediaId: string,
  chunk: Blob,
  segmentIndex: number,
  chunkCount: number,
  uploadedStartBytes: number,
  totalBytes: number
) => {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = new URL(UPLOAD_ENDPOINT);
    url.searchParams.set("command", "APPEND");
    url.searchParams.set("media_id", mediaId);
    url.searchParams.set("segment_index", String(segmentIndex));

    xhr.open("POST", url.toString(), true);
    xhr.withCredentials = true;

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    const chunkSize = chunk.size;

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      const loaded = event.lengthComputable ? event.loaded : 0;
      const uploadedBytes = uploadedStartBytes + loaded;
      const progress =
        totalBytes === 0 ? 1 : Math.min(1, uploadedBytes / totalBytes);
      notifyProgress(payload.requestId, {
        phase: "append",
        uploadedBytes,
        totalBytes,
        progress,
        chunkIndex: segmentIndex,
        chunkCount,
      });
    };

    xhr.onerror = () => {
      reject(new Error("APPEND 请求网络失败"));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const uploadedBytes = uploadedStartBytes + chunkSize;
        const progress =
          totalBytes === 0 ? 1 : Math.min(1, uploadedBytes / totalBytes);
        notifyProgress(payload.requestId, {
          phase: "append",
          uploadedBytes,
          totalBytes,
          progress,
          chunkIndex: segmentIndex,
          chunkCount,
        });
        resolve();
      } else {
        reject(new Error(`APPEND 请求失败，状态码 ${xhr.status}`));
      }
    };

    const formData = new FormData();
    formData.append("media", chunk, payload.fileName);

    xhr.send(formData);
  });
};

const performFinalize = async (
  requestId: string,
  headers: Record<string, string>,
  mediaId: string,
  totalBytes: number
) => {
  notifyProgress(requestId, {
    phase: "finalize",
    uploadedBytes: totalBytes,
    totalBytes,
    progress: 1,
  });

  const url = new URL(UPLOAD_ENDPOINT);
  url.searchParams.set("command", "FINALIZE");
  url.searchParams.set("media_id", mediaId);

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: makeHeaders(headers),
  });

  if (!response.ok) {
    throw new Error(`FINALIZE 请求失败，状态码 ${response.status}`);
  }

  return (await response.json()) as FinalizeResponse;
};

const waitForProcessing = async (
  requestId: string,
  headers: Record<string, string>,
  mediaId: string,
  initial: FinalizeResponse,
  totalBytes: number
) => {
  let current = initial.processing_info;
  let latest = initial;

  while (current && current.state && current.state !== "succeeded") {
    if (current.state === "failed") {
      throw new Error(current.error?.message ?? "媒体处理失败");
    }
    if (current.error?.message) {
      throw new Error(current.error.message);
    }

    notifyProgress(requestId, {
      phase: "processing",
      uploadedBytes: totalBytes,
      totalBytes,
      progress: 1,
      checkAfterSecs: current.check_after_secs,
      processingState: current.state,
    });

    const waitMs = Math.max(1000, (current.check_after_secs ?? 1) * 1000);
    await sleep(waitMs);

    const url = new URL(UPLOAD_ENDPOINT);
    url.searchParams.set("command", "STATUS");
    url.searchParams.set("media_id", mediaId);

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: makeHeaders(headers),
    });

    if (!response.ok) {
      throw new Error(`STATUS 请求失败，状态码 ${response.status}`);
    }

    latest = (await response.json()) as FinalizeResponse;
    current = latest.processing_info;
    if (current?.state === "failed") {
      throw new Error(current.error?.message ?? "媒体处理失败");
    }
  }

  if (current?.error?.message) {
    throw new Error(current.error.message);
  }

  return latest;
};

export const performMediaUploadRequest = async (
  payload: MediaUploadRequestPayload
) => {
  try {
    const headers = buildUploadHeaders();
    const totalBytes = payload.file.size ?? 0;
    const mediaId = await performInit(payload, headers, totalBytes);

    const chunkSize = Math.max(
      1024 * 1024,
      payload.chunkSizeBytes ?? DEFAULT_CHUNK_BYTES
    );
    const chunkCount = Math.max(1, Math.ceil(totalBytes / chunkSize));
    let uploadedBytes = 0;

    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(totalBytes, start + chunkSize);
      const chunk = payload.file.slice(start, end);
      await uploadChunk(
        payload,
        headers,
        mediaId,
        chunk,
        index,
        chunkCount,
        uploadedBytes,
        totalBytes
      );
      uploadedBytes += chunk.size;
    }

    const finalizeResult = await performFinalize(
      payload.requestId,
      headers,
      mediaId,
      totalBytes
    );

    const finalResult = await waitForProcessing(
      payload.requestId,
      headers,
      mediaId,
      finalizeResult,
      totalBytes
    );

    notifySuccess(payload.requestId, finalResult);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "未知错误");
    notifyError(payload.requestId, message);
  }
};
