(function () {
    'use strict';

    const webchat = angular.module('webchat');

    webchat.controller('LoginController', function LoginController ($scope, $state) {
        const controller = this;

        controller.success = () => {
          $state.go('webchat.home');
        }

        const main = () => {
        };

        main();

    });

})();
