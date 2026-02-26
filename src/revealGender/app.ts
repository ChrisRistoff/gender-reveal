import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user from cognito
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "unauthorized" }),
        };
    }

    // get scan id from url
    const scanId = event.pathParameters?.scanId;

    if (!scanId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "scanId is required" }),
        };
    }

    const body = JSON.parse(event.body ?? "{}");
    const { gender } = body;

    // check gender is boy or girl
    if (!gender || !["boy", "girl"].includes(gender.toLowerCase())) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "gender must be boy or girl" }),
        };
    }

    // make sure scan belongs user
    const scanResult = await dynamo.send(new QueryCommand({
        TableName: process.env.SCANS_TABLE!,
        KeyConditionExpression: "userId = :userId AND scanId = :scanId",
        ExpressionAttributeValues: {
            ":userId": userId,
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

    // make sure scan not revealed yet
    if (scan.status === "REVEALED") {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "this scan has already been revealed" }),
        };
    }

    // update scan with gender and change status to revealed
    // this write triggers the dynamo stream which wakes up the processor lambda
    await dynamo.send(new UpdateCommand({
        TableName: process.env.SCANS_TABLE!,
        Key: { userId, scanId },
        UpdateExpression: "SET #status = :status, gender = :gender, revealedAt = :revealedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
            ":status": "REVEALED",
            ":gender": gender.toLowerCase(),
            ":revealedAt": new Date().toISOString(),
        },
    }));

    return {
        statusCode: 200,
        body: JSON.stringify({ scanId, status: "REVEALED", gender: gender.toLowerCase() }),
    };
};
