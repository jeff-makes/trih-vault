import registry from "../../data/rules/topics.json";

export type TopicId = string;

export interface TopicDefinition {
  id: TopicId;
  label: string;
  slug: string;
  aliases: string[];
  description?: string;
}

export const TOPIC_DEFINITIONS: TopicDefinition[] = registry;

export const TOPIC_BY_ID: Record<string, TopicDefinition> = TOPIC_DEFINITIONS.reduce(
  (acc, topic) => {
    acc[topic.id] = topic;
    return acc;
  },
  {} as Record<string, TopicDefinition>
);

export const TOPIC_ALIASES: Record<string, TopicDefinition> = TOPIC_DEFINITIONS.reduce(
  (acc, topic) => {
    topic.aliases.forEach((alias) => {
      acc[alias.toLowerCase()] = topic;
    });
    acc[topic.label.toLowerCase()] = topic;
    acc[topic.slug.toLowerCase()] = topic;
    acc[topic.id.toLowerCase()] = topic;
    acc[topic.label.toLowerCase()] = topic;
    return acc;
  },
  {} as Record<string, TopicDefinition>
);

export function findTopicByAlias(value: string): TopicDefinition | undefined {
  return TOPIC_ALIASES[value.trim().toLowerCase()];
}

export function findTopic(value: string): TopicDefinition | undefined {
  const trimmed = value.trim().toLowerCase();
  return TOPIC_BY_ID[trimmed] ?? TOPIC_ALIASES[trimmed];
}
