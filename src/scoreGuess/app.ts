import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SQSEvent } from "aws-lambda";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const sns = new SNSClient();

export const handler = async (event: SQSEvent): Promise<void> => {
    for (const record of event.Records) {
        const { scanId, userId, guess, gender } = JSON.parse(record.body);

        // compare the guess
        const status = guess === gender ? "CORRECT" : "WRONG";

        // update the guess record in dynamo
        await dynamo.send(new UpdateCommand({
            TableName: process.env.GUESSES_TABLE!,
            Key: { scanId, userId },
            UpdateExpression: "SET #status = :status, resolvedAt = :resolvedAt",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":status": status,
                ":resolvedAt": new Date().toISOString(),
            },
        }));

        // publish to sns
        // this fans out to notifyUser and leaderboard queues simultaneously
        await sns.send(new PublishCommand({
            TopicArn: process.env.GUESS_RESULT_TOPIC_ARN!,
            Message: JSON.stringify({ scanId, userId, guess, gender, status }),
            MessageAttributes: {
                eventType: {
                    DataType: "String",
                    StringValue: "guess_scored",
                },
            },
        }));
    }
};
