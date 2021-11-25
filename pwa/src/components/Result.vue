<template>
  <div class="card my-5">
    <div class="columns">
      <div class="column">
        <figure class="image is-128x128">
          <img
            class="thumbnail"
            src="https://bulma.io/images/placeholders/128x128.png"
          />
        </figure>
      </div>
      <div class="column">
        <div class="name">
          <a href="${memory.url}">${memory.name}</a>
        </div>
        <div class="abstract">${memory.name}</div>
        <div class="type">${memory['@type']}</div>
        <div class="encodingFormat">${memory.encodingFormat}</div>
      </div>
      <div class="column is-one-fifth">
        <div class="actions">
          <button class="button is-fullwidth download">Download</button>
          <button class="button is-fullwidth forget">Forget</button>
          <!-- TODO GET /recall?@id=??? -->
          <button class="button is-fullwidth details">More</button>
        </div>
      </div>
    </div>
  </div>
</template>