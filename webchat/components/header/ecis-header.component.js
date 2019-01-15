(function () {
    'use strict';

    angular.module('webchat').component('ecisHeader', {
        templateUrl: "app/components/header/ecis-header.html",
        controller: [
            '$mdSidenav',
            headerController,
        ],
        controllerAs: "headerCtrl",
        bindings: {
            className: "@",
            style: "@",
            ariaLabel: "@",
            mdColors: "@",
            user: "<"
        },
    });

    function headerController ($mdSidenav) {
        const headerCtrl = this;

        headerCtrl.toggleNavbar = (componentId) => {
            $mdSidenav(componentId).toggle();
        };
    }
})();
