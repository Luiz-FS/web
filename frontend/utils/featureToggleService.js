(function() {
    'use strict';

    const app = angular.module('app');

    app.service('FeatureToggleService', function FeatureToggleService(HttpService) {
        const service = this;
        const uri = '/api/feature-toggle';


        /**
         * Function to get all features or filter by name
         * 
         * @param {String} featureName - (Optional) Feature name to use in query parameter
         * @return {Promise} Promise that when it is resolved it returns the searched feature.
         */
        service.getFeatures = function getFeatures(featureName) {
            const query = (featureName) ? `?name=${featureName}` : '';
            return HttpService.get(`${uri}${query}`);
        };


        /**
         * This function checks whether the feature passed by parameter 
         * is enabled for the logged in user and the device that he uses.
         * 
         * @param {String} featureName - Feature name to check if is enabled
         * @return {Promise} Promise that when it is resolved it returns a boolean indicating whether or not it is enabled.
         */
        service.isEnabled = function isEnabled(featureName) {
            return service.getFeatures(featureName).then(function(response) {
                const feature = _.first(response);
                const disableMobile = _.get(feature, 'enable_mobile') === 'DISABLED';
                const disableDesktop = _.get(feature, 'enable_desktop') === 'DISABLED';
                
                if (disableMobile && disableDesktop)
                    return false;

                return !disableDesktop && !Utils.isMobileScreen() || !disableMobile && Utils.isMobileScreen();
            });
        };
    });
})();