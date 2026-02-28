import { Genders, RevealStatus } from "@shared/enums";
import { getScanByUserAndScanIds } from "./revealGenderRepository";
import { UpdateScanGenderResult } from "./types";

export const updateScanGender = async (scanId: string, userId: string, gender: Genders): Promise<UpdateScanGenderResult> => {
    // check gender is boy or girl
    if (!gender || !Object.values(Genders).includes(gender.toLowerCase() as Genders)) {
        return {
            success: false,
            code: 400,
            body: JSON.stringify({ message: "gender must be boy or girl" }),
        };
    }

    const scanToUpdate = await getScanByUserAndScanIds(userId, scanId);

    if (!scanToUpdate) {
        return {
            success: false,
            code: 404,
            body: JSON.stringify({ message: "scan not found" }),
        }
    }

    if (scanToUpdate.status === RevealStatus.Revealed) {
        return {
            success: false,
            code: 409,
            body: JSON.stringify({ message: "this scan has already been revealed" }),
        }
    }

    return { success: true };
}
