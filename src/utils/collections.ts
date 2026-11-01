/**
 * 중복 행 속성 병합
 */
function mergeProperties(
  existing: Record<string, any>,
  incoming: Record<string, any>,
  idColumn: string,
) {
  const propertyKeys = Object.keys(incoming).filter((key) => key !== idColumn);

  for (const key of propertyKeys) {
    const previous = existing[key] ? existing[key].split(",") : [];
    const next = incoming[key] ? incoming[key].split(",") : [];

    existing[key] = [...new Set([...previous, ...next])].join(",");
  }
}

/**
 * 동일 ID 속성 중복 병합
 */
export function mergeDuplicateObjectArray<T extends Record<string, any>>(
  idColumn: keyof T & string,
  objects: T[],
) {
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
