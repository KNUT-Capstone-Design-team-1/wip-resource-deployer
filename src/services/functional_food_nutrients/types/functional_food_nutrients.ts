/**
 * 건강기능식품 영양성분 정보
 */
export interface IFunctionalFoodNutrients {
  foodCode: string; // 식품코드
  foodName: string; // 식품명
  foodMajorCategoryName: string; // 식품대분류명
  representativeFoodName: string; // 대표식품명
  foodMediumCategoryName: string; // 식품중분류명
  nutrientServingSize: string; // 영양성분제공단위량
  energy: string; // 에너지(kcal)
  moisture: string; // 수분(g)
  protein: string; // 단백질(g)
  fat: string; // 지방(g)
  ash: string; // 회분(g)
  carbohydrate: string; // 탄수화물(g)
  sugars: string; // 당류(g)
  dietaryFiber: string; // 식이섬유(g)
  calcium: string; // 칼슘(mg)
  iron: string; // 철(mg)
  phosphorus: string; // 인(mg)
  potassium: string; // 칼륨(mg)
  sodium: string; // 나트륨(mg)
  vitaminA: string; // 비타민 A(μg RAE)
  retinol: string; // 레티놀(μg)
  betaCarotene: string; // 베타카로틴(μg)
  thiamine: string; // 티아민(mg)
  riboflavin: string; // 리보플라빈(mg)
  niacin: string; // 니아신(mg)
  vitaminC: string; // 비타민 C(mg)
  vitaminD: string; // 비타민 D(μg)
  cholesterol: string; // 콜레스테롤(mg)
  saturatedFattyAcids: string; // 포화지방산(g)
  transFattyAcids: string; // 트랜스지방산(g)
  sourceName: string; // 출처명
  servingSize: string; // 1회분량
  servingWeightVolume: string; // 1회분량중량/부피
  dailyIntakeFrequency: string; // 1일섭취횟수
  intakeTarget: string; // 섭취대상
  foodWeightVolume: string; // 식품중량/부피
  itemReportNumber: string; // 품목제조신고번호
  manufacturerName: string; // 제조사명
  importerName: string; // 수입업체명
  distributorName: string; // 유통업체명
  originCountryName: string; // 원산지국명
  dataCreatedAt: string; // 데이터생성일자
  dataReferenceDate: string; // 데이터기준일자
}

export type TFunctionalFoodNutrientsResource = Record<
  "functionalFoodNutrients",
  Array<IFunctionalFoodNutrients>
>;
