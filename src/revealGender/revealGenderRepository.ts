import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Genders, RevealStatus } from "../enums";
import { Scan } from "../commonTypes";


const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient());

export const getScanByUserAndScanIds = async (userId: string, scanId: string): Promise<Scan | undefined> => {
    const scan = await dynamo.send(new QueryCommand({
        TableName: process.env.SCANS_TABLE!,
        KeyConditionExpression: "userId = :userId AND scanId = :scanId",
        ExpressionAttributeValues: {
            ":userId": userId,
            ":scanId": scanId,
        },
    }));

    return scan.Items?.length ? scan.Items[0] as Scan : undefined;
}

export const writeScanGenderUpdate = async (scanId: string, userId: string, gender: Genders): Promise<void> => {
    await dynamo.send(new UpdateCommand({
        TableName: process.env.SCANS_TABLE!,
        Key: { userId, scanId },
        UpdateExpression: "SET #status = :status, gender = :gender, revealedAt = :revealedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
            ":status": RevealStatus.Revealed,
            ":gender": gender.toLowerCase(),
            ":revealedAt": new Date().toISOString(),
        },
    }));
}
