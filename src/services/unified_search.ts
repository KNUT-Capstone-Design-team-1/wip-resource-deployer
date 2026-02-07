import axios from "axios";

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