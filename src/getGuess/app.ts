import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
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

    // get scanId from url
    const scanId = event.pathParameters?.scanId;

    if (!scanId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "scanId is required" }),
        };
    }

    // look up this user's guess for this specific scan
    const result = await dynamo.send(new GetCommand({
        TableName: process.env.GUESSES_TABLE!,
        Key: { scanId, userId },
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: "no guess found for this scan" }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
    };
};
