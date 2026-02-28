import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GuessItem } from "./types";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const sqs = new SQSClient();

export const getGuessesById = async (scanId: string): Promise<GuessItem[]> => {
    const result = await dynamo.send(new QueryCommand({
        TableName: process.env.GUESSES_TABLE!,
        KeyConditionExpression: "scanId = :scanId",
        ExpressionAttributeValues: {
            ":scanId": scanId,
        }
    }));

    return (result.Items ?? []) as GuessItem[];
}

export const publishGuessesForScoring = async (chunk: GuessItem[], scanId: string, gender: string): Promise<void> => {
    await sqs.send(new SendMessageBatchCommand({
        QueueUrl: process.env.SCORE_GUESS_QUEUE_URL!,
        Entries: chunk.map((guess) => ({
            Id: `${guess.userId}`,
            MessageBody: JSON.stringify({
                scanId,
                userId: guess.userId,
                guess: guess.guess,
                gender,
            }),
        })),
    }));
}
