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

//#endregion
