import logger from "./logger";
export * from "./resource";

export function convertStringToInt8Array(
  int8ArrayFormatString: string
): Int8Array {
  const res = int8ArrayFormatString.match(/-?\d+/g)?.map(Number);

  return new Int8Array(res ?? []);
}

export function getObjectArrayDiff(
  criteria: Array<Record<string, any>>,
  criteriaKey: string,
  compare: Array<Record<string, any>>
) {
  const diff: Array<Record<string, any>> = [];

  for (let i = 0; i < criteria.length; i += 1) {
    const criteriaItem = criteria[i];

    const sameItem = compare.find(
      (c) => c[criteriaKey] === criteriaItem[criteriaKey]
    );

    if (
      !sameItem ||
      JSON.stringify(criteriaItem) !== JSON.stringify(sameItem)
    ) {
      diff.push(criteriaItem);
    }
  }

  return diff;
}

export function convertTextToVector(text: string) {
  // PRINT_FRONT + PRINT_BACK => vector (유니코드 벡터)
  const maxVectorLength = 29;

  const vector = new Array<number>(maxVectorLength).fill(0);

  for (let i = 0; i < text.length; i++) {
    vector[i] = text.charCodeAt(i);
  }

  return vector;
}

export function mergeDuplicateObjectArray(
  idColumn: string,
  objects: Array<Record<string, any>>
) {
  const mergedMap = new Map();

  objects.forEach((object) => {
    const existing = mergedMap.get(object[idColumn]);

    if (!existing) {
      mergedMap.set(object[idColumn], { ...object });
      return;
    }

    for (const key in object) {
      if (key === idColumn) {
        continue;
      }

      const existValue = existing[key] ? existing[key].split(",") : [];
      const newValue = object[key] ? object[key].split(",") : [];

      existing[key] = Array.from(new Set([...existValue, ...newValue])).join(
        ","
      );
    }

    mergedMap.set(object[idColumn], { ...existing });
  });

  return Array.from(mergedMap.values());
}

export { logger };
