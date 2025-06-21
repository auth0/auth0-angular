/**
 * Tracks the state of refresh operations
 */
export const RefreshState = {
  Refreshing: 'Refreshing',
  Complete: 'Complete',
} as const;
export type RefreshState = (typeof RefreshState)[keyof typeof RefreshState];
