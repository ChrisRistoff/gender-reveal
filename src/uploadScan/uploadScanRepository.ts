import { DynamoDBClient, QueryCommandOutput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { RevealStatus } from "@shared/enums";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3 = new S3Client();

export const getScanByUserAndYear = async (userId: string, year: string): Promise<QueryCommandOutput> => {
    return await dynamo.send(new QueryCommand({
        TableName: process.env.SCANS_TABLE!,
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "#year = :year",
        ExpressionAttributeNames: { "#year": "year" },
        ExpressionAttributeValues: {
            ":userId": userId,
            ":year": year,
        },
    }));
}

export const writeScanRecord = async (
    userId: string,
    scanId: string,
    s3Key: string,
    year: string
): Promise<void> => {
    // gender is null until the user comes back to reveal it
    await dynamo.send(new PutCommand({
        TableName: process.env.SCANS_TABLE!,
        Item: {
            userId,
            scanId,
            s3Key,
            gender: null,
            status: RevealStatus.Unrevealed,
            year,
            createdAt: new Date().toISOString(),
        },
    }));
}

export const getPresignedScanUrl = async (s3Key: string): Promise<string> => {
    return await getSignedUrl(
            s3,
            new PutObjectCommand({
                Bucket: process.env.SCANS_BUCKET!,
                Key: s3Key,
                ContentType: "image/jpeg",
            }),
            { expiresIn: 300 }
        );
}
