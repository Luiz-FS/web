(function () {
    'use strict';

    angular.module("app").service('EmailService', ["HttpService", function emailService(HttpService) {
        const emailService = this;

        emailService.STATE_LINK_EMAIL_API_URI = "/api/email/current-state";

        /**
         * Make a post request to the backend to send a state link by email.
         * It receives the state link that will be sent.
         *
         * @param stateLink the state link that will be sent.
         * @returns The post request to the backend.
         */
        emailService.sendStateLink = (stateLink) => {
            return HttpService.post(emailService.STATE_LINK_EMAIL_API_URI, {
                "data": {
                    "state-link": Config.FRONTEND_URL + stateLink
                }
            });
        };
    }]);
})();