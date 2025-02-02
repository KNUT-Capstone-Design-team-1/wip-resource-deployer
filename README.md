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

MODE="실행모드. dev | prod"
```
- [의약품 낱알식별](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=11)
- [의약품 제품허가 상세정보](https://nedrug.mfds.go.kr/pbp/CCBGA01/getItem?totalPages=8&limit=10&page=2&&openDataInfoSeq=12)

# execute
```bash
yarn start
```
