import { processGuesses } from "../../src/revealProcessor/revealProcessorService";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import * as repository from "../../src/revealProcessor/revealProcessorRepository";
import { Genders, RevealStatus } from "../../src/enums";

jest.mock("../../src/revealProcessor/revealProcessorRepository");
const mockRepository = repository as jest.Mocked<typeof repository>;

let RECORD: DynamoDBRecord;
let GUESS_ITEM: repository.GuessItem;

describe("scoreGuess service", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        GUESS_ITEM = { guess: Genders.Boy, userId: "1" };

        mockRepository.publishGuessesForScoring.mockResolvedValue(undefined);
        mockRepository.getGuessesById.mockResolvedValue([GUESS_ITEM]);

        RECORD = {
            eventName: "MODIFY",
            dynamodb: {
                OldImage: { status: { S: RevealStatus.Unrevealed } },
                NewImage: {
                    status: { S: RevealStatus.Revealed },
                    scanId: { S: "1" },
                    gender: { S: Genders.Girl }
                },
            },
        }
    });

    it("ignores records that are not modify events", async () => {
        RECORD.eventName = "INSERT";

        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        await processGuesses(event);

        expect(mockRepository.getGuessesById).toHaveBeenCalledTimes(0);
        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it("ignores records where old status is NOT UNREVEALED", async () => {
        RECORD.dynamodb!.OldImage!.status.S = RevealStatus.Revealed;

        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        await processGuesses(event);

        expect(mockRepository.getGuessesById).toHaveBeenCalledTimes(0);
        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it("ignores records where new status is UNREVEALED", async () => {
        RECORD.dynamodb!.NewImage!.status.S = RevealStatus.Unrevealed

        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        await processGuesses(event);

        expect(mockRepository.getGuessesById).toHaveBeenCalledTimes(0);
        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it("ignores records where scan ID is undefined", async () => {
        RECORD.dynamodb!.NewImage!.scanId.S = undefined;

        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        await processGuesses(event);

        expect(mockRepository.getGuessesById).toHaveBeenCalledTimes(0);
        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it("ignores records where gender is undefined", async () => {
        RECORD.dynamodb!.NewImage!.gender.S = undefined;

        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        await processGuesses(event);

        expect(mockRepository.getGuessesById).toHaveBeenCalledTimes(0);
        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it("ignores publishing when records is empty", async () => {
        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        mockRepository.getGuessesById.mockResolvedValueOnce([])

        await processGuesses(event);

        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it("ignores publishing when records is undefined", async () => {
        const event: DynamoDBStreamEvent = { Records: [RECORD]}

        mockRepository.getGuessesById.mockResolvedValueOnce(undefined!)

        await processGuesses(event);

        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(0);
    });

    it('process guesses succesfully for a valid event and batches chunks correctly', async () => {
        const guesses: repository.GuessItem[] = [];

        for (let i = 0; i < 12; i++) {
            guesses.push(GUESS_ITEM);
        }

        const event: DynamoDBStreamEvent = { Records: [RECORD, RECORD] };

        mockRepository.getGuessesById.mockResolvedValueOnce(guesses).mockResolvedValueOnce(guesses);

        await processGuesses(event);

        expect(mockRepository.getGuessesById).toHaveBeenCalledTimes(2);
        expect(mockRepository.publishGuessesForScoring).toHaveBeenCalledTimes(4);
    })
});
