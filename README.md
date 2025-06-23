# wip resource deployer

이게뭐약 리소스 배포 도구

# function

- 리소스 파일을 데이터베이스 파일로 변환
- 데이터베이스 파일을 리소스 저장소에 업로드를 수행

# requirement

- .env

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

- 데이터베이스
  - [의약품 낱알식별](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=11)
  - [의약품 제품허가 상세정보](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=12)

# execute

0. .env 파일 구성
1. 프로젝트 루트 위치에 `res` 디렉터리 생성
2. `res` 디렉터리에 `drug_recognition` 및 `finished_medicine_permission_detail` 디렉터리 생성
3. `res/drug_recognition` 디렉터리에 `의약품 낱알식별` 데이터베이스(xls) 파일 이동
4. `res/finished_medicine_permission_detail` 디렉터리에 `의약품 제품허가 상세정보` 데이터베이스(xls) 파일 이동
5. 스키마가 변경된 경우 `config.json`의 `schemaVersion` 올림

- (ex) 기존 1이면 2로 변경

6. 실행

```bash
yarn start
```
