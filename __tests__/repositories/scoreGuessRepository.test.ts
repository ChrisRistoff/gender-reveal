import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { updateGuessStatus, publishGuessResult } from "../../src/scoreGuess/scoreGuessRepository";
import { GuessStatus } from "../../src/enums";

const dynamoMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

describe("scoreGuess repository", () => {
    beforeEach(() => {
        dynamoMock.reset();
        snsMock.reset();

        process.env.GUESSES_TABLE = "test-guesses";
        process.env.GUESS_RESULT_TOPIC_ARN = "test-topic";
    });

    describe("updateGuessStatus", () => {
        it("sends an update command to dynamo with the correct status", async () => {
            dynamoMock.on(UpdateCommand).resolves({});

            await updateGuessStatus("scan1", "user1", GuessStatus.Correct);

            const calls = dynamoMock.commandCalls(UpdateCommand);

            expect(calls).toHaveLength(1);
            expect(calls[0].args[0].input).toMatchObject({
                Key: { scanId: "scan1", userId: "user1" },
                ExpressionAttributeValues: expect.objectContaining({
                    ":status": GuessStatus.Correct,
                }),
            });
        });

        it("throws if dynamo fails", async () => {
            dynamoMock.on(UpdateCommand).rejects(new Error("dynamo error"));

            await expect(updateGuessStatus("scan1", "user1", GuessStatus.Correct)).rejects.toThrow("dynamo error");
        });
    });

    describe("publishGuessResult", () => {
        it("publishes the correct payload to sns", async () => {
            snsMock.on(PublishCommand).resolves({});

            await publishGuessResult({
                scanId: "scan1",
                userId: "user1",
                guess: "girl",
                gender: "girl",
                status: GuessStatus.Correct,
            });

            const calls = snsMock.commandCalls(PublishCommand);

            expect(calls).toHaveLength(1);

            expect(JSON.parse(calls[0].args[0].input.Message!)).toMatchObject({
                scanId: "scan1",
                userId: "user1",
                status: GuessStatus.Correct,
            });
        });

        it("throws if sns fails", async () => {
            snsMock.on(PublishCommand).rejects(new Error("sns error"));

            await expect(publishGuessResult({
                scanId: "scan1",
                userId: "user1",
                guess: "girl",
                gender: "girl",
                status: GuessStatus.Correct,
            })).rejects.toThrow("sns error");
        });
    });
});
