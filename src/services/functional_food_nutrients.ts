import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 건강기능식품 영양성분 정보 리소스 생성
 */
export async function createFunctionalFoodNutrientsResource() {
  try {
    logger.info("[FUNCTIONAL_FOOD_NUTRIENTS] Start load resource");

    const resourceLoader = new ResourceLoader(["functional_food_nutrients"]);

    const functionalFoodNutrientsData = await resourceLoader.loadResource();

    logger.info("[FUNCTIONAL_FOOD_NUTRIENTS] Complete load resource");

    logger.info(
      "[FUNCTIONAL_FOOD_NUTRIENTS] Start create functional_food_nutrients data",
    );

    await createResourceFile(
      "functional_food_nutrients.json",
      functionalFoodNutrientsData.functionalFoodNutrients,
      false,
    );

    logger.info(
      "[FUNCTIONAL_FOOD_NUTRIENTS] Complete create functional_food_nutrients data",
    );
  } catch (e: any) {
    logger.error(
      "[FUNCTIONAL_FOOD_NUTRIENTS] Failed to create functional food nutrients data. %s",
      e.stack || e,
    );
  }
}
