import {
  S3Client,
} from "@aws-sdk/client-s3";

export class CloudFlareR2Client {
  private readonly apiURL: string;
  private readonly bucket: string;
  private readonly accessKeyID: string;
  private readonly secretAccessKey: string;
  private readonly resourcePath: string;

  constructor() {
    const {
      CLOUD_FLARE_RESOURCE_DOWNLOAD_URL,
      CLOUD_FLARE_RESOURCE_BUCKET,
      CLOUD_FLARE_ACCESS_KEY_ID,
      CLOUD_FLARE_SECRET_ACCESS_KEY,
    } = process.env;

    this.apiURL = CLOUD_FLARE_RESOURCE_DOWNLOAD_URL as string;
    this.bucket = CLOUD_FLARE_RESOURCE_BUCKET as string;
    this.accessKeyID = CLOUD_FLARE_ACCESS_KEY_ID as string;
    this.secretAccessKey = CLOUD_FLARE_SECRET_ACCESS_KEY as string;
  }

  public async upload() {}

  private getS3Client() {
    return new S3Client({
      endpoint: this.apiURL,
      region: "auto",
      credentials: {
        accessKeyId: this.accessKeyID,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }
}
