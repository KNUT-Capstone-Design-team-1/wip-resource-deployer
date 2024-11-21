import { logger } from "./utils";

async function main() {
  logger.info("Start wip-resource-deployer");

  // 0. 리소스 파일을 읽어 initial.realm (이하 new)을 만든다
  // 1. 클라우드 플레어로부터 initial.realm (이하 current)을 받는다
  // 2. current load한다
  //   - Realm.copyBundledRealmFiles(); 으로 *.realm 파일들을 애플리케이션 문서 디렉터리에 추가한다
  //   - const realmContext = createRealmContext({schema: [], path: 'current~~~.realm'}); 으로 realm context를 가져온다
  //   - current의 인스턴스를 open하고 모든 데이터를 읽는다
  // 3. new의 모든 데이터를 읽는다
  //   - 데이터 정확도를 위해 리소스 파일로 부터 읽은 데이터가 아닌 DB로 부터 읽은 데이터를 읽는다
  // 4. current와 new를 비교해서 값이 다른 데이터를 update.realm으로 만든다
  // 5. initial.realm과 update.realm을 CF에 업로드 하여 덮어쓰기 한다

  logger.info("End wip-resource-deployer");
  process.exit(0);
}

main();
