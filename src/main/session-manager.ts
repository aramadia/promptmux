import { session, Session } from "electron";

const PARTITIONS = {
  chatgpt: "persist:chatgpt",
  gemini: "persist:gemini",
  claude: "persist:claude",
} as const;

export type ServiceName = keyof typeof PARTITIONS;

export function getPartition(service: ServiceName): string {
  return PARTITIONS[service];
}

export function getSession(service: ServiceName): Session {
  return session.fromPartition(PARTITIONS[service]);
}

export function getAllPartitions(): Record<ServiceName, string> {
  return { ...PARTITIONS };
}
