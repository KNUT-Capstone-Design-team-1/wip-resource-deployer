# wip resource deployer
이게뭐약 리소스 배포 모듈. 

# function
- 리소스 파일을 데이터베이스 파일로 변환
- 데이터베이스 파일을 리소스 저장소에 업로드를 수행.

# requirement
- .env
```
REALM_ENCRYPTION_KEY="realm 데이터베이스 암호화 키"

CLOUD_FLARE_RESOURCE_DOWNLOAD_URL="클라우드 플레어 리소스 스토리지 URL"
CLOUD_FLARE_RESOURCE_BUCKET="클라우드 플레어 리소스 버킷 이름"
CLOUD_FLARE_TOKEN_VALUE="클라우드 플레어 R2 토큰"
CLOUD_FLARE_ACCESS_KEY_ID="클라우드 플레어 R2 액세스 키 아이디"
CLOUD_FLARE_SECRET_ACCESS_KEY="클라우드 플레어 R2 액세스 키"
```
- [의약품 낱알식별정보 데이터](https://data.mfds.go.kr/OPCAC01F05?srchSrvcKorNm=%EC%9D%98%EC%95%BD%ED%92%88%20%EB%82%B1%EC%95%8C%EC%8B%9D%EB%B3%84%EC%A0%95%EB%B3%B4%20%EB%8D%B0%EC%9D%B4%ED%84%B0)
- [완제 의약품 허가 상세 데이터](https://data.mfds.go.kr/OPCAC01F05/search?loginCk=false&aplyYn=&taskDivsCd=&srchSrvcKorNm=%EC%99%84%EC%A0%9C+%EC%9D%98%EC%95%BD%ED%92%88+%ED%97%88%EA%B0%80+%EC%83%81%EC%84%B8+%EB%8D%B0%EC%9D%B4%ED%84%B0)

# execute
```bash
# mode: initial / update
yarn start {mode}
```
