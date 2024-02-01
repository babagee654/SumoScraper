import path from "path";
import fs from "fs";
//#region Helper Functions
export function cleanup(directoryPath: string) {
    fs.readdir(directoryPath, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directoryPath, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

export function parseWrestlerIdFromUrl(url: string) {
    const rQueryIndex = url.indexOf("r=");
    if (!rQueryIndex) {
        throw new Error(`Unable to parse for WrestlerId from URL, ${url}`);
    }
    const wrestlerId = url.slice(rQueryIndex + 2);
    return wrestlerId;
}

export function parseBashoIdFromUrl(url: string) {
    const bQueryIndex = url.indexOf("b=");
    if (!bQueryIndex) {
        throw new Error(`Unable to parse for BashoId from URL, ${url}`);
    }
    const bashoId = url.slice(bQueryIndex + 2);
    return bashoId;
}
//#endregion
