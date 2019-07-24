/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { registerSuite } = intern.getInterface('object');
const { createEmail } = require('../lib/helpers');
const FunctionalHelpers = require('./lib/helpers');
const config = intern._config;
const selectors = require('./lib/selectors');

const EMAIL_FIRST_URL = `${config.fxaContentRoot}?action=email`;

const PASSWORD = 'passwordzxcv';

let email;

const {
  clearBrowserState,
  click,
  createUser,
  fillOutEmailFirstSignIn,
  openFxaFromRp,
  openPage,
  openRP,
  testElementExists,
  testElementTextInclude,
} = FunctionalHelpers;

registerSuite('oauth prompt=none', {
  beforeEach: function() {
    email = createEmail();

    return this.remote.then(
      clearBrowserState({
        '123done': true,
        contentServer: true,
      })
    );
  },

  afterEach: function() {
    return this.remote.then(
      clearBrowserState({
        '123done': true,
        contentServer: true,
      })
    );
  },

  tests: {
    'fails RP that is not allowed': function() {
      return this.remote
        .then(openRP({ untrusted: true, query: { return_on_error: false } }))
        .then(click(selectors['123DONE'].BUTTON_PROMPT_NONE))
        .then(testElementExists(selectors['400'].HEADER))
        .then(
          testElementTextInclude(
            selectors['400'].ERROR,
            'prompt=none is not enabled for this client'
          )
        );
    },

    /*    'fails if requesting keys': function () {
      return this.remote
        .then(openRP({ query: { return_on_error: false }}))
        .then(click(selectors["123DONE"].BUTTON_PROMPT_NONE))
        .then(reOpenWithAdditionalQueryParams({ keys: 'anotheruser@restmail.net '}))
        .then(testElementExists(selectors['400'].HEADER))
        .then(testElementTextInclude(selectors['400'].ERROR, 'prompt=none cannot be used when requesting keys'))
    },
*/
    'fails if no user logged in': function() {
      return this.remote
        .then(openRP({ query: { return_on_error: false } }))
        .then(click(selectors['123DONE'].BUTTON_PROMPT_NONE))
        .then(testElementExists(selectors['400'].HEADER))
        .then(
          testElementTextInclude(
            selectors['400'].ERROR,
            'User is not signed in'
          )
        );
    },

    'fails if account is not verified': function() {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: false }))

        .then(openPage(EMAIL_FIRST_URL, selectors.ENTER_EMAIL.HEADER))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.CONFIRM_SIGNUP.HEADER))

        .then(openRP({ query: { return_on_error: false } }))
        .then(click(selectors['123DONE'].BUTTON_PROMPT_NONE))
        .then(testElementExists(selectors['400'].HEADER))
        .then(
          testElementTextInclude(
            selectors['400'].ERROR,
            'Account is not verified'
          )
        );
    },
    /*'
    'fails if account has TOTP enabled': function () {
    },
    */
    'fails if loginHint is different to logged in user': function() {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))

        .then(openPage(EMAIL_FIRST_URL, selectors.ENTER_EMAIL.HEADER))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.SETTINGS.HEADER))

        .then(
          openRP({
            query: { return_on_error: false, login_hint: createEmail() },
          })
        )
        .then(click(selectors['123DONE'].BUTTON_PROMPT_NONE))
        .then(testElementExists(selectors['400'].HEADER))
        .then(
          testElementTextInclude(selectors['400'].ERROR, 'is not signed in')
        );
    },

    'succeeds if no loginHint, user logged in': function() {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))

        .then(openPage(EMAIL_FIRST_URL, selectors.ENTER_EMAIL.HEADER))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.SETTINGS.HEADER))

        .then(openFxaFromRp('prompt-none'))
        .then(testElementExists(selectors['123DONE'].AUTHENTICATED));
    },

    'succeeds if loginHint same as logged in user': function() {
      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))

        .then(openPage(EMAIL_FIRST_URL, selectors.ENTER_EMAIL.HEADER))
        .then(fillOutEmailFirstSignIn(email, PASSWORD))
        .then(testElementExists(selectors.SETTINGS.HEADER))

        .then(openRP({ query: { login_hint: email } }))
        .then(click(selectors['123DONE'].BUTTON_PROMPT_NONE))
        .then(testElementExists(selectors['123DONE'].AUTHENTICATED));
    },
  },
});
