/**
 * 统一生成请求 ID，便于在内容脚本与拦截脚本之间跟踪一次请求的完整生命周期。
 */
export const createRequestId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
