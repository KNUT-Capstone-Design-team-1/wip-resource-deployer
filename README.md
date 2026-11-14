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

# Trouble Shooting

#### GCS 리소스 업로드 시 인증 오류가 발생하는 경우

1. [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)를 설치한 후 프로젝트 터미널에서 아래 명령을 실행하고 브라우저에서 로그인 및 접근을 허용한다.

```bash
gcloud auth application-default login
```

이 프로젝트의 `@google-cloud/storage`는 Application Default Credentials(ADC)를 사용하므로, CLI용 로그인인 `gcloud auth login`만으로는 인증 설정이 완료되지 않는다.

2. 로그인 완료 후 `yarn upload:resources`를 다시 실행한다. 인증 만료 오류가 발생하면 위 로그인 명령을 다시 실행한다.

3. `403` 권한 오류가 계속되면 로그인한 계정에 대상 버킷(기본값: `wip-bucket`, 변경 시 `RESOURCE_DATA_BUCKET`)의 객체 읽기·생성·덮어쓰기 권한이 있는지 확인한다.

참고: [Cloud Storage 인증 안내](https://cloud.google.com/storage/docs/authentication)

#### D1 데이터베이스 업데이트 안되는 경우

1. 브라우저에서 cloudflare 로그인

2. 프로젝트 터미널에서 아래 명령 실행 후 브라우저에서 허용

```bash
wrangler login
```
