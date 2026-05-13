/**
 * 완제 의약품 허가 상세
 */
export interface IFinishedMedicinePermissionDetail {
  ITEM_NAME: string; // 품목명
  ITEM_ENG_NAME: string; // 품목 영문명
  ITEM_SEQ: string; // 품목일련번호
  APPROVAL_TYPE: string; // 허가/신고구분
  CANCEL_STATUS: string; // 취소상태
  CANCEL_DATE: string; // 취소일자
  ENTP_NAME: string; // 업체명
  ENTP_ENG_NAME: string; // 업체 영문명
  ITEM_PERMIT_DATE: string; // 허가일자
  ENTP_PERMIT_NO: string; // 업체허가번호
  ETC_OTC_CODE: string; // 전문일반
  CHART: string; // 성상
  BAR_CODE: string; // 표준코드
  MATERIAL_NAME: string; // 원료성분
  MATERIAL_ENG_NAME: string; // 영문성분명
  EE_DOC_DATA: string; // 효능효과
  UD_DOC_DATA: string; // 용법용량
  NB_DOC_DATA: string; // 주의사항
  ATT_DOC_DATA: string; // 첨부문서
  STORAGE_METHOD: string; // 저장방법
  REEXAM_TARGET_YN: string; // 재심사대상
  REEXAM_CONT: string; // 재심사기간
  VALID_TERM: string; // 유효기간
  PACK_UNIT: string; // 포장단위
  INSURANCE_CODE: string; // 보험코드
  DRUG_CLASS: string; // 마약류분류
  FINISH_MATERIAL_YN: string; // 완제원료구분
  NEW_DRUG_YN: string; // 신약여부
  INDUTY_CODE: string; // 업종구분
  CHANGE_CONTENT: string; // 변경내용
  TOTAL_CONTENT: string; // 총량
  MAIN_ITEM_INGR: string; // 주성분명
  INGR_NAME: string; // 첨가제명
  ATC_CODE: string; // ATC코드
  ENTP_BIZ_NO: string; // 사업자번호
  RARE_DRUG_YN: string; // 희귀의약품여부
  OEM_ENTP_NAME: string; // 위탁제조업체
}

export type TFinishedMedicinePermissionDetailResource = Record<
  "finishedMedicinePermissionDetail",
  Array<IFinishedMedicinePermissionDetail>
>;

export const FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP = {
  품목명: "ITEM_NAME",
  "품목 영문명": "ITEM_ENG_NAME",
  품목일련번호: "ITEM_SEQ",
  "허가/신고구분": "APPROVAL_TYPE",
  취소상태: "CANCEL_STATUS",
  취소일자: "CANCEL_DATE",
  업체명: "ENTP_NAME",
  "업체 영문명": "ENTP_ENG_NAME",
  허가일자: "ITEM_PERMIT_DATE",
  업체허가번호: "ENTP_PERMIT_NO",
  전문일반: "ETC_OTC_CODE",
  성상: "CHART",
  표준코드: "BAR_CODE",
  원료성분: "MATERIAL_NAME",
  영문성분명: "MATERIAL_ENG_NAME",
  효능효과: "EE_DOC_DATA",
  용법용량: "UD_DOC_DATA",
  주의사항: "NB_DOC_DATA",
  첨부문서: "ATT_DOC_DATA",
  저장방법: "STORAGE_METHOD",
  유효기간: "VALID_TERM",
  재심사대상: "REEXAM_TARGET_YN",
  재심사기간: "REEXAM_CONT",
  포장단위: "PACK_UNIT",
  보험코드: "INSURANCE_CODE",
  마약류분류: "DRUG_CLASS",
  완제원료구분: "FINISH_MATERIAL_YN",
  신약여부: "NEW_DRUG_YN",
  업종구분: "INDUTY_CODE",
  변경내용: "CHANGE_CONTENT",
  총량: "TOTAL_CONTENT",
  주성분명: "MAIN_ITEM_INGR",
  첨가제명: "INGR_NAME",
  ATC코드: "ATC_CODE",
  사업자번호: "ENTP_BIZ_NO",
  희귀의약품여부: "RARE_DRUG_YN",
  위탁제조업체: "OEM_ENTP_NAME",
} as const;
