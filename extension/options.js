
// Ensure compatability for Firefox and Chrome
if (typeof browser === "undefined") {
    var browser = chrome;
}

function saveOptions(e) {
    e.preventDefault();

    // Promise only works on Firefox
    // browser.storage.sync.set({
    //     mindUrl: document.querySelector("#mind-url").value,
    //     authToken: document.querySelector("#auth-token").value
    // })
    //     .then((result) => console.debug(result))
    //     .catch((error) => console.error(error));

    browser.storage.sync.set({
            memoriUrl: document.querySelector("#memori-url").value,
            authToken: document.querySelector("#auth-token").value
        }, 
        (x) => console.debug(x));

}

function restoreOptions() {

    // Promise only works on Firefox
    // browser.storage.sync.get(["memoriUrl", "authToken"])
    //     .then((result) => {
    //         document.querySelector("#memori-url").value = result.memoriUrl || "";
    //         document.querySelector("#auth-token").value = result.authToken || "";
    //         console.debug(result);
    //     },
    //         (error) => console.error(error))
    //     .catch((error) => console.error(error));

    browser.storage.sync.get(["memoriUrl", "authToken"],
        (result) => {
            document.querySelector("#memori-url").value = result.memoriUrl || "";
            document.querySelector("#auth-token").value = result.authToken || "";
            console.debug(result);

        });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);