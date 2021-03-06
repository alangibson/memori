import { URL } from 'url';
import blessed from 'blessed';
import { Command } from 'commander';
import readline, { Interface } from 'readline';
import { IRecalledMemory, Mind } from './index.js';
import open from 'open';
import { ChildProcess } from 'child_process';
import { ICommand, ICommittable, IMemory } from './models.js';
import { Commands } from './commands.js';
import { FilesystemCrawler } from './crawler.js';
import { Config } from './configuration.js';

async function echoResults(recall: IRecalledMemory[]) {
    recall.forEach((rm: IRecalledMemory, i) => {
        console.log(
            '----\n\n' +
                // @ts-ignore
                rm.thing.name +
                '\n' +
                // @ts-ignore
                rm.thing.url +
                '\n' +
                // @ts-ignore
                rm.thing.abstract +
                '\n'
        );
    });
}

async function displayResults(recall: IRecalledMemory[]) {
    // Create a screen object.
    const screen = blessed.screen({
        smartCSR: true
    });
    // screen.title = 'my window title';
    // Quit on Escape, q, or Control-C.
    screen.key(['escape', 'q', 'C-c'], function (ch, key) {
        return process.exit(0);
    });

    const box = blessed.box({
        tags: true,
        // padding: 1,
        // keys: true,
        scrollable: true,
        // alwaysScroll:true,
        scrollbar: {
            style: {
                bg: 'blue'
            }
        },
        // style: {
        //     scrollbar:  {
        //         bg: 'blue'
        //     }
        // },
        border: {
            type: 'line'
        }
    });
    screen.append(box);

    const rows: blessed.Widgets.BoxElement[] = [];
    let currentRow = 0;

    box.key('o', () => {
        const recall: IRecalledMemory | null = rows[currentRow].get(
            'recall',
            null
        );
        if (recall == null) {
            console.error(
                `Couldn't find recalled memory at position ${currentRow}`
            );
            return;
        }
        // @ts-ignore
        const proc: Promise<ChildProcess> = open(recall.thing['url']);
        // Disown child process so we don't wait for it to exit
        proc.then((proc: ChildProcess) => proc.unref());
    });
    box.key('e', () => {
        const recall: IRecalledMemory | null = rows[currentRow].get(
            'recall',
            null
        );
        if (recall == null) {
            console.error(
                `Couldn't find recalled memory at position ${currentRow}`
            );
            return;
        }
        // @ts-ignore
        const proc: Promise<ChildProcess> = open(recall.thing['url'], {
            wait: true
        });
        // FIXME actually wait for process to exit
    });
    box.key('h', () => {
        const help = blessed.box({
            height: '50%',
            width: '50%',
            content: '<enter>: select item\nh: help\no: open item\nq: quit',
            border: 'line'
        });
        screen.append(help);
        screen.render();
    });
    box.key('up', () => {
        rows[currentRow].style = { bg: null, fg: null };
        currentRow = currentRow <= 0 ? 0 : currentRow - 1;
        rows[currentRow].style = { bg: 'white', fg: 'black' };
        box.scroll(-6);
        screen.render();
    });
    box.key('down', () => {
        rows[currentRow].style = { bg: null, fg: null };
        currentRow =
            currentRow >= rows.length - 1 ? rows.length - 1 : currentRow + 1;
        rows[currentRow].style = { bg: 'white', fg: 'black' };
        box.scroll(6);
        screen.render();
    });
    box.key('enter', function (ch, key) {
        screen.render();
    });
    box.on('scroll', () => {});

    // Create one list item for each recalled memory
    recall.forEach((rm: IRecalledMemory, i) => {
        let excerpt = '';
        // HACK it's possible for recall to empty if we got the memory by @id or something
        if (rm.recall) {
            // Extract search terms to bold
            const rex = new RegExp(
                '(((\\S+\\s+){0,4})(' +
                    // Words to bold
                    Object.keys(rm.recall.match).join('|') +
                    ')((\\s+\\S+){0,4}))',
                'ig'
            );

            // Build up an excerpt with bolded search terms
            // @ts-ignore
            for (let matches of <RegExpMatchArray>(
                rm.thing['text']
                    .replace(new RegExp('\\s+', 'g'), ' ')
                    .matchAll(rex)
            ))
                excerpt +=
                    '... ' +
                    matches[2] +
                    ' {bold}' +
                    matches[4] +
                    '{/bold} ' +
                    matches[5];
            excerpt += ' ...';
        }

        // Build list item box
        const b = blessed.box({
            height: 8,
            top: i * 8,
            // valign: 'middle',
            // shrink: true,
            padding: 1,
            tags: true,
            // border: {
            //     type: 'bg'
            // },
            // @ts-ignore
            content:
                rm.thing['name'] +
                '\n' +
                // @ts-ignore
                rm.thing['url'] +
                '\n' +
                excerpt
        });
        // Save referece to our recalled data
        b.set('recall', rm);
        // Preselect first row
        if (i == 0) b.style = { bg: 'white', fg: 'black' };
        // Add row to enclosing box
        rows.push(b);
        box.append(b);
    });

    box.focus();
    screen.render();
}

async function interactiveInput(memory: Mind) {
    // User input accumulator
    const input: string[] = [];

    // Go into interactive mode
    const readin: Interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    readin.on('line', (line: string) => {
        input.push(line);
        // HACK Every line should begin with a right angle bracket
        process.stdout.write('> ');
    });
    // aka Ctrl+C
    readin.on('SIGINT', () => {
        console.log('\nClosing without remembering anything');
        process.exit(0);
    });
    // aka Ctrl+D
    readin.on('close', async () => {
        // Apply "magic numbers"
        // If first full line is a valid URL, assume all lines are
        try {
            await Promise.all(
                input.map(
                    async (line) =>
                        await memory.remember({
                            encodingFormat: 'text/uri-list',
                            blob: Buffer.from(line, 'utf8')
                        })
                )
            );
        } catch (error) {
            input.length = 0; // clear array
        }
        // TODO assume input is YAML if first line is '---'

        // HACK make sure shell prompt starts on new line
        process.stdout.write('\n');
    });
    readin.prompt();
}

async function constructMindFromToken(token: string): Promise<Mind> {
    const auth = await Config.getInstance().getAuthorizationByToken(token);

    if (!auth) throw new Error('Could not find mind with given token');

    const mind = await Config.getInstance().newMind({
        name: auth.name,
        scope: auth.scope,
        space: auth.space
    });

    await mind.load();

    return mind;
}

/**
 *  memori remember http://example.com/one.html

    memori remember
    > just a 
    > note
    Ctrl^D

    memori find "ne555"

    // TODO
    memori crawl /home/me/docs
    memori crawl add /home/me/docs
    memori crawl add http://example.com/
    memori crawl run http://example.com/
    memori crawl run 
 */
async function main() {
    // Build command parser
    const program = new Command().option(
        '-t, --token <token>',
        'Authorization token'
    );

    program
        .command('peek')
        .argument('url', 'URL to examine')
        .action(async (url: string) => {
            const mind = await constructMindFromToken(program.opts().token);
            const things: IMemory[] = await mind.parse(
                await mind.fetch(new URL(url))
            );
            console.info(JSON.stringify(things, null, 2));
        });
    program
        .command('remember')
        .argument('[thought]', 'URL. If omitted, enter interactive mode.')
        .action(async (thought: string | null) => {
            const mind = await constructMindFromToken(program.opts().token);
            if (thought == null) {
                await interactiveInput(mind);
            } else {
                // TODO try to parse input to see if if they are really urls
                await mind.remember({
                    encodingFormat: 'text/uri-list',
                    blob: Buffer.from(thought, 'utf8')
                });
            }
            // Clean shutdown
            console.debug('Saving Memory to disk');
            await mind.save();
        });
    program
        .command('forget')
        .argument('id', 'URL to forget.')
        .action(async (id: string) => {
            const mind = await constructMindFromToken(program.opts().token);
            // First remove from command log
            const log = new Commands(`./${mind.name}/commands`);
            await log.replay(async (command: ICommand) => {
                if (command.url != undefined && command.url == new URL(id))
                    await log.remove(command);
            });

            // then remove from Index
            try {
                await mind.forget(new URL(id));
            } catch (e) {
                console.info(`Couldn't remove ${id} because ${e}`);
            }
        });
    program
        .command('search')
        .argument('q', 'Text to search for')
        .argument('[i]', 'Enter interactive mode')
        .action(async (q: string, i: boolean) => {
            const mind = await constructMindFromToken(program.opts().token);
            const found: IRecalledMemory[] = await mind.search(q);
            if (i) await displayResults(found);
            else await echoResults(found);
        });
    program.command('rebuild').action(async () => {
        const mind = await constructMindFromToken(program.opts().token);
        // Clear memory
        await mind.clear();
        // read in command.log line by line
        await mind.commands.replay(async (command: ICommand) => {
            if (command.action) {
                try {
                    // Upgrade type because we definitely have a location
                    // since this has all be written once before
                    await mind.commit(<ICommittable>command);
                } catch (e) {
                    // URL can be invalid or fetch can fail
                    console.error(
                        'Failed to reload Command',
                        command,
                        'Moving on to next item',
                        e
                    );
                }
            }
            // else do nothing
        });
        // then save
        await mind.save();
    });
    program
        .command('reindex')
        .argument('id', '@id to reindex')
        .action(async (id: string) => {
            const mind = await constructMindFromToken(program.opts().token);

            const atId = new URL(id);

            // Get Memory with _attachments
            const memory: IMemory = await mind.get(atId, true, false);

            console.log(memory._attachments);

            if (memory._attachments?.[id])
                // Commit attachment blob to memory
                await mind.commit({
                    url: memory.url,
                    name: memory.name,
                    blob: memory._attachments[id].data,
                    encodingFormat: memory._attachments[id].content_type
                });
            else console.info(`Couldn't find Memory with @id: ${id}`);
        });
    program
        .command('crawl')
        .argument('root', 'Root path to start from')
        .action(async (root: string) => {
            const mind = await constructMindFromToken(program.opts().token);
            await new FilesystemCrawler().crawl(
                new URL(root),
                async (path: string) => {
                    console.log(path);
                    try {
                        await mind.remember({
                            encodingFormat: 'text/uri-list',
                            blob: Buffer.from(path, 'utf8')
                        });
                    } catch (e) {
                        console.warn(`Skipping ${path}: ${e}`);
                    }
                }
            );
            await mind.save();
        });

    program.parse(process.argv);
}

// Run main program
main();
