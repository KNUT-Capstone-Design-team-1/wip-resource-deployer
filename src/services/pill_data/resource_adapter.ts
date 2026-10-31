import { DRUG_RECOGNITION_PROPERTY_MAP } from "./drug_recognition_property_map";
import { FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP } from "./finished_medicine_permission_detail_property_map";
import { mappingProperty } from "../../utils/resource_mapper";

type PillResourceName =
  "drug_recognition" | "finished_medicine_permission_detail";

const ALIASES: Record<PillResourceName, Record<string, string>> = {
  drug_recognition: {
    CHARTN: "CHART",
    LENG_LONG: "LENGTH_LONG",
    LENG_SHORT: "LENGTH_SHORT",
    THICK: "LENGTH_THICK",
    MARK_CODE_FRONT_ANAL: "DRUG_SHAPE_FRONT",
    MARK_CODE_BACK_ANAL: "DRUG_SHAPE_BACK",
    MARK_CODE_FRONT_IMG: "MARK_IMAGE_FRONT",
    MARK_CODE_BACK_IMG: "MARK_IMAGE_BACK",
    EDI_CODE: "COVERAGE_ENG_NAME",
  },
  finished_medicine_permission_detail: {
    CNSGN_MANUF: "OEM_ENTP_NAME",
    EE_DOC_ID: "EE_DOC_DATA",
    UD_DOC_ID: "UD_DOC_DATA",
    NB_DOC_ID: "NB_DOC_DATA",
    INSERT_FILE: "ATT_DOC_DATA",
    REEXAM_TARGET: "REEXAM_TARGET_YN",
    REEXAM_DATE: "REEXAM_CONT",
    EDI_CODE: "INSURANCE_CODE",
    PERMIT_KIND: "APPROVAL_TYPE",
    ENTP_NO: "ENTP_PERMIT_NO",
    NARCOTIC_KIND: "DRUG_CLASS",
    NEWDRUG_CLASS_NAME: "NEW_DRUG_YN",
    INDUTY_TYPE: "INDUTY_CODE",
  },
};

/**
 * 원본의 빈 값을 빈 문자열로 바꾸고 문자열의 앞뒤 공백을 정리한다.
 */
function normalizePillValue(value: unknown): string {
  const isEmptyValue = value === null || value === undefined;

  if (isEmptyValue) {
    return "";
  }

  return String(value).trim();
}

/**
 * 식별자가 있는 행의 전문·일반 코드와 허가일자를 정규화한다.
 */
function normalizePillRow(row: Record<string, string>) {
  const isMissingItemSeq = !row.ITEM_SEQ;

  // 식별자가 없는 행끼리 병합하거나 서로 결합하지 않는다.
  if (isMissingItemSeq) {
    return [];
  }

  const otcNames: Record<string, string> = {
    "01": "일반의약품",
    "02": "전문의약품",
  };

  row.ETC_OTC_CODE = otcNames[row.ETC_OTC_CODE] ?? row.ETC_OTC_CODE;
  row.ITEM_PERMIT_DATE = row.ITEM_PERMIT_DATE.replace(
    /^(\d{4})-(\d{2})-(\d{2})$/,
    "$1$2$3",
  );

  return [row];
}

/**
 * 한글·영문 원본을 기존 내부 스키마로 변환하고 없는 항목은 빈 문자열로 유지한다.
 */
export function mapPillResourceRows(rows: unknown[], name: PillResourceName) {
  const isDrugRecognition = name === "drug_recognition";
  const legacyMap = isDrugRecognition
    ? DRUG_RECOGNITION_PROPERTY_MAP
    : FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP;
  const targets = Object.values(legacyMap);

  const propertyMap = {
    ...legacyMap,
    ...Object.fromEntries(targets.map((target) => [target, target])),
    ...ALIASES[name],
  };
  const defaults = Object.fromEntries(targets.map((target) => [target, ""]));

  const mapped = mappingProperty(rows, propertyMap, normalizePillValue);

  // SHAPE_CODE는 코드이고 FORM_CODE는 제형명이므로 그대로 대입하지 않는다.
  return mapped.flatMap((row) => {
    const normalized = { ...defaults, ...row } as Record<string, string>;

    return normalizePillRow(normalized);
  });
}
