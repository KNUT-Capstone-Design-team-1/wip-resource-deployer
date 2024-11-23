import path from "path";
import _ from "lodash";
import logger from "./logger";

export const NEW_DATABASE_DIRECTORY_NAME = "./database_resource";

export const NEW_INITIAL_REALM_FILE_NAME = path.join(
  `${NEW_DATABASE_DIRECTORY_NAME}/initial.realm`
);
export const UPDATE_REALM_FILE_NAME = path.join(
  `${NEW_DATABASE_DIRECTORY_NAME}/update.realm`
);

export const CURRENT_DATABASE_DIRECTORY_NAME = "./current_database_resource";

export const CURRENT_INITIAL_REALM_FILE_NAME = path.join(
  `${CURRENT_DATABASE_DIRECTORY_NAME}/initial.realm`
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

    if (!sameItem || !_.isEqual(criteriaItem, sameItem)) {
      diff.push(criteriaItem);
    }
  }

  return diff;
}

export { logger };
