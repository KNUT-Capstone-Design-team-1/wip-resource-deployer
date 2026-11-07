import { createSourceResource } from "../../utils/source_resource";

/** 도핑 금지 목록 생성 */
export async function createProhibitedListResource() {
  await createSourceResource("prohibited_list");
}
