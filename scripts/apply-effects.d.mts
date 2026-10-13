export function applyPatch(twin: Record<string, unknown>, patch: unknown): void;
export function play(script: object, choiceIds: string[]): { twin: Record<string, unknown>; nodeId: string; visited: string[] };
