import { getUserGuessForScan } from "../../src/getGuess/getGuessService";
import * as repository from "../../src/getGuess/getGuessRepository";

jest.mock("../../src/getGuess/getGuessRepository");
const mockRepository = repository as jest.Mocked<typeof repository>;

describe('getGuess service', () => {
    it('should return error when no guess found', async () => {
        mockRepository.getGuessById.mockResolvedValue({ Item: undefined, $metadata: {} });
        const result = await getUserGuessForScan('234', '234');

        expect(result).toMatchObject({
            success: false,
            code: 404,
            body: JSON.stringify({ message: "no guess found for this scan" })
        })
    })

    it('should return guess when found', async () => {
        const guess = { scanId: '234', userId: '234', guess: 'girl', status: 'PENDING', createdAt: '2026-01-01' };
        mockRepository.getGuessById.mockResolvedValue({ Item: guess, $metadata: {} });
        const result = await getUserGuessForScan('234', '234');

        expect(result).toMatchObject({ success: true, guess });
    });
})
