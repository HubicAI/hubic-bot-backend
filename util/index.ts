export const calculateModParts = (a: number, b: number) => {
    return {
        quotient: Math.floor(a / b), // quotient
        remainder: a % b              // remainder
    };
}