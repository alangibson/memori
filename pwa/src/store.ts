import { writable } from 'svelte/store';

export const User = function () {
    const { subscribe, set } = writable('init');
    return {
        subscribe,
        signout: () => { set('') },
        signin: () => { set('John') }
    }
}();

export const AuthenticationState = function () {
    const { subscribe, set } = writable(false);
    return {
        subscribe,
        isAuthenticated: (state: boolean) => { 
            console.debug(`Is Authenticated: ${state}`);
            set(state) ;
        }
    }
}();

export const SearchResults = function () {
    const a: any[] = [];
    const { subscribe, set } = writable(a);
    return {
        subscribe,
        setResults: (state: any[]) => set(state)
    }
}();
