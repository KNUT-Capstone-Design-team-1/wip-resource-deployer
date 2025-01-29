import { IPillData } from "./pill_data";
import { IFinishedMedicinePermissionDetail } from "./finished_medicine_permission_detail";

export type TPillDataDirectoryName = "pill_data";

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
