import { IFinishedMedicinePermissionDetail, IDrugRecognition } from "./";

/**
 * 알약 데이터
 */
export interface IPillData
  extends IDrugRecognition,
    IFinishedMedicinePermissionDetail {}
