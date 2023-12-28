import { Locator, Page, chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { Wrestler, Divisions, Basho } from "@babagee654/sumo-data-models";
const DivisionCount = Divisions.length;

//#region Helper Functions
function cleanup(directoryPath: string) {
    fs.readdir(directoryPath, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directoryPath, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

function parseWrestlerIdFromUrl(url: string) {
    const rQueryIndex = url.indexOf("r=");
    if (!rQueryIndex) {
        throw new Error(`Unable to parse for WrestlerId from URL, ${url}`);
    }
    const wrestlerId = url.slice(rQueryIndex + 2);
    return wrestlerId;
}
function parseBashoIdFromUrl(url: string) {
    const bQueryIndex = url.indexOf("b=");
    if (!bQueryIndex) {
        throw new Error(`Unable to parse for BashoId from URL, ${url}`);
    }
    const bashoId = url.slice(bQueryIndex + 2);
    return bashoId;
}
//#endregion

//#region Scraper Functions
async function scrapeBanzukeByDivision(page: Page) {
    try {
        let locator = await page.locator(".banzuke");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate '.banzuke'");
        }
        const divisionsList: Wrestler[][] = [];
        for (let i = 0; i < DivisionCount; i++) {
            const division = Divisions[i];
            const wrestlerList: Wrestler[] = await scrapeDivisionTable(await locator.nth(i), division);
            console.log(`Found ${wrestlerList.length} wrestlers in ${division} division!`);
            divisionsList.push(wrestlerList);
        }
        return divisionsList;
    } catch (error) {
        throw new Error(`Error scraping division tables! ${error}`);
    }
}

async function scrapeDivisionTable(locator: Locator, division: string) {
    console.log(`\n--------Scraping ${division} Table--------\n`);
    try {
        const wrestlersArray: Wrestler[] = [];
        const tableRows = await locator.locator("tbody > tr");
        if ((await tableRows.count()) <= 0) {
            throw new Error("Unable to locate 'tbody > tr'");
        }
        for (let i = 0; i < (await tableRows.count()); i++) {
            const currRow = await tableRows.nth(i);
            await currRow.highlight();
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
                    tdWrestler.wrestler_id = await parseInt(tdWrestlerId);
                    tdWrestler.name = (await tdShikona.textContent()) ?? "";
                    tdWrestler.current_basho_record = (await tdResult.textContent())?.split(" ")[0];
                    tdWrestler.current_rank = tdRank ?? "";
                    tdWrestler.current_division = division;

                    wrestlersArray.push(tdWrestler);
                    console.log(`${tdWrestler.wrestler_id}: ${tdWrestler.name} added! 🙆‍♂️`);
                    break;
                case 4:
                    console.log(`Found single wrestler in row ${i} 🐒`);
                    let singleShikona = await currRow.locator(".shikona");
                    if ((await singleShikona.count()) <= 0) {
                        singleShikona = await currRow.locator(".debut");
                    }
                    await singleShikona.highlight();
                    const singleRank = await currRow.locator(".short_rank");
                    await singleRank.highlight();
                    const singleResult = await currRow.locator("[style*='white-space:nowrap;']");
                    await singleResult.highlight();
                    const singleWrestlerUrl = await singleShikona.locator("a").getAttribute("href");
                    const singleWrestlerId = parseWrestlerIdFromUrl(singleWrestlerUrl ?? "");

                    const singleFoundWrestler = new Wrestler();
                    singleFoundWrestler.wrestler_id = await parseInt(singleWrestlerId);
                    singleFoundWrestler.name = (await singleShikona.textContent()) ?? "";
                    singleFoundWrestler.current_basho_record = (await singleResult.textContent())?.split(" ")[0];
                    singleFoundWrestler.current_rank = (await singleRank.textContent()) ?? "";
                    singleFoundWrestler.current_division = division;

                    wrestlersArray.push(singleFoundWrestler);
                    console.log(`${singleFoundWrestler.wrestler_id}: ${singleFoundWrestler.name} added! 🙆‍♂️`);

                    break;
                case 5:
                    console.log(`Found two wrestlers in row ${i} 🐒🐒`);
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
                    wrestler1.wrestler_id = await parseInt(wrestler1Id);
                    wrestler1.name = (await shikona1.textContent()) ?? "";
                    wrestler1.current_basho_record = (await result1.textContent())?.split(" ")[0];
                    wrestler1.current_rank = (await doubleRank.textContent()) ?? "";
                    wrestler1.current_division = division;
                    wrestlersArray.push(wrestler1);
                    console.log(`${wrestler1.wrestler_id}: ${wrestler1.name} added! 🙆‍♂️`);

                    const wrestler2 = new Wrestler();
                    wrestler2.wrestler_id = await parseInt(wrestler2Id);
                    wrestler2.name = (await shikona2.textContent()) ?? "";
                    wrestler2.current_basho_record = (await result2.textContent())?.split(" ")[0];
                    wrestler2.current_rank = (await doubleRank.textContent()) ?? "";
                    wrestler2.current_division = division;
                    wrestlersArray.push(wrestler2);
                    console.log(`${wrestler2.wrestler_id}: ${wrestler2.name} added! 🙆‍♂️`);
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

async function scrapeBashoDetails(page: Page) {
    try {
        let locator = await page.locator("h1");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate 'h1'");
        }
        await locator.nth(0).highlight();
        const bashoName = (await locator.nth(0).textContent()) ?? "";

        locator = await page.locator("h2");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate 'h2'");
        }
        await locator.nth(0).highlight();
        const titleData = await locator.nth(0).textContent();
        const cityVenue = titleData?.split(", ") || [];

        locator = await page.locator("h3");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate 'h3'");
        }

        await locator.nth(0).highlight();
        const stringDates = await locator.nth(0).textContent();
        const dates = stringDates?.split(" - ") ?? [];

        locator = await page.locator("td[style*='white-space:nowrap;'] > a").first();
        const bashoIdUrl = await locator.getAttribute("href");
        const bashoId = parseBashoIdFromUrl(bashoIdUrl ?? "");

        const basho: Basho = new Basho();
        basho.bashoId = parseInt(bashoId);
        basho.bashoName = bashoName;
        basho.venue = cityVenue[1];
        basho.city = cityVenue[0];
        basho.startDate = new Date(dates[0]);
        basho.endDate = new Date(dates[1]);
        return basho;
    } catch (error) {
        throw new Error(`Error scraping for Basho Details! ${error}`);
    }
}
//#endregion

export async function ScrapeBashoPage() {
    const browser = await chromium.launch({ headless: false });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        const url = "https://sumodb.sumogames.de/Banzuke.aspx";

        console.log("Scraping Banzuke Page...");

        await page.goto(url);

        console.log("Getting Basho Details... 👹");

        const basho = await scrapeBashoDetails(page);
        fs.writeFile(`./.temp/${basho.bashoName}.txt`, basho.toString(), (err) => {
            if (err) console.log(err);
        });

        console.log("Getting Banzuke Details for Makuuchi/Juryo...👺");
        const divisionsList = await scrapeBanzukeByDivision(page);

        for (let i = 0; i < DivisionCount; i++) {
            const division = Divisions[i];
            fs.writeFile(`./.temp/${basho.bashoName}-${division}.txt`, "", (err) => {
                if (err) console.log(err);
            });
            for (let wrestler of divisionsList[i]) {
                fs.appendFile(`./.temp/${basho.bashoName}-${division}.txt`, `${wrestler.toString()}\n`, (err) => {
                    if (err) console.log(err);
                });
            }
        }
    } catch (error) {
        console.log("⚠️ Uh Oh! There was an error! ⚠️");
        console.log(error);
    } finally {
        await browser.close();
        await cleanup("./.temp/");
    }
}
