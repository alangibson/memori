import { writable, readable } from 'svelte/store';

export const User = function () {
    const { subscribe, set } = writable('init');
    return {
        subscribe,
        signout: () => { set('') },
        signin: () => { set('John') }
    }
}();

export const Auth = function () {
    const { subscribe, set } = writable('yes');
    return {
        subscribe,
        setAuthorized: (state: string) => { set(state) }
    }
}()

