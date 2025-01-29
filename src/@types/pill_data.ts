import { IDrugRecognition } from "./drug_recognition";
import { IFinishedMedicinePermissionDetail } from "./finished_medicine_permission_detail";

/**
 * 알약 데이터
 */
export interface IPillData
  extends IDrugRecognition,
    IFinishedMedicinePermissionDetail {
  VECTOR: number[];
  DELETED?: boolean;
}
