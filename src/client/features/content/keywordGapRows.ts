type RankedKeyword = { keyword: string; position: number | null };

export function keywordGapRows<T extends RankedKeyword>(
  ownRows: RankedKeyword[],
  rivalRows: T[],
) {
  const own = new Map(
    ownRows.map((row) => [row.keyword.trim().toLocaleLowerCase(), row]),
  );
  return rivalRows.filter((row) => {
    const match = own.get(row.keyword.trim().toLocaleLowerCase());
    return (
      !match ||
      (row.position != null &&
        match.position != null &&
        row.position < match.position)
    );
  });
}
