/**
 * 마약류
 */
export interface INarcotics {
  chemicalNameKr: string;
  chemicalNameEn: string;
  synonyms: string;
  casNumber: string;
  isomerCasNumber: string;
  molecularFormula: string;
  molecularWeight: string;
}

export type TNarcoticsResource = Record<"narcotics", Array<INarcotics>>;

export const NARCOTICS_PROPERTY_MAP = {
  "품명(국문)": "chemicalNameKr",
  "품명(영문)": "chemicalNameEn",
  이명: "synonyms",
  "CAS No": "casNumber",
  "이성질체 CAS No": "isomerCasNumber",
  분자식: "molecularFormula",
  분자량: "molecularWeight",
} as const;
