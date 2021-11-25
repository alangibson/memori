<template>
  <div class="notification is-warning">
    <button class="delete"></button>
    <div class="container">
      <div class="columns">
        <div class="column">
          <div class="card">
            <div class="card-content">
              <p>
                We got a bad response from the server. Are you sure you are
                logged in?
              </p>
              <form method="get" action="/login">
                <div class="field">
                  <label class="label">Token</label>
                  <div class="control">
                    <input
                      name="token"
                      class="input"
                      type="text"
                      placeholder="Secret Token"
                    />
                  </div>
                </div>
                <div class="field is-grouped">
                  <div class="control">
                    <button class="button is-link">Log In</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="column">
          <div class="card">
            <div class="card-content">
              <p>
                If you haven't created a Mind yet, you can create one here. 
                Just enter a name and click Create. 
                We'll respond with your secret token and automatically log you in.
              </p>
              <form method="POST">
                <label for="mindName">Name</label>
                <input name="mindName" />
                <button>Create</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>