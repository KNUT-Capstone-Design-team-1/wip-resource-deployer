import path from "path";
import fs from "fs";
import {
  TResourceDirectoryName,
  DRUG_RECOGNITION_PROPERTY_MAP,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  NEARBY_PHARMACIES_PROPERTY_MAP,
  CANNABIS_PROPERTY_MAP,
  NARCOTICS_PROPERTY_MAP,
  psychotropics_PROPERTY_MAP,
  PROHIBITED_LIST_PROPERTY_MAP,
  CATEGORY_REGEX,
  IProhibitedList,
  CATEGORY_MAP,
} from "../types";

/**
 * 원천 데이터를 저장할 디렉터리 생성
 */
export function createResourcesDirectory() {
  const dirPath = path.resolve(__dirname, "../../resources");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 리소스 별 프로퍼티 맵
 */
export const RESOURCE_PROPERTY_MAP: Record<
  TResourceDirectoryName,
  Record<string, string>
> = {
  drug_recognition: DRUG_RECOGNITION_PROPERTY_MAP,
  finished_medicine_permission_detail:
    FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  nearby_pharmacies: NEARBY_PHARMACIES_PROPERTY_MAP,
  cannabis: CANNABIS_PROPERTY_MAP,
  narcotics: NARCOTICS_PROPERTY_MAP,
  psychotropics: psychotropics_PROPERTY_MAP,
  prohibited_list: PROHIBITED_LIST_PROPERTY_MAP,
} as const;

/**
 * PDF 리소스용 설정 인터페이스
 */
export interface IPDFProcessorConfig<T> {
  sectionRegex?: RegExp;
  promptGenerator: (content: string, category?: string) => string;
  postProcessor?: (items: any[], category?: string) => T[];
}

/**
 * PDF 리소스용 설정
 */
export const PDF_RESOURCE_CONFIG: Record<string, IPDFProcessorConfig<any>> = {
  prohibited_list: {
    sectionRegex: CATEGORY_REGEX,
    promptGenerator: (content: string, category?: string) => `
You are a medical substance extraction expert specialized in the WADA Prohibited List.
Extract all prohibited substances from the provided text, which is from the 2026 Prohibited List International Standard.

CRITICAL RULES:
1. Extract the substance English names (genericEn).
2. For EACH substance, identify its category code (e.g., S1, S2, S6, P1, M1). If a specific category code is mentioned in the text context (like "S1. ANABOLIC AGENTS"), use it.
3. For EACH substance, determine if it is prohibited "In-Competition" and "Out-of-Competition".
   - Look for headers like "PROHIBITED AT ALL TIMES (IN- AND OUT-OF-COMPETITION)" or "PROHIBITED IN-COMPETITION".
   - inGameProhibited: 1 if prohibited In-Competition, 0 otherwise.
   - outGameProhibited: 1 if prohibited Out-of-Competition, 0 otherwise.
4. Extract ONLY English names.
5. Deduplicate.

Output STRICT JSON ARRAY of objects:
[
  { 
    "genericEn": "Substance Name",
    "category": "S1",
    "inGameProhibited": 1,
    "outGameProhibited": 1
  },
  ...
]

Text:
${content}
`,
    postProcessor: (items: any[], category?: string): IProhibitedList[] => {
      return items.map((item) => {
        // LLM이 추출한 카테고리를 우선 사용하되, 없으면 섹션 카테고리 사용
        const categoryCode = item.category || category;
        const categoryInfo = categoryCode ? CATEGORY_MAP[categoryCode] : null;

        return {
          genericKr: "", // 번역 프로세스에서 채워질 예정
          genericEn: item.genericEn,
          category: categoryCode as any,
          categoryKr: (categoryInfo?.kr || "") as any,
          categoryEn: (categoryInfo?.en || "") as any,
          inGameProhibited: (item.inGameProhibited ?? categoryInfo?.inGame ?? 0) as 0 | 1,
          outGameProhibited: (item.outGameProhibited ?? categoryInfo?.outGame ?? 0) as 0 | 1,
        };
      });
    },
  },
};
