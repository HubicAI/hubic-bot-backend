export type Prize = {
    amount: number;
    probability: number; // in percent
};

export const prizes: Prize[] = [
    { amount: 500, probability: 65 },
    { amount: 1000, probability: 40 },
    { amount: 2000, probability: 25 },
    { amount: 5000, probability: 15 },
    { amount: 10000, probability: 10 },
    { amount: 20000, probability: 5 },
    { amount: 50000, probability: 3 },
    { amount: 100000, probability: 2 },
];

export const max_time_difference = 3600 * 1000 * 26