import { createSourceResource } from "../../utils/source_resource";

/** 마약류 리소스 생성 */
export async function createNarcoticsResource() {
  await createSourceResource("narcotics");
}
