import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import express from 'express';
import multer from 'multer';
import { IRecalledMemory, Mind } from '../index';
import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import CookieStrategy from 'passport-cookie';
import cookieParser from 'cookie-parser';
import { IMemory, IRememberable } from '../models'
import { AccessRule, Config } from '../configuration';

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
passport.use(new BearerStrategy(async (token, done) => {
    const authorization = await Config.getInstance().getAuthorizationByToken(token)
    if (!authorization)
        return done(null, null);
    else
        done(null, authorization, { scope: authorization.scope });
}));
passport.use(new CookieStrategy({ cookieName: 'Authorization' },
    async (token: string, done: any) => {
        const authorization = await Config.getInstance().getAuthorizationByToken(token)
        if (!authorization)
            return done(null, null);
        else
            done(null, authorization, { scope: authorization.scope });
    }
));

// Extract all urls that entirely occupy a line
function extractUrlsFromText(text: string): URL[] {
    return text
        .split('\n')
        .map((line: string) => {
            return new URL(line.trim());
        })
        .reduce((prev: URL[], curr: URL | null) =>
            curr ? prev.concat([curr]) : prev,
            []
        );
}

function parseRememberableFromText(text: string): IRememberable {

    // TODO what if there are > 1 urls. Possible data loss!

    const urlsFromText: URL[] = extractUrlsFromText(text);
    if (urlsFromText.length)
        return {
            encodingFormat: 'text/uri-list',
            blob: Buffer.from(urlsFromText[0].toString()),
            url: urlsFromText[0]
        }
    else
        // otherwise, mimeType = text/plain
        return {
            encodingFormat: 'text/plain',
            blob: Buffer.from(text)
        }
}

app.post('/remember/share',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        console.log('/remember/share', req);

        // Get org and mind via tokens structure
        // Casting to AccessRule because we should return Unauthorized if no access
        const authorization: AccessRule = <AccessRule>req.user;

        const config = await Config.getInstance();
        const mind: Mind = await config.newMind(authorization);
        await mind.load();

        // PWA as Web Share Target can receieve basically anything in text field
        const rememberable = parseRememberableFromText(req.body.text);

        console.log('parseRememberableFromText', rememberable);

        if (rememberable) {
            const thing: IMemory = await mind.remember(rememberable);

            // Save Mind state
            await mind.save();

            // Respond to requet with 303 See Other. Typical for PWAs
            return res.status(303)
                .setHeader('Location',
                    // @ts-ignore
                    `/recall?@id=${thing['@id']}`)
                .end();
        } else {
            return res.status(400)
                .end();
        }
    }
);


// Remember resource endpoint
app.post("/remember",
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        console.debug(`POST /remember : called`);

        // Get org and mind via tokens structure
        // Casting to AccessRule because we should return Unauthorized if no access
        const authorization: AccessRule = <AccessRule>req.user;

        // Load up Mind
        console.log(`POST /remember : Memory is ${authorization.name}`);
        const mind = await Config.getInstance().newMind(authorization);
        await mind.load();

        let remembered: IMemory[] = [];

        // Remember uri lists
        if (req.body['uri-list'])
            remembered.push(
                await mind.remember({
                    encodingFormat: 'text/uri-list',
                    blob: Buffer.from(req.body['uri-list'])
                })
            );

        // Remember user notes
        if (req.body.name && req.body.mimetype && req.body.text)
            remembered.push(
                await mind.remember({
                    name: req.body.name,
                    encodingFormat: req.body.mimetype,
                    blob: Buffer.from(req.body.text)
                })
            );

        // Remember each file we get
        console.debug(`POST /remember : Trying to remember ${req.files?.length} files`)
        const rememberedFiles: IMemory[] = await Promise.all(
            (<any[]>req.files)?.map(async (file: any): Promise<IMemory> => {

                console.debug(`POST /remember : Field name=${file.fieldname}, original name=${file.originalname}, mime type=${file.mimetype},encoding=${file.encoding}, size=${file.size}`);

                return mind.remember({
                    encodingFormat: file.mimetype,
                    blob: file.buffer,
                    // FIXME location will cause colliding @ids when > 1 file
                    url: req.body.url,
                    name: file.originalname,
                    encoding: file.encoding
                });
            })
        );
        remembered = remembered.concat(rememberedFiles);
        console.log(`POST /remember : Remembered ${remembered.length} Memories`);

        // Save Mind satate
        await mind.save();

        // Respond to request with 201 Created
        const r = res.status(201)
        remembered.forEach(memory => 
            r.setHeader('Location', `/recall?@id=${memory['@id']}`));
        return r.end();
    });

