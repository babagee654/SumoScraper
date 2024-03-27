import { Page, chromium } from "playwright";
import fs from "fs";
import { Basho, SumoDBPages } from "@babagee654/sumo-data-models";
import { Logger } from "winston";
import { parseBashoIdFromUrl } from "../helpers/urlParserHelpers";

async function scrapeBashoDetails(page: Page) {
    try {
        let locator = await page.locator("h1");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate 'h1'");
        }
        const bashoName = (await locator.nth(0).textContent()) ?? "";

        locator = await page.locator("h2");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate 'h2'");
        }
        const titleData = await locator.nth(0).textContent();
        const cityVenue = titleData?.split(", ") || [];

        locator = await page.locator("h3");
        if ((await locator.count()) <= 0) {
            throw new Error("Unable to locate 'h3'");
        }

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

export async function ScrapeBashoPage(logger: Logger) {
    const browser = await chromium.launch();
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        const url = SumoDBPages.Basho || "https://sumodb.sumogames.de/Banzuke.aspx";

        logger.info(`Navigating to ${url}...`);
        await page.goto(url);

        logger.info("Getting Basho Details... 👹");

        const basho = await scrapeBashoDetails(page);
        fs.writeFile(`./.temp/${basho.bashoName}.txt`, basho.toString(), (err) => {
            if (err) logger.error(err);
        });
        logger.info(`${basho.bashoName} Saved! 🙆‍♂️`);

        return basho;
    } catch (error) {
        logger.warn("⚠️ Uh Oh! There was an error scraping Banzuke page! ⚠️");
        logger.error(error?.message || error);
    } finally {
        await browser.close();
        // await cleanup("./.temp/");
    }
}
