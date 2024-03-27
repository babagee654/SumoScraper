import { Logger } from "winston";
import { Basho, SumoDBPages, Divisions, Matchup, MatchupData, Wrestler, Status } from "@babagee654/sumo-data-models";
import { Locator, Page, chromium } from "playwright";
import { parseWrestlerIdFromUrl } from "../helpers/urlParserHelpers";
import fs from "fs";

const DivisionCount = Object.keys(Divisions).length;

async function scrapeMatchupsTable(logger: Logger, locator: Locator, page: Page, division: string, basho: Basho, bashoDay: number) {
    logger.info(`\n--------Scraping ${division} Matchups Table--------\n`);
    try {
        const matchups: Matchup[] = [];
        const rows = await locator.locator("tbody > tr");

        // Start at 1 b/c Division header is also tr
        if ((await rows.count()) <= 1) {
            throw new Error("Unable to locate 'tbody > tr'");
        }
        for (let i = 1; i < (await rows.count()); i++) {
            const currRow = await rows.nth(i);
            const rowTds = await currRow.locator("td");
            // Each currRow should have 5 cells
            if ((await rowTds.count()) <= 4) {
                throw new Error("Unable to locate matchup 'td'");
            }
            const matchup: Matchup = new Matchup();
            matchup.matchupDivision = division;

            // Possible win/loss images
            const loss = "img/hoshi_kuro.gif";
            const win = "img/hoshi_shiro.gif";
            const fusen_win = "img/hoshi_fusensho.gif";
            const fusen_loss = "img/hoshi_fusenpai.gif";

            const kekka1 = await rowTds.nth(0);
            const wrestlerData1 = await rowTds.nth(1);
            const matchupRecord = await rowTds.nth(2);
            const wrestlerData2 = await rowTds.nth(3);
            const kekka2 = await rowTds.nth(4);

            const hasImage = await kekka1.locator("img");

            // Check if matchup is pending

            const wrestler1 = await scrapeWrestlerDetailsInMatchup(logger, wrestlerData1, page);
            const wrestler2 = await scrapeWrestlerDetailsInMatchup(logger, wrestlerData2, page);

            matchup.wrestler1 = wrestler1;
            matchup.wrestler2 = wrestler2;

            matchup.matchupRecord = await matchupRecord.locator("font").nth(1).textContent();
            matchup.matchupDay = bashoDay;
            matchup.basho = basho;

            if ((await hasImage.count()) < 1) {
                logger.info("Match Pending, no winner yet!");
                matchup.matchupStatus = Status.Pending;
                matchup.kimarite = "";
            } else {
                // Get Kimarite, remove numbers, brackets, and hyphens
                matchup.kimarite = (await matchupRecord.textContent()).replace(/[0-9\[\]()-]/g, "");

                switch (await kekka1.locator("img").getAttribute("src")) {
                    case win:
                        matchup.winner = wrestler1;
                        matchup.loser = wrestler2;
                        logger.info("Match Completed");
                        matchup.matchupStatus = Status.Completed;
                        break;
                    case loss:
                        matchup.winner = wrestler2;
                        matchup.loser = wrestler1;
                        logger.info("Match Completed");
                        matchup.matchupStatus = Status.Completed;
                        break;
                    case fusen_win:
                        matchup.winner = wrestler1;
                        matchup.loser = wrestler2;
                        logger.info("Match Completed");
                        matchup.matchupStatus = Status.Completed;
                        break;
                    case fusen_loss:
                        matchup.winner = wrestler2;
                        matchup.loser = wrestler1;
                        logger.info("Match Completed");
                        matchup.matchupStatus = Status.Completed;
                        break;
                    default:
                        // Used for local testing since src does not match
                        logger.info("Match Pending, unable to discern winner!");
                        matchup.matchupStatus = Status.Pending;
                        break;
                }
            }
            logger.info(matchup);
            matchups.push(matchup);
        }

        return matchups;
    } catch (error) {
        throw new Error(`Unable to scrape Matchups for ${division} Table!, ${error}`);
    }
}

