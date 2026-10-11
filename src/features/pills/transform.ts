import { IDrugRecognition } from "./drug_recognition.types";
import { IFinishedMedicinePermissionDetail } from "./finished_medicine_permission_detail.types";
import { IPillData } from "./pill_data.types";
import { mergeDuplicateObjectArray } from "../../shared/collections";
/**
 * 의약품 낱알식별정보 데이터 전처리
 * @param drugRecognition 의약품 낱알식별정보 데이터
 * @returns
 */
function preprocessingDrugRecognition(drugRecognition: Array<IDrugRecognition>) {
  const replacePrint = (print: string) => print
    .replace(/\u3000+|=+|\s{2, }/g, " ")
    .replace(/-{2,}|분할선/g, (match) => (match === "분할선" ? "|" : ""));
  const processed: Array<IDrugRecognition> = drugRecognition.map((item) => {
    const { PRINT_FRONT, PRINT_BACK, ITEM_NAME } = item;
    const printFront = replacePrint(PRINT_FRONT);
    const printBack = replacePrint(PRINT_BACK);
    return {
      ...item,
      ITEM_NAME: ITEM_NAME.trim().replace(/\s{2, }/g, " "),
      PRINT_FRONT: printFront,
      PRINT_BACK: printBack,
    };
  });
  return processed;
}
function combinePill(drug: IDrugRecognition, permissions: Map<string, IFinishedMedicinePermissionDetail>): IPillData[] {
  const finished = permissions.get(drug.ITEM_SEQ);
  const hasPermission = finished !== undefined;
  if (!hasPermission) {
    return [];
  }
  const {
    APPROVAL_TYPE,
    CANCEL_STATUS,
    CANCEL_DATE,
    ENTP_PERMIT_NO,
    BAR_CODE,
    EE_DOC_DATA,
    UD_DOC_DATA,
    NB_DOC_DATA,
    ATT_DOC_DATA,
    REEXAM_TARGET_YN,
    REEXAM_CONT,
    ENTP_BIZ_NO,
    ENTP_SEQ,
    IMG_REGIST_TS,
    BUSINESS_LICENCE_NUMBER,
    DRUG_SHAPE_FRONT,
    DRUG_SHAPE_BACK,
    MARK_IMAGE_FRONT,
    MARK_IMAGE_BACK,
    FINISH_MATERIAL_YN,
    INDUTY_CODE,
    ...rest
  } = { ...finished, ...drug };
  return [rest];
}
/** 허가 정보는 한 번 인덱싱하고 첫 번째 일치 행을 사용한다. */
export function createPillData(drugRecognition: IDrugRecognition[], finishedMedicinePermission: IFinishedMedicinePermissionDetail[]): IPillData[] {
  const permissions = new Map<string, IFinishedMedicinePermissionDetail>();
  finishedMedicinePermission.forEach((permission) => {
    const isFirstPermission = !permissions.has(permission.ITEM_SEQ);
    if (isFirstPermission) {
      permissions.set(permission.ITEM_SEQ, permission);
    }
  });
  const merged = mergeDuplicateObjectArray("ITEM_SEQ", drugRecognition);
  return preprocessingDrugRecognition(merged).flatMap((drug) => combinePill(drug, permissions));
}
