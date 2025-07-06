import path from "path";
import moment from "moment";
import config from "../../config.json";
import { TResourceDirectoryName } from "../@types/resource";
import {
  DRUG_RECOGNITION_PROPERTY_MAP,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
} from "../@types/realm";
import { NEARBY_PHARMACIES_PROPERTY_MAP } from "../@types/d1/nearby_pharmacies";

export const DATABASE_DIRECTORY_NAME = "./database_resource";

const resourceVersion = `${config.schemaVersion}_${moment().format(
  "YYYYMMDD"
)}${config.schemaMinorVersion ? `_${config.schemaMinorVersion}` : `_test`}`;

export const INITIAL_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/initial_${resourceVersion}.realm`
);
export const UPDATE_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/update_${resourceVersion}.realm`
);

export const PILL_DATA = "PillData";

export const RESOURCE_PROPERTY_MAP: Record<
  TResourceDirectoryName,
  | typeof DRUG_RECOGNITION_PROPERTY_MAP
  | typeof FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP
  | typeof NEARBY_PHARMACIES_PROPERTY_MAP
> = {
  drug_recognition: DRUG_RECOGNITION_PROPERTY_MAP,
  finished_medicine_permission_detail:
    FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  nearby_pharmacies: NEARBY_PHARMACIES_PROPERTY_MAP,
} as const;
