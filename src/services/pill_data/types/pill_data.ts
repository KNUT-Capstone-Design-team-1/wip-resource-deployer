/** pill_data.json의 공개 스키마. API 응답 타입과 독립적으로 유지한다. */
export interface IPillData {
  ITEM_NAME: string; // 품목명
  ITEM_ENG_NAME: string; // 품목 영문명
  ITEM_SEQ: string; // 품목일련번호
  ENTP_NAME: string; // 업체명
  ENTP_ENG_NAME: string; // 업체 영문명
  ITEM_PERMIT_DATE: string; // 허가일자
  ETC_OTC_CODE: string; // 전문일반
  CHART: string; // 성상
  MATERIAL_NAME: string; // 원료성분
  MATERIAL_ENG_NAME: string; // 영문성분명
  STORAGE_METHOD: string; // 저장방법
  VALID_TERM: string; // 유효기간
  PACK_UNIT: string; // 포장단위
  INSURANCE_CODE: string; // 보험코드
  DRUG_CLASS: string; // 마약류분류
  NEW_DRUG_YN: string; // 신약여부
  CHANGE_CONTENT: string; // 변경내용
  TOTAL_CONTENT: string; // 총량
  MAIN_ITEM_INGR: string; // 주성분명
  INGR_NAME: string; // 첨가제명
  ATC_CODE: string; // ATC코드
  RARE_DRUG_YN: string; // 희귀의약품여부
  OEM_ENTP_NAME: string; // 위탁제조업체
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
  CLASS_NO: string; // 분류번호
  CLASS_NAME: string; // 분류명
  FORM_CODE: string; // 제형코드명
  MARK_CODE_FRONT: string; // 표기코드앞
  MARK_CODE_BACK: string; // 표기코드뒤
  CHANGE_DATE: string; // 변경일자
  COVERAGE_ENG_NAME: string; // 보험코드
  /** 명사형 효능 키워드를 공백 없는 쉼표로 연결한 문자열 */
  EFFECT_KEYWORD?: string | null;
  /** 키워드 추출 전 수식어와 적응 조건을 보존한 줄글 */
  EFFECT_SUMMARY?: string | null;
}
