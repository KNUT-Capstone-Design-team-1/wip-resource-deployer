import { ObjectSchema } from "realm";
import { DRUG_RECOGNITION } from "../utils";

/**
 * 의약품 낱알식별정보
 */
const DrugRecognitionSchema: ObjectSchema = {
  name: DRUG_RECOGNITION,
  primaryKey: "ITEM_SEQ",
  properties: {
    ITEM_SEQ: "string",
    ITEM_NAME: "string",
    ENTP_SEQ: { type: "string", optional: true },
    ENTP_NAME: { type: "string", optional: true },
    CHARTIN: { type: "string", optional: true },
    ITEM_IMAGE: { type: "string", optional: true },
    PRINT_FRONT: { type: "string", optional: true },
    PRINT_BACK: { type: "string", optional: true },
    DRUG_SHAPE: { type: "string", optional: true },
    COLOR_CLASS1: { type: "string", optional: true },
    COLOR_CLASS2: { type: "string", optional: true },
    LINE_FRONT: { type: "string", optional: true },
    LINE_BACK: { type: "string", optional: true },
    LENG_LONG: { type: "string", optional: true },
    LENG_SHORT: { type: "string", optional: true },
    THICK: { type: "string", optional: true },
    IMG_REGIST_TS: { type: "string", optional: true },
    CLASS_NO: { type: "string", optional: true },
    ETC_OTC_CODE: { type: "string", optional: true },
    ITEM_PERMIT_DATE: { type: "string", optional: true },
    SHAPE_CODE: { type: "string", optional: true },
    MARK_CODE_FRONT_ANAL: { type: "string", optional: true },
    MARK_CODE_BACK_ANAL: { type: "string", optional: true },
    MARK_CODE_FRONT_IMG: { type: "string", optional: true },
    MARK_CODE_BACK_IMG: { type: "string", optional: true },
    ITEM_ENG_NAME: { type: "string", optional: true },
    EDI_CODE: { type: "string", optional: true },
  },
};

export default DrugRecognitionSchema;
