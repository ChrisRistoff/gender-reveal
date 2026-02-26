import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";

const s3 = new S3Client();
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user id from the cognito token
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "unauthorized" }),
        };
    }

    // check if user hsa already uploaded a scan this year, 1 scan a year lomit
    const currentYear = new Date().getFullYear().toString();

    const existing = await dynamo.send(new QueryCommand({
        TableName: process.env.SCANS_TABLE!,
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "#year = :year",
        ExpressionAttributeNames: { "#year": "year" },
        ExpressionAttributeValues: {
            ":userId": userId,
            ":year": currentYear,
        },
    }));

    if (existing.Items && existing.Items.length > 0) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "you already uploaded a scan this year" }),
        };
    }

    const scanId = randomUUID();

    // path of image in s3
    const s3Key = `scans/${userId}/${scanId}`;

    // generate a presigned temporary url frontend uses to upload to s3
    // expires in 5 minutes
    const presignedUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
            Bucket: process.env.SCANS_BUCKET!,
            Key: s3Key,
            ContentType: "image/jpeg",
        }),
        { expiresIn: 300 }
    );

    // write the scan record to dynamo with status unrevealed
    // gender is null until the user comes back to reveal it
    await dynamo.send(new PutCommand({
        TableName: process.env.SCANS_TABLE!,
        Item: {
            userId,
            scanId,
            s3Key,
            gender: null,
            status: "UNREVEALED",
            year: currentYear,
            createdAt: new Date().toISOString(),
        },
    }));

    // return the url and scanId to the frontend
    // frontend uploads the image directly to s3
    // stores the scanId to reference this scan later
    return {
        statusCode: 201,
        body: JSON.stringify({ scanId, presignedUrl }),
    };
};
