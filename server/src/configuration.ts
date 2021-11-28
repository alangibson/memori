import { promises as fs } from "fs";
import crypto from 'crypto';
import { Mind } from "./index";

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
    }

}

export interface ISettings {

    ocrLanguage: string;
    voskModel: string;
    defaultMindName: string;
    couchDbUrl: string;

}

export class Config {

    private static instance: Config;
    private _settings: ISettings | undefined;
    private _security: ISecurity;

    private constructor(settings?: ISettings, security?: ISecurity) {
        this._settings = settings;
        this._security = security || { tokens: {} };
    }

    static getInstance(): Config {
        if (this.instance)
            return this.instance;
        this.instance = new Config();
        return this.instance;
    }

    async load(): Promise<Config> {

        // TODO create default settings.json if not exists

        // Read in settings.json
        this._settings = JSON.parse(
            await fs.readFile(`${process.cwd()}/etc/settings.json`,
                { encoding: 'utf8' }));

        try {
            this._security = JSON.parse(
                await fs.readFile(`${process.cwd()}/etc/security.json`,
                    { encoding: 'utf8' }))
        } catch (e) {
            console.warn(`No security.json found. Creating default empty structure.`);
        }

        return this;
    }

    private async ensureLoaded() {
        if (!this._settings || !this._security)
            await this.load();
    }

    async settings(): Promise<ISettings> {
        await this.ensureLoaded();
        // Return a copy of settings so the original structure can't be modified
        // @ts-ignore because settings is definitely not undefined after load()
        return { ...this._settings };
    }

    async save() {
        // Save security.json
        await fs.writeFile(`${process.cwd()}/etc/security.json`,
            JSON.stringify(this._security), { encoding: 'utf8' });

        // TODO save settings.json?
    }

    // Usually called by server.ts since Express will provide auth
    async newMind(auth: AccessRule): Promise<Mind> {
        await this.ensureLoaded();
        // TODO get from config?
        const jailPath: string = `${process.cwd()}/store`;
        return Mind.create(await this.settings(), jailPath, auth.space, auth.name);

    }

    // Add security authorization
    async allow(space: string, name: string, scope: AuthorizationScopes) {
        await this.ensureLoaded();
        const token: string = crypto.randomBytes(64).toString('base64url');
        // Should be impossible, but if token exists, fatal error
        // @ts-ignore because settings is definitely not undefined after load()
        if (token in this._security.tokens)
            throw new Error('Generated a token that already exists. This should be impossible.');
        // @ts-ignore because settings is definitely not undefined after load()
        this._security.tokens[token] = {
            space: space,
            name: name,
            scope: scope
        };
        return token;
    }

    async getAuthorizationByToken(token: string): Promise<AccessRule | null> {
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