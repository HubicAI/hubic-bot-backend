import { Prize } from "../config";
export const getRandomPrize = (prizes: Prize[]): { amount: number; index: number } => {
    const totalWeight = prizes.reduce((sum, p) => sum + p.probability, 0);
    const rand = Math.random() * totalWeight;

    let cumulative = 0;
    for (const prize of prizes) {
        cumulative += prize.probability;
        if (rand < cumulative) {
            return {
               amount: prize.amount,
               index: prizes.indexOf(prize)
            }
        }
    }

    const randomPrizeIndex = Math.random() * prizes.length
    return {
        amount: prizes[randomPrizeIndex].amount,
        index: randomPrizeIndex
    }
}