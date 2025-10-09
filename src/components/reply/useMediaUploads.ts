import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadMedia } from "@/api/twitterUpload";

const MAX_UPLOAD_ITEMS = 4;

export type UploadStatus = "Uploading" | "Processing" | "Uploaded" | "Error";

export type UploadKind = "image" | "video" | "unknown";

export interface UploadItem {
  id: string;
  name: string;
  mimeType: string;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  mediaId?: string;
  kind: UploadKind;
}

const inferUploadKind = (mimeType: string): UploadKind => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
};

const createUploadId = (file: File) =>
  [
    file.name,
    file.size,
    file.lastModified,
    Math.random().toString(16).slice(2),
  ].join("-");

interface UseMediaUploadsResult {
  items: Record<string, UploadItem>;
  addFiles: (files: FileList) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  isUploading: boolean;
  uploadedMediaIds: string[];
}

export const useMediaUploads = (): UseMediaUploadsResult => {
  const [items, setItems] = useState<Record<string, UploadItem>>({});
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const item of Object.values(itemsRef.current)) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const addFiles = useCallback((files: FileList) => {
    if (files.length === 0) return;
    const currentCount = Object.keys(itemsRef.current).length;
    const availableSlots = Math.max(0, MAX_UPLOAD_ITEMS - currentCount);
    if (availableSlots === 0) return;
    const limit = Math.min(files.length, availableSlots);

    for (let index = 0; index < limit; index += 1) {
      const file = files.item(index);
      if (!file) continue;
      if (!file.type.includes("video") && !file.type.includes("image"))
        continue;
      const id = createUploadId(file);
      const previewUrl = URL.createObjectURL(file);
      const mimeType = file.type || "application/octet-stream";
      const kind = inferUploadKind(mimeType);

      setItems((prev) => ({
        ...prev,
        [id]: {
          id,
          name: file.name,
          mimeType,
          previewUrl,
          progress: 0,
          status: "Uploading",
          kind,
        },
      }));

      uploadMedia(file, {
        onProgress(progress) {
          setItems((prev) => {
            const existing = prev[id];
            if (!existing) return prev;
            const status =
              existing.status === "Uploading" && progress.phase === "finalize"
                ? "Processing"
                : existing.status;
            return {
              ...prev,
              [id]: {
                ...existing,
                status,
                progress: progress.progress,
              },
            };
          });
        },
      })
        .then((result) => {
          setItems((prev) => {
            const existing = prev[id];
            if (!existing) return prev;
            return {
              ...prev,
              [id]: {
                ...existing,
                status: "Uploaded",
                mediaId: result.mediaId,
              },
            };
          });
        })
        .catch((error) => {
          console.error("[TSB][ReplyComposer] 媒体上传失败", error);
          setItems((prev) => {
            const existing = prev[id];
            if (!existing) return prev;
            return {
              ...prev,
              [id]: {
                ...existing,
                status: "Error",
              },
            };
          });
        });
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = { ...prev };
      const removed = next[id];
      if (!removed) return prev;
      delete next[id];
      URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      for (const item of Object.values(prev)) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return {};
    });
  }, []);

  const isUploading = useMemo(() => {
    return Object.values(items).some(
      (item) => item.status === "Uploading" || item.status === "Processing"
    );
  }, [items]);

  const uploadedMediaIds = useMemo(() => {
    return Object.values(items)
      .filter((item) => item.status === "Uploaded" && item.mediaId)
      .map((item) => item.mediaId as string);
  }, [items]);

  return {
    items,
    addFiles,
    removeItem,
    clear,
    isUploading,
    uploadedMediaIds,
  };
};
