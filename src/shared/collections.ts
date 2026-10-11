/** ID가 같은 행을 입력 순서대로 병합한다. */
function mergeProperties(existing: Record<string, any>, incoming: Record<string, any>, idColumn: string): void {
  Object.keys(incoming)
    .filter((key) => key !== idColumn)
    .forEach((key) => {
      const previous = existing[key] ? existing[key].split(",") : [];
      const next = incoming[key] ? incoming[key].split(",") : [];
      existing[key] = [...new Set([...previous, ...next])].join(",");
    });
}
export function mergeDuplicateObjectArray<T extends Record<string, any>>(idColumn: keyof T & string, objects: T[]): T[] {
  const merged = new Map<T[keyof T], T>();
  objects.forEach((object) => {
    const id = object[idColumn];
    const existing = merged.get(id);
    const isFirstOccurrence = existing === undefined;
    if (isFirstOccurrence) {
      merged.set(id, { ...object });
      return;
    }
    mergeProperties(existing, object, idColumn);
  });
  return [...merged.values()];
}
