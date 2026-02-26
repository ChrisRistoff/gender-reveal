import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3 = new S3Client();

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // returns all scans from all users
    const result = await dynamo.send(new ScanCommand({
        TableName: process.env.SCANS_TABLE!,
    }));

    const scans = result.Items ?? [];

    // generate url for each scan
    const scansWithUrls = await Promise.all(
        scans.map(async (scan) => {
            const imageUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({
                    Bucket: process.env.SCANS_BUCKET!,
                    Key: scan.s3Key,
                }),
                { expiresIn: 3600 } // url valid for 1 hr
            );

            // strip out the gender
            const { gender, ...safeScan } = scan;

            return {
                ...safeScan,
                imageUrl,
                ...(scan.status === "REVEALED" && { gender }),
            };
        })
    );

    return {
        statusCode: 200,
        body: JSON.stringify(scansWithUrls),
    };
};
