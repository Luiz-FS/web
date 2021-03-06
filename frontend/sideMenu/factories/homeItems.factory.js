"use strict";

(function () {
    angular
    .module('app')
    .factory('HomeItemsFactory', function ($state, STATES, AuthService, $mdDialog, $window, SCREEN_SIZES) {
        const factory = {};
        const url_report = Config.SUPPORT_URL + "/report";

        const isSuperUser = user => user.hasPermission('analyze_request_inst');

        const takeTour = event => {
            $mdDialog.show({
                templateUrl: 'app/invites/welcome_dialog.html',
                controller: function WelcomeController() {
                    const controller = this;
                    controller.next = false;
                    controller.cancel = function() {
                        $mdDialog.cancel();
                    };
                },
                controllerAs: "controller",
                targetEvent: event,
                clickOutsideToClose: false
            });
        };

        factory.getItems = user => {
            const getInstitutionKey = () => user.current_institution.key;
            const isNotMobileScreen = !Utils.isMobileScreen(600);
            return [
                {
                    icon: 'home',
                    description: 'Início',
                    stateName: 'HOME',
                    showIf: () => isNotMobileScreen,
                    onClick: () => $state.go(STATES.HOME)
                },
                {
                    icon: 'account_box',
                    description: 'Meu Perfil',
                    stateName: 'CONFIG_PROFILE',
                    onClick: () => $state.go(STATES.CONFIG_PROFILE, {userKey: user.key})
                },
                {
                    icon: 'date_range',
                    description: 'Eventos',
                    stateName: 'EVENTS',
                    onClick: () => $state.go(STATES.EVENTS)
                },
                {
                    icon: 'mail_outline',
                    description: 'Convites',
                    stateName: 'INVITE_INSTITUTION',
                    onClick: () => $state.go(STATES.INVITE_INSTITUTION),
                    showIf: () => isSuperUser(user)
                },
                {
                    icon: 'account_balance',
                    description: 'Gerenciar instituição',
                    stateName: 'MANAGE_INST_EDIT',
                    showIf: () => user.isAdminOfCurrentInst(),
                    sectionTitle: 'INSTITUIÇÃO',
                    topDivider: true,
                    onClick: () => {
                        const state = Utils.selectFieldBasedOnScreenSize(
                            STATES.MANAGE_INST_EDIT, STATES.MANAGE_INST_MENU_MOB, SCREEN_SIZES.SMARTPHONE
                        );
                        $state.go(state, {institutionKey: getInstitutionKey()});
                    },
                },
                {
                    icon: 'account_circle',
                    description: 'Gerenciar Membros',
                    stateName: 'MANAGE_INST_MEMBERS',
                    showIf: () => user.isAdminOfCurrentInst() && isNotMobileScreen,
                    onClick: () => $state.go(STATES.MANAGE_INST_MEMBERS, {institutionKey: getInstitutionKey()}),
                },
                {
                    icon: 'account_balance',
                    description: 'Vínculos Institucionais',
                    stateName: 'MANAGE_INST_INVITE_INST',
                    showIf: () => user.isAdminOfCurrentInst() && isNotMobileScreen,
                    onClick: () => $state.go(STATES.MANAGE_INST_INVITE_INST, {institutionKey: getInstitutionKey()}),
                },
                {
                    icon: 'account_balance',
                    description: 'Instituições cadastradas',
                    stateName: 'USER_INSTITUTIONS',
                    topDivider: true,
                    onClick: () => $state.go(STATES.USER_INSTITUTIONS)
                },
                {
                    icon: 'card_travel',
                    description: 'Iniciar Tutorial',
                    onClick: event => takeTour(event)
                },
                {
                    icon: 'warning',
                    description: 'Reportar problemas',
                    showIf: () => !isNotMobileScreen,
                    onClick: () => $window.open(url_report),
                },
                {
                    icon: 'exit_to_app',
                    description: 'Sair',
                    onClick: () => AuthService.logout()
                },
            ];
        };

        return factory;
    });
})();