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
import { PROMPTS } from "./prompts";

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
  postProcessor?: (items: unknown, category?: string) => T[];
}

/**
 * 도핑 금지 약물 리소스 설정 생성
 */
function getProhibitedListConfig(): IPDFProcessorConfig<IProhibitedList> {
  const sectionRegex = CATEGORY_REGEX;

  const promptGenerator = (content: string) => {
    return PROMPTS.prohibited_list.replace("{{content}}", content);
  };

  const postProcessor = (
    items: unknown,
    category?: string,
  ): IProhibitedList[] => {
    const extractItems = (data: any): any[] => {
      if (Array.isArray(data)) {
        return data;
      }

      if (data && typeof data === "object") {
        return data.items || data.substances || [];
      }

      return [];
    };

    return extractItems(items).map((item: any) => {
      const categoryCode =
        item.category || (category as IProhibitedList["category"]);
      const categoryInfo = categoryCode ? CATEGORY_MAP[categoryCode] : null;

      return {
        genericKr: "",
        genericEn: item.genericEn || "",
        category: categoryCode,
        categoryKr: categoryInfo?.kr || "",
        categoryEn: categoryInfo?.en || "",
        inGameProhibited: item.inGameProhibited ?? (categoryInfo?.inGame || 0),
        outGameProhibited:
          item.outGameProhibited ?? (categoryInfo?.outGame || 0),
      } as IProhibitedList;
    });
  };

  return { sectionRegex, promptGenerator, postProcessor };
}

/**
 * PDF 리소스용 설정 정보를 반환하는 함수
 */
export function getPDFResourceConfig(): Record<
  string,
  IPDFProcessorConfig<any>
> {
  return { prohibited_list: getProhibitedListConfig() };
}
