
// Ensure compatability for Firefox and Chrome
if (typeof browser === "undefined") {
    var browser = chrome;
}

//
// Change "remember" button icon based on whether or not url is in memory
//

function updateIconForTab(tab) {
    updateIcon(tab.tabId);
}

// Updates the browserAction icon to reflect whether the current page
// is already bookmarked.
function updateIcon(tabId) {

    if (!tabId || tabId <= 0)
        return;

    // TODO Check memory to see if we already remembered url
    // Make icon green if so; otherwise black 

    // TODO is url in tab rememebered?
    // HEAD /recall@id=${url} ???

    // browser.browserAction.setIcon({
    //     tabId: tabId,
    //     path: currentBookmark ? {
    //         32: "icons/memori-32.png",
    //         48: "icons/memori-48.png",
    //         96: "icons/memori-96.png"
    //     } : {
    //         32: "icons/memori-32.png",
    //         48: "icons/memori-48.png",
    //         96: "icons/memori-96.png"
    //     }
    // });

    // browser.browserAction.setTitle({
    //     // Screen readers can see the title
    //     title: currentBookmark ? 'Unbookmark it!' : 'Bookmark it!',
    //     tabId: currentTab.id
    // });
}

//
// Fetching and remembering functions
//

async function fetchBlobFromUrl(url) {
    const response = await fetch(url);
    return response.blob();
}

// Remember a blob
async function remember(memoriUrl, authToken, url, title, blob) {
    const formData = new FormData();
    formData.append('url', url);
    formData.append('name', title);
    console.log('document', blob);
    formData.append('document', blob);
    // TODO don't hard code mime type
    formData.append('documentMimeType', blob.type);
    // Do the request to Memori
    const memoriResponse = await fetch(`${memoriUrl}/remember`, {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });
    return memoriResponse;
}

async function rememberUrl(url, name) {

    // Get extension settings 
    // Promise only works on Firefox
    // const settings = await browser.storage.sync.get(["mindUrl", "authToken"]);

    browser.storage.sync.get(["memoriUrl", "authToken"],
        async (settings) => {
            try {
                // Make sure we have settings.
                // We will actually get a 200 OK if we GET the internal extension URL!
                if (settings.memoriUrl == undefined || settings.authToken == undefined)
                    throw new Error('Please set Memori server url and authorization token in extension settings');

                // Fetch blob and remember it
                const blob = await fetchBlobFromUrl(url);
                const memoriResponse = await remember(settings.memoriUrl, settings.authToken, url, name, blob);

                // Check the response code
                if (memoriResponse.status == 401)
                    throw new Error('Unauthorized. Please check your authorization token in extension settings.');
                else if (memoriResponse.status >= 400)
                    throw new Error(`${memoriResponse.status} ${memoriResponse.statusText}`);

                // Popup green success box
                let execution = await browser.tabs.executeScript(
                    {
                        code: `
                        var popup = document.createElement('div');
                        popup.id = 'memori-popup';
                        popup.style = 'position: fixed; top: 0; left: 0; width: 100%; z-index: 9999;';
                        popup.innerHTML = \`
                        <div style="background-color: lightgreen; padding: 8px;">
                            <div style="background-color: lightgreen; padding: 8px; border: 1px solid green;">
                                <ul>
                                    <li>Request URL: ${memoriResponse.url}</li>
                                    <li>Reponse Status: ${memoriResponse.status}</li>
                                    <li>Reponse Status Text: ${memoriResponse.statusText}</li>
                                    <li>Location: ${memoriResponse.headers.get('Location')}</li>
                                    <li>Remember URL: ${url}</li>
                                    <li>Memori URL: ${settings.memoriUrl}</li>
                                </ul>
                                 
                                <div>
                                    <button onclick="document.getElementById('memori-popup').remove()">Close</button>
                                </div>
                            </div>
                        <div>
                        \`
                        document.body.appendChild(popup);
                        undefined;
                        `
                    });
                console.debug(execution);

            } catch (error) {
                console.error(error);
                // Popup red error box
                let execution = await browser.tabs.executeScript(
                    {
                        code: `
                        var popup = document.createElement('div');
                        popup.id = 'memori-popup';
                        popup.style = 'position: fixed; top: 0; left: 0; width: 100%; z-index: 9999;';
                        popup.innerHTML = \`
                        <div style="background-color: red; padding: 8px;">
                            <div style="background-color: red; padding: 8px; border: 1px solid darkred;">
                                ${error}
                                <div>
                                    <button onclick="document.getElementById('memori-popup').remove()">Close</button>
                                </div>
                            </div>
                        <div>
                        \`
                        document.body.appendChild(popup);
                        undefined;
                        `
                    });
                console.log(execution);
            }

        });

}

//
// Handle user clicking on "remember" button
//

browser.browserAction.onClicked.addListener(async (tab, click) => {

    console.log('remembering tab', tab);

    // TODO we could do this on Firefox
    // Get from WebResource we previously captured
    // const html = htmlByTab[tab.id];

    await rememberUrl(tab.url, tab.name);
});

//
// Remember bookmarks
//

// bookmark: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks/BookmarkTreeNode
browser.bookmarks.onCreated.addListener(async (id, bookmark) => {

    if (bookmark.type != 'bookmark')
        return;
    console.debug(`Remembering bookmark ${id} with URL: ${bookmark.url}`);

    await rememberUrl(bookmark.url, bookmark.name);
});

//
// Capture document HTML as it streams in via WebRequest 
// Does not work on Chrome due to missing filterResponseData()
//

var htmlByTab = [];

function listener(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    filter.ondata = (event) => {
        let str = new TextDecoder("utf-8").decode(event.data, { stream: true });
        htmlByTab[details.tabId] = str;
        filter.write(new TextEncoder().encode(str));
        filter.disconnect();
    }
    return {};
}

// Register listener to read page content as it comes in
// Disabled until we decide to do something with this on Firefox
// browser.webRequest.onBeforeRequest.addListener(
//     listener,
//     { urls: ["*://*/*"], types: ["main_frame"] },
//     ["blocking"]
// );

//
// Context menu item
//

// browser.contextMenus.create({
//     id: "remember",
//     title: "Remember"
// });

// browser.contextMenus.onClicked.addListener(function (info, tab) {
//     if (info.menuItemId == "remember") {
//         browser.tabs.executeScript({
//             file: "page-eater.js"
//         });
//     }
// });

//
// Icon change listeners
//

// listen to tab URL changes
browser.tabs.onUpdated.addListener(updateIconForTab);

// listen to tab switching
browser.tabs.onActivated.addListener(updateIconForTab);

// listen for window switching
browser.windows.onFocusChanged.addListener(updateIcon);
