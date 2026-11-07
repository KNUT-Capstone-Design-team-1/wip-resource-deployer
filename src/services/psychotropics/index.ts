import { createSourceResource } from "../../utils/source_resource";

/** 향정신성 약물 리소스 생성 */
export async function createPsychotropicsResource() {
  await createSourceResource("psychotropics");
}
