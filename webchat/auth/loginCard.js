'use strict';

(function() {
  function LoginCardController() {
    let ctrl = this;
    ctrl.user = {};

    ctrl.signIn = () => {
      // login with AuthService
      ctrl.onLogin();
    }

    ctrl.$onInit = () => {
      if (angular.isUndefined(ctrl.email) || ctrl.email === null)
        ctrl.email = true;
      if (angular.isUndefined(ctrl.google) || ctrl.google === null)
        ctrl.google = true;
      if (angular.isUndefined(ctrl.email) || ctrl.invite === null)
        ctrl.invite = true;
    }
  }

  angular.module('webchat')
    .component('loginCard', {
      templateUrl: 'app/auth/loginCard.html',
      controller: LoginCardController,
      controllerAs: 'ctrl',
      bindings: {
        email: '<',
        google: '<',
        invite: '<',
        onLogin: '&',
      },
    });
})();
