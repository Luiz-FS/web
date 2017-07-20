'use strict';
(function() {
    var app = angular.module('app');

    app.controller("MainController", function MainController($mdSidenav, $mdDialog, $mdToast, $state, AuthService) {
        var mainCtrl = this;

        mainCtrl.user = AuthService.getCurrentUser();

        mainCtrl.toggle = function toggle() {
            $mdSidenav('leftNav').toggle();
        };

        mainCtrl.isActive = function isActive(inst) {
            if (mainCtrl.user.current_institution == inst) {
                return true;
            }
            return false;
        };

        mainCtrl.isAdmin = function isAdmin() {
            if (mainCtrl.user){
                return !_.isEmpty(mainCtrl.user.institutions_admin);
            }
        };

        mainCtrl.userIsActive = function userIsActive() {
            return mainCtrl.user.state == 'active';
        };

        mainCtrl.changeInstitution = function changeInstitution(name) {
            mainCtrl.user.changeInstitution(name);
        };

        mainCtrl.settings = [{
            name: 'Início',
            stateTo: 'app.home',
            icon: 'home',
            enabled: true
        }];

        mainCtrl.goTo = function goTo(state) {
            $state.go(state);
            mainCtrl.toggle();
        };

        mainCtrl.goInvite = function goInvite() {
            $state.go('app.invite_inst');
        };

        mainCtrl.goToInstitution = function goToInstitution(institutionKey) {
            $state.go('app.institution', {institutionKey: institutionKey});
            mainCtrl.toggle();
        };

        mainCtrl.logout = function logout() {
            AuthService.logout();
        };

        function isInactive() {
            var notMember = mainCtrl.user.institutions.length === 0;
            var notInvitee = mainCtrl.user.invites.length === 0;
            var notActive = !mainCtrl.userIsActive();
            
            return ((notMember && notInvitee) || notActive);
        }

        (function main() {
            if (isInactive()) {
                $state.go("user_inactive");
            }

            var inviteOfUser = mainCtrl.user.getPendingInvitationOf("user");
            var inviteOfInstitution = mainCtrl.user.getPendingInvitationOf("institution");
            
            if (inviteOfUser) {
                var institutionKey = inviteOfUser.institution_key;
                var inviteKey = inviteOfUser.key;
                $state.go("new_invite", {institutionKey: institutionKey, inviteKey: inviteKey});
            }

            if (inviteOfInstitution) {
                $state.go("submit_institution");
            }

        })();
    });
})();