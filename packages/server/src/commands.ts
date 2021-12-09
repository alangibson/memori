import { URL } from 'url';
import { promises as fs } from 'fs';
import JSON from 'buffer-json';
import { ICommand } from './models';

export class Commands {
    private path: string;

    constructor(path: string) {
        this.path = path;
    }

    async log(command: ICommand) {
        console.debug(
            `Commands.log() : Logging command action ${command.action} for ${command.encodingFormat} ${command.url}`
        );

        // Make sure directory exists
        await fs.mkdir(this.path, { recursive: true });

        // Write to dated file
        const filename: string = `${this.path}/${new Date().getTime()}-${(
            Math.random() + 1
        )
            .toString(36)
            .substring(2)}.json`;
        await fs.appendFile(filename, JSON.stringify(command));
    }

    async replay(callback: (command: ICommand) => Promise<void>) {
        for await (const filename of await fs.readdir(this.path)) {
            console.log(`Replaying command ${filename}`);
            await callback({
                ...JSON.parse(
                    await fs.readFile(`${this.path}/${filename}`, {
                        encoding: 'utf8'
                    })
                ),
                commandId: filename
            });
        }
    }

    async remove(toRemove: ICommand | URL) {
        console.debug(`Removing command: ${toRemove}`);
        if (toRemove instanceof URL)
            // Remove commands where location == command
            await this.replay(async (command: ICommand) => {
                if (command.url == toRemove) this.remove(command);
            });
        else if (toRemove.commandId) {
            console.debug(
                `Commands.remove() : Removing command log item ${this.path}/${toRemove.commandId}`
            );
            await fs.rm(`${this.path}/${toRemove.commandId}`);
        } else {
            throw new Error(
                `Can't remove logged command with undefined commandId`
            );
        }
    }
}
