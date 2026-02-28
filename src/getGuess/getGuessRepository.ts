import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());

export const getGuessById = async (scanId: string, userId: string): Promise<GetCommandOutput> => {
    return await dynamo.send(new GetCommand({
        TableName: process.env.GUESSES_TABLE!,
        Key: { scanId, userId },
    }));
}
