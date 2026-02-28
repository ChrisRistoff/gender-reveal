import { Scan } from "../commonTypes";
import { RevealStatus } from "../enums";
import { getAllScans, getImageUrl } from "./getScansRepository";

export const getAllScansWithUrls = async (): Promise<Scan[]> => {
    const allScans = await getAllScans();

    const scansWithUrls = Promise.all(
        allScans.map(async (scan) => {
            const imageUrl = await getImageUrl(scan);

            const { gender, ...scanWithoutGendedr } = scan;

            return {
                ...scanWithoutGendedr,
                imageUrl,
                gender: scan.status === RevealStatus.Revealed ? gender : null
            }
        })
    );

    return scansWithUrls;
}
