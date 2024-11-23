import { S3Client } from "@aws-sdk/client-s3";

export class CloudFlareR2Client {
  public static s3Client: S3Client;

  public static get() {
    return this.s3Client;
  }

  public static createS3Client() {
    const {
      CLOUD_FLARE_RESOURCE_DOWNLOAD_URL,
      CLOUD_FLARE_ACCESS_KEY_ID,
      CLOUD_FLARE_SECRET_ACCESS_KEY,
    } = process.env;

    this.s3Client = new S3Client({
      endpoint: CLOUD_FLARE_RESOURCE_DOWNLOAD_URL as string,
      region: "auto",
      credentials: {
        accessKeyId: CLOUD_FLARE_ACCESS_KEY_ID as string,
        secretAccessKey: CLOUD_FLARE_SECRET_ACCESS_KEY as string,
      },
    });
  }
}
