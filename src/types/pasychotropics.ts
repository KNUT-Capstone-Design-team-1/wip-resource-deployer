/**
 * 향정신성 약물
 */
export interface IPasychotropics {
  chemicalNameKr: string;
  chemicalNameEn: string;
  synonyms: string;
  casNumber: string;
  isomerCasNumber: string;
  molecularFormula: string;
  molecularWeight: string;
}

export type TPasychotropicsResource = Record<
  "pasychotropics",
  Array<IPasychotropics>
>;

export const PASYCHOTROPICS_PROPERTY_MAP = {
  "품명(국문)": "chemicalNameKr",
  "품명(영문)": "chemicalNameEn",
  이명: "synonyms",
  "CAS No": "casNumber",
  "이성질체 CAS No": "isomerCasNumber",
  분자식: "molecularFormula",
  분자량: "molecularWeight",
} as const;
