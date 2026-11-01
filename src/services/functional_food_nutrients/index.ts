import { ResourceLoader } from "../../utils/resource_loader";
import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";

/**
 * 영양 성분 리소스 생성
 */
export async function createFunctionalFoodNutrientsResource() {
  // 건강기능식품 영양 성분 원본 파일을 읽고 리소스 속성으로 변환
  logger.info("[functional_food_nutrients] Start load resource");

  const resources = await new ResourceLoader([
    "functional_food_nutrients",
  ]).loadResource();

  // 변환한 건강기능식품 영양 성분 데이터를 JSON 리소스 파일로 저장
  await createResourceFile(
    "functional_food_nutrients.json",
    resources.functionalFoodNutrients,
  );

  logger.info("[functional_food_nutrients] Complete create resource");
}
