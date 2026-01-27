import fs from "fs";
import path from "path";
import axios from "axios";
import {
  IDrugRecognition,
  IPillData,
  IFinishedMedicinePermissionDetail,
} from "../types";
import { logger, mergeDuplicateObjectArray, ResourceLoader } from "../utils";

/**
 * 의약품 낱알식별정보 데이터 전처리
 * @param drugRecognition 의약품 낱알식별정보 데이터
 * @returns
 */
function preprocessingDrugRecognition(
  drugRecognition: Array<IDrugRecognition>,
) {
  const replacePrint = (print: string) =>
    print
      .replace(/\u3000+|=+|\s{2, }/g, " ")
      .replace(/-{2,}|분할선/g, (match) => (match === "분할선" ? "|" : ""));

  const processed: Array<IDrugRecognition> = drugRecognition.map((item) => {
    const { PRINT_FRONT, PRINT_BACK, ITEM_NAME } = item;

    const printFront = replacePrint(PRINT_FRONT);
    const printBack = replacePrint(PRINT_BACK);

    return {
      ...item,
      ITEM_NAME: ITEM_NAME.trim().replace(/\s{2, }/g, " "),
      PRINT_FRONT: printFront,
      PRINT_BACK: printBack,
    };
  });

  return processed;
}

/**
 * 의약품 낱알식별 정보 데이터의 별도 문서 데이터를 의약품 안전나라에서 xml으로 받아온다
 * @param itemSeq 알약 ID
 * @returns
 */
async function getDocData(itemSeq: string) {
  const baseUrl = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}`;

  try {
    const EE = await axios.get(`${baseUrl}/EE`);
    const UD = await axios.get(`${baseUrl}/UD`);
    const NB = await axios.get(`${baseUrl}/NB`);

    const nedrugData = {
      EE_DOC_DATA: EE.data,
      UD_DOC_DATA: UD.data,
      NB_DOC_DATA: NB.data,
    };

    console.log("get data (%s)", itemSeq);

    return nedrugData;
  } catch (e) {
    console.log("Failed to get doc data. item_seq: %s. %s", e.stack || e);

    return { EE_DOC_DATA: "", UD_DOC_DATA: "", NB_DOC_DATA: "" };
  }
}

/**
 * pill_data 생성
 * @param drugRecognition 의약품 낱알식별정보 데이터
 * @param finishedMedicinePermission 완제 의약품 허가 상세 데이터
 * @returns
 */
async function createPillData(
  drugRecognition: Array<IDrugRecognition>,
  finishedMedicinePermission: Array<IFinishedMedicinePermissionDetail>,
) {
  const mergedDrugRecognition = mergeDuplicateObjectArray(
    "ITEM_SEQ",
    drugRecognition,
  );

  const preprocessedDrugRecognition = preprocessingDrugRecognition(
    mergedDrugRecognition,
  ) as IDrugRecognition[];

  const pillData: Array<IPillData> = [];

  for (let i = 0; i < preprocessedDrugRecognition.length; i += 1) {
    const drug = preprocessedDrugRecognition[i];

    const finished = finishedMedicinePermission.find(
      ({ ITEM_SEQ }) => drug.ITEM_SEQ === ITEM_SEQ,
    );

    if (!finished) {
      continue;
    }

    const {
      ITEM_SEQ,
      CHART,
      BAR_CODE,
      MATERIAL_NAME,
      VALID_TERM,
      STORAGE_METHOD,
      PACK_UNIT,
      MAIN_ITEM_INGR,
      INGR_NAME,
    } = finished;

    const { EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA } =
      await getDocData(ITEM_SEQ);

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
      EE_DOC_DATA,
      UD_DOC_DATA,
      NB_DOC_DATA,
    });
  }

  return pillData;
}

/**
 * pill_data 리소스 파일 생성
 * @param pillData pill_data 데이터
 */
function createResourceFile(pillData: IPillData[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(__dirname, "../../pill_data.json");

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    stream.on("finish", resolve);
    stream.on("error", reject);

    stream.write('{"resources":[');

    pillData.forEach((resource, index) => {
      if (index > 0) stream.write(",");
      stream.write(JSON.stringify(resource));
    });

    stream.write("]}");
    stream.end();
  });
}

/**
 * pill_data 리소스 파일 생성
 */
export async function generatePillDataResourceFile() {
  try {
    logger.info("[PILL-DATA] Start load resource");

    const resourceLoader = new ResourceLoader([
      "drug_recognition",
      "finished_medicine_permission_detail",
    ]);

    const resource = await resourceLoader.loadResource();

    logger.info("[PILL-DATA] Complete load resource");

    logger.info("[PILL-DATA] Start create pill data");

    const pillData = await createPillData(
      resource.drugRecognition,
      resource.finishedMedicinePermissionDetail,
    );

    logger.info("[PILL-DATA] Complete create pill data");

    logger.info("[PILL-DATA] Start create pill data resource file");

    await createResourceFile(pillData);

    logger.info("[PILL-DATA] Complete create pill data resource file");
  } catch (e) {
    logger.error(
      "[PILL-DATA] Failed to create pill data resource file. %s",
      e.stack || e,
    );
  }
}
