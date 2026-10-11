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

