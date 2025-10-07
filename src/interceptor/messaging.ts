import {
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_FROM_INTERCEPTOR,
} from "@/common/bridge";

/**
 * Convenience helper for sending messages back to the content script.
 */
export const postToContent = (type: string, payload: unknown) => {
  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_FROM_INTERCEPTOR,
      type,
      payload,
    },
    "*"
  );
};
