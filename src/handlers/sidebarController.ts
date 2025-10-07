import { ensureSidebar } from "@/components";
import { sidebarStore } from "@/store/sidebarStore";
import { requestTweetDetail } from "./tweetDetailHandler";
import type { SidebarTweetStatus } from "@/types/sidebar";
import {
  applyDetailToTweetCache,
  getTweet,
  getTweetDetail,
  getTweetRelation,
  resolveTweet,
} from "@/store/tweetsStore";
import { TweetData, TweetRelation } from "@/types/tweet";

type SidebarSnapshot = {
  tweet: TweetData;
  relationship: TweetRelation | null;
  relateTweets: Record<string, TweetData> | null;
  status: SidebarTweetStatus;
};

/**
 * Centralised controller used by DOM/event handlers to open the sidebar and keep it in sync with
 * tweet detail responses.
 */
export const openTweetInSidebar = (tweetId: string): boolean => {
  ensureSidebar();
  const snapshot = buildSidebarSnapshot(tweetId);
  if (!snapshot) return false;

  if (!getTweetDetail(tweetId)) {
    void hydrateDetailInBackground(tweetId, snapshot.tweet.controllerData);
  }

  sidebarStore.openTweet(
    snapshot.tweet,
    snapshot.relationship,
    snapshot.relateTweets,
    snapshot.status
  );
  return true;
};

const hydrateDetailInBackground = async (
  tweetId: string,
  controllerData: string | null
) => {
  try {
    await requestTweetDetail(tweetId, controllerData ?? null);
    if (sidebarStore.getState().tweetId !== tweetId) {
      return;
    }
    const snapshot = buildSidebarSnapshot(tweetId);
    if (!snapshot) return;
    sidebarStore.openTweet(
      snapshot.tweet,
      snapshot.relationship,
      snapshot.relateTweets,
      snapshot.status
    );
  } catch {
    if (sidebarStore.getState().tweetId !== tweetId) {
      return;
    }
    // Keep rendering the last successful snapshot; users can retry manually.
  }
};

const buildSidebarSnapshot = (
  tweetId: string
): SidebarSnapshot | undefined => {
  const data = getTweetAndRelation(tweetId);
  if (!data) return undefined;
  const { tweet, relationship, relateTweets } = data;
  const extendedRelateTweets = getRelateAncestorsAndChildren(
    relationship,
    relateTweets
  );
  const orderedRelationship = reorderReplies(relationship);
  const finalRelationship = orderedRelationship ?? relationship ?? null;
  return {
    tweet,
    relationship: finalRelationship,
    relateTweets: extendedRelateTweets,
    status: computeSidebarStatus(finalRelationship, extendedRelateTweets),
  };
};

const computeSidebarStatus = (
  relationship: TweetRelation | null,
  relateTweets: Record<string, TweetData> | null
): SidebarTweetStatus => {
  const relationshipCount = countRelationship(relationship);
  const cachedRelateTweetCount = Object.values(relateTweets ?? {}).length;
  if (
    cachedRelateTweetCount > 0 &&
    cachedRelateTweetCount < relationshipCount
  ) {
    return "partical";
  }
  return "success";
};

function reorderReplies(relationship: TweetRelation | null) {
  if (relationship == null || relationship.replies === undefined)
    return relationship;
  const currentState = sidebarStore.getState();
  const currentId = currentState.tweetId;
  const currentRelate = currentState.relateTweets;
  const replise = relationship.replies;
  const newSet = new Set<string>();
  if (currentId !== null && replise.has(currentId)) {
    newSet.add(currentId);
  }
  if (currentRelate !== null) {
    for (const id of Object.keys(currentRelate)) {
      if (replise.has(id)) {
        newSet.add(id);
      }
    }
  }
  for (const id of replise) {
    if (newSet.has(id)) continue;
    newSet.add(id);
  }
  return { ...relationship, replies: newSet };
}

