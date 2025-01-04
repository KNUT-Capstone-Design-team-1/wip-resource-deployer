import { IDrugRecognition, IFinishedMedicinePermissionDetail } from "src/@types"
import { textToVector } from "./converter"

const replaceDrugRecognition = (data: Array<IDrugRecognition>) => {
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

const optimizeDrugRecognition = (drugData: Array<IDrugRecognition>, finishedData: Array<IFinishedMedicinePermissionDetail>): Array<IDrugRecognition> => {
  const optimizedDrugData = drugData.filter((drug) => {
    return finishedData.some((finished) => {
      return finished.ITEM_NAME === drug.ITEM_NAME
    })
  })

  return optimizedDrugData
}

export { replaceDrugRecognition, optimizeDrugRecognition }