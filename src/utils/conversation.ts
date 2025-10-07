import type {
  ConversationSection,
  ConversationThread,
  Instruction,
  TimelineModuleContent,
  TweetResponse,
  Entry,
  TweetResult,
} from "@/types/response";

const isConversationModule = (
  content?: TimelineModuleContent | null
): content is TimelineModuleContent => {
  if (!content) return false;
  if (content.entryType !== "TimelineTimelineModule") return false;
  return Array.isArray(content.items);
};

const extractTweetsFromModule = (
  module: TimelineModuleContent
): TweetResult[] => {
  const tweets: TweetResult[] = [];
  module.items?.forEach((item) => {
    const tweet = item?.item?.itemContent?.tweet_results as {
      result?: TweetResult;
    } | null;
    const result = tweet?.result;
    if (result && result.__typename === "Tweet") {
      tweets.push(result);
    }
  });
  return tweets;
};

export const extractConversationThreads = (
  detail?: TweetResponse | null
): ConversationThread[] => {
  if (!detail) return [];

  const instructions =
    detail.data?.threaded_conversation_with_injections_v2?.instructions ?? [];

  const threads: ConversationThread[] = [];
  const seenEntryIds = new Set<string>();

  instructions.forEach((instruction: Instruction | undefined) => {
    if (!instruction || instruction.type !== "TimelineAddEntries") return;

    instruction.entries?.forEach((entry: Entry | undefined) => {
      if (!entry) return;
      const entryId = entry.entryId ?? "";
      if (!entryId.startsWith("conversationthread-")) return;
      if (seenEntryIds.has(entryId)) return;

      const content = entry.content as TimelineModuleContent | undefined;
      if (!isConversationModule(content)) return;

      const tweets = extractTweetsFromModule(content);
      if (tweets.length === 0) return;

      const section =
        content.clientEventInfo?.details?.conversationDetails
          ?.conversationSection ?? "Default";
      const controllerData =
        content.clientEventInfo?.details?.timelinesDetails?.controllerData ??
        null;

      threads.push({
        id: entryId || tweets[0]?.rest_id || `thread-${threads.length}`,
        section,
        tweets,
        controllerData,
      });
      seenEntryIds.add(entryId);
    });
  });

  return threads;
};

const SECTION_LABELS: Partial<Record<ConversationSection, string>> = {
  HighQuality: "优质回复",
  LowQuality: "更多回复",
  Unsorted: "更多讨论",
  Following: "关注的人",
  Default: "全部回复",
};

export const getSectionLabel = (section: ConversationSection): string => {
  if (SECTION_LABELS[section]) return SECTION_LABELS[section] as string;
  return "更多讨论";
};

export const groupThreadsBySection = (threads: ConversationThread[]) => {
  const groups: Array<{
    section: ConversationSection;
    label: string;
    threads: ConversationThread[];
  }> = [];
  const indexBySection = new Map<ConversationSection, number>();

  threads.forEach((thread) => {
    const section = (thread.section || "Default") as ConversationSection;
    const existingIndex = indexBySection.get(section);
    if (existingIndex === undefined) {
      const label = getSectionLabel(section);
      const group = { section, label, threads: [thread] };
      indexBySection.set(section, groups.length);
      groups.push(group);
    } else {
      groups[existingIndex].threads.push(thread);
    }
  });

  return groups;
};
