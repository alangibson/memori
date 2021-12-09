import debug from 'debug';

export default function config(name: string) {
    const logger = debug(name);

    const f = function (...args: any[]) {
        logger.log(...args);
    };

    f.debug = debug(name);
    f.info = debug(name);
    f.warn = debug(name);
    f.error = debug(name);

    return f;
}
