(function () {
    'use strict';

    angular.module("webchat").component("chatButtons", {
        templateUrl: "app/components/chat/buttons/chat-buttons.html",
        controller: chatButtonsController,
        controllerAs: "chatButtonsCtrl",
        bindings: {
            callFunc: "<",
        },
    });

    function chatButtonsController() {
        const chatButtonsCtrl = this;

    }

})();