import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GuessStatus } from "@shared/enums";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());

// fetch a scan by scanId using the gsi
export const getScanById = async (scanId: string) => {
    const result = await dynamo.send(new QueryCommand({
        TableName: process.env.SCANS_TABLE!,
        IndexName: "scanId-index",
        KeyConditionExpression: "scanId = :scanId",
        ExpressionAttributeValues: { ":scanId": scanId },
    }));
    return result.Items?.[0] ?? null;
};

// write the guess
// naturally enforces 1 guess per user per scan
// if they guess again it will overwrite
export const createGuess = async (scanId: string, userId: string, guess: string) => {
    await dynamo.send(new PutCommand({
        TableName: process.env.GUESSES_TABLE!,
        Item: {
            scanId,
            userId,
            guess,
            status: GuessStatus.Pending,
            createdAt: new Date().toISOString(),
        },

        // put will fail if a guess exists for this user+scan
        ConditionExpression: "attribute_not_exists(scanId) AND attribute_not_exists(userId)",
    }));
};
