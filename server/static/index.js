// Registering Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// TODO requests permission for notifications when a button is clicked:
// const button = document.getElementById('notifications');
// button.addEventListener('click', () => {
//   Notification.requestPermission().then((result) => {
//     if (result === 'granted') {
//       randomNotification();
//     }
//   });
// });


function appendHtmlToResults(html) {
    const child = document.createElement('div');
    child.classList.add('result');
    child.innerHTML = html;
    document.getElementById('results')
        .appendChild(child);

}

// Remove all divs from #results
function clearResults() {
    // document.getElementById('results').childNodes.forEach((child) => {
    //     child.remove();
    // });
    document.getElementById('results').innerHTML = '';
}

function find(q, sort) {

    // Find and save Authorization token
    // const token = document.querySelector(`input[name='token']`).value;

    fetch(`/recall?q=${q}&sort=${sort}`, {
        // headers: {
        //     Authorization: `Bearer ${token}`
        // },
        credentials: "include"
    })
        .then((response) => {

            clearResults();

            if (response.status >= 400) {
                appendHtmlToResults(`${response.status} ${response.statusText}`);
                return;
            }

            // Add result divs to #results
            response.json()
                .then((results) => {

                    if (results.length == 0) {
                        appendHtmlToResults(`No results found`);
                        return;
                    }

                    results.forEach((result) => {

                        let innerHTML = `
                            <div class="property name">
                                <a href="/recall?@id=${result.thing['@id']}">
                                    ${result.thing.name}
                                </a>
                            </div>
                            <div class="property abstract">
                                ${result.thing.abstract}
                            </div>
                            <div class="property url">
                                <a href="${result.thing.url}">
                                    ${result.thing.url}
                                </a>
                            </div>
                            <div>
                                ${result.thing['@type']}
                                &nbsp; ${result.thing.encodingFormat}
                            </div>
                            <div>
                                <a href="/recall/blob?@id=${result.thing['@id']}">
                                    Download from memory
                                </a>
                                <button onclick="forget('${result.thing['@id']}')">
                                    Forget
                                </button>
                            </div>
                        `;

                        // Add subschema html
                        let subschemas = [];

                        if (result.thing['m:embedded'])
                            subschemas = subschemas.concat(
                                result.thing['m:embedded']
                                    .map((schema) => `
                                    <div class="property name">
                                        <a href="${schema.url}">
                                            ${schema.name}
                                        </a>
                                    </div>
                                    <div>
                                        ${schema['@type']}
                                        &nbsp; ${schema.encodingFormat}
                                    </div>
                                    `)
                            );

                        if (subschemas.length) {
                            innerHTML += '<div class="subschemas">';
                            innerHTML = subschemas.reduce((prev, curr) => {
                                return prev += `<div class="subschema">${curr}</div>`;
                            }, innerHTML);
                            innerHTML += '</div>';
                        }

                        appendHtmlToResults(innerHTML);
                    });
                });
        })
        .catch((err) => appendHtmlToResults(`Error: ${err}`));

    return false;
}

function forget(id) {

    fetch('/recall?@id=' + id, {
        method: 'DELETE'
    })
        .then((response) => {
            find(document.querySelector(`input[name='q']`).value,
                document.querySelector(`select[name='sort']`).value);
        })
}

function recordAudio() {

    // const recordAudioButton = document.getElementById('recordAudio');
    const pauseAudioButton = document.getElementById('pauseAudio');
    const rememberAudioButton = document.getElementById('rememberAudio');

    const handleSuccess = function (stream) {

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        // Accumulate audio data as it comes in
        const recordedChunks = [];
        mediaRecorder.addEventListener('dataavailable', function (e) {
            console.log(`Storing data of size ${e.data.size}`);
            if (e.data.size > 0)
                recordedChunks.push(e.data);
        }); 

        mediaRecorder.addEventListener('stop', function () {
            
            // TODO reset icons
            
            // Turn audio data into a blob
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });

            // Remember audio blob
            console.log(`Remembering audio Blob of size ${blob.size}`);
            const formData = new FormData();
            formData.append('audio', blob);
            fetch('/remember', {
                method: 'POST',
                body: formData
            })
        });

        // recordAudioButton.addEventListener('click', () => mediaRecorder.start());
        rememberAudioButton.addEventListener('click', () => {
            mediaRecorder.requestData();
            mediaRecorder.stop();
        });

        pauseAudioButton.addEventListener('click', () => {
            if (mediaRecorder.state == 'paused')
                mediaRecorder.resume();
            else
                mediaRecorder.pause();
        });

        // Remember to call start() or MedialRecorder will be in inactive state
        mediaRecorder.start();
    };

    navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(handleSuccess);

}