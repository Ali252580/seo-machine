/** Retain paginated data only while the current project stays the same. */
export function keepPreviousProjectData<T>(
  projectId: string,
  previous: T | undefined,
  previousQuery: { queryKey: readonly unknown[] } | undefined,
): T | undefined {
  return previousQuery?.queryKey[1] === projectId ? previous : undefined;
}
