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
    CNSGN_MANUF: { type: "string", optional: true },
    ETC_OTC_CODE: { type: "string", optional: true },
    CHART: { type: "string", optional: true },
    BAR_CODE: { type: "string", optional: true },
    MATERIAL_NAME: { type: "string", optional: true },
    EE_DOC_ID: { type: "string", optional: true },
    UD_DOC_ID: { type: "string", optional: true },
    NB_DOC_ID: { type: "string", optional: true },
    INSERT_FILE: { type: "string", optional: true },
    VALID_TERM: { type: "string", optional: true },
    STORAGE_METHOD: { type: "string", optional: true },
    REEXAM_TARGET: { type: "string", optional: true },
    REEXAM_DATE: { type: "string", optional: true },
    PACK_UNIT: { type: "string", optional: true },
    EDI_CODE: { type: "string", optional: true },
    PERMIT_KIND: { type: "string", optional: true },
    ENTP_NO: { type: "string", optional: true },
    NARCOTIC_KIND: { type: "string", optional: true },
    NEWDRUG_CLASS_NAME: { type: "string", optional: true },
    INDUTY_TYPE: { type: "string", optional: true },
    MAIN_ITEM_INGR: { type: "string", optional: true },
    INGR_NAME: { type: "string", optional: true },
  },
};
