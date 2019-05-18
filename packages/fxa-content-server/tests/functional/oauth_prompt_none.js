/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { registerSuite } = intern.getInterface('object');
const assert = intern.getPlugin('chai').assert;
const { createEmail } = require('../lib/helpers');
const FunctionalHelpers = require('./lib/helpers');
const config = intern._config;
const OAUTH_APP = config.fxaOAuthApp;
const selectors = require('./lib/selectors');

const SIGNIN_URL = `${config.fxaContentRoot}signin`;
const EMAIL_FIRST_URL = `${config.fxaContentRoot}?action=email`;

const PASSWORD = 'passwordzxcv';

let email;
let secret;

const {
  clearBrowserState,
  click,
  closeCurrentWindow,
  confirmTotpCode,
  createUser,
  fillOutEmailFirstSignIn,
  generateTotpCode,
  openFxaFromRp,
  openFxaFromUntrustedRp,
  openPage,
  openVerificationLinkInNewTab,
  switchToWindow,
  testElementExists,
  testElementValueEquals,
  testErrorTextInclude,
  thenify,
  type,
} = FunctionalHelpers;

const testAtOAuthApp = thenify(function () {
  return this.parent
    .then(testElementExists(selectors['123DONE'].AUTHENTICATED))
    .getCurrentUrl()
    .then(function (url) {
      // redirected back to the App
      assert.ok(url.indexOf(OAUTH_APP) > -1);
    });
});

registerSuite('oauth prompt=none', {
  beforeEach: function () {
    email = createEmail();

    return this.remote
      .then(clearBrowserState({
        '123done': true,
        contentServer: true
      }));
  },

  afterEach: function () {
    return this.remote.then(clearBrowserState({
      '123done': true,
      contentServer: true
    }));
  },

  tests: {
    'fails RP is untrusted': function () {
      return this.remote
        .then(openFxaFromUntrustedRp('prompt-none', { header: selectors['400'].HEADER }));
    },

    'fails if no user logged in': function () {
      return this.remote
        .then(openFxaFromRp('prompt-none', { header: selectors['400'].HEADER }));
    },

    'fails if requesting keys': function () {
      return this.remote
        .then(openFxaFromRp('signin-pkce', { header: selectors['400'].HEADER }));
    },

    'fails if account is not verified': function () {
    },

    'fails if account has TOTP enabled': function () {
    },

    'fails if loginHint is different to logged in user': function () {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))

        .then(openPage(EMAIL_FIRST_URL))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.SIGNIN_COMPLETE.HEADER))

        .then(openFxaFromRp('prompt-none', {
          header: selectors['400'].HEADER,
          query: { loginHint: 'anotheruser@restmail.net '}
        }));
    },

    'succeeds if no loginHint, user logged in': function () {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))

        .then(openPage(EMAIL_FIRST_URL))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.SIGNIN_COMPLETE.HEADER))

        .then(openFxaFromRp('prompt-none'))
        .then(testElementExists(selectors['123DONE'].AUTHENTICATED));
    },

    'succeeds if loginHint same as logged in user': function () {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))

        .then(openPage(EMAIL_FIRST_URL))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.SIGNIN_COMPLETE.HEADER))

        .then(openFxaFromRp('prompt-none', { query: { loginHint: email }}))
        .then(testElementExists(selectors['123DONE'].AUTHENTICATED));
    }
  }
});
