import { IFinishedMedicinePermissionDetail, IDrugRecognition } from "./";

/**
 * 제외할 알약 데이터 속성
 */
export type OmitPillDataProps =
  | "APPROVAL_TYPE"
  | "CANCEL_STATUS"
  | "CANCEL_DATE"
  | "ENTP_PERMIT_NO"
  | "BAR_CODE"
  | "EE_DOC_DATA"
  | "UD_DOC_DATA"
  | "NB_DOC_DATA"
  | "ATT_DOC_DATA"
  | "REEXAM_TARGET_YN"
  | "REEXAM_CONT"
  | "ENTP_BIZ_NO"
  | "ENTP_SEQ"
  | "IMG_REGIST_TS"
  | "BUSINESS_LICENCE_NUMBER"
  | "DRUG_SHAPE_FRONT"
  | "DRUG_SHAPE_BACK"
  | "MARK_IMAGE_FRONT"
  | "MARK_IMAGE_BACK"
  | "FINISH_MATERIAL_YN"
  | "INDUTY_CODE";

/**
 * 알약 데이터
 */
export interface IPillData
  extends Omit<IDrugRecognition, OmitPillDataProps>,
    Omit<IFinishedMedicinePermissionDetail, OmitPillDataProps> {}

