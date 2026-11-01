import { IDrugRecognition } from "./types/drug_recognition";
import { IDrugProductPermissionDetail } from "./types/drug_product_permission_detail";
import { IPillData } from "./types/pill_data";
import { createEffectSummary } from "./effect_summary/summary";
import { mergeDuplicateObjectArray } from "../../utils/collections";

/**
 * 누락 값 문자열 변환
 */
function text(value: string | number | null | undefined): string {
  return value == null ? "" : String(value);
}

/**
 * 낱알식별 필드 변환
 */
function toDrugRecognition(item: IDrugRecognition) {
  return {
    ITEM_SEQ: text(item.ITEM_SEQ),
    ITEM_NAME: text(item.ITEM_NAME),
    ITEM_ENG_NAME: text(item.ITEM_ENG_NAME),
    ENTP_NAME: text(item.ENTP_NAME),
    ITEM_PERMIT_DATE: text(item.ITEM_PERMIT_DATE),
    ETC_OTC_CODE: text(item.ETC_OTC_NAME),
    CHART: text(item.CHART),
    ITEM_IMAGE: text(item.ITEM_IMAGE),
    PRINT_FRONT: text(item.PRINT_FRONT),
    PRINT_BACK: text(item.PRINT_BACK),
    DRUG_SHAPE: text(item.DRUG_SHAPE),
    COLOR_CLASS1: text(item.COLOR_CLASS1),
    COLOR_CLASS2: text(item.COLOR_CLASS2),
    LINE_FRONT: text(item.LINE_FRONT),
    LINE_BACK: text(item.LINE_BACK),
    LENGTH_LONG: text(item.LENG_LONG),
    LENGTH_SHORT: text(item.LENG_SHORT),
    LENGTH_THICK: text(item.THICK),
    CLASS_NO: text(item.CLASS_NO),
    CLASS_NAME: text(item.CLASS_NAME),
    FORM_CODE: text(item.FORM_CODE_NAME),
    MARK_CODE_FRONT: text(item.MARK_CODE_FRONT),
    MARK_CODE_BACK: text(item.MARK_CODE_BACK),
    CHANGE_DATE: text(item.CHANGE_DATE),
    COVERAGE_ENG_NAME: text(item.EDI_CODE),
  };
}

/**
 * 각인 문자열 정리
 */
function replacePrint(print: string): string {
  return print
    .replace(/\u3000+|=+|\s{2, }/g, " ")
    .replace(/-{2,}|분할선/g, (match) => (match === "분할선" ? "|" : ""));
}

/**
 * 품목별 허가 정보 색인
 */
function indexPermissions(
  drugProductPermissionDetails: IDrugProductPermissionDetail[],
) {
  const permissions = new Map<string, IDrugProductPermissionDetail>();

  for (const permission of drugProductPermissionDetails) {
    const itemSeq = text(permission.ITEM_SEQ);

    const shouldIndex = Boolean(itemSeq) && !permissions.has(itemSeq);
    if (shouldIndex) {
      permissions.set(itemSeq, permission);
    }
  }

  return permissions;
}

/**
 * 알약 정보 병합·변환
 */
export function createPillData(
  drugRecognition: IDrugRecognition[],
  drugProductPermissionDetails: IDrugProductPermissionDetail[],
): IPillData[] {
  const permissions = indexPermissions(drugProductPermissionDetails);
  const drugs = mergeDuplicateObjectArray(
    "ITEM_SEQ",
    drugRecognition.map(toDrugRecognition),
  );

  return drugs.flatMap((drug): IPillData[] => {
    const permission = permissions.get(drug.ITEM_SEQ);

    const hasPermission = permission !== undefined;
    if (!hasPermission) {
      return [];
    }

    return [
      {
        ...drug,
        ENTP_ENG_NAME: text(permission.ENTP_ENG_NAME),
        MATERIAL_NAME: text(permission.MATERIAL_NAME),
        MATERIAL_ENG_NAME: text(permission.MAIN_INGR_ENG),
        STORAGE_METHOD: text(permission.STORAGE_METHOD),
        VALID_TERM: text(permission.VALID_TERM),
        PACK_UNIT: text(permission.PACK_UNIT),
        INSURANCE_CODE: text(permission.EDI_CODE),
        DRUG_CLASS: text(permission.NARCOTIC_KIND_CODE),
        NEW_DRUG_YN: text(permission.NEWDRUG_CLASS_NAME),
        // 제품 허가 API에는 기존 파일 원본의 변경내용 필드가 없다.
        CHANGE_CONTENT: "",
        TOTAL_CONTENT: text(permission.TOTAL_CONTENT),
        MAIN_ITEM_INGR: text(permission.MAIN_ITEM_INGR),
        INGR_NAME: text(permission.INGR_NAME),
        ATC_CODE: text(permission.ATC_CODE),
        RARE_DRUG_YN: text(permission.RARE_DRUG_YN),
        OEM_ENTP_NAME: text(permission.CNSGN_MANUF),
        ITEM_NAME: drug.ITEM_NAME.trim().replace(/\s{2, }/g, " "),
        PRINT_FRONT: replacePrint(drug.PRINT_FRONT),
        PRINT_BACK: replacePrint(drug.PRINT_BACK),
        EFFECT_SUMMARY: createEffectSummary(drug.CLASS_NAME),
      },
    ];
  });
}
