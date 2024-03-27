export function calculateDayNumber(startDate: Date, endDate: Date, currentDate: Date): number | string {
    // Check if current_date is within the range of Sumo Tournament
    if (startDate <= currentDate && currentDate <= endDate) {
        // Calculate the current day number
        const oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds
        const dayNumber = Math.floor((currentDate.getTime() - startDate.getTime()) / oneDay) + 1;
        return dayNumber;
    } else {
        return 15;
    }
}

export function getCurrentJapanDate(): Date {
    // Get the current local time
    const currentLocalDate = new Date();

    // Get the current time in UTC
    const currentUTCTime = new Date(
        Date.UTC(
            currentLocalDate.getUTCFullYear(),
            currentLocalDate.getUTCMonth(),
            currentLocalDate.getUTCDate(),
            currentLocalDate.getUTCHours(),
            currentLocalDate.getUTCMinutes(),
            currentLocalDate.getUTCSeconds(),
            currentLocalDate.getUTCMilliseconds()
        )
    );

    // Calculate the UTC offset for Japan (JST)
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9

    // Convert the current UTC time to JST by adding the offset
    const japanDate = new Date(currentUTCTime.getTime() + jstOffset);

    return japanDate;
}
