import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// converts js objects to dynamodb format and back automatically
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// create the dynamo client once outside the handler so it gets reused across warm invocations
const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get guessId from url path
    const guessId = event.pathParameters?.guessId;

    if (!guessId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "guessId is required" }),
        };
    }

    // ask dynamo for the item with this guessId as the key
    const result = await client.send(new GetCommand({
        TableName: process.env.TABLE_NAME!, // table name from env in template.yaml
        Key: { guessId },
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: "guess not found" }),
        };
    }

    // return the full item — includes name, guess, status, createdAt etc.
    return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
    };
};
