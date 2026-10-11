import axios from "axios";
import logger from "../../shared/logging/logger";
import { normalizeText } from "./contents";
export async function getDocData(itemSeq: string) {
  const baseUrl = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}`;
  try {
    const EE = await axios.get<string>(`${baseUrl}/EE`);
    const UD = await axios.get<string>(`${baseUrl}/UD`);
    const NB = await axios.get<string>(`${baseUrl}/NB`);
    const nedrugData = {
      EE_DOC_DATA: normalizeText(EE.data),
      UD_DOC_DATA: normalizeText(UD.data),
      NB_DOC_DATA: normalizeText(NB.data),
    };
    logger.info("get data (%s)", itemSeq);
    return nedrugData;
  }
  catch (e) {
    logger.error("Failed to get doc data. item_seq: %s. %s", itemSeq, e.stack || e);
    return { EE_DOC_DATA: "", UD_DOC_DATA: "", NB_DOC_DATA: "" };
  }
}
