/**
 * 완제 의약품 허가 상세
 */
export interface IFinishedMedicinePermissionDetail {
  ITEM_SEQ: string; // 품목일련번호
  ITEM_NAME: string; // 품목명
  ENTP_NAME: string; // 업체명
  ITEM_PERMIT_DATE: string; // 허가일자
  ETC_OTC_CODE: string; // 전문일반
  CHART: string; // 성상
  BAR_CODE: string; // 표준코드
  MATERIAL_NAME: string; // 원료성분
  VALID_TERM: string; // 유효기간
  STORAGE_METHOD: string; // 저장방법
  PACK_UNIT: string; // 포장단위
  MAIN_ITEM_INGR: string; // 주성분명
  INGR_NAME: string; // 첨가제명
}

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

export type TFinishedMedicinePermissionDetailResource = Record<
  "finishedMedicinePermissionDetail",
  Array<IFinishedMedicinePermissionDetail>
>;

export type TFinishedMedicinePermissionDetailDirectoryName =
  "finished_medicine_permission_detail";

export const FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP = {
  품목일련번호: "ITEM_SEQ",
  품목명: "ITEM_NAME",
  업체명: "ENTP_NAME",
  허가일자: "ITEM_PERMIT_DATE",
  전문일반: "ETC_OTC_CODE",
  성상: "CHART",
  표준코드: "BAR_CODE",
  원료성분: "MATERIAL_NAME",
  유효기간: "VALID_TERM",
  저장방법: "STORAGE_METHOD",
  포장단위: "PACK_UNIT",
  주성분명: "MAIN_ITEM_INGR",
  첨가제명: "INGR_NAME",
} as const;
