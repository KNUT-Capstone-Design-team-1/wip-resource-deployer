/**
 * 도핑 금지 약물
 */
export interface IProhibitedList {
  genericKr: string;
  genericEn: string;
  category:
    | "S0"
    | "S1"
    | "S2"
    | "S3"
    | "S4"
    | "S5"
    | "S6"
    | "S7"
    | "S8"
    | "S9"
    | "P1"
    | "M1";
  categoryKr:
    | "동화작용제"
    | "펩티드호르몬, 성장인자, 관련 약물 및 유사제"
    | "베타-2 작용제"
    | "호르몬 및 대사변조제"
    | "이뇨제 및 은폐제"
    | "흥분제"
    | "마약"
    | "카나비노이드"
    | "글로코코르티코이드"
    | "베타차단제";
  categoryEn:
    | "Anabolic Agents"
    | "Peptide Hormones, Growth Factors, Related Substances, And Mimetics"
    | "Beta-2 Agonists"
    | "Hormone And Metabolic Modulators"
    | "Diuretics And Masking Agents"
    | "Stimulants"
    | "Narcotics"
    | "Cannabinoids"
    | "Glucocorticoids"
    | "Beta-Blockers";
  inGameProhibited: 0 | 1;
  outGameProhibited: 0 | 1;
}

export type TProhibitedListResource = Record<
  "prohibitedList",
  Array<IProhibitedList>
>;

export const PROHIBITED_LIST_PROPERTY_MAP = {
  genericKr: "genericKr",
  genericEn: "genericEn",
  category: "category",
  categoryKr: "categoryKr",
  categoryEn: "categoryEn",
  inGameProhibited: "inGameProhibited",
  outGameProhibited: "outGameProhibited",
} as const;

export const CATEGORY_REGEX = /(S[0-9]|P1|M[1-3])/g;

export const CATEGORY_MAP: Record<
  string,
  { kr: string; en: string; inGame: 0 | 1; outGame: 0 | 1 }
> = {
  S0: {
    kr: "비승인약물",
    en: "Non-approved substances",
    inGame: 1,
    outGame: 1,
  },
  S1: {
    kr: "동화작용제",
    en: "Anabolic Agents",
    inGame: 1,
    outGame: 1,
  },
  S2: {
    kr: "펩티드호르몬, 성장인자, 관련 약물 및 유사제",
    en: "Peptide Hormones, Growth Factors, Related Substances, And Mimetics",
    inGame: 1,
    outGame: 1,
  },
  S6: {
    kr: "흥분제",
    en: "Stimulants",
    inGame: 1,
    outGame: 0,
  },
  S7: {
    kr: "마약",
    en: "Narcotics",
    inGame: 1,
    outGame: 0,
  },
  S8: {
    kr: "카나비노이드",
    en: "Cannabinoids",
    inGame: 1,
    outGame: 0,
  },
  S9: {
    kr: "글로코코르티코이드",
    en: "Glucocorticoids",
    inGame: 1,
    outGame: 0,
  },
  P1: {
    kr: "베타차단제",
    en: "Beta-Blockers",
    inGame: 1,
    outGame: 0,
  },
} as const;
