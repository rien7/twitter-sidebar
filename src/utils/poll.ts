import type {
  TweetCardBindingValue,
  TweetCardBindingValueValue,
  TweetResult,
} from "@/types/response";
import type { TweetPollChoice, TweetPollInfo } from "@/types/poll";

const createBindingValueMap = (
  bindingValues:
    | TweetCardBindingValue[]
    | Record<string, TweetCardBindingValueValue>
    | null
    | undefined
): Map<string, TweetCardBindingValueValue> => {
  const map = new Map<string, TweetCardBindingValueValue>();
  if (!bindingValues) return map;
  if (Array.isArray(bindingValues)) {
    for (const entry of bindingValues) {
      if (!entry?.key || !entry.value) continue;
      map.set(entry.key, entry.value);
    }
    return map;
  }
  for (const [key, value] of Object.entries(bindingValues)) {
    if (!key || !value) continue;
    map.set(key, value);
  }
  return map;
};

const getString = (
  map: Map<string, TweetCardBindingValueValue>,
  key: string
): string | undefined => {
  const value = map.get(key);
  if (!value) return undefined;
  if (typeof value.string_value === "string" && value.string_value.length > 0) {
    return value.string_value;
  }
  if (typeof value.scribe_key === "string" && value.scribe_key.length > 0) {
    return value.scribe_key;
  }
  if (typeof value.long_value === "string" && value.long_value.length > 0) {
    return value.long_value;
  }
  return undefined;
};

const getBoolean = (
  map: Map<string, TweetCardBindingValueValue>,
  key: string
): boolean | undefined => {
  const value = map.get(key);
  if (!value) return undefined;
  if (typeof value.boolean_value === "boolean") return value.boolean_value;
  if (typeof value.string_value === "string") {
    if (value.string_value.toLowerCase() === "true") return true;
    if (value.string_value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const parseChoices = (
  map: Map<string, TweetCardBindingValueValue>
): TweetPollChoice[] => {
  const result: TweetPollChoice[] = [];
  for (let index = 1; index <= 4; index += 1) {
    const label = getString(map, `choice${index}_label`);
    if (!label) continue;
    const rawCount = getString(map, `choice${index}_count`);
    const count = rawCount ? Number.parseInt(rawCount, 10) : 0;
    result.push({
      id: index,
      label,
      count: Number.isFinite(count) ? count : 0,
    });
  }
  return result;
};

/**
 * 根据推文携带的 Card 元数据提取投票信息，供前端组件展示与提交投票使用。
 */
export const extractPollInfo = (tweet: TweetResult): TweetPollInfo | null => {
  const legacyCard = tweet.card?.legacy;
  if (!legacyCard) return null;
  const bindingValues = createBindingValueMap(legacyCard.binding_values);
  if (bindingValues.size === 0) return null;
  if (!bindingValues.has("choice1_label")) return null;

  const choices = parseChoices(bindingValues);
  if (choices.length === 0) return null;

  const endpoint = getString(bindingValues, "api") ?? null;
  const cardUri =
    tweet.card?.rest_id ?? legacyCard.url ?? getString(bindingValues, "card_url");
  if (!cardUri) return null;

  const selectedChoiceRaw = getString(bindingValues, "selected_choice");
  let selectedChoiceId: number | undefined;
  if (selectedChoiceRaw) {
    const parsed = Number.parseInt(selectedChoiceRaw, 10);
    if (Number.isFinite(parsed)) {
      selectedChoiceId = parsed;
    }
  }
  const countsAreFinal = getBoolean(bindingValues, "counts_are_final") ?? false;
  const endDateTime = getString(bindingValues, "end_datetime_utc");
  const lastUpdatedAt = getString(bindingValues, "last_updated_datetime_utc");
  const durationRaw = getString(bindingValues, "duration_minutes");
  const durationMinutes = durationRaw ? Number.parseInt(durationRaw, 10) : NaN;
  const totalVotes = choices.reduce((sum, choice) => sum + choice.count, 0);

  return {
    cardUri,
    cardName: legacyCard.name ?? "",
    endpoint,
    countsAreFinal,
    selectedChoiceId,
    endDateTime: endDateTime ?? undefined,
    lastUpdatedAt: lastUpdatedAt ?? undefined,
    durationMinutes: Number.isFinite(durationMinutes)
      ? durationMinutes
      : undefined,
    totalVotes,
    choices,
  };
};
