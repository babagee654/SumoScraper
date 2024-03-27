import { Locator, Page, chromium } from "playwright";
import fs from "fs";
import { Wrestler, Divisions, Basho, SumoDBPages } from "@babagee654/sumo-data-models";
import { Logger } from "winston";
import { parseWrestlerIdFromUrl, parseBashoIdFromUrl } from "../helpers/urlParserHelpers";

const DivisionCount = Object.keys(Divisions).length;

//#region Scraper Functions
async function scrapeBanzukeByDivision(page: Page, logger: Logger) {
    try {
        let locator = await page.locator(".banzuke");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate '.banzuke'");
        }
        const divisionsList: Wrestler[][] = [];
        for (let i = 0; i < DivisionCount; i++) {
            const division = Object.keys(Divisions)[i];
            const wrestlerList: Wrestler[] = await scrapeDivisionTable(await locator.nth(i), division, logger);
            logger.info(`Found ${wrestlerList.length} wrestlers in ${division} division!`);
            divisionsList.push(wrestlerList);
        }
        return divisionsList;
    } catch (error) {
        throw new Error(`Error scraping division tables! ${error}`);
    }
}

async function scrapeDivisionTable(locator: Locator, division: string, logger: Logger) {
    logger.info(`\n--------Scraping ${division} Banzuke Table--------\n`);
    try {
        const wrestlersArray: Wrestler[] = [];
        const tableRows = await locator.locator("tbody > tr");
        if ((await tableRows.count()) <= 0) {
            throw new Error("Unable to locate 'tbody > tr'");
        }
        for (let i = 0; i < (await tableRows.count()); i++) {
            const currRow = await tableRows.nth(i);
            const rowTds = await currRow.locator("td");
            const tdCount = (await rowTds.count()) ?? 0;

            switch (tdCount) {
                case 3:
                    // 3 Cells, Rank will say TD, meaning it is the same as previous row's Rank
                    const tdResult = await rowTds.nth(0);
                    const tdShikona = await rowTds.nth(1);
                    const tdRank = wrestlersArray[wrestlersArray.length - 1].current_rank;
                    const tdWrestlerUrl = await tdShikona.locator("a").getAttribute("href");
                    const tdWrestlerId = parseWrestlerIdFromUrl(tdWrestlerUrl ?? "");
                    const tdWrestler = new Wrestler();
                    tdWrestler.wrestlerId = await parseInt(tdWrestlerId);
                    tdWrestler.name = (await tdShikona.textContent()) ?? "";
                    tdWrestler.current_basho_record = (await tdResult.textContent())?.split(" ")[0];
                    tdWrestler.current_rank = tdRank ?? "";
                    tdWrestler.current_division = division;

                    wrestlersArray.push(tdWrestler);
                    logger.info(`${tdWrestler.wrestlerId}: ${tdWrestler.name} added! 🙆‍♂️`);
                    break;
                case 4:
                    logger.info(`Found single wrestler in row ${i} 🐒`);
                    let singleShikona = await currRow.locator(".shikona");
                    if ((await singleShikona.count()) <= 0) {
                        singleShikona = await currRow.locator(".debut");
                    }
                    const singleRank = await currRow.locator(".short_rank");
                    const singleResult = await currRow.locator("[style*='white-space:nowrap;']");
                    const singleWrestlerUrl = await singleShikona.locator("a").getAttribute("href");
                    const singleWrestlerId = parseWrestlerIdFromUrl(singleWrestlerUrl ?? "");

                    const singleFoundWrestler = new Wrestler();
                    singleFoundWrestler.wrestlerId = await parseInt(singleWrestlerId);
                    singleFoundWrestler.name = (await singleShikona.textContent()) ?? "";
                    singleFoundWrestler.current_basho_record = (await singleResult.textContent())?.split(" ")[0];
                    singleFoundWrestler.current_rank = (await singleRank.textContent()) ?? "";
                    singleFoundWrestler.current_division = division;

                    wrestlersArray.push(singleFoundWrestler);
                    logger.info(`${singleFoundWrestler.wrestlerId}: ${singleFoundWrestler.name} added! 🙆‍♂️`);

                    break;
                case 5:
                    logger.info(`Found two wrestlers in row ${i} 🐒🐒`);
                    const result1 = await rowTds.nth(0);
                    const shikona1 = await rowTds.nth(1);
                    const wrestler1Url = await shikona1.locator("a").getAttribute("href");
                    const wrestler1Id = parseWrestlerIdFromUrl(wrestler1Url ?? "");

                    const doubleRank = await rowTds.nth(2);

                    const result2 = await rowTds.nth(4);
                    const shikona2 = await rowTds.nth(3);
                    const wrestler2Url = await shikona2.locator("a").getAttribute("href");
                    const wrestler2Id = parseWrestlerIdFromUrl(wrestler2Url ?? "");

                    const wrestler1 = new Wrestler();
                    wrestler1.wrestlerId = await parseInt(wrestler1Id);
                    wrestler1.name = (await shikona1.textContent()) ?? "";
                    wrestler1.current_basho_record = (await result1.textContent())?.split(" ")[0];
                    wrestler1.current_rank = (await doubleRank.textContent()) ?? "";
                    wrestler1.current_division = division;
                    wrestlersArray.push(wrestler1);
                    logger.info(`${wrestler1.wrestlerId}: ${wrestler1.name} added! 🙆‍♂️`);

                    const wrestler2 = new Wrestler();
                    wrestler2.wrestlerId = await parseInt(wrestler2Id);
                    wrestler2.name = (await shikona2.textContent()) ?? "";
                    wrestler2.current_basho_record = (await result2.textContent())?.split(" ")[0];
                    wrestler2.current_rank = (await doubleRank.textContent()) ?? "";
                    wrestler2.current_division = division;
                    wrestlersArray.push(wrestler2);
                    logger.info(`${wrestler2.wrestlerId}: ${wrestler2.name} added! 🙆‍♂️`);
                    break;
                default:
                    throw new Error(`Invalid tdCount ${tdCount}. Check to ensure code is correct!`);
            }
        }
        return wrestlersArray;
    } catch (error) {
        throw new Error(`Error scraping ${division} division table! ${error}`);
    }
}
//#endregion

export async function ScrapeBanzukePage(logger: Logger, basho: Basho) {
    const browser = await chromium.launch();
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        const url = SumoDBPages.Basho || "https://sumodb.sumogames.de/Banzuke.aspx";

        logger.info(`Navigate to ${url}`);
        await page.goto(url);

        logger.info("Getting Banzuke Details for Makuuchi/Juryo...👺");
        const divisionsList = await scrapeBanzukeByDivision(page, logger);

        for (let i = 0; i < DivisionCount; i++) {
            const division = Object.keys(Divisions)[i];
            fs.writeFile(`./.temp/${basho.bashoName}-${division}.txt`, "", (err) => {
                if (err) logger.error(err);
            });
            for (let wrestler of divisionsList[i]) {
                fs.appendFile(`./.temp/${basho.bashoName}-${division}.txt`, `${wrestler.toString()}\n`, (err) => {
                    if (err) logger.error(err);
                });
            }
        }

        return divisionsList;
    } catch (error) {
        logger.warn("⚠️ Uh Oh! There was an error scraping Banzuke page! ⚠️");
        logger.error(error?.message || error);
    } finally {
        await browser.close();
        // await cleanup("./.temp/");
    }
}
