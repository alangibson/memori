import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { IRecalledMemory, Mind } from '../index';
import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import CookieStrategy from 'passport-cookie';
import cookieParser from 'cookie-parser';
import { IMemory, IRememberable } from '../models';
import { AccessRule, Config } from '../configuration';
import { request } from 'http';

// Build Express server and middleware
const app = express();

app.use(cookieParser());

// Make multipart/form-request available in request.body
// Accepts all files that comes over the wire.
// An array of files will be stored in req.files.
// https://github.com/expressjs/multer#any
// TODO: WARNING Never add multer as a global middleware since a malicious user could upload files to a route that you didn't anticipate
app.use(multer().any());

// Serve static files from dir ./static on / (not /static !)
app.use(express.static('static'));

// Support Authorization header
app.use(passport.initialize());

// http://www.passportjs.org/packages/passport-http-bearer/
passport.use(
    new BearerStrategy(async (token, done) => {
        try {
            const authorization =
                await Config.getInstance().getAuthorizationByToken(token);
            if (!authorization) return done(null, null);
            else done(null, authorization, { scope: authorization.scope });
        } catch (e) {
            console.error(`BearerStrategy : Unexpected error`, e);
        }
    })
);
passport.use(
    new CookieStrategy(
        { cookieName: 'Authorization' },
        async (token: string, done: any) => {
            try {
                const authorization =
                    await Config.getInstance().getAuthorizationByToken(token);
                if (!authorization) return done(null, null);
                else done(null, authorization, { scope: authorization.scope });
            } catch (e) {
                console.error(`CookieStrategy : Unexpected error`, e);
            }
        }
    )
);

// Extract all urls that entirely occupy a line
function extractUrlsFromText(text: string): URL[] {
    return text
        .split('\n')
        .map((line: string) => {
            return new URL(line.trim());
        })
        .reduce(
            (prev: URL[], curr: URL | null) =>
                curr ? prev.concat([curr]) : prev,
            []
        );
}

function parseRememberableFromText(text: string): IRememberable[] {
    if (!text) return [];

    const urlsFromText: URL[] = extractUrlsFromText(text);

    if (urlsFromText.length)
        return [
            {
                encodingFormat: 'text/uri-list',
                blob: Buffer.from(text)
            }
        ];
    // otherwise, mimeType = text/plain
    else
        return [
            {
                encodingFormat: 'text/plain',
                blob: Buffer.from(text)
            }
        ];
}

async function parseFiles(req: Request): Promise<IRememberable[]> {
    return await Promise.all(
        (<any[]>req.files)?.map(async (file: any): Promise<IRememberable> => {
            return {
                encodingFormat: file.mimetype,
                blob: file.buffer,
                // FIXME location will cause colliding @ids when > 1 file
                url: req.body.url,
                name: file.originalname,
                encoding: file.encoding
            };
        })
    );
}

async function rememberAll(
    mind: Mind,
    rememberables: IRememberable[]
): Promise<IMemory[]> {
    console.log(
        `rememberAll() : Remembering ${rememberables.length} IRememberables`
    );
    return await Promise.all(
        rememberables.map(
            async (rememberable) => await mind.remember(rememberable)
        )
    );
}

// Target for WebShare API call
app.post(
    '/memory/webshare',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {
        console.log('POST /memory/webshare');

        // Get org and mind via tokens structure
        // Casting to AccessRule because we should return Unauthorized if no access
        const authorization: AccessRule = <AccessRule>req.user;

        const config = await Config.getInstance();
        const mind: Mind = await config.newMind(authorization);
        await mind.load();

        // Accumulated new memories
        let memories: IMemory[] = [];

        // Parse files (images, etc)
        memories = memories.concat(
            await rememberAll(mind, await parseFiles(req))
        );

        // Parse IRememberables from text
        memories = memories.concat(
            await rememberAll(mind, parseRememberableFromText(req.body.text))
        );

        // Save Mind state
        await mind.save();

        if (memories.length) {
            // Respond to requet with 303 See Other. Typical for PWAs
            return res.status(303).setHeader('Location', `/memory`).end();
        } else {
            return res.status(400).end();
        }
    }
);

