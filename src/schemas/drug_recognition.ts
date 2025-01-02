import { ObjectSchema } from "realm";
import { DRUG_RECOGNITION } from "../utils";

/**
 * 의약품 낱알식별정보
 */
export const DrugRecognitionSchema: ObjectSchema = {
  name: DRUG_RECOGNITION,
  primaryKey: "ITEM_SEQ",
  properties: {
    ITEM_SEQ: "string",
    ITEM_NAME: "string",
    ENTP_SEQ: "string",
    ENTP_NAME: "string",
    ITEM_IMAGE: { type: "string", optional: true },
    PRINT_FRONT: { type: "string", optional: true },
    PRINT_BACK: { type: "string", optional: true },
    DRUG_SHAPE: { type: "string", optional: true },
    COLOR_CLASS1: { type: "string", optional: true },
    COLOR_CLASS2: { type: "string", optional: true },
    LINE_FRONT: { type: "string", optional: true },
    LINE_BACK: { type: "string", optional: true },
    IMG_REGIST_TS: { type: "string", optional: true },
    ETC_OTC_CODE: { type: "string", optional: true },
    ITEM_PERMIT_DATE: { type: "string", optional: true },
    VECTOR: { type: "list", objectType: 'int', optional: true }
  },
};
