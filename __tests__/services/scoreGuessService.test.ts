import { scoreGuess } from "../../src/scoreGuess/scoreGuessService";
import * as repository from "../../src/scoreGuess/scoreGuessRepository";
import { Genders, GuessStatus } from "../../src/enums";

jest.mock("../../src/scoreGuess/scoreGuessRepository");
const mockRepository = repository as jest.Mocked<typeof repository>;

describe("scoreGuess service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository.updateGuessStatus.mockResolvedValue(undefined);
        mockRepository.publishGuessResult.mockResolvedValue(undefined);
    });

    it("scores a correct guess", async () => {
        await scoreGuess({ scanId: "123", userId: "user1", guess: Genders.Girl, gender: Genders.Girl });
        expect(mockRepository.updateGuessStatus).toHaveBeenCalledWith("123", "user1", GuessStatus.Correct);
    });

    it("scores a wrong guess", async () => {
        await scoreGuess({ scanId: "123", userId: "user1", guess: Genders.Boy,gender: Genders.Girl });
        expect(mockRepository.updateGuessStatus).toHaveBeenCalledWith("123", "user1", GuessStatus.Wrong);
    });

    it("publishes the result to sns after scoring", async () => {
        await scoreGuess({ scanId: "123", userId: "user1", guess: Genders.Girl, gender: Genders.Girl });
        expect(mockRepository.publishGuessResult).toHaveBeenCalledWith({
            scanId: "123",
            userId: "user1",
            guess: Genders.Girl,
            gender: Genders.Girl,
            status: GuessStatus.Correct,
        });
    });

    it("always publishes even for wrong guesses", async () => {
        await scoreGuess({ scanId: "123", userId: "user1", guess: Genders.Boy, gender: Genders.Girl });
        expect(mockRepository.publishGuessResult).toHaveBeenCalledWith(
            expect.objectContaining({ status: GuessStatus.Wrong })
        );
    });
});
