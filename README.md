# wip resource deployer

이게뭐약 리소스 배포 도구

# function

- 리소스 파일을 데이터베이스 파일로 변환
- 데이터베이스 파일을 리소스 저장소에 업로드를 수행

# requirement

#### .env

```
REALM_ENCRYPTION_KEY="realm 데이터베이스 암호화 키"

CLOUD_FLARE_RESOURCE_DOWNLOAD_URL="클라우드 플레어 리소스 스토리지 URL"
CLOUD_FLARE_RESOURCE_BUCKET="클라우드 플레어 리소스 버킷 이름"
CLOUD_FLARE_TOKEN_VALUE="클라우드 플레어 R2 토큰"
CLOUD_FLARE_ACCESS_KEY_ID="클라우드 플레어 R2 액세스 키 아이디"
CLOUD_FLARE_SECRET_ACCESS_KEY="클라우드 플레어 R2 액세스 키"

# 자동 업로드 시 prod로 변경
MODE="실행모드. dev | prod"
```

#### config.json

- realm 구성 설정

```json
{
  "schemaVersion": 2, // 스키마 버전
  "schemaMinorVersion": "test" // 스키마 마이너 버전. 메인 형상인 경우 main 으로 설정
}
```

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

0. .env 파일 구성
1. 프로젝트 루트 위치에 `res` 디렉터리 생성
2. `res` 디렉터리에 아래 디렉터리 생성

- `drug_recognition` (의약품 낱알식별 / xls)
- `finished_medicine_permission_detail` (의약품 제품허가 상세정보 / xls)
- `nearby_pharmacies` (전국 병의원 및 약국 현황 / 2.약국정보서비스)

3. 데이터베이스 리소스 버전 설정 (`config.json`)

- 스키마 버전: `schemaVersion`
  - (ex) 스키마가 변경된 경우 기존 1이면 2로 변경
- 스키마 마이너 버전: `schemaMinorVersion`
  - 메인 버전인 경우 `main`으로 설정
  - 기타 테스트 버전인 경우 영어 및 숫자로 자유롭게 설정
    - (ex) 2mukee

4. 실행

```bash
# realm DB 및 cloudflare D1 DB 업데이트
yarn start

# realm DB 업데이트
yarn realm

# D1 DB 업데이트
yarn d1
```

# Trouble Shooting

#### D1 주변약국 데이터베이스 업데이트 안되는 경우

1. 브라우저에서 cloudflare 로그인

2. 프로젝트 터미널에서 아래 명령 실행 후 브라우저에서 허용

```bash
wrangler login
```
