import { createSourceResource } from "../../utils/source_resource";

/** 대마 리소스 생성 */
export async function createCannabisResource() {
  await createSourceResource("cannabis");
}
