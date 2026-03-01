import { getAllScansWithUrls } from "../../src/getScans/getScansService";
import * as repository from "../../src/getScans/getScansRepository";
import { RevealStatus, Genders } from "../../src/enums";
import { Scan } from "../../src/commonTypes";

jest.mock("../../src/getScans/getScansRepository");
const mockRepository = repository as jest.Mocked<typeof repository>;

const UNREVEALED_SCAN: Scan = {
    userId: 'user1',
    scanId: 'scan1',
    s3Key: 'scans/user1/scan1',
    gender: Genders.Girl,
    status: RevealStatus.Unrevealed,
    year: '2026',
    createdAt: '2026-01-01',
};

const REVEALED_SCAN: Scan = {
    ...UNREVEALED_SCAN,
    status: RevealStatus.Revealed,
    gender: Genders.Girl,
    revealedAt: '2026-01-02',
};

describe('getScans service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository.getImageUrl.mockResolvedValue('test-url');
    });

    it('returns empty array when no scans exist', async () => {
        mockRepository.getAllScans.mockResolvedValue([]);
        const result = await getAllScansWithUrls();

        expect(result).toEqual([]);
    });

    it('hides gender for unrevealed scans', async () => {
        mockRepository.getAllScans.mockResolvedValue([UNREVEALED_SCAN]);
        const result = await getAllScansWithUrls();

        expect(result[0].gender).toBeNull();
    });

    it('shows gender for revealed scans', async () => {
        mockRepository.getAllScans.mockResolvedValue([REVEALED_SCAN]);
        const result = await getAllScansWithUrls();

        expect(result[0].gender).toBe(Genders.Girl);
    });

    it('includes image url for each scan', async () => {
        mockRepository.getAllScans.mockResolvedValue([UNREVEALED_SCAN]);
        const result = await getAllScansWithUrls();

        expect(result[0]).toHaveProperty('imageUrl', 'test-url');
    });

    it('throws if repository rejects', async () => {
        mockRepository.getAllScans.mockRejectedValue(new Error('dynamo error'));

        await expect(getAllScansWithUrls()).rejects.toThrow('dynamo error');
    });
});
