<template>
  <div class="hello">
    <ul>
      <li>
        Search <input name="q" />
        <select name="sort">
          <option>Relevance</option>
          <option>created:desc</option>
        </select>
        <button
          onclick="find(document.querySelector(`input[name='q']`).value, 
                                  document.querySelector(`select[name='sort']`).value)"
        >
          Recall
        </button>
      </li>
      <li>
        <button
          onclick="find('', document.querySelector(`select[name='sort']`).value)"
        >
          List All
        </button>
      </li>
      <li>
        Create new Mind
        <label for="mindName">Name</label>
        <input name="mindName" />
        <button
          onclick="createMind(document.querySelector(`input[name='mindName']`).value)"
        >
          Create
        </button>
      </li>
      <li>
        <form method="get" action="/login">
          <label for="token">Log in with token</label>
          <input id="token" name="token" />
          <button>Log in</button>
        </form>
      </li>
      <li>
        <form method="get" action="/logout">
          <label for="token">Log out</label>
          <button>Log out</button>
        </form>
      </li>
      <li>
        <form method="post" action="/remember" enctype="multipart/form-data">
          <label for="files">File</label>
          <input id="files" name="file" type="file" multiple="true" />
          <button>Remember</button>
        </form>
      </li>
      <li>
        <form method="post" action="/remember" enctype="multipart/form-data">
          Photo:
          <input name="image" type="file" accept="image/*" capture />
          <button>Remember</button>
        </form>
      </li>
      <li>
        <form method="POST" action="/remember" enctype="multipart/form-data">
          Video: <input name="video" type="file" accept="video/*" capture />
          <button>Remember</button>
        </form>
      </li>
      <li>
        <form method="POST" action="/remember" enctype="multipart/form-data">
          Audio: <input name="audio" type="file" accept="audio/*" capture />
          <button>Remember</button>
        </form>
      </li>
      <li>
        <form method="post" action="/remember" enctype="multipart/form-data">
          URL:
          <input name="uri-list" />
          <button>Remember</button>
        </form>
      </li>
      <li>
        <form method="post" action="/remember" enctype="multipart/form-data">
          Notes
          <input name="name" />
          <select name="mimetype">
            <option value="text/plain">Plain Text</option>
            <option value="text/markdown">Markdown</option>
          </select>
          <textarea name="text"></textarea>
          <button>Remember</button>
        </form>
      </li>
      <li>
        Audio
        <button id="recordAudio" onclick="recordAudio()">Record</button>
        <button id="pauseAudio">Pause</button>
        <button id="rememberAudio">Remember</button>
      </li>
    </ul>
  </div>
</template>