// Remember resource endpoint
app.post(
    '/memory',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {
        console.debug(`POST /memory : called`);

        // Get org and mind via tokens structure
        // Casting to AccessRule because we should return Unauthorized if no access
        const authorization: AccessRule = <AccessRule>req.user;

        // Load up Mind
        console.log(`POST /memory : Memory is ${authorization.name}`);
        const mind = await Config.getInstance().newMind(authorization);
        await mind.load();

        let remembered: IMemory[] = [];

        // Remember uri lists
        // Any post with a 'uri-list' field is
        if (req.body['uri-list']) {
            console.debug('POST /memory : Remembering a text/uri-list');
            remembered.push(
                await mind.remember({
                    encodingFormat: 'text/uri-list',
                    blob: Buffer.from(req.body['uri-list'])
                })
            );
        }

        // Remember user notes
        // Any post with a 'note' field is treated as a note
        if (req.body.note) {
            console.debug('POST /memory : Remembering a text note');
            remembered.push(
                await mind.remember({
                    name: req.body.name, // possibly undefined
                    url: req.body.url, // possibly undefined
                    encodingFormat: req.body.mimetype || 'text/plain',
                    blob: Buffer.from(req.body.note, 'utf8'),
                    encoding: 'utf8'
                })
            );
        }

        // Remember each file we get
        console.debug(
            `POST /memory : Trying to remember ${req.files?.length} files`
        );

        const rememberableFiles: IRememberable[] = await parseFiles(req);
        const rememberedFiles: IMemory[] = await rememberAll(
            mind,
            rememberableFiles
        );

        // const rememberedFiles: IMemory[] = await Promise.all(
        //     (<any[]>req.files)?.map(async (file: any): Promise<IMemory> => {

        //         console.debug(`POST /memory : Field name=${file.fieldname}, original name=${file.originalname}, mime type=${file.mimetype},encoding=${file.encoding}, size=${file.size}`);

        //         return mind.remember({
        //             encodingFormat: file.mimetype,
        //             blob: file.buffer,
        //             // FIXME location will cause colliding @ids when > 1 file
        //             url: req.body.url,
        //             name: file.originalname,
        //             encoding: file.encoding
        //         });
        //     })
        // );

        remembered = remembered.concat(rememberedFiles);
        console.log(`POST /memory : Remembered ${remembered.length} Memories`);

        // Save Mind satate
        await mind.save();

        // Respond to request with 201 Created
        const r = res.status(201);
        remembered.forEach((memory) =>
            r.setHeader('Location', `/memory?@id=${memory['@id']}`)
        );
        return r.end();
    }
);

// Search and query endpoint
app.get(
    '/memory',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {
        // Get org and mind via tokens structure
        // Casting to AccessRule because we should return Unauthorized if no access
        const authorization: AccessRule = <AccessRule>req.user;

        if (req.query['@id']) {
            console.debug(
                `GET /memory : Getting memory by id ${req.query['@id']}`
            );

            const memory = await Config.getInstance().newMind(authorization);
            await memory.load();

            const atId: URL = new URL(req.query['@id'].toString());
            const found: IRecalledMemory = await memory.recall(atId);

            console.debug(`GET /memory : Found memory ${memory}`);

            if (found) return res.status(200).json(found).end();
            else return res.status(404).end();
        } else if (req.query.q && req.query.q.toString() != '') {
            console.debug(`GET /memory : Searching for ${req.query.q}`);

            const memory = await Config.getInstance().newMind(authorization);
            await memory.load();

            // Free text search
            let found: IRecalledMemory[] = await memory.search(
                req.query.q.toString()
            );

            // Sort by req.query.sort
            if (req.query.sort == 'created:desc') {
                console.debug(`Sorting by ${req.query.sort}`);
                found = found
                    // Sort by lexical order of m:created
                    .sort((a, b) =>
                        a.thing['m:created'] > b.thing['m:created'] ? -1 : 1
                    );
            } else {
                console.warn(`Sort method not supported: ${req.query.sort}`);
            }

            // Respond to request
            if (found) return res.status(200).json(found).end();
            else return res.status(404).end();
        } else {
            console.debug(`GET /memory : Listing all memories`);

            const memory = await Config.getInstance().newMind(authorization);
            await memory.load();

            const found: IRecalledMemory[] = await memory.all();
            console.debug(`GET /memory : Found ${found.length} memories`);

            // Respond to request
            return res.status(200).json(found).end();
        }
    }
);

