import { ObjectSchema } from "realm";
import { FINISHED_MEDICINE_PERMISSION_DETAIL } from "../utils";

/**
 * 완제 의약품 허가 상세
 */
export const FinishedMedicinePermissionDetailSchema: ObjectSchema = {
  name: FINISHED_MEDICINE_PERMISSION_DETAIL,
  primaryKey: "ITEM_SEQ",
  properties: {
    ITEM_SEQ: "string",
    ITEM_NAME: "string",
    ENTP_NAME: "string",
    ITEM_PERMIT_DATE: { type: "string", optional: true },
    ETC_OTC_CODE: { type: "string", optional: true },
    CHART: { type: "string", optional: true },
    BAR_CODE: { type: "string", optional: true },
    MATERIAL_NAME: { type: "string", optional: true },
    VALID_TERM: { type: "string", optional: true },
    STORAGE_METHOD: { type: "string", optional: true },
    PACK_UNIT: { type: "string", optional: true },
    MAIN_ITEM_INGR: { type: "string", optional: true },
    INGR_NAME: { type: "string", optional: true },
  },
};
