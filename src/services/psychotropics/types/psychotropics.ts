/**
 * 향정신성 약물
 */
export interface Ipsychotropics {
  chemicalNameKr: string;
  chemicalNameEn: string;
  synonyms: string;
  casNumber: string;
  isomerCasNumber: string;
  molecularFormula: string;
  molecularWeight: string;
}

export type TpsychotropicsResource = Record<
  "psychotropics",
  Array<Ipsychotropics>
>;
