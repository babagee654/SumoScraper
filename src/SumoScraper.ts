import { Locator, Page, chromium } from "playwright";
import * as fs from "fs";

/*
    Goes to latest banzuke, data and save into file, collect list of wrestler urls
*/
const divisions: string[] = ["Makuuchi", "Juryo"];

enum Ranks {
    Y = "Yokozuna",
    O = "Ozeki",
    S = "Sekiwake",
    K = "Komusubi",
    M = "Makuuchi",
    J = "Juryo",
}

class Wrestler {
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

class Basho {
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

function parseWrestlerIdFromUrl(url: string) {
    const rQueryIndex = url.indexOf("r=");
    if (!rQueryIndex) {
        throw new Error(`Unable to parse for WrestlerId from URL, ${url}`);
    }
    let wrestlerId = url.slice(rQueryIndex + 2);
    return wrestlerId;
}
function parseBashoIdFromUrl(url: string) {
    const bQueryIndex = url.indexOf("b=");
    if (!bQueryIndex) {
        throw new Error(`Unable to parse for BashoId from URL, ${url}`);
    }
    let bashoId = url.slice(bQueryIndex + 2);
    return bashoId;
}

async function scrapeBanzukeByDivision(page: Page, basho: Basho) {
    let locator = await page.locator(".banzuke");
    if ((await locator.count()) <= 0) {
        throw new Error("Unable to locate '.banzuke'");
    }
    for (let i = 0; i < 2; i++) {
        let wrestlerList: Wrestler[] = [];
        let division = divisions[i];
        await scrapeDivisionTable(await locator.nth(i), division, wrestlerList);
        console.log(`Found ${wrestlerList.length} Wrestlers! Saving to file...`);
        fs.writeFile(`./temp/${basho.bashoName}-${division}.txt`, "", (err) => {
            if (err) console.log(err);
        });
        for (let wrestler of wrestlerList) {
            fs.appendFile(`./temp/${basho.bashoName}-${division}.txt`, `${wrestler.toString()}\n`, (err) => {
                if (err) console.log(err);
            });
        }
    }
}

async function scrapeDivisionTable(locator: Locator, division: string, wrestlersArray: Wrestler[]) {
    console.log(`\n--------Scraping ${division} Table--------\n`);
    try {
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

                    const rank = await rowTds.nth(2);

                    const result2 = await rowTds.nth(4);
                    const shikona2 = await rowTds.nth(3);
                    const wrestler2Url = await shikona2.locator("a").getAttribute("href");
                    const wrestler2Id = parseWrestlerIdFromUrl(wrestler2Url ?? "");

                    const wrestler1 = new Wrestler();
                    wrestler1.wrestler_id = await parseInt(wrestler1Id);
                    wrestler1.name = (await shikona1.textContent()) ?? "";
                    wrestler1.current_basho_record = (await result1.textContent())?.split(" ")[0];
                    wrestler1.current_rank = (await rank.textContent()) ?? "";
                    wrestler1.current_division = division;
                    wrestlersArray.push(wrestler1);
                    console.log(`${wrestler1.wrestler_id}: ${wrestler1.name} added! 🙆‍♂️`);

                    const wrestler2 = new Wrestler();
                    wrestler2.wrestler_id = await parseInt(wrestler2Id);
                    wrestler2.name = (await shikona2.textContent()) ?? "";
                    wrestler2.current_basho_record = (await result2.textContent())?.split(" ")[0];
                    wrestler2.current_rank = (await rank.textContent()) ?? "";
                    wrestler2.current_division = division;
                    wrestlersArray.push(wrestler2);
                    console.log(`${wrestler2.wrestler_id}: ${wrestler2.name} added! 🙆‍♂️`);
                    break;
                default:
                    throw new Error(`Invalid tdCount ${tdCount}. Check to ensure code is correct!`);
            }
        }
    } catch (error) {
        throw new Error(`Error scraping ${division} division table!`);
    }
}

async function scrapeBashoDetails(page: Page, basho: Basho) {
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
    let titleData = await locator.nth(0).textContent();
    let cityVenue = titleData?.split(", ") || [];

    locator = await page.locator("h3");
    if ((await locator.count()) <= 0) {
        throw new Error("Unable to locate 'h3'");
    }

    await locator.nth(0).highlight();
    let stringDates = await locator.nth(0).textContent();
    let dates = stringDates?.split(" - ") ?? [];

    locator = await page.locator("td[style*='white-space:nowrap;'] > a").first();
    const bashoIdUrl = await locator.getAttribute("href");
    const bashoId = parseBashoIdFromUrl(bashoIdUrl ?? "");

    basho.bashoId = parseInt(bashoId);
    basho.bashoName = bashoName;
    basho.venue = cityVenue[1];
    basho.city = cityVenue[0];
    basho.startDate = new Date(dates[0]);
    basho.endDate = new Date(dates[1]);
}

(async function scrapeBanzuke() {
    const browser = await chromium.launch({ headless: false });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        const url = "https://sumodb.sumogames.de/Banzuke.aspx";

        console.log("Scraping Banzuke Page...");

        await page.goto(url);

        console.log("Getting Basho Details... 👹");
        let basho: Basho = new Basho();
        await scrapeBashoDetails(page, basho);
        fs.writeFile(`./temp/${basho.bashoName}.txt`, basho.toString(), (err) => {
            if (err) console.log(err);
        });

        console.log("Getting Banzuke Details for Makuuchi/Juryo...👺");
        await scrapeBanzukeByDivision(page, basho);
    } catch (error) {
        console.log("⚠️ Uh Oh! There was an error! ⚠️");
        console.log(error);
    } finally {
        await browser.close();
    }
})();
