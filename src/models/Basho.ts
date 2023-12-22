export default class Basho {
    bashoId?: number | undefined;
    bashoName?: string | undefined;
    venue?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    city?: string | undefined;

    constructor() {}

    public toString = (): string => {
        return `${this.bashoId}, ${this.bashoName}, ${this.venue}, ${this.startDate?.toDateString()}, ${this.endDate?.toDateString()}, ${this.city}\n`;
    };
}
