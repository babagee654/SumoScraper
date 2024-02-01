import { ConsoleTransportOptions } from "winston/lib/winston/transports";
import { ScrapeBashoPage } from "./webpages/BashoPage";
import winston, { Logger } from "winston";

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
        await ScrapeBashoPage(rootLogger);
    } catch (error) {
        rootLogger.error(error);
    }
})();