function getTweetAndRelation(tweetId: string) {
  const tweet = getTweet(tweetId);
  if (!tweet) return;
  const relationship = getTweetRelation(tweetId) ?? null;
  let relateTweets: Record<string, TweetData> | null = null;
  function pushToRelateTweets(id: string | Set<string> | undefined) {
    if (id === undefined) return;
    if (relateTweets === null) relateTweets = {};
    if (typeof id === "string") {
      const tweet = getTweet(id);
      if (tweet) relateTweets[id] = tweet;
      return;
    }
    for (const i of id) {
      const tweet = getTweet(i);
      if (tweet) relateTweets[i] = tweet;
    }
  }
  if (relationship) {
    pushToRelateTweets(relationship.quote);
    pushToRelateTweets(relationship.quoteBy);
    pushToRelateTweets(relationship.replies);
    pushToRelateTweets(relationship.replyTo);
    pushToRelateTweets(relationship.retweet);
    pushToRelateTweets(relationship.retweetBy);
  }
  return { tweet, relationship, relateTweets };
}

function getRelateAncestorsAndChildren(
  relationship: TweetRelation | null,
  relateTweets: Record<string, TweetData> | null
) {
  if (relationship === null) return relateTweets;

  let result = relateTweets;

  const ensureRelateTweets = () => {
    if (result === null) {
      result = {};
    }
    return result;
  };

  const getReplyTo = (tweetId: string) => {
    const tweet = getTweet(tweetId);
    if (tweet === undefined) return;
    const map = ensureRelateTweets();
    map[tweet.result.rest_id] = tweet;
    const relationshipRecord = getTweetRelation(tweetId);
    if (
      relationshipRecord !== undefined &&
      relationshipRecord.replyTo !== undefined
    ) {
      getReplyTo(relationshipRecord.replyTo);
    }
  };

  if (relationship.replyTo !== undefined) {
    getReplyTo(relationship.replyTo);
  }

  const getReplies = (tweetId: string) => {
    const tweet = getTweet(tweetId);
    if (tweet === undefined) return;
    const map = ensureRelateTweets();
    map[tweet.result.rest_id] = tweet;
    const relationshipRecord = getTweetRelation(tweetId);
    if (
      relationshipRecord !== undefined &&
      relationshipRecord.replies !== undefined
    ) {
      relationshipRecord.replies.forEach((id) => getReplies(id));
    }
  };

  if (relationship.replies !== undefined) {
    relationship.replies.forEach((id) => getReplies(id));
  }

  return result;
}

function countRelationship(relationship: TweetRelation | null) {
  let count = 0;
  if (relationship === null) return count;
  if (relationship.quote !== undefined) count++;
  if (relationship.quoteBy !== undefined) count++;
  if (relationship.replies !== undefined) count += relationship.replies.size;
  if (relationship.replyTo !== undefined) count++;
  if (relationship.retweet !== undefined) count++;
  if (relationship.retweetBy !== undefined)
    count += relationship.retweetBy.size;
  return count;
}

export const refreshTweetDetail = async (tweetId: string) => {
  const state = sidebarStore.getState();
  if (state.tweetId !== tweetId) return;

  const record = getTweet(tweetId) ?? resolveTweet(tweetId);
  if (!record) return;

  try {
    const refreshedDetail = await requestTweetDetail(
      tweetId,
      record.controllerData ?? null,
      true
    );
    if (sidebarStore.getState().tweetId !== tweetId) {
      return;
    }
    applyDetailToTweetCache(tweetId, refreshedDetail);
    const snapshot = buildSidebarSnapshot(tweetId);
    if (snapshot) {
      sidebarStore.openTweet(
        snapshot.tweet,
        snapshot.relationship,
        snapshot.relateTweets,
        snapshot.status
      );
    }
  } catch {
    // Preserve the previous sidebar state when refresh fails.
  }
};