async function scrapeWrestlerDetailsInMatchup(logger: Logger, locator: Locator, page: Page) {
    try {
        const wrestler = new Wrestler();

        const wrestlerName = await locator.locator("center > a").nth(0);
        wrestler.name = await wrestlerName.textContent();

        const wrestlerId = parseWrestlerIdFromUrl(await wrestlerName.getAttribute("href"));
        wrestler.wrestlerId = parseInt(wrestlerId);

        // font nth(0) is the rank, nth(1) is the record
        const wrestlerRank = await locator.locator("font").nth(0).textContent();
        // removing east/west from rank
        wrestler.currentRank = rankStringCleanup(wrestlerRank);

        const wrestlerRecord = await locator.locator("center > a").nth(1);
        wrestler.currentBashoRecord = await wrestlerRecord.textContent();

        return wrestler;
    } catch (error) {
        throw new Error(`Unable to scrape Wrestler Details in Matchup!, ${error}`);
    }
}

function rankStringCleanup(rank: string) {
    const firstLetter = rank[0];

    switch (firstLetter) {
        // for Yokozuna, Ozeki, Sekiwake, Komusubi
        case "Y":
            return "Y";
        case "O":
            return "O";
        case "S":
            return "S";
        case "K":
            return "K";
        // for Maegashira/Juryo
        default:
            return rank.substring(0, rank.length - 1);
    }
}

async function scrapeMatchupsByDivision(logger: Logger, page: Page, basho: Basho, bashoDay: number) {
    try {
        let locator = page.locator(".tk_table");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate '.tk_table'");
        }

        const divisionMatchups: Matchup[][] = [];
        for (let i = 0; i < DivisionCount; i++) {
            const division = Object.keys(Divisions)[i];
            const matchupList = await scrapeMatchupsTable(logger, locator.nth(i), page, division, basho, bashoDay);
            divisionMatchups.push(matchupList);
        }
        return divisionMatchups;
    } catch (error) {
        throw new Error(`Unable to scrape Matchups by Division!, ${error}`);
    }
}

export async function ScrapeResultsPage(logger: Logger, basho: Basho, bashoDay: number) {
    const browser = await chromium.launch();
    try {
        // Create a new Date object to get the date of Japan

        logger.info(`Scraping Day ${bashoDay} of ${basho.bashoName}...`);
        const context = await browser.newContext();
        const page = await context.newPage();
        const url = `${SumoDBPages.BashoResultsByDay}?b=${basho.bashoId}&d=${bashoDay}`;
        // PENDING DAY
        // const url = `file://D:/Desktop/coding/SumoSaltyBet/PendingSumoPages/Pending%20Hatsu%202024,%20Day%205%20Results.html`;
        // COMPLETED DAY
        // const url = `file:///D:/Desktop/coding/SumoSaltyBet/PendingSumoPages/Complete%20Hatsu%202024,%20Day%2014%20Results.html`;

        logger.info(`Navigate to ${url}`);
        await page.goto(url);
        await page.waitForLoadState("domcontentloaded");
        logger.info("Getting Day Matchup Details... 👹");
        const divisionMatchups = await scrapeMatchupsByDivision(logger, page, basho, bashoDay as number);

        for (let i = 0; i < DivisionCount; i++) {
            const division = Object.keys(Divisions)[i];
            fs.writeFile(`./.temp/${basho.bashoName}-${division}-${bashoDay}.txt`, "", (err) => {
                if (err) logger.error(err);
            });
            for (let matchup of divisionMatchups[i]) {
                fs.appendFile(`./.temp/${basho.bashoName}-${division}-${bashoDay}.txt`, `${matchup.toString()}\n`, (err) => {
                    if (err) logger.error(err);
                });
            }
        }
        logger.info("👹 Done! 👹");
        return divisionMatchups;
    } catch (error) {
        logger.warn("⚠️ Uh Oh! There was an error scraping Results page! ⚠️");
        logger.error(error?.message || error);
    } finally {
        await browser.close();
        // await cleanup("./.temp/");
    }
}
