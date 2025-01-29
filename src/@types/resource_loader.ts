import { IPillData } from "./drug_recognition";
import { IFinishedMedicinePermissionDetail } from "./finished_medicine_permission_detail";

export type TPillDataDirectoryName = "drug_recognition";

export type TFinishedMedicinePermissionDetailDirectoryName =
  "finished_medicine_permission_detail";

export type TResourceDirectoryName =
  | TPillDataDirectoryName
  | TFinishedMedicinePermissionDetailDirectoryName;

export type TPillDataResourceObj = Record<
  "pillData",
  Array<IPillData>
>;

export type TFinishedMedicinePermissionDetail = Record<
  "finishedMedicinePermissionDetail",
  Array<IFinishedMedicinePermissionDetail>
>;

export type TLoadedResource = TPillDataResourceObj &
  TFinishedMedicinePermissionDetail;

export type TResource =
  | IPillData
  | IFinishedMedicinePermissionDetail

export type TResourceData =
  | Array<IPillData>
  | Array<IFinishedMedicinePermissionDetail>
