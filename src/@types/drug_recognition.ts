/**
 * 의약품 낱알식별정보
 */
export interface IDrugRecognition {
  ITEM_SEQ: string; // 품목일련번호
  ITEM_NAME: string; // 품목명
  ENTP_SEQ: string; // 업소일련번호
  ENTP_NAME: string; // 업소명
  ITEM_IMAGE: string; // 큰제품이미지
  PRINT_FRONT: string; // 표시앞
  PRINT_BACK: string; // 표시뒤
  DRUG_SHAPE: string; // 의약품제형
  COLOR_CLASS1: string; // 색상앞
  COLOR_CLASS2: string; // 색상뒤
  LINE_FRONT: string; // 분할선앞
  LINE_BACK: string; // 분할선뒤
  IMG_REGIST_TS: string; // 이미지생성일자(약학정보원)
  CLASS_NAME: string; // 분류명
  ETC_OTC_CODE: string; // 전문일반구분
  ITEM_PERMIT_DATE: string; // 품목허가일자
  MARK_CODE_FRONT: string; // 표기코드앞
  MARK_CODE_BACK: string; // 표기코드뒤
  FORM_CODE: string; // 제형코드
}
