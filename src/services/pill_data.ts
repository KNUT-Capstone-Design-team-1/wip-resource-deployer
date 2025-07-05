import {
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
  IPillData,
} from "src/@types";
import { convertTextToVector, mergeDuplicateObjectArray } from "../utils";

function preprocessingDrugRecognition(
  drugRecognition: Array<IDrugRecognition>
) {
  const replacePrint = (print: string) =>
    print
      .replace(/\u3000+|=+|\s{2, }/g, " ")
      .replace(/-{2,}|분할선/g, (match) => (match === "분할선" ? "|" : ""));

  const processed: Array<
    IDrugRecognition & Pick<IPillData, "VECTOR" | "DELETED">
  > = drugRecognition.map((item) => {
    const { PRINT_FRONT, PRINT_BACK, ITEM_NAME } = item;

    const printFront = replacePrint(PRINT_FRONT);
    const printBack = replacePrint(PRINT_BACK);

    return {
      ...item,
      ITEM_NAME: ITEM_NAME.trim().replace(/\s{2, }/g, " "),
      PRINT_FRONT: printFront,
      PRINT_BACK: printBack,
      VECTOR: convertTextToVector(printFront + printBack),
      DELETED: false,
    };
  });

  return processed;
}

export function createPillData(
  drugRecognition: Array<IDrugRecognition>,
  finishedMedicinePermission: Array<IFinishedMedicinePermissionDetail>
) {
  const mergedDrugRecognition = mergeDuplicateObjectArray(
    "ITEM_SEQ",
    drugRecognition
  );

  const preprocessedDrugRecognition = preprocessingDrugRecognition(
    mergedDrugRecognition
  );

  const pillData: Array<IPillData> = [];

  preprocessedDrugRecognition.forEach((drug) => {
    const finished = finishedMedicinePermission.find(
      ({ ITEM_SEQ }) => drug.ITEM_SEQ === ITEM_SEQ
    );

    if (!finished) {
      return;
    }

    const {
      CHART,
      BAR_CODE,
      MATERIAL_NAME,
      VALID_TERM,
      STORAGE_METHOD,
      PACK_UNIT,
      MAIN_ITEM_INGR,
      INGR_NAME,
    } = finished;

    pillData.push({
      ...drug,
      CHART,
      BAR_CODE,
      MATERIAL_NAME,
      VALID_TERM,
      STORAGE_METHOD,
      PACK_UNIT,
      MAIN_ITEM_INGR,
      INGR_NAME,
    });
  });

  return pillData;
}
