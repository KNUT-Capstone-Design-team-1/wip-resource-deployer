import { IDrugRecognition, IFinishedMedicinePermissionDetail } from "./realm";

export type TDrugRecognitionDirectoryName = "drug_recognition";

export type TFinishedMedicinePermissionDetailDirectoryName =
  "finished_medicine_permission_detail";

export type TResourceDirectoryName =
  | TDrugRecognitionDirectoryName
  | TFinishedMedicinePermissionDetailDirectoryName;

export type TDrugRecognitionResource = Record<
  "drugRecognition",
  Array<IDrugRecognition>
>;

export type TFinishedMedicinePermissionDetail = Record<
  "finishedMedicinePermissionDetail",
  Array<IFinishedMedicinePermissionDetail>
>;

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetail;

export type TDrugRecognitionRaw = {
  품목일련번호: string;
  품목명: string;
  업소일련번호: string;
  업소명: string;
  큰제품이미지: string;
  표시앞: string;
  표시뒤: string;
  의약품제형: string;
  색상앞: string;
  색상뒤: string;
  분할선앞: string;
  분할선뒤: string;
  "이미지생성일자(약학정보원)": string;
  분류명: string;
  전문일반구분: string;
  품목허가일자: string;
};

export type TFinishedMedicinePermissionRaw = {
  품목일련번호: string;
  품목명: string;
  업체명: string;
  허가일자: string;
  전문일반: string;
  성상: string;
  표준코드: string;
  원료성분: string;
  유효기간: string;
  저장방법: string;
  포장단위: string;
  주성분명: string;
  첨가제명: string;
};

export type TResourceRaw = TDrugRecognitionRaw | TFinishedMedicinePermissionRaw;

export type TResource = IDrugRecognition | IFinishedMedicinePermissionDetail;
