/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import $ from 'jquery';
import AuthErrors from 'lib/auth-errors';
import Broker from 'models/auth_brokers/base';
// import AttachedClients from 'models/attached-clients';
import chai from 'chai';
import Metrics from 'lib/metrics';
import Notifier from 'lib/channels/notifier';
import NullChannel from 'lib/channels/null';
import Relier from 'models/reliers/relier';
import sinon from 'sinon';
import TestHelpers from '../../../lib/helpers';
import User from 'models/user';
import View from 'views/settings/delete_account';

var assert = chai.assert;
var wrapAssertion = TestHelpers.wrapAssertion;

describe('views/settings/delete_account', function() {
  const UID = '123';
  const password = 'password';
  let account;
  let broker;
  let email;
  let metrics;
  let notifier;
  let relier;
  let tabChannelMock;
  let user;
  let view;
  // let attachedClients;

  beforeEach(() => {
    relier = new Relier();
    tabChannelMock = new NullChannel();
    user = new User();

    broker = new Broker({
      relier,
    });

    notifier = new Notifier({
      tabChannel: tabChannelMock,
    });
    metrics = new Metrics({ notifier });

    view = new View({
      // attachedClients,
      broker,
      metrics,
      notifier,
      relier,
      user,
    });

    // attachedClients = new AttachedClients(
    //   [
    //     {
    //       deviceId: 'device-1',
    //       os: 'Windows',
    //       isCurrentSession: true,
    //       isWebSession: true,
    //       name: 'alpha',
    //       deviceType: 'tablet',
    //     },
    //     {
    //       deviceId: 'device-2',
    //       os: 'iOS',
    //       isCurrentSession: true,
    //       isWebSession: false,
    //       name: 'beta',
    //       deviceType: 'mobile',
    //     },
    //     {
    //       clientId: 'app-1',
    //       lastAccessTime: Date.now(),
    //       isOAuthApp: true,
    //       name: '123Done',
    //     },
    //     {
    //       clientId: 'app-2',
    //       lastAccessTime: Date.now(),
    //       name: 'Pocket',
    //       scope: ['profile', 'profile:write'],
    //       isOAuthApp: false
    //     },
    //   ],
    //   {
    //     notifier: notifier,
    //   }
    // );
  });

  afterEach(function() {
    $(view.el).remove();
    view.destroy();
    view = null;
  });

  // describe('constructor', () => {
  //   it('creates an `AttachedClients` instance if one not passed in', () => {
  //     assert.ok(view._attachedClients);
  //   });
  // })

  describe('with session', function() {
    beforeEach(function() {
      email = TestHelpers.createEmail();

      account = user.initAccount({
        email: email,
        sessionToken: 'abc123',
        uid: UID,
        verified: true,
      });
      sinon.stub(account, 'isSignedIn').callsFake(function() {
        return Promise.resolve(true);
      });

      sinon.stub(view, 'getSignedInAccount').callsFake(function() {
        return account;
      });
      sinon.stub(notifier, 'trigger').callsFake(function() {});

      return view.render().then(function() {
        $('body').append(view.el);
      });
    });

    // check for conditionals like _setHasTwoColumnProductList - if count of products is >= 4
    // check for disabled button if checkboxes aren't all checked & enabled if so
    // uncheck box to make sure submit button toggles?
    // hide container div if there is an error
    // successfully retrieves & displays products

    describe('isValid', function() {
      it('returns true if all checkboxes are checked and password is filled out', function() {
        $('form input[type=password]').val(password);
        $('.delete-account-checkbox').not(':checked').length === 0;

        assert.equal(view.isValid(), true);
      });

      it('returns false if password is too short', function() {
        $('form input[type=password]').val('passwor');

        assert.equal(view.isValid(), false);
      });

      it('returns false if all 3 checkboxes are not checked', function() {
        $('.delete-account-checkbox').not(':checked').length > 0;

        assert.equal(view.isValid(), false);
      });
    });

    describe('showValidationErrors', function() {
      it('shows an error if the password is invalid', function(done) {
        view.$('[type=email]').val('testuser@testuser.com');
        view.$('[type=password]').val('passwor');

        view.on('validation_error', function(which, msg) {
          wrapAssertion(function() {
            assert.ok(msg);
          }, done);
        });

        view.showValidationErrors();
      });
    });

    describe('submit', function() {
      beforeEach(function() {
        $('form input[type=email]').val(email);
        $('form input[type=password]').val(password);
        $('.delete-account-checkbox').not(':checked').length === 0;
      });

      describe('success', function() {
        beforeEach(function() {
          sinon.stub(user, 'deleteAccount').callsFake(function() {
            return Promise.resolve();
          });

          sinon.spy(broker, 'afterDeleteAccount');
          sinon.spy(view, 'logViewEvent');
          sinon.spy(view, 'navigate');

          return view.submit();
        });

        it('delegates to the user model', function() {
          assert.isTrue(user.deleteAccount.calledOnce);
          assert.isTrue(user.deleteAccount.calledWith(account, password));
        });

        it('notifies the broker', function() {
          assert.isTrue(broker.afterDeleteAccount.calledOnce);
          assert.isTrue(broker.afterDeleteAccount.calledWith(account));
        });

        it('redirects to signup, clearing query params', function() {
          assert.equal(view.navigate.args[0][0], 'signup');

          assert.ok(view.navigate.args[0][1].success);
          assert.isTrue(view.navigate.args[0][2].clearQueryParams);
        });

        it('logs success', function() {
          assert.isTrue(view.logViewEvent.calledOnce);
          assert.isTrue(view.logViewEvent.calledWith('deleted'));
        });
      });

      describe('error', function() {
        beforeEach(function() {
          view.$('#password').val('bad_password');

          sinon.stub(user, 'deleteAccount').callsFake(function() {
            return Promise.reject(AuthErrors.toError('INCORRECT_PASSWORD'));
          });

          sinon.stub(view, 'showValidationError').callsFake(function() {});
          return view.submit();
        });

        it('display an error message', function() {
          assert.isTrue(view.showValidationError.called);
        });
      });

      describe('other errors', function() {
        beforeEach(function() {
          sinon.stub(user, 'deleteAccount').callsFake(function() {
            return Promise.reject(AuthErrors.toError('UNEXPECTED_ERROR'));
          });
        });

        it('are re-thrown', function() {
          return view.submit().then(assert.fail, function(err) {
            assert.isTrue(AuthErrors.is(err, 'UNEXPECTED_ERROR'));
          });
        });
      });
    });
  });
});
