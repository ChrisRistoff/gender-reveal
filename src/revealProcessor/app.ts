import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { DynamoDBStreamEvent } from "aws-lambda";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const sqs = new SQSClient();

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
    for (const record of event.Records) {
        // only care about updates, reveal is an update
        if (record.eventName !== "MODIFY") continue;

        const newImage = record.dynamodb?.NewImage;
        const oldImage = record.dynamodb?.OldImage;

        if (!newImage || !oldImage) continue;

        // only fire when status changes from unrevealed to revealed
        const wasUnrevealed = oldImage.status?.S === "UNREVEALED";
        const isNowRevealed = newImage.status?.S === "REVEALED";

        if (!wasUnrevealed || !isNowRevealed) continue;

        const scanId = newImage.scanId?.S;
        const gender = newImage.gender?.S;

        if (!scanId || !gender) continue;

        // fetch all guesses for this scan
        const guessesResult = await dynamo.send(new QueryCommand({
            TableName: process.env.GUESSES_TABLE!,
            KeyConditionExpression: "scanId = :scanId",
            ExpressionAttributeValues: {
                ":scanId": scanId,
            },
        }));

        const guesses = guessesResult.Items ?? [];

        if (guesses.length === 0) continue;

        // sqs batch send accepts max 10 messages at a time so we chunk the guesses
        const chunks = [];
        for (let i = 0; i < guesses.length; i += 10) {
            chunks.push(guesses.slice(i, i + 10));
        }

        // drop one sqs message per guess, scoreGuess lambda will pick them up
        for (const chunk of chunks) {
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
    }
};
