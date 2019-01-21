(function() {
    'use strict';

    const app = angular.module('app');

    /**
     * This controller manages the view that displays all features for the user.
     */
    app.controller('ManageTogglesController', ['ManageTogglesService' , 'AuthService', 'MessageService' , function(ManageTogglesService, AuthService, 
        MessageService) {
        
        const manageTogglesCtrl = this;
        manageTogglesCtrl.isLoading = false;
        manageTogglesCtrl.oddFeatures = [];
        manageTogglesCtrl.features = [];

        manageTogglesCtrl.options = [
            {
                value: 'DISABLED',
                name: 'DESABILITADO'
            }, {
                value: 'ALL',
                name: 'TODOS'
            }, {
                value: 'ADMIN',
                name: 'TESTE'
            }, {
                value: 'SUPER_USER',
                name: 'SUPER USÁRIO'
            }
        ];

        manageTogglesCtrl.logout = function() {
            AuthService.logout();
        };

        function getChangedFeatures() {
            return manageTogglesCtrl.features.filter((feature, index) => {
                const oddFeature = manageTogglesCtrl.oddFeatures[index];
                const isEqualMobile = oddFeature.enable_mobile === feature.enable_mobile;
                const isEqualDesktop = oddFeature.enable_desktop === feature.enable_desktop;
                return !isEqualMobile || !isEqualDesktop;
            });
        }

        manageTogglesCtrl.save = function save() {
            const modifiedFeatures = getChangedFeatures();
            if (modifiedFeatures.length !== 0) {
                manageTogglesCtrl.isLoading = true;
                return ManageTogglesService.saveFeatures(modifiedFeatures)
                    .then(() => {
                        return loadFeatures().then(features => {
                            MessageService.showToast("Alterações salvas com sucesso.");
                            return features;
                        });
                    }).catch(response => {
                        MessageService.showToast(response.msg);
                    }).finally(function() {
                        manageTogglesCtrl.isLoading = false;
                    });
            }

        };

        function loadFeatures() {
            return ManageTogglesService.getAllFeatureToggles().then(function(features) {
                manageTogglesCtrl.oddFeatures = features;
                manageTogglesCtrl.features = _.cloneDeep(features);
                return features;
            });
        }

        manageTogglesCtrl.$onInit = function() {
            return loadFeatures();
        };
    }]);
})();