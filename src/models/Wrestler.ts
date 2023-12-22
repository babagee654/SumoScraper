export default class Wrestler {
    wrestler_id?: number;
    name?: string;
    nationality?: string;
    height?: number;
    weight?: number;
    heya?: string;
    age?: number;
    highest_rank?: string;
    current_rank?: string;
    current_division?: string;
    debut?: Date;
    career_wins?: number;
    career_losses?: number;
    current_basho_record?: string;

    constructor() {}

    public toString = (): string => {
        return `${this.wrestler_id}, ${this.name}, ${this.current_rank}, ${this.current_basho_record}`;
    };
}
