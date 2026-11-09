import axios from "axios";
import logger from "../../utils/logger";
import { tryAsyncItem } from "../../utils/item_processing";
import { readEffectDocument } from "../pill_data/effect_summary/storage";
import { normalizeText } from "./contents";

type DocumentKind = "EE" | "UD" | "NB";

async function fetchDocument(itemSeq: string, kind: DocumentKind) {
  const result = await tryAsyncItem(async () => {
    const url = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}/${kind}`;
    const response = await axios.get<string>(url, {
      timeout: 15000,
      responseType: "text",
    });
    return normalizeText(response.data);
  }, `search document ITEM_SEQ=${itemSeq} kind=${kind}`);
  return result ?? "";
}

async function readEffectText(itemSeq: string) {
  const cached = await tryAsyncItem(
    () => readEffectDocument(itemSeq),
    "search effect cache ITEM_SEQ=" + itemSeq,
  );
  if (cached?.trim()) return normalizeText(cached);
  return fetchDocument(itemSeq, "EE");
}

/** 효능 캐시를 재사용하고 문서별 실패를 격리해 정상 응답은 보존한다. */
export async function getDocData(itemSeq: string) {
  const [effect, usage, notice] = await Promise.all([
    readEffectText(itemSeq),
    fetchDocument(itemSeq, "UD"),
    fetchDocument(itemSeq, "NB"),
  ]);
  logger.debug("[UNIFIED-SEARCH] Documents processed ITEM_SEQ=%s", itemSeq);
  return { EE_DOC_DATA: effect, UD_DOC_DATA: usage, NB_DOC_DATA: notice };
}
