import { ConsoleTransportOptions } from "winston/lib/winston/transports";
import { ScrapeBanzukePage } from "./webpages/BanzukePage";
import { ScrapeBashoPage } from "./webpages/BashoPage";
import winston, { Logger } from "winston";
import { ScrapeResultsPage } from "./webpages/ResultsPage";
import { calculateDayNumber, getCurrentJapanDate } from "./helpers/calculateHelpers";

(async function main() {
    //TODO enable page scraping selection
    const options: ConsoleTransportOptions = {
        level: "info",
        handleExceptions: true,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    };
    const rootLogger: Logger = winston.createLogger({ transports: [new winston.transports.Console(options)] });
    try {
        // provides basho details, and Wrestlers in [MakuuchiWrestlers, JuryoWrestlers]
        rootLogger.info("----------------Scraping Basho Page----------------");
        const basho = await ScrapeBashoPage(rootLogger);
        rootLogger.info("----------------Scraping Banzuke Page----------------");
        const divisionsList = await ScrapeBanzukePage(rootLogger, basho);
        const japanDate = getCurrentJapanDate();

        const currentBashoDay: number | string = calculateDayNumber(basho.startDate, basho.endDate, japanDate);
        if (typeof currentBashoDay === "string") {
            throw new Error(currentBashoDay);
        }

        rootLogger.info("----------------Scraping Results Page----------------");
        const divisionMatchups = await ScrapeResultsPage(rootLogger, basho, currentBashoDay);
    } catch (error) {
        rootLogger.error(error?.message || error);
    }
})();
