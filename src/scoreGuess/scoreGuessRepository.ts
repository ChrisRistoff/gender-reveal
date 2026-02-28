import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());
const sns = new SNSClient();

// update the guess record with the final scored status
export const updateGuessStatus = async (
    scanId: string,
    userId: string,
    status: string
) => {
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
};

// publish the scored result to sns for fanout to notify and leaderboard
export const publishGuessResult = async (payload: {
    scanId: string;
    userId: string;
    guess: string;
    gender: string;
    status: string;
}) => {
    await sns.send(new PublishCommand({
        TopicArn: process.env.GUESS_RESULT_TOPIC_ARN!,
        Message: JSON.stringify(payload),
        MessageAttributes: {
            eventType: {
                DataType: "String",
                StringValue: "guess_scored",
            },
        },
    }));
};
