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
  EE_DOC_DATA: string; // 효능효과
  UD_DOC_DATA: string; // 용법용량
  NB_DOC_DATA: string; // 주의사항
  VALID_TERM: string; // 유효기간
  STORAGE_METHOD: string; // 저장방법
  PACK_UNIT: string; // 포장단위
  MAIN_ITEM_INGR: string; // 주성분명
  INGR_NAME: string; // 첨가제명
}

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
  효능효과: "EE_DOC_DATA",
  용법용량: "UD_DOC_DATA",
  주의사항: "NB_DOC_DATA",
  유효기간: "VALID_TERM",
  저장방법: "STORAGE_METHOD",
  포장단위: "PACK_UNIT",
  주성분명: "MAIN_ITEM_INGR",
  첨가제명: "INGR_NAME",
} as const;
