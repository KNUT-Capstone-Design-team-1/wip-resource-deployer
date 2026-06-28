/**
 * 통합 검색 데이터
 */
export interface IUnifiedSearchData {
  ITEM_SEQ: string;
  CONTENTS: string;
}

export const PILL_DATA_COLUMNS = [
  "ITEM_NAME",
  "ENTP_NAME",
  "CHART",
  "PRINT_FRONT",
  "PRINT_BACK",
  "DRUG_SHAPE",
  "COLOR_CLASS1",
  "COLOR_CLASS2",
  "ENTP_ENG_NAME",
  "MATERIAL_NAME",
  "MATERIAL_ENG_NAME",
] as const;