// Search and query endpoint
app.get('/recall',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        // Get org and mind via tokens structure
        // Casting to AccessRule because we should return Unauthorized if no access
        const authorization: AccessRule = <AccessRule>req.user;

        if (req.query['@id']) {
            console.debug(`GET /recall : Getting memory by id ${req.query['@id']}`);

            const memory = await Config.getInstance().newMind(authorization);
            await memory.load();

            const atId: URL = new URL(req.query['@id'].toString());
            const found: IRecalledMemory = await memory.recall(atId);

            console.debug(`GET /recall : Found memory ${memory}`);

            if (found)
                return res.status(200)
                    .json(found)
                    .end();
            else
                return res.status(404)
                    .end();

        } else if (req.query.q && req.query.q.toString() != '') {
            console.debug(`GET /recall : Searching for ${req.query.q}`);

            const memory = await Config.getInstance().newMind(authorization);
            await memory.load();

            // Free text search
            let found: IRecalledMemory[] = await memory.search(req.query.q.toString());

            // Sort by req.query.sort
            if (req.query.sort == 'created:desc') {
                console.debug(`Sorting by ${req.query.sort}`);
                found = found
                    // Sort by lexical order of m:created
                    .sort((a, b) => a.thing['m:created'] > b.thing['m:created'] ? -1 : 1);
            } else {
                console.warn(`Sort method not supported: ${req.query.sort}`);
            }

            // Respond to request
            if (found)
                return res.status(200)
                    .json(found)
                    .end();
            else
                return res.status(404)
                    .end();

        } else {
            console.debug(`GET /recall : Listing all memories`);

            const memory = await Config.getInstance().newMind(authorization);
            await memory.load();

            const found: IRecalledMemory[] = await memory.all();
            console.debug(`GET /recall : Found ${found.length} memories`);

            // Respond to request
            return res.status(200)
                .json(found)
                .end();
        }

    });

app.get('/recall/blob',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        const authorization: AccessRule = <AccessRule>req.user;

        const mind = await Config.getInstance().newMind(authorization);
        await mind.load();

        if (req.query['@id']) {

            // PouchDB url encodes all ids, so we need to do so too
            const atId: URL = new URL(req.query['@id'].toString());

            try {

                // PouchDB throws an error if document id is not found
                const found: IRecalledMemory = await mind.recall(atId, true);

                if (found) {

                    // Get our attachment
                    const attachment = found.thing._attachments?.[atId.toString()];

                    // If there is no attachment, then 404 Not Found
                    if (attachment == null)
                        return res.sendStatus(404);

                    return res.status(200)
                        .setHeader('Content-Type', attachment.content_type || 'application/octet-stream')
                        .setHeader('Content-Length', attachment.length || attachment.data?.length || 0)
                        .send(attachment.data)
                        .end();

                } else {
                    return res.sendStatus(400);
                }

            } catch (e) {
                return res.status(404)
                    .send(e)
                    .end();
            }

        }
    });

// Forget memories
app.delete('/recall',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        const authorization: AccessRule = <AccessRule>req.user;
        const mind = await Config.getInstance().newMind(authorization);
        await mind.load();

        if (req.query['@id']) {

            // PouchDB url encodes all ids, so we need to do so too
            const atId: URL = new URL(req.query['@id'].toString());

            mind.forget(atId);

            return res.status(200)
                .send('Deleted ' + atId)
                .end();
        } else {
            return res.sendStatus(400);
        }
    });

app.post("/mind", async (req, res) => {

    const storageRoot: string = 'store';
    const spaceName: string = uuid();
    const mindName: string | undefined = req.body.mindName?.toString();

    if (!mindName)
        return res.status(400)
            .send('No mind name provided')
            .end();

    const config: Config = Config.getInstance();
    const token: string = await config.allow(spaceName, mindName, 'all');
    await config.save();

    await Mind.create(await config.settings(), storageRoot, spaceName, mindName);

    // Log user in and redirect back to home page
    res.status(200)
        .setHeader('Set-Cookie', `Authorization=${token}; Max-Age>=0; path=/; HttpOnly; SameSite=Lax`)
        .json({ token: token })
        .end();

});

// https://owasp.org/www-community/HttpOnly
app.get('/login',
    async (req, res) => {
        const token = req.query.token;
        res.status(302)
            .setHeader('Set-Cookie', `Authorization=${token}; Max-Age>=0; path=/; HttpOnly; SameSite=Lax`)
            .setHeader('Location', '/')
            .end();
    }
);

app.get('/logout',
    async (req, res) => {
        res.status(302)
            .setHeader('Set-Cookie', 'Authorization=""; Max-Age>=0; path=/')
            .setHeader('Location', '/')
            .end();
    }
);

export default app;
