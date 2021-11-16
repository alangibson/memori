import fs from 'fs';
import { URL } from 'url';
import express from 'express';
import multer, { Multer } from 'multer';
import { IRecalledMemory, Mind } from './index.js';
import passport from 'passport';
import { Strategy as BearerStrategy, VerifyFunction } from 'passport-http-bearer';
import CookieStrategy from 'passport-cookie';
import { Command, Option } from 'commander';
import cookieParser from 'cookie-parser';
import https from 'https';
import { IMemory, IRememberable } from './models.js'

type AuthorizationScopes = 'all';

interface IAuthorization extends Express.User {
    orgName: string;
    mindName: string;
    scope: AuthorizationScopes;
}


function getAuthorizationByToken(token: string) {
    // Read in security file
    const security = JSON.parse(fs.readFileSync(argv.security, { encoding: 'utf8' }));
    // Load up owner key, mind name and scope based on token
    const access = security.tokens[token];
    if (!access) {
        return null;
    } else {
        const authorization: IAuthorization = {
            orgName: access[0],
            mindName: access[1],
            scope: access[2]
        };
        return authorization;
    }

}


// Parse command line args
const program = new Command()
    .addOption(new Option('-p, --port <port>', 'TCP port to listen on').default(4321))
    .option('-b, --bind <ip4>', 'IP address to bind to', '0.0.0.0')
    .option('-d, --data <dir>', 'Directory to store data in', process.cwd())
    .option('-s, --security <file>', 'Security config file', `${process.cwd()}/security.json`)
    .parse(process.argv);
const argv = program.opts();


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
passport.use(new BearerStrategy((token, done) => {
    const authorization = getAuthorizationByToken(token);
    if (!authorization)
        return done(null, null);
    else
        done(null, authorization, { scope: authorization.scope });
}));
passport.use(new CookieStrategy({ cookieName: 'Authorization' },
    (token: string, done: any) => {
        const authorization = getAuthorizationByToken(token);
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
        // Casting to IAuthorization because we should return Unauthorized if no access
        const authorization: IAuthorization = <IAuthorization>req.user;

        console.log('authorization', authorization);

        const mind = new Mind(authorization.mindName);
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
                    `https://ef77-91-113-85-122.ngrok.io/recall?@id=${thing['@id']}`)
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
        // Casting to IAuthorization because we should return Unauthorized if no access
        const authorization: IAuthorization = <IAuthorization>req.user;

        // Load up Mind
        console.log(`POST /remember : Memory is ${authorization.mindName}`);
        const mind = new Mind(authorization.mindName);
        await mind.load();

        // Remember uri lists
        if (req.body['uri-list'])
            await mind.remember({
                encodingFormat: 'text/uri-list',
                blob: Buffer.from(req.body['uri-list'])
            });
        
        // Remember user notes
        if (req.body.name && req.body.mimetype && req.body.text)
            await mind.remember({
                name: req.body.name,
                encodingFormat: req.body.mimetype,
                blob: Buffer.from(req.body.text)
            });

        // Handle each file we need to remember
        console.debug(`POST /remember : Trying to remember ${req.files?.length} files`)
        const remembered: IMemory[] = await Promise.all(
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
        console.log(`POST /remember : Remembered ${remembered.length} Memories`);

        // Save Mind satate
        await mind.save();

        // Respond to requet
        return res.status(201)
            // TODO Return a Location header for each memory in remembered
            .setHeader('Location', req.body.url || '/TODO')
            .end();
    });

// Search and query endpoint
app.get('/recall',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        function stripAttachments(recalled: IRecalledMemory) {
            delete recalled.thing._attachments;
            delete recalled.thing.video?._attachments;
            return recalled;
        }

        // Get org and mind via tokens structure
        // Casting to IAuthorization because we should return Unauthorized if no access
        const authorization: IAuthorization = <IAuthorization>req.user;

        if (req.query['@id']) {

            const memory = new Mind(authorization.mindName);
            await memory.load();

            const atId: URL = new URL(req.query['@id'].toString());
            const found: IRecalledMemory = await memory.recall(atId);

            if (found)
                return res.status(200)
                    .json(stripAttachments(found))
                    .end();
            else
                return res.status(404)
                    .end();

        } else if (req.query.q) {

            const memory = new Mind(authorization.mindName);
            await memory.load();

            // Free text search
            const found: IRecalledMemory[] = await memory.search(req.query.q.toString());

            // Strip _attachments
            // TODO do this in indexer
            let cleaned = found
                .map((recalled: IRecalledMemory) => stripAttachments(recalled))

            // Sort by req.query.sort
            if (req.query.sort == 'created:desc') {
                console.debug(`Sorting by ${req.query.sort}`);
                cleaned = cleaned
                    // Sort by lexical order of m:created
                    .sort((a, b) => a.thing['m:created'] > b.thing['m:created'] ? -1 : 1);
            } else {
                console.warn(`Sort method not supported: ${req.query.sort}`);
            }

            // Respond to request
            if (cleaned)
                return res.status(200)
                    .json(cleaned)
                    .end();
            else
                return res.status(404)
                    .end();

        } else {
            
            const memory = new Mind(authorization.mindName);
            await memory.load();

            const found: IRecalledMemory[] = await memory.all();

            // Respond to request
            return res.status(200)
                .json(found)
                .end();
        }

    });

app.get('/recall/blob',
    passport.authenticate(['bearer', 'cookie'], { session: false }),
    async (req, res) => {

        const authorization: IAuthorization = <IAuthorization>req.user;
        const mind = new Mind(authorization.mindName);
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

        const authorization: IAuthorization = <IAuthorization>req.user;
        const mind = new Mind(authorization.mindName);
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

if (process.env.NODE_ENV == 'development')
    https.createServer({
        key: fs.readFileSync(`${process.cwd()}/dev.key`),
        cert: fs.readFileSync(`${process.cwd()}/dev.cert`)
    }, app)
        .listen(argv.port, argv.bind, () => {
            console.info(`Server started with TLS at https://${argv.bind}:${argv.port}`);
        });
else
    // Start the express server
    app.listen(argv.port, argv.bind, () => {
        console.info(`Server started at http://${argv.bind}:${argv.port}`);
    });

