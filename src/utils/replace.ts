import { IPillData, IFinishedMedicinePermissionDetail } from "src/@types"
import { textToVector } from "./converter"

const replacePillData = (data: Array<IPillData>) => {
  data.forEach((item) => {
    item.PRINT_FRONT = item.PRINT_FRONT.replace(/\u3000+|=+|\s{2, }/g, " ").replace(/-{2,}|분할선/g, (match) => {
      if (match === "분할선") return "|"
      return ""
    })
    item.PRINT_BACK = item.PRINT_BACK.replace(/\u3000+|=+|\s{2, }/g, " ").replace(/-{2,}|분할선/g, (match) => {
      if (match === "분할선") return "|"
      return ""
    })

    item.ITEM_NAME = item.ITEM_NAME.trim().replace(/\s{2, }/g, " ")

    item.VECTOR = textToVector(item.PRINT_FRONT + item.PRINT_BACK)
  })
}

const optimizePillData = (drugData: Array<IPillData>, finishedData: Array<IFinishedMedicinePermissionDetail>): Array<IPillData> => {
  const optimizedDrugData = drugData.filter((drug) => {
    return finishedData.some((finished) => {
      if (finished.ITEM_SEQ === drug.ITEM_SEQ) {
        drug.CHART = finished.CHART
        drug.BAR_CODE = finished.BAR_CODE
        drug.MATERIAL_NAME = finished.MATERIAL_NAME
        drug.VALID_TERM = finished.VALID_TERM
        drug.STORAGE_METHOD = finished.STORAGE_METHOD
        drug.PACK_UNIT = finished.PACK_UNIT
        drug.MAIN_ITEM_INGR = finished.MAIN_ITEM_INGR
        drug.INGR_NAME = finished.INGR_NAME
        return true
      }
      return false
    })
  })

  return optimizedDrugData
}

export { replacePillData, optimizePillData }