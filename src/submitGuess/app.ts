import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user id from cognito token
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "unauthorized" }),
        };
    }

    // get the scanId from the url
    const scanId = event.pathParameters?.scanId;

    if (!scanId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "scanId is required" }),
        };
    }

    const body = JSON.parse(event.body ?? "{}");
    const { guess } = body;

    if (!guess || !["boy", "girl"].includes(guess.toLowerCase())) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "guess must be boy or girl" }),
        };
    }

    const scanResult = await dynamo.send(new QueryCommand({
        TableName: process.env.SCANS_TABLE!,
        IndexName: "scanId-index",
        KeyConditionExpression: "scanId = :scanId",
        ExpressionAttributeValues: {
            ":scanId": scanId,
        },
    }));

    if (!scanResult.Items || scanResult.Items.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: "scan not found" }),
        };
    }

    const scan = scanResult.Items[0];

    // user cant guess on already revealed scans
    if (scan.status === "REVEALED") {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "this scan has already been revealed" }),
        };
    }

    // user cant guess on their own scan
    if (scan.userId === userId) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "you cannot guess on your own scan" }),
        };
    }

    // write the guess
    // naturally enforces 1 guess per user per scan
    // if they guess again it will overwrite
    await dynamo.send(new PutCommand({
        TableName: process.env.GUESSES_TABLE!,
        Item: {
            scanId,
            userId,
            guess: guess.toLowerCase(),
            status: "PENDING",
            createdAt: new Date().toISOString(),
        },

        // put will fail if a guess exists for this user+scan
        ConditionExpression: "attribute_not_exists(scanId) AND attribute_not_exists(userId)",
    }));

    return {
        statusCode: 201,
        body: JSON.stringify({ scanId, userId, status: "PENDING" }),
    };
};
