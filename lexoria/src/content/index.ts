import environment from "./vocab.environment.json";
import technology from "./vocab.technology.json";
import education from "./vocab.education.json";

export type TopicId = "environment" | "technology" | "education";

export interface Word {
  id: string;
  topic: TopicId;
  word: string;
  ipa: string;
  pos: string;
  vi: string;
  example: string;
  collocation: string;
}

export interface Topic {
  id: TopicId;
  name: string;
  monster: string;
  color: number;
}

export const TOPICS: Topic[] = [
  { id: "environment", name: "Môi trường", monster: "Slime Rêu", color: 0x5bbf5b },
  { id: "technology", name: "Công nghệ", monster: "Bọ Mạch Điện", color: 0x4fa3e0 },
  { id: "education", name: "Giáo dục", monster: "Sách Ma", color: 0xd98e3f },
];

type RawWord = Omit<Word, "id" | "topic">;

function withIds(topic: TopicId, raw: RawWord[]): Word[] {
  return raw.map((w) => ({ ...w, topic, id: `${topic}:${w.word}` }));
}

export const WORDS: Word[] = [
  ...withIds("environment", environment),
  ...withIds("technology", technology),
  ...withIds("education", education),
];

export const WORDS_BY_ID: Record<string, Word> = Object.fromEntries(WORDS.map((w) => [w.id, w]));

export function wordsOfTopic(topic: TopicId): Word[] {
  return WORDS.filter((w) => w.topic === topic);
}

export const WRITING_PROMPTS = [
  {
    id: "t2-technology-children",
    topic: "technology" as TopicId,
    prompt:
      "Some people believe that children today spend too much time on electronic devices. To what extent do you agree or disagree?",
  },
  {
    id: "t2-environment-individuals",
    topic: "environment" as TopicId,
    prompt:
      "Some people think that environmental problems are too big for individuals to solve. Others believe that individuals can make a difference. Discuss both views and give your own opinion.",
  },
  {
    id: "t2-education-university",
    topic: "education" as TopicId,
    prompt:
      "Some people believe that university education should be free for all students. Others think students should pay. Discuss both views and give your own opinion.",
  },
];
