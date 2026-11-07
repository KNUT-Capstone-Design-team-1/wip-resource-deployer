/** 식품안전나라 I2710 품목분류정보. id는 날짜를 제외한 내용의 SHA-256이다. */
export interface FunctionalFoodClassification {
  id: string;
  PRDCT_NM: string;
  IFTKN_ATNT_MATR_CN: string;
  PRIMARY_FNCLTY: string;
  DAY_INTK_LOWLIMIT: string;
  DAY_INTK_HIGHLIMIT: string;
  INTK_UNIT: string;
  INTK_MEMO: string;
  SKLL_IX_IRDNT_RAWMTRL: string;
  CRET_DTM: string;
  LAST_UPDT_DTM: string;
}

/** 식품안전나라 C003 품목제조신고(원재료). 신고번호를 제품 식별자로 사용한다. */
export interface HealthFunctionalFoodRawMaterial {
  /** functional_food_classification.id를 참조하는 JSON 문자열 배열. */
  CLASSIFICATION_IDS: string;
  LCNS_NO: string;
  BSSH_NM: string;
  PRDLST_REPORT_NO: string;
  PRDLST_NM: string;
  PRMS_DT: string;
  POG_DAYCNT: string;
  DISPOS: string;
  NTK_MTHD: string;
  PRIMARY_FNCLTY: string;
  IFTKN_ATNT_MATR_CN: string;
  CSTDY_MTHD: string;
  SHAP: string;
  STDR_STND: string;
  RAWMTRL_NM: string;
  CRET_DTM: string;
  LAST_UPDT_DTM: string;
  PRDT_SHAP_CD_NM: string;
}

export type FoodSafetyService = "I2710" | "C003";
export type FoodSafetyRow = Record<string, unknown>;
export interface FunctionalFoodOptions {
  apiUrl?: string;
  pageSize?: number;
  requestDelayMs?: number;
}
export interface FoodSafetyClientOptions extends FunctionalFoodOptions {
  apiKey?: string;
  fetchPage?: (
    service: FoodSafetyService,
    start: number,
    end: number,
  ) => Promise<unknown>;
  wait?: (ms: number) => Promise<void>;
}
