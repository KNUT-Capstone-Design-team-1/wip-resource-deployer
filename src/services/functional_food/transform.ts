import { createHash } from "node:crypto";
import logger from "../../utils/logger";
import type {
  FoodSafetyRow,
  FunctionalFoodClassification,
  HealthFunctionalFoodRawMaterial,
} from "./types";

export const CLASSIFICATION_FIELDS = [
  "PRDCT_NM",
  "IFTKN_ATNT_MATR_CN",
  "PRIMARY_FNCLTY",
  "DAY_INTK_LOWLIMIT",
  "DAY_INTK_HIGHLIMIT",
  "INTK_UNIT",
  "INTK_MEMO",
  "SKLL_IX_IRDNT_RAWMTRL",
  "CRET_DTM",
  "LAST_UPDT_DTM",
] as const;
const CLASSIFICATION_IDENTITY_FIELDS = CLASSIFICATION_FIELDS.filter(
  (key) => key !== "CRET_DTM" && key !== "LAST_UPDT_DTM",
);

export const RAW_MATERIAL_FIELDS = [
  "LCNS_NO",
  "BSSH_NM",
  "PRDLST_REPORT_NO",
  "PRDLST_NM",
  "PRMS_DT",
  "POG_DAYCNT",
  "DISPOS",
  "NTK_MTHD",
  "PRIMARY_FNCLTY",
  "IFTKN_ATNT_MATR_CN",
  "CSTDY_MTHD",
  "SHAP",
  "STDR_STND",
  "RAWMTRL_NM",
  "CRET_DTM",
  "LAST_UPDT_DTM",
  "PRDT_SHAP_CD_NM",
] as const;

/** 원문 단위와 설명을 보존하면서 모든 필드를 SQLite TEXT 값으로 통일한다. */
function textFields<K extends string>(
  row: FoodSafetyRow,
  fields: readonly K[],
): Record<K, string> {
  return Object.fromEntries(
    fields.map((key) => {
      const value = row[key];
      if (
        value != null &&
        typeof value !== "string" &&
        typeof value !== "number"
      ) {
        throw new Error("Invalid functional food field: " + key);
      }
      return [key, value == null ? "" : String(value).trim()];
    }),
  ) as Record<K, string>;
}

/** 동일 식별자는 최종수정일이 가장 최근인 항목을 사용한다. */
function latestRows<T extends { LAST_UPDT_DTM: string }>(
  rows: T[],
  getId: (row: T) => string,
): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    const id = getId(row);
    const previous = byId.get(id);
    if (!previous || row.LAST_UPDT_DTM >= previous.LAST_UPDT_DTM)
      byId.set(id, row);
  }
  return [...byId.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

export function createFunctionalFoodClassifications(
  rows: FoodSafetyRow[],
): FunctionalFoodClassification[] {
  const skipped: { row: number; fields: string[] }[] = [];
  const records = rows.flatMap((row, index) => {
    const record = textFields(row, CLASSIFICATION_FIELDS);
    if (!record.PRDCT_NM) {
      skipped.push({ row: index + 1, fields: Object.keys(row) });
      return [];
    }
    const identity = CLASSIFICATION_IDENTITY_FIELDS.map((key) => record[key]);
    return [
      {
        id: createHash("sha256").update(JSON.stringify(identity)).digest("hex"),
        ...record,
      },
    ];
  });
  if (skipped.length > 0) {
    logger.warn(
      "[FUNCTIONAL-FOOD] service=I2710 skipped=%s total=%s reason=missing_PRDCT_NM samples=%j",
      skipped.length,
      rows.length,
      skipped.slice(0, 3),
    );
  }
  if (records.length === 0) {
    throw new Error(
      "I2710 has no valid PRDCT_NM rows; existing resources preserved",
    );
  }
  return latestRows(records, (row) => row.id);
}

export function createHealthFunctionalFoodRawMaterials(
  rows: FoodSafetyRow[],
  classifications: FunctionalFoodClassification[],
): HealthFunctionalFoodRawMaterial[] {
  const classificationIdsByName = new Map<string, string[]>();
  for (const item of classifications) {
    const name = normalizeMaterialName(item.PRDCT_NM);
    const ids = classificationIdsByName.get(name) ?? [];
    ids.push(item.id);
    classificationIdsByName.set(name, ids);
  }
  const records = rows.map((row) => {
    const record = textFields(row, RAW_MATERIAL_FIELDS);
    if (!record.PRDLST_REPORT_NO || !record.PRDLST_NM)
      throw new Error("C003 row has no report number or product name");
    const names = new Set(
      splitRawMaterials(record.RAWMTRL_NM).map(normalizeMaterialName),
    );
    const ids = [...names]
      .flatMap((name) => classificationIdsByName.get(name) ?? [])
      .sort();
    return { ...record, CLASSIFICATION_IDS: JSON.stringify([...new Set(ids)]) };
  });
  return latestRows(records, (row) => row.PRDLST_REPORT_NO);
}

/** 괄호 안의 설명에 들어 있는 쉼표는 원재료 경계로 취급하지 않는다. */
export function splitRawMaterials(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    depth = materialDepth(char, depth);
    if (isMaterialSeparator(char, depth)) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

/** 띄어쓰기·대소문자만 통일한다. 부분 일치나 임의의 동의어로 연결하지 않는다. */
function normalizeMaterialName(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

function materialDepth(char: string, depth: number) {
  if ("([{（".includes(char)) return depth + 1;
  if (")]}）".includes(char)) return Math.max(0, depth - 1);
  return depth;
}

function isMaterialSeparator(char: string, depth: number) {
  return (char === "," || char === "\n") && depth === 0;
}
