export interface TweetPollChoice {
  id: number;
  label: string;
  count: number;
}

export interface TweetPollInfo {
  cardUri: string;
  cardName: string;
  endpoint: string | null;
  countsAreFinal: boolean;
  selectedChoiceId?: number;
  endDateTime?: string;
  lastUpdatedAt?: string;
  durationMinutes?: number;
  totalVotes: number;
  choices: TweetPollChoice[];
}
