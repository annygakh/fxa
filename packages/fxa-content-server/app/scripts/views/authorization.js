/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * OAuth authorization view, redirects based on requested OAuth actions.
 */
import BaseView from './base';
import Cocktail from 'cocktail';
import { OAUTH_PROMPT_NONE } from '../lib/constants';
import CachedCredentialsMixin from './mixins/cached-credentials-mixin';

class AuthorizationView extends BaseView {
  beforeRender() {
    if (this.relier.get('prompt') === OAUTH_PROMPT_NONE) {
      return (
        this._doPromptNone()
          // false prevents the view from further rendering
          .then(() => false)
      );
    }

    const action = this.relier.get('action');
    if (action) {
      const pathname = action === 'email' ? '/oauth/' : action;
      this.replaceCurrentPage(pathname);
    } else {
      // if no action is specified, let oauth-index decide based on
      // current user signed in state.
      this.replaceCurrentPage('/oauth/');
    }
  }

  _doPromptNone() {
    const account = this.getSignedInAccount();

    try {
      this.relier.validatePromptNoneRequest(account);
    } catch (err) {
      if (
        err.response_error_code &&
        this.relier.get('returnOnError') !== false
      ) {
        return this.broker.sendOAuthResultToRelier({
          error: err.response_error_code,
          redirect: this.relier.get('redirectUri'),
        });
      }

      // Other errors are developer facing and should be surfaced
      // to help the developer remedy the problem.
      throw err;
    }

    return this.useLoggedInAccount(account);
  }
}

Cocktail.mixin(AuthorizationView, CachedCredentialsMixin);

export default AuthorizationView;
