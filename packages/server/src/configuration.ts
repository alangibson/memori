import path from 'path';
import fsSync from 'fs';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import nconf from 'nconf';
import defaults from './defaults';
import { Mind, mkdir } from './index';

type AuthorizationScopes = 'all';

export interface AccessRule {
    space: string;
    name: string;
    scope: AuthorizationScopes;
}

export interface ISecurity {
    tokens: {
        // key = token
        [key: string]: AccessRule;
    };
}

export interface ISettings {
    ocrLanguage: string;
    voskModel: string;
    defaultMindName: string;
    couchDbUrl: string;
    dataDir: string;
}

// https://stackoverflow.com/questions/19275776/node-js-how-to-get-the-os-platforms-user-data-folder
export function getDataDirectory() {
    const userDataDir =
        process.env.APPDATA ||
        (process.platform == 'darwin'
            ? process.env.HOME + '/Library/Preferences'
            : process.env.HOME + '/.local/share');
    return `${userDataDir}/memori`;
}

export class Config {
    private static instance: Config;
    private _settings: ISettings | undefined;
    private _security: ISecurity;
    private _dataDir: string;

    private constructor(settings?: ISettings, security?: ISecurity) {
        this._settings = settings;
        this._security = security || { tokens: {} };
        this._dataDir = settings?.dataDir || getDataDirectory();
    }

    static getInstance(): Config {
        if (this.instance) return this.instance;
        this.instance = new Config();
        return this.instance;
    }

    // TODO make async
    loadSettings(): ISettings {
        const conf = nconf
            .defaults(defaults)
            .file(`${this._dataDir}/settings.json`)
            .env()
            .argv();

        return {
            couchDbUrl: conf.get('couchDbUrl'),
            defaultMindName: conf.get('defaultMindName'),
            ocrLanguage: conf.get('ocrLanguage'),
            voskModel: conf.get('voskModel'),
            dataDir: conf.get('dataDir')
        };
    }

    async load(): Promise<Config> {
        console.debug('Configuration.load()');

        // Read in all settings
        this._settings = this.loadSettings();

        // TODO download vosk-model-* automatically
        const voskModelPath = `${this._dataDir}/${this._settings.voskModel}`;
        if (!fsSync.existsSync(voskModelPath)) {
            console.warn(`Vosk model not found at ${voskModelPath}`);
        }

        // Read in security.json, or init a new one if it doesnt exist
        try {
            this._security = JSON.parse(
                await fs.readFile(`${this._dataDir}/security.json`, {
                    encoding: 'utf8'
                })
            );
        } catch (e) {
            console.warn(
                `No security.json found. Creating default empty structure.`
            );
        }

        return this;
    }

    private async ensureLoaded() {
        if (!this._settings || !this._security) await this.load();
    }

    async settings(): Promise<ISettings> {
        await this.ensureLoaded();
        // Return a copy of settings so the original structure can't be modified
        // @ts-ignore because settings is definitely not undefined after load()
        return { ...this._settings };
    }

    async save() {
        // Save security.json since it may be modified by the user at runtime
        await mkdir(this._dataDir);
        await fs.writeFile(
            `${this._dataDir}/security.json`,
            JSON.stringify(this._security),
            { encoding: 'utf8' }
        );
    }

    // Usually called by server.ts since Express will provide auth
    async newMind(auth: AccessRule): Promise<Mind> {
        try {
            await this.ensureLoaded();
        } catch (e) {
            console.error('bloop', e);
        }
        // TODO get from config?
        const jailPath: string = `${this._dataDir}/store`;
        return Mind.create(
            await this.settings(),
            jailPath,
            auth.space,
            auth.name
        );
    }

    // Add security authorization
    async allow(space: string, name: string, scope: AuthorizationScopes) {
        await this.ensureLoaded();
        const token: string = crypto.randomBytes(64).toString('base64url');
        // Should be impossible, but if token exists, fatal error
        // @ts-ignore because settings is definitely not undefined after load()
        if (token in this._security.tokens)
            throw new Error(
                'Generated a token that already exists. This should be impossible.'
            );
        // @ts-ignore because settings is definitely not undefined after load()
        this._security.tokens[token] = {
            space: space,
            name: name,
            scope: scope
        };
        return token;
    }

    async getAuthorizationByToken(token: string): Promise<AccessRule | null> {
        console.debug(
            `Configuration.getAuthorizationByToken() : Token ${token}`
        );
        await this.ensureLoaded();
        // Read in security file
        // const security = JSON.parse(await fs.readFile(argv.security, { encoding: 'utf8' }));
        // Load up owner key, mind name and scope based on token
        // @ts-ignore because settings is definitely not undefined after load()
        const access = this._security.tokens[token];
        if (!access) {
            return null;
        } else {
            const authorization: AccessRule = {
                space: access.space,
                name: access.name,
                scope: access.scope
            };
            return authorization;
        }
    }
}
