// src/utils/threadPrune.ts
import { getTweetRelation } from "@/store/tweetsStore";
import { TweetResult } from "@/types/response";
import type { TweetData } from "@/types/tweet";
import { getUserIdFromTweet } from "./responseData";

// 从 TweetData 中稳健地取作者 userId
export function getAuthorUserId(
  t: TweetData | undefined | null
): string | null {
  if (!t) return null;
  // 下面根据你的数据形态做多重兜底（必要时按你项目里真实字段裁剪）
  const r: TweetResult = t.result;
  return getUserIdFromTweet(r);
}

export function isAuthor(
  tweetId: string,
  relateTweets: Record<string, TweetData> | null,
  rootAuthorId: string
): boolean {
  if (!relateTweets) return false;
  const t = relateTweets[tweetId];
  return getAuthorUserId(t) === rootAuthorId;
}

function childrenOf(tweetId: string): string[] {
  const replies = getTweetRelation(tweetId)?.replies;
  return replies ? Array.from(replies) : [];
}

function hasImmediateAuthorReply(
  tweetId: string,
  relateTweets: Record<string, TweetData> | null,
  rootAuthorId: string
): boolean {
  return childrenOf(tweetId).some((child) =>
    isAuthor(child, relateTweets, rootAuthorId)
  );
}

/**
 * 计算“作者主干剪枝”路径。
 * @param rootId 起点 tweetId（一般是面板里的 main 推文）
 * @param relateTweets 关系里已缓存的 TweetData 映射（来自你的 controller）
 * @returns 一条线性的 tweetId[]，按展示顺序（包含 rootId）
 */
export function buildAuthorSpine(
  rootId: string,
  rootAuthorId: string | null,
  relateTweets: Record<string, TweetData> | null
): string[] {
  if (!relateTweets || !rootAuthorId) return [rootId];

  const path: string[] = [rootId];
  let cur = rootId;

  while (true) {
    const lv1 = childrenOf(cur);
    if (lv1.length === 0) break;

    // 情形 1：L+1 层直接有作者
    const directAuthors = lv1.filter((id) =>
      isAuthor(id, relateTweets, rootAuthorId)
    );

    if (directAuthors.length === 1) {
      const a = directAuthors[0];
      path.push(a);
      cur = a;
      continue;
    }
    if (directAuthors.length >= 2) {
      // 同层出现两个作者回复 → 停止
      break;
    }

    // 情形 2：L+1 层没有作者，但恰有一个节点的 L+2 层里出现作者
    const lv1WithAuthorInNext = lv1.filter((id) =>
      hasImmediateAuthorReply(id, relateTweets, rootAuthorId)
    );

    if (lv1WithAuthorInNext.length === 1) {
      const mid = lv1WithAuthorInNext[0];
      // 找到它的 L+2 里唯一一个作者（如果多于一个，也视为冲突，停止）
      const lv2 = childrenOf(mid).filter((id) =>
        isAuthor(id, relateTweets, rootAuthorId)
      );
      if (lv2.length === 1) {
        const a = lv2[0];
        // 先展示中间节点，再展示作者节点
        path.push(mid, a);
        cur = a;
        continue;
      }
      // L+2 层里也不是唯一 → 停止
      break;
    }

    // 既没有直接作者，也没有“唯一能通向作者”的中间节点 → 停止
    break;
  }

  return path;
}
