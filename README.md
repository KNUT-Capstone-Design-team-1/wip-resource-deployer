# wip resource deployer

이게뭐약 리소스 배포 도구

# function

- 리소스 파일을 원천 데이터로 변환
- 리소스 파일을 리소스 저장소에 업로드 수행 (일부 리소스 미지원)

# Requirement

#### 데이터베이스 및 오픈 API

- [식품의약품안전처_의약품 낱알식별 정보](https://www.data.go.kr/data/15057639/openapi.do)
- [식품의약품안전처_의약품 제품 허가정보](https://www.data.go.kr/data/15095677/openapi.do)
- [건강기능식품 품목분류정보 (I2710)](https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=I2710)
- [건강기능식품 품목제조신고·원재료 (C003)](https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C003)
- [약국 오픈 API Data (생활안전정보)](https://www.safemap.go.kr/opna/data/dataViewRenew.do?objtId=127)
- [마약정보데이터베이스](https://www.nifds.go.kr/toxinfo/kind/kr/index.do)
- [도핑 금지 목록](https://www.kada-ad.or.kr/kada?where=drug/drug_info_method)

#### 환경 변수 (.env)

`pill_data`, `nearby_pharmacies`, `functional_food` 실행 시 사용하는 API 키를 환경 변수 또는 프로젝트 루트 `.env`에 설정한다. 환경 변수를 우선 사용한다.

```env
DRUG_RECOGNITION_API_KEY=your_drug_recognition_key_here
DRUG_PRODUCT_PERMISSION_DETAIL_API_KEY=your_drug_product_permission_detail_key_here
NEARBY_PHARMACIES_API_KEY=your_service_key_here
FOOD_SAFETY_KOREA_API_KEY=your_food_safety_korea_key_here
```

# execute

1. 프로젝트 루트 위치에 `origin_data` 디렉터리 생성

2. `origin_data` 디렉터리에 아래 디렉터리 생성

- `cannabis` (대마 데이터 / xlsx)
- `narcotics` (마약류 데이터 / xlsx)
- `psychotropics` (향정신성 약물 데이터 / xlsx)
- `prohibited_list` (도핑 금지 약물 / pdf)

3. 처음 `yarn start`를 실행하면 `config.json`이 없을 때 `config.example.json`의 기본값으로 생성한 뒤 실행한다.
   기본 설정은 모든 작업을 비활성화한다. `config.json`에서 실행할 리소스 타입의 `_`를 제거한 후 다시 실행한다.
   기존 설정은 덮어쓰지 않으며, `config.json`은 Git 추적에서 제외한다.

- common > targetResource

```json
"pillData": {
  "createEffectSummary": true,
  "createMarkImage": true
}
```

4. 실행

```bash
yarn install

yarn start
```

통합 검색은 기존 v2 스키마(`unified_search_v2`, `unified_search_fts_v2`,
`unified_search_docs_fts_v2`)만 사용한다. v1 테이블 생성·저장·복구는 수행하지 않는다.

`config.json`의 `common.targetResource`에서 필요한 작업의 `_`를 제거하고 `yarn start`를 실행한다.
별도 CLI 실행은 필요 없다. 최초 구축이나 누락된 스키마 생성이 필요하면
`unifiedSearch.dbInitialize`를 `true`로 설정한다(기본값 `false`).
`unified_search` 실행 전에 없는 v2 테이블·트리거만 생성하며 기존 데이터는 삭제하지 않는다.

- `unified_search`: `dbInitialize: true`이면 스키마·트리거 준비 → `pill_data.json` 전체 저장 → 누락·추가·문서 실패 및 두 FTS 인덱스 검증
- `unified_search_insert_failed`: 스키마 준비 → 실패 항목 재생성·저장 → 전체 데이터와 두 FTS 인덱스 검증
- `unified_search_restore_fts`: 기존 v2 원본을 기준으로 누락된 FTS 테이블·트리거 복구 및 두 인덱스 재구축·검증
- `unified_search_rebuild_fts`: 기존 두 FTS 인덱스 재구축·검증

기본 예제 설정은 위 작업도 비활성화한다. 검색 작업은 앞서 선택한 리소스 생성 작업 이후 실행되며,
원격 D1 데이터베이스 `wip_unified_search`를 갱신한다.
TypeScript에서는 `updateUnifiedSearchDb`, `upsertFailedRetryAll`, `restoreUnifiedSearchFts`,
`rebuildFts5`, `verifyUnifiedSearch` 함수를 직접 가져와 실행할 수도 있다.

# Trouble Shooting

#### D1 데이터베이스 업데이트 안되는 경우

1. 브라우저에서 cloudflare 로그인

2. 프로젝트 터미널에서 아래 명령 실행 후 브라우저에서 허용

```bash
wrangler login
```
