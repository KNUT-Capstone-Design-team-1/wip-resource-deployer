/**
 * 중복 행 속성 병합
 */
function mergeProperties<T extends { [Key in keyof T]: string }>(
  existing: T,
  incoming: T,
  idColumn: keyof T,
) {
  const propertyKeys = (Object.keys(incoming) as (keyof T)[]).filter(
    (key) => key !== idColumn,
  );

  for (const key of propertyKeys) {
    const previous = existing[key] ? existing[key].split(",") : [];
    const next = incoming[key] ? incoming[key].split(",") : [];

    existing[key] = [...new Set([...previous, ...next])].join(
      ",",
    ) as T[keyof T];
  }
}

/**
 * 동일 ID 속성 중복 병합
 */
export function mergeDuplicateObjectArray<
  T extends { [Key in keyof T]: string },
>(idColumn: keyof T & string, objects: T[]) {
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
