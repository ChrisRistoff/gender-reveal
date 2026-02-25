import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// updatecommand lets us update a specific field on an existing item
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBStreamEvent } from "aws-lambda";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

// host reveals the gender without touching code
const ACTUAL_GENDER = process.env.ACTUAL_GENDER ?? "girl";

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {

    // dynamo streams can batch multiple records together so we loop through all of them
    for (const record of event.Records) {

        // WARN: without this check we get into an infinite loop - update triggers stream, stream triggers update and so on
        if (record.eventName !== "INSERT") continue;

        // newimage is the full state of the item that was just written to dynamo
        const newImage = record.dynamodb?.NewImage;

        if (!newImage) {
            continue;
        }

        // dynamo stream format wraps values in type descriptors e.g. { S: "somestring" }
        // pull .S to get the actual string value
        const guessId = newImage.guessId?.S;
        const guess = newImage.guess?.S;

        if (!guessId || !guess) {
            continue;
        }

        // compare the guess against the real answer
        const status = guess === ACTUAL_GENDER ? "CORRECT" : "WRONG";

        // update just the status field on the existing dynamo item, not overwrite the whole thing
        await client.send(new UpdateCommand({
            TableName: process.env.TABLE_NAME!,
            Key: { guessId },
            // #status is an expression alias because status is a reserved word in dynamodb
            UpdateExpression: "SET #status = :status, resolvedAt = :resolvedAt",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":status": status,
                ":resolvedAt": new Date().toISOString(),
            },
        }));
    }
};
