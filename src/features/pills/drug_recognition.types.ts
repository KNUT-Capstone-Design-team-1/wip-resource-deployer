/**
 * 의약품 낱알식별정보
 */
export interface IDrugRecognition {
  ITEM_SEQ: string; // 품목일련번호
  ITEM_NAME: string; // 품목명
  ENTP_SEQ: string; // 업소일련번호
  ENTP_NAME: string; // 업소명
  CHART: string; // 성상
  ITEM_IMAGE: string; // 큰제품이미지
  PRINT_FRONT: string; // 표시앞
  PRINT_BACK: string; // 표시뒤
  DRUG_SHAPE: string; // 의약품제형
  COLOR_CLASS1: string; // 색상앞
  COLOR_CLASS2: string; // 색상뒤
  LINE_FRONT: string; // 분할선앞
  LINE_BACK: string; // 분할선뒤
  LENGTH_LONG: string; // 크기장축
  LENGTH_SHORT: string; // 크기단축
  LENGTH_THICK: string; // 크기두께
  IMG_REGIST_TS: string; // 이미지생성일자(약학정보원)
  CLASS_NO: string; // 분류번호
  CLASS_NAME: string; // 분류명
  ETC_OTC_CODE: string; // 전문일반구분
  ITEM_PERMIT_DATE: string; // 품목허가일자
  FORM_CODE: string; // 제형코드명
  DRUG_SHAPE_FRONT: string; // 표기내용앞
  DRUG_SHAPE_BACK: string; // 표기내용뒤
  MARK_IMAGE_FRONT: string; // 표기이미지앞
  MARK_IMAGE_BACK: string; // 표기이미지뒤
  MARK_CODE_FRONT: string; // 표기코드앞
  MARK_CODE_BACK: string; // 표기코드뒤
  CHANGE_DATE: string; // 변경일자
  BUSINESS_LICENCE_NUMBER: string; // 사업자번호
  ITEM_ENG_NAME: string; // 품목영문명
  COVERAGE_ENG_NAME: string; // 보험코드
  BAR_CODE: string; // 표준코드
}

export type TDrugRecognitionResource = Record<
  "drugRecognition",
  Array<IDrugRecognition>
>;

export const DRUG_RECOGNITION_PROPERTY_MAP = {
  품목일련번호: "ITEM_SEQ",
  품목명: "ITEM_NAME",
  업소일련번호: "ENTP_SEQ",
  업소명: "ENTP_NAME",
  성상: "CHART",
  큰제품이미지: "ITEM_IMAGE",
  표시앞: "PRINT_FRONT",
  표시뒤: "PRINT_BACK",
  의약품제형: "DRUG_SHAPE",
  색상앞: "COLOR_CLASS1",
  색상뒤: "COLOR_CLASS2",
  분할선앞: "LINE_FRONT",
  분할선뒤: "LINE_BACK",
  크기장축: "LENGTH_LONG",
  크기단축: "LENGTH_SHORT",
  크기두께: "LENGTH_THICK",
  "이미지생성일자(약학정보원)": "IMG_REGIST_TS",
  분류번호: "CLASS_NO",
  분류명: "CLASS_NAME",
  전문일반구분: "ETC_OTC_CODE",
  품목허가일자: "ITEM_PERMIT_DATE",
  제형코드명: "FORM_CODE",
  표기내용앞: "DRUG_SHAPE_FRONT",
  표기내용뒤: "DRUG_SHAPE_BACK",
  표기이미지앞: "MARK_IMAGE_FRONT",
  표기이미지뒤: "MARK_IMAGE_BACK",
  표기코드앞: "MARK_CODE_FRONT",
  표기코드뒤: "MARK_CODE_BACK",
  변경일자: "CHANGE_DATE",
  사업자번호: "BUSINESS_LICENCE_NUMBER",
  품목영문명: "ITEM_ENG_NAME",
  보험코드: "COVERAGE_ENG_NAME",
  표준코드: "BAR_CODE",
} as const;
