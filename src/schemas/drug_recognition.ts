import { ObjectSchema } from "realm";

/**
 * 의약품 낱알식별정보
 */
export interface IDrugRecognition {
  ITEM_SEQ: string; // 품목 일련 번호
  ITEM_NAME: string; // 품목명
  ENTP_SEQ: string; // 업체 일련 번호
  ENTP_NAME: string; // 업체명
  CHARTIN: string; // 제형
  ITEM_IMAGE: string; // 큰 제품 이미지
  PRINT_FRONT: string; // 글자 앞
  PRINT_BACK: string; // 글자 뒤
  DRUG_SHAPE: string; // 모양
  COLOR_CLASS1: string; // 색깔 (앞)
  COLOR_CLASS2: string; // 색깔 뒤
  LINE_FRONT: string; // 분할선 (앞)
  LINE_BACK: string; // 분할선 (뒤)
  LENG_LONG: string; // 크기 (장축)
  LENG_SHORT: string; // 크기 (단축)
  THICK: string; // 두께
  IMG_REGIST_TS: string; // 약학 정보원 이미지 생성일
  CLASS_NO: string; // 분류 번호
  ETC_OTC_CODE: string; // 전문/일반
  ITEM_PERMIT_DATE: string; // 품목 허가 일자
  SHAPE_CODE: string; // 제형 코드
  MARK_CODE_FRONT_ANAL: string; // 마크 내용 (앞)
  MARK_CODE_BACK_ANAL: string; // 마크 내용 (뒤)
  MARK_CODE_FRONT_IMG: string; // 마크 이미지 (앞)
  MARK_CODE_BACK_IMG: string; // 마크 이미지 (뒤)
  ITEM_ENG_NAME: string; // 제품 영문명
  EDI_CODE: string; // 보험 코드
}

const DrugRecognitionSchema: ObjectSchema = {
  name: "DrugRecognition",
  properties: {
    ITEM_SEQ: "string",
    ITEM_NAME: "string",
    ENTP_SEQ: "string",
    ENTP_NAME: "string",
    CHARTIN: "string",
    ITEM_IMAGE: "string",
    PRINT_FRONT: "string",
    PRINT_BACK: "string",
    DRUG_SHAPE: "string",
    COLOR_CLASS1: "string",
    COLOR_CLASS2: "string",
    LINE_FRONT: "string",
    LINE_BACK: "string",
    LENG_LONG: "string",
    LENG_SHORT: "string",
    THICK: "string",
    IMG_REGIST_TS: "string",
    CLASS_NO: "string",
    ETC_OTC_CODE: "string",
    ITEM_PERMIT_DATE: "string",
    SHAPE_CODE: "string",
    MARK_CODE_FRONT_ANAL: "string",
    MARK_CODE_BACK_ANAL: "string",
    MARK_CODE_FRONT_IMG: "string",
    MARK_CODE_BACK_IMG: "string",
    ITEM_ENG_NAME: "string",
    EDI_CODE: "string",
  },
};

export default DrugRecognitionSchema;