app.get(
    '/memory/attachment',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {
        const authorization: AccessRule = <AccessRule>req.user;

        const mind = await Config.getInstance().newMind(authorization);
        await mind.load();

        if (req.query['@id']) {
            // PouchDB url encodes all ids, so we need to do so too
            const atId: URL = new URL(req.query['@id'].toString());
            const attachmentId: string =
                req.query['attachment']?.toString() || atId.toString();

            console.debug(
                `GET /memory/attachment : Getting attachment ${attachmentId} for memory ${atId}`
            );

            try {
                // PouchDB throws an error if document id is not found
                const found: IRecalledMemory = await mind.recall(atId, true);

                if (found) {
                    // Get our attachment
                    const attachment = found.thing._attachments?.[attachmentId];

                    // If there is no attachment, then 404 Not Found
                    if (attachment == null) return res.sendStatus(404);

                    return res
                        .status(200)
                        .setHeader(
                            'Content-Type',
                            attachment.content_type ||
                                'application/octet-stream'
                        )
                        .setHeader(
                            'Content-Length',
                            attachment.length || attachment.data?.length || 0
                        )
                        .send(attachment.data)
                        .end();
                } else {
                    return res.sendStatus(400);
                }
            } catch (e) {
                return res.status(404).send(e).end();
            }
        }
    }
);

// Forget memories
app.delete(
    '/memory',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {
        const authorization: AccessRule = <AccessRule>req.user;
        const mind = await Config.getInstance().newMind(authorization);
        await mind.load();

        if (req.query['@id']) {
            // PouchDB url encodes all ids, so we need to do so too
            const atId: URL = new URL(req.query['@id'].toString());

            mind.forget(atId);

            return res
                .status(200)
                .send('Deleted ' + atId)
                .end();
        } else {
            return res.sendStatus(400);
        }
    }
);

app.post('/mind', async (req, res) => {
    console.debug(`POST /mind`);

    const config: Config = Config.getInstance();

    const storageRoot: string = 'store';
    const spaceName: string = uuid();

    console.debug(`POST /mind : Fetching default mind name`);
    const mindName = (await config.settings()).defaultMindName;
    console.debug(`POST /mind : Default mind name is: ${mindName}`);
    // const mindName: string = req.body.mindName?.toString() || defaultMindName;

    console.debug(`POST /mind : Creating name: ${mindName}`);

    const token: string = await config.allow(spaceName, mindName, 'all');
    await config.save();

    await Mind.create(
        await config.settings(),
        storageRoot,
        spaceName,
        mindName
    );

    // Log user in and redirect back to home page
    res.status(200)
        .setHeader(
            'Set-Cookie',
            `Authorization=${token}; Max-Age>=0; path=/; HttpOnly; SameSite=Lax`
        )
        .json({ token: token })
        .end();
});

// https://owasp.org/www-community/HttpOnly
app.get('/authorization', async (req, res) => {
    console.debug('GET /authorization');

    // See if token is good
    const token: string | undefined = req.query.token?.toString();

    if (!token) return res.sendStatus(400);

    var config: Config = Config.getInstance();

    try {
        const access = await config.getAuthorizationByToken(token);
        if (!access) return res.sendStatus(401);
    } catch (e) {
        console.error(
            'GET /authorization : Failed to getAuthorizationByToken()',
            e
        );
        return res.sendStatus(500);
    }

    res.status(204)
        .setHeader(
            'Set-Cookie',
            `Authorization=${token}; Max-Age>=0; path=/; HttpOnly; SameSite=Lax`
        )
        .end();
});

app.delete('/authorization', async (req, res) => {
    res.status(204)
        .setHeader('Set-Cookie', 'Authorization=""; Max-Age>=0; path=/')
        .end();
});

app.get(
    '/ping',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {
        const authorization: AccessRule = <AccessRule>req.user;
        if (!authorization) return res.sendStatus(401);
        else return res.sendStatus(204);
    }
);

export default app;
