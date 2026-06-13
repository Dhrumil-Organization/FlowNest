export const getCurrentFinancialYear = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11 (Jan-Dec)

    // Financial year starts in April (month 3)
    const financialYear = month >= 3 ? year + 1 : year;
    return (financialYear % 100).toString(); // Last two digits, e.g., 27 for 2027
};