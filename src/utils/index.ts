import path from "path";
import logger from "./logger";

export const DATABASE_DIRECTORY_NAME = "./database_resource";

export const INITIAL_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/initial.realm`
);
export const UPDATE_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/update.realm`
);

export const CURRENT_INITIAL_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/current_initial.realm`
);

export const FINISHED_MEDICINE_PERMISSION_DETAIL =
  "FinishedMedicinePermissionDetail";

export const DRUG_RECOGNITION = "DrugRecognition";

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

    const sameItem = compare.find((c) => c[criteriaKey] === criteriaItem[criteriaKey]);

    if (!sameItem || JSON.stringify(criteriaItem) !== JSON.stringify(sameItem)) {
      diff.push(criteriaItem);
    }
  }

  return diff;
}

// PRINT_FRONT + PRINT_BACK => vector (유니코드 벡터)
const maxTextLength = 29

export const textToVector = (text: string) => {
  const vector = new Array<number>(maxTextLength).fill(0)

  for (let i = 0; i < text.length; i++) {
    vector[i] = text.charCodeAt(i)
  }

  return vector
}

export { logger };
