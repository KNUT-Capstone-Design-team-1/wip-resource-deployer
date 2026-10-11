/**
 * 대마
 */
export interface ICannabis {
  chemicalNameKr: string;
  chemicalNameEn: string;
  synonyms: string;
  casNumber: string;
  isomerCasNumber: string;
  molecularFormula: string;
  molecularWeight: string;
}

export type TCannabisResource = Record<"cannabis", Array<ICannabis>>;

export const CANNABIS_PROPERTY_MAP = {
  "품명(국문)": "chemicalNameKr",
  "품명(영문)": "chemicalNameEn",
  이명: "synonyms",
  "CAS No": "casNumber",
  "이성질체 CAS No": "isomerCasNumber",
  분자식: "molecularFormula",
  분자량: "molecularWeight",
} as const;
