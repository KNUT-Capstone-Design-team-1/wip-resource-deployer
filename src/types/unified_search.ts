import { IPillData } from "./pill_data";

/**
 * 통합 검색 데이터
 */
export interface IUnifiedSearchData extends IPillData {
  EE_DOC_DATA: string;
  UD_DOC_DATA: string;
  NB_DOC_DATA: string;
}
