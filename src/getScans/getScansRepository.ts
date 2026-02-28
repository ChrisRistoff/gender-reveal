import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Scan } from "@shared/commonTypes";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3 = new S3Client();

export const getAllScans = async (): Promise<Scan[]> => {
    const result = await dynamo.send(new ScanCommand({
        TableName: process.env.SCANS_TABLE!,
    }));

    return result.Items?.length ? result.Items as Scan[] : [];
}

export const getImageUrl = async (scan: Scan): Promise<string> => {
    return await getSignedUrl(
        s3,
        new GetObjectCommand({
            Bucket: process.env.SCANS_BUCKET!,
            Key: scan.s3Key
        }),
        { expiresIn: 3600 } // valid for 1hr
    )
}
