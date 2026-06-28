import { IPillData } from "./pill_data";

/**
 * 통합 검색 데이터
 */
export interface IUnifiedSearchData extends Pick<
  IPillData,
  | "ITEM_NAME"
  | "ENTP_NAME"
  | "CHART"
  | "PRINT_FRONT"
  | "PRINT_BACK"
  | "DRUG_SHAPE"
  | "COLOR_CLASS1"
  | "COLOR_CLASS2"
  | "ENTP_ENG_NAME"
  | "MATERIAL_NAME"
  | "MATERIAL_ENG_NAME"
> {
  ITEM_SEQ: string;
  EE_DOC_DATA: string;
  UD_DOC_DATA: string;
  NB_DOC_DATA: string;
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

export const SEARCH_COLUMNS = [
  ...PILL_DATA_COLUMNS,
  "EE_DOC_DATA",
  "UD_DOC_DATA",
  "NB_DOC_DATA",
] as const;
