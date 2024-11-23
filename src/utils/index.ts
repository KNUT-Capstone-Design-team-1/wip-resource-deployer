import path from "path";
import logger from "./logger";

export const DATABASE_DIRECTORY_NAME = "./database_resource";
export const INITIAL_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/initial.realm`
);
export const UPDATE_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/update.realm`
);

export const CURRENT_DATABASE_DIRECTORY_NAME = "./current_database_resource";
export const CURRENT_INITIAL_REALM_FILE_NAME = path.join(
  `${CURRENT_DATABASE_DIRECTORY_NAME}/initial.realm`
);

export const FINISHED_MEDICINE_PERMISSION_DETAILS =
  "FinishedMedicinePermissionDetail";
export const DRUG_RECOGNITION = "DrugRecognition";

export function convertStringToInt8Array(
  int8ArrayFormatString: string
): Int8Array {
  const res = int8ArrayFormatString.match(/-?\d+/g)?.map(Number);

  return new Int8Array(res ?? []);
}

export { logger };
