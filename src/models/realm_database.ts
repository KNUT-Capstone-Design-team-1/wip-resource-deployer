import Realm from "realm";
import { PillDataSchema } from "../schemas";
import { convertStringToInt8Array } from "../utils";

export class RealmDatabase {
  public static getInstance(realmFilepath: string): Realm {
    const config = {
      path: realmFilepath,
      schema: [PillDataSchema],
      schemaVersion: 1,
      encryptionKey: convertStringToInt8Array(
        process.env.REALM_ENCRYPTION_KEY as string
      ),
    };

    return new Realm(config);
  }
}
