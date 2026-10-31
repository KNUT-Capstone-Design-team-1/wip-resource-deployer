import { DRUG_RECOGNITION_PROPERTY_MAP } from "./drug_recognition_property_map";
import { FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP } from "./finished_medicine_permission_detail_property_map";
import { mapResourceProperties } from "../../utils/resource_mapper";

export type PillResourceName =
  "drug_recognition" | "finished_medicine_permission_detail";

/**
 * 원본의 빈 값과 숫자 셀을 문자열로 바꾸고 기존 문자열 내용은 그대로 보존
 */
function normalizePillValue(value: unknown): string {
  const isEmptyValue = value === null || value === undefined;

  if (isEmptyValue) {
    return "";
  }

  return String(value);
}

/**
 * 품목 행의 필수 컬럼·식별자·전문일반 명칭 검증
 */
function validatePillResourceRow(
  row: unknown,
  targets: string[],
  name: PillResourceName,
  index: number,
) {
  const fields = row as unknown as Record<string, string>;
  const missingFields = targets.filter((target) => !(target in fields));
  const hasMissingFields = missingFields.length > 0;

  if (hasMissingFields) {
    throw new Error(
      "[PILL-DATA] " +
        name +
        " 행 " +
        (index + 1) +
        ": 필수 컬럼 누락 " +
        missingFields.join(", ") +
        ". 완전한 원본 파일을 pill_data_sources.json에 지정하세요.",
    );
  }

  const isMissingItemSeq = !fields.ITEM_SEQ.trim();

  if (isMissingItemSeq) {
    throw new Error(
      "[PILL-DATA] " +
        name +
        " 행 " +
        (index + 1) +
        ": 품목일련번호가 없습니다.",
    );
  }

  const isCodedOtcValue = /^\d+$/.test(fields.ETC_OTC_CODE);

  if (isCodedOtcValue) {
    throw new Error(
      "[PILL-DATA] " +
        name +
        " 행 " +
        (index + 1) +
        ": 전문일반 코드 대신 명칭을 제공하는 원본이 필요합니다.",
    );
  }
}

/**
 * 기존 한글 헤더 또는 동일한 내부 필드명을 가진 완전한 원본만 변환
 * 축약 원본의 누락 정보나 코드값을 이름 변경만으로 복원하지 않는다.
 */
export function mapPillResourceRows(rows: unknown[], name: PillResourceName) {
  const isDrugRecognition = name === "drug_recognition";
  const legacyMap = isDrugRecognition
    ? DRUG_RECOGNITION_PROPERTY_MAP
    : FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP;
  const targets = [...new Set(Object.values(legacyMap))];
  const propertyMap = {
    ...legacyMap,
    ...Object.fromEntries(targets.map((target) => [target, target])),
  };
  const mapped = mapResourceProperties(rows, propertyMap, normalizePillValue);
  const isEmptyResource = mapped.length === 0;

  if (isEmptyResource) {
    throw new Error(
      "[PILL-DATA] " +
        name +
        ": 원본 데이터가 비어 있거나 지원하는 컬럼이 없습니다.",
    );
  }

  mapped.forEach((row, index) =>
    validatePillResourceRow(row, targets, name, index),
  );

  return mapped;
}
