import {
  Entry,
  Instruction,
  TimelineModuleContent,
  TweetResponse,
  TweetResult,
} from "@/types/response";

type TimelineItemContentLike = {
  entryType?: string;
  itemContent?: {
    tweet_results?: { result?: TweetResult };
  };
  clientEventInfo?: Entry["clientEventInfo"];
};

export function isTimelineItemContent(
  content: unknown
): content is TimelineItemContentLike {
  return Boolean(
    content &&
      typeof content === "object" &&
      (content as { entryType?: string }).entryType === "TimelineTimelineItem"
  );
}

export function isTimelineModuleContent(
  content: unknown
): content is TimelineModuleContent {
  return Boolean(
    content &&
      typeof content === "object" &&
      (content as { entryType?: string }).entryType ===
        "TimelineTimelineModule" &&
      Array.isArray((content as { items?: unknown }).items)
  );
}

export function extractTimelineInstructions(
  response: TweetResponse | null | undefined
): Instruction[] {
  if (!response) return [];
  const collected: Instruction[] = [];
  const pushFrom = (source: unknown) => {
    if (!Array.isArray(source)) return;
    for (const instruction of source) {
      if (instruction && typeof instruction === "object") {
        collected.push(instruction as Instruction);
      }
    }
  };

  pushFrom(response.data?.home?.home_timeline_urt?.instructions);
  pushFrom(
    response.data?.threaded_conversation_with_injections_v2?.instructions
  );

  // Search timeline (SearchTimeline)
  pushFrom(
    response.data?.search_by_raw_query?.search_timeline?.timeline?.instructions
  );

  const userResult = response.data?.user?.result;
  if (userResult && typeof userResult === "object") {
    const instructions = (
      userResult as
        | { timeline?: { timeline?: { instructions?: Instruction[] } } }
        | null
        | undefined
    )?.timeline?.timeline?.instructions;
    pushFrom(instructions);
  }

  return collected;
}
