'use strict';

(function() {
    var app = angular.module('app');

    app.controller('ProcessInviteUserAdmController', function ProcessInviteUserAdmController(key, type_of_dialog, InviteService, MessageService, AuthService, $mdDialog) {
        var processCtrl = this;
        processCtrl.invite = {};
        processCtrl.type_of_dialog = type_of_dialog;
        processCtrl.isAccepting = false;
        processCtrl.current_user = AuthService.getCurrentUser();

        processCtrl.accept = function accept() {
            InviteService.acceptInviteUserAdm(processCtrl.invite.key).then(function success() {
                MessageService.showToast('Convite aceito com sucesso!');
                processCtrl.current_user.institutions_admin.push(processCtrl.invite.institution_key);
                AuthService.save();
                processCtrl.type_of_dialog = 'accepted';
                processCtrl.isAccepting = true;
            });
        };

        processCtrl.reject = function reject() {
            InviteService.rejectInviteUserAdm(processCtrl.invite.key).then(function success() {
                MessageService.showToast('Convite recusado!');
                $mdDialog.hide();
            });
        };

        processCtrl.close = function close() {
            $mdDialog.hide();
        };

        (function main() {
            InviteService.getInvite(key).then(function success(response) {
                let invite = new Invite(response.data);

                if (invite.status === 'sent' || type_of_dialog === 'accepted') {
                    processCtrl.invite = invite;

                    if(invite.status === 'accepted') {
                        _.remove(processCtrl.current_user.institutions_admin, function(url) {
                            return getKey(url) === invite.institution_key;
                        });
                        AuthService.save();
                    }

                } else {
                    MessageService.showToast('Convite já processado!');
                    processCtrl.close();
                }
            });
        })();
    });
})();