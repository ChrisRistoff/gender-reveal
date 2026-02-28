import { submitGuess } from "../../src/submitGuess/submitGuessService";
import * as repository from "../../src/submitGuess/submitGuessRepository";
import { RevealStatus, Genders } from "../../src/enums";

// mock the entire repository module so no real dynamo calls are made
jest.mock("../../src/submitGuess/submitGuessRepository");
const mockRepository = repository as jest.Mocked<typeof repository>;

describe("submitGuess service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 400 if guess is not boy or girl", async () => {
        const result = await submitGuess({ scanId: "123", userId: "user1", guess: "maybe" });

        expect(result).toEqual({ success: false, code: 400, body: JSON.stringify({ message: "guess must be boy or girl" })});
    });

    it("returns 404 if scan does not exist", async () => {
        mockRepository.getScanById.mockResolvedValue(null);

        const result = await submitGuess({ scanId: "123", userId: "user1", guess: Genders.Girl });

        expect(result).toEqual({ success: false, code: 404, body: JSON.stringify({ message: "scan not found" })});
    });

    it("returns 409 if scan is already revealed", async () => {
        mockRepository.getScanById.mockResolvedValue({ scanId: "123", userId: "owner", status: RevealStatus.Revealed });

        const result = await submitGuess({ scanId: "123", userId: "user1", guess: Genders.Girl });

        expect(result).toEqual({ success: false, code: 409, body: JSON.stringify({ message: "this scan has already been revealed" })});
    });

    it("returns 409 if user tries to guess on their own scan", async () => {
        mockRepository.getScanById.mockResolvedValue({ scanId: "123", userId: "user1", status: RevealStatus.Unrevealed });

        const result = await submitGuess({ scanId: "123", userId: "user1", guess: Genders.Girl });

        expect(result).toEqual({ success: false, code: 409, body: JSON.stringify({ message: "you cannot guess on your own scan" })});
    });

    it("returns 409 if user already guessed on this scan", async () => {
        mockRepository.getScanById.mockResolvedValue({ scanId: "123", userId: "owner", status: RevealStatus.Unrevealed });

        const err = new Error("ConditionalCheckFailedException");

        err.name = "ConditionalCheckFailedException";

        mockRepository.createGuess.mockRejectedValue(err);

        const result = await submitGuess({ scanId: "123", userId: "user1", guess: Genders.Girl });

        expect(result).toEqual({ success: false, code: 409, body: JSON.stringify({ message: "you already guessed on this scan" })});
    });

    it("returns success if guess is valid", async () => {
        mockRepository.getScanById.mockResolvedValue({ scanId: "123", userId: "owner", status: RevealStatus.Unrevealed });

        mockRepository.createGuess.mockResolvedValue(undefined);

        const result = await submitGuess({ scanId: "123", userId: "user1", guess: Genders.Girl });

        expect(result).toEqual({ success: true });
    });
});
