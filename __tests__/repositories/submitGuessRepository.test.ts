import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getScanById, createGuess } from "../../src/submitGuess/submitGuessRepository";
import { Genders, GuessStatus } from "../../src/enums"

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe("submitGuess repository", () => {
    beforeEach(() => {
        dynamoMock.reset();

        process.env.SCANS_TABLE = "test-scans";
        process.env.GUESSES_TABLE = "test-guesses";
    });

    it("queries the correct secondary index with the right scanId", async () => {
        dynamoMock.on(QueryCommand).resolves({ Items: [] });
        await getScanById("123");

        const calls = dynamoMock.commandCalls(QueryCommand);

        expect(calls[0].args[0].input).toMatchObject({
            IndexName: "scanId-index",
            ExpressionAttributeValues: { ":scanId": "123" },
        });
    });

    it("writes to the correct table with the right key and status", async () => {
        dynamoMock.on(PutCommand).resolves({});
        await createGuess("scan1", "user1", Genders.Girl);

        const calls = dynamoMock.commandCalls(PutCommand);

        expect(calls[0].args[0].input).toMatchObject({
            TableName: "test-guesses",
            Item: {
                scanId: "scan1",
                userId: "user1",
                guess: Genders.Girl,
                status: GuessStatus.Pending,
            },
        });
    });

    it("throws if dynamo rejects", async () => {
        dynamoMock.on(PutCommand).rejects(new Error("dynamo error"));
        await expect(createGuess("scan1", "user1", Genders.Girl)).rejects.toThrow("dynamo error");
    });
});
