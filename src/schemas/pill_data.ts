import { ObjectSchema } from "realm";
import { PILL_DATA } from "../utils";

/**
 * 알약 데이터
 */
export const PillDataSchema: ObjectSchema = {
  name: PILL_DATA,
  primaryKey: "ITEM_SEQ",
  properties: {
    // Drug Recognition Schema
    ITEM_SEQ: "string", // 품목일련번호
    ITEM_NAME: "string", // 품목명
    ENTP_SEQ: "string", // 업소일련번호
    ENTP_NAME: "string", // 업소명
    ITEM_IMAGE: { type: "string", optional: true }, // 큰제품이미지
    PRINT_FRONT: { type: "string", optional: true }, // 표시앞
    PRINT_BACK: { type: "string", optional: true }, // 표시뒤
    DRUG_SHAPE: { type: "string", optional: true }, // 의약품제형
    COLOR_CLASS1: { type: "string", optional: true }, // 색상앞
    COLOR_CLASS2: { type: "string", optional: true }, // 색상뒤
    LINE_FRONT: { type: "string", optional: true }, // 분할선앞
    LINE_BACK: { type: "string", optional: true }, // 분할선뒤
    IMG_REGIST_TS: { type: "string", optional: true }, // 이미지생성일자(약학정보원)
    CLASS_NAME: { type: "string", optional: true }, // 분류명
    ETC_OTC_CODE: { type: "string", optional: true }, // 전문일반구분
    ITEM_PERMIT_DATE: { type: "string", optional: true }, // 품목허가일자
    // Finished Medicine Permission Detail Schema
    CHART: { type: "string", optional: true }, // 성상
    BAR_CODE: { type: "string", optional: true }, // 표준코드
    MATERIAL_NAME: { type: "string", optional: true }, // 원료성분
    VALID_TERM: { type: "string", optional: true }, // 유효기간
    STORAGE_METHOD: { type: "string", optional: true }, // 저장방법
    PACK_UNIT: { type: "string", optional: true }, // 포장단위
    MAIN_ITEM_INGR: { type: "string", optional: true }, // 주성분명
    INGR_NAME: { type: "string", optional: true }, // 첨가제명
    VECTOR: { type: "list", objectType: 'int', optional: true },
  },
};
