import Realm from "realm";
import RealmDatabase from "./realm_database";
import { IDrugRecognition } from "../@types/drug_recognition";
import { DRUG_RECOGNITION, logger } from "../utils";

export class DrugRecognitionModel {
  private readonly realm: Realm;
  private readonly collection: string;

  constructor() {
    this.realm = RealmDatabase.get();
    this.collection = DRUG_RECOGNITION;
  }

  public readAll() {
    return this.realm.objects(this.collection);
  }

  public upsertMany(datas: Array<IDrugRecognition>) {
    for (let i = 0; i < datas.length; i += 1) {
      logger.info(datas[i]);
      this.upsert(datas[i]);
    }
  }

  public upsert(data: IDrugRecognition) {
    this.realm.write(() => {
      this.realm.create(DRUG_RECOGNITION, data, Realm.UpdateMode.Modified);
    });
  }
}
