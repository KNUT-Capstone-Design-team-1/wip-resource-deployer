# wip resource deployer

이게뭐약 리소스 배포 도구

# function

- 리소스 파일을 원천 데이터로 변환
- 리소스 파일을 리소스 저장소에 업로드 수행 (일부 리소스 미지원)

# Requirement

#### 데이터베이스 및 오픈 API

- [의약품 낱알식별](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=11)
- [의약품 제품허가 상세정보](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=12)
- [약국 오픈 API Data (생활안전정보)](https://www.safemap.go.kr/opna/data/dataViewRenew.do?objtId=127)
- [마약정보데이터베이스](https://www.nifds.go.kr/toxinfo/kind/kr/index.do)
- [도핑 금지 목록](https://www.kada-ad.or.kr/kada?where=drug/drug_info_method)

#### 환경 변수 (.env)

`nearby_pharmacies` 리소스 생성 시 프로젝트 루트에 `.env` 파일을 생성하고 생활안전지도 API 키 설정 필요

```env
NEARBY_PHARMACIES_API_KEY=your_service_key_here
```

# execute

1. 프로젝트 루트 위치에 `origin_data` 디렉터리 생성

2. `origin_data` 디렉터리에 아래 디렉터리 생성

- `drug_recognition` (의약품 낱알식별 / xls)
- `finished_medicine_permission_detail` (의약품 제품허가 상세정보 / xls)
- `cannabis` (대마 데이터 / xlsx)
- `narcotics` (마약류 데이터 / xlsx)
- `psychotropics` (향정신성 약물 데이터 / xlsx)
- `prohibited_list` (도핑 금지 약물 / pdf)

3. `config.json`에서 생성 및 배포하고자 하는 리소스 타입의 `_` 제거

- common > targetResource

4. 실행

```bash
yarn install

yarn start
```

# Trouble Shooting

#### D1 데이터베이스 업데이트 안되는 경우

1. 브라우저에서 cloudflare 로그인

2. 프로젝트 터미널에서 아래 명령 실행 후 브라우저에서 허용

```bash
wrangler login
```
