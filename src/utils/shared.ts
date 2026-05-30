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
