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

export const FUNCTIONAL_FOOD_NUTRIENTS_PROPERTY_MAP = {
  "식품코드": "foodCode",
  "식품명": "foodName",
  "식품대분류명": "foodMajorCategoryName",
  "대표식품명": "representativeFoodName",
  "식품중분류명": "foodMediumCategoryName",
  "영양성분제공단위량": "nutrientServingSize",
  "에너지(kcal)": "energy",
  "수분(g)": "moisture",
  "단백질(g)": "protein",
  "지방(g)": "fat",
  "회분(g)": "ash",
  "탄수화물(g)": "carbohydrate",
  "당류(g)": "sugars",
  "식이섬유(g)": "dietaryFiber",
  "칼슘(mg)": "calcium",
  "철(mg)": "iron",
  "인(mg)": "phosphorus",
  "칼륨(mg)": "potassium",
  "나트륨(mg)": "sodium",
  "비타민 A(μg RAE)": "vitaminA",
  "레티놀(μg)": "retinol",
  "베타카로틴(μg)": "betaCarotene",
  "티아민(mg)": "thiamine",
  "리보플라빈(mg)": "riboflavin",
  "니아신(mg)": "niacin",
  "비타민 C(mg)": "vitaminC",
  "비타민 D(μg)": "vitaminD",
  "콜레스테롤(mg)": "cholesterol",
  "포화지방산(g)": "saturatedFattyAcids",
  "트랜스지방산(g)": "transFattyAcids",
  "출처명": "sourceName",
  "1회분량": "servingSize",
  "1회분량중량/부피": "servingWeightVolume",
  "1일섭취횟수": "dailyIntakeFrequency",
  "섭취대상": "intakeTarget",
  "식품중량/부피": "foodWeightVolume",
  "품목제조신고번호": "itemReportNumber",
  "제조사명": "manufacturerName",
  "수입업체명": "importerName",
  "유통업체명": "distributorName",
  "원산지국명": "originCountryName",
  "데이터생성일자": "dataCreatedAt",
  "데이터기준일자": "dataReferenceDate",
} as const;
