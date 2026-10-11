/**
 * ID가 같은 행을 입력 순서대로 병합한다.
 */
function mergeProperties(
  existing: Record<string, any>,
  incoming: Record<string, any>,
  idColumn: string,
) {
  for (const key of Object.keys(incoming)) {
    if (key === idColumn) {
      continue;
    }

    const previous = existing[key] ? existing[key].split(",") : [];
    const next = incoming[key] ? incoming[key].split(",") : [];

    existing[key] = [...new Set([...previous, ...next])].join(",");
  }
}

/**
 * 같은 ID의 객체를 합치고 각 속성의 쉼표 구분 값을 중복 없이 병합한다.
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
