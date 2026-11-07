# 건강기능식품 전환 패치

이 작업 환경에서는 wip-resource-deployer만 쓰기가 허용되어 연결 저장소 변경을 패치로 제공한다. 두 패치 모두 현재 로컬 저장소에 대해 git apply --check를 통과했다. 실제 연결 저장소 파일은 아직 변경하지 않았다.

- wip-serverless.patch: 기존 functional_food_nutrients 스키마와 버전을 보존하고 두 신규 테이블의 스키마·버전만 추가한다.
- wip-application-v2.patch: 새 두 테이블 동기화, 구형 영양제 캐시 제거, JOIN 조회, 제품·원재료·제조사 검색, 분류 필터, 상세 정보를 전환한다. 보관함과 복용 알림은 보존한다.

각 저장소에서 적용:

```powershell
git -C C:/project/wip-serverless apply C:/project/wip-resource-deployer/integration/functional-food/wip-serverless.patch
git -C C:/project/wip-application-v2 apply C:/project/wip-resource-deployer/integration/functional-food/wip-application-v2.patch
```

배포 도구의 config.json에서 common.targetResource에 functional_food를 활성화한다. 기존 다른 작업의 활성 상태는 유지했다. 기본 예시는 _functional_food로 비활성 상태다. 제공된 인증키는 무시되는 .env의 FOOD_SAFETY_KOREA_API_KEY에 저장했다.

생성 파일:

- functional_food_classification.json: I2710, PK id
- health_functional_food_raw_material.json: C003, PK PRDLST_REPORT_NO

CLASSIFICATION_IDS는 제품에서 분류 id들을 참조하는 JSON 문자열 배열이다. SQLite json_each와 JOIN하여 여러 원재료·분류를 연결한다. 원재료와 분류명의 공백·대소문자를 정규화한 정확한 일치만 연결하며, 미매칭 제품은 전체 검색에서 보존한다. 분류별 기준을 제품의 실제 함량이나 권장 섭취량으로 표시하지 않는다.

배포 시 두 JSON을 같은 실행에서 생성하여 리소스 버킷에 함께 올리고 서버 스키마·버전을 배포한 뒤 앱을 배포해야 한다. 이 작업에서 운영 배포는 실행하지 않았다.

검증:

- 배포 도구 TypeScript 검사 및 API 수집 회귀 테스트
- 앱 전체 TypeScript 검사: 기존 0건, 변경 적용 가상 파일 시스템 0건
- 앱 ESLint: 0건 (가상 파일의 import 해석 규칙은 제외하고 전체 TypeScript 검사로 해석 검증)
- 실제 SQLite에서 앱 쿼리의 다중 JOIN·중복 방지·필터·페이지네이션 검증
- 기존 영양제 캐시 제거 및 사용자 보관함 보존 검증
- 서버 기존 영양제 스키마·버전 보존 및 신규 스키마 응답 검증
- 두 저장소 git apply --check 통과

외부 API 접속은 현재 샌드박스의 EACCES로 차단되어 실제 인증 및 전체 데이터 수집, 실행 중인 모바일 앱의 시각 검증은 하지 못했다. API 필드와 응답 코드는 식품안전나라 I2710/C003 공식 문서를 기준으로 구현했다.
