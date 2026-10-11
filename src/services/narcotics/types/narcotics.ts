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

