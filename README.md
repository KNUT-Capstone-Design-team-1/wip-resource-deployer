# wip resource deployer

이게뭐약 리소스 배포 도구

# function

- 리소스 파일을 데이터베이스 파일로 변환
- 리소스 파일을 리소스 저장소에 업로드를 수행 (일부 리소스 미지원)

# requirement

#### wrangler.toml

- cloudflare DB 구성 설정

```toml
name = "" # 프로젝트 이름
compatibility_date = "2025-07-06" # 프로젝트 호환성 날짜

[[d1_databases]]
binding = "" # 데이터베이스 바인딩 이름
database_name = "" # 데이터베이스 이름
database_id = ""  # D1 대시보드에서 확인
```

#### 데이터베이스

- [의약품 낱알식별](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=11)
- [의약품 제품허가 상세정보](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=12)
- [전국 병의원 및 약국 현황 / 2.약국정보서비스](https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=11925&publDataTpCd=&searchCnd=ttl&searchWrd=%EC%A0%84%EA%B5%)

# execute

1. 프로젝트 루트 위치에 `res` 디렉터리 생성

2. `res` 디렉터리에 아래 디렉터리 생성

- `drug_recognition` (의약품 낱알식별 / xls)
- `finished_medicine_permission_detail` (의약품 제품허가 상세정보 / xls)
- `nearby_pharmacies` (전국 병의원 및 약국 현황 / 2.약국정보서비스)

3. `config.json`에서 생성 및 배포하고자 하는 리소스 타입의 `_` 제거

- common > targetResource

4. 실행

```bash
yarn start
```

# Trouble Shooting

#### D1 주변약국 데이터베이스 업데이트 안되는 경우

1. 브라우저에서 cloudflare 로그인

2. 프로젝트 터미널에서 아래 명령 실행 후 브라우저에서 허용

```bash
wrangler login
```
