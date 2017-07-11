'use strict';

(function() {
    var app = angular.module("app");

    app.controller("SubmitInstController", function SubmitInstController(AuthService, InstitutionService, $state, $mdToast, $mdDialog, $q, $http) {
        var submitInstCtrl = this;
        submitInstCtrl.invite = {
            suggestion_institution_name: "",
            invitee: ""
        };

        Object.defineProperty(submitInstCtrl, 'user', {
            get: function() {
                return AuthService.user;
            },
        });

        submitInstCtrl.invite = submitInstCtrl.user.getPendingInvitationOf('institution');

        submitInstCtrl.institution = {
            name: submitInstCtrl.invite.suggestion_institution_name,
            image_url: "",
            email: submitInstCtrl.invite.invitee,
            state: "active"
        };

        submitInstCtrl.natures = [
            {value:"public", name:"Pública"}, 
            {value:"private", name:"Privada"},
            {value:"philanthropic", name:"Filantrópica"}
        ];

        submitInstCtrl.areas = [
            {value:"official laboratories", name:"Laboratórios Oficiais"}, 
            {value:"government agencies", name:"Ministérios e outros Órgãos do Governo"}, 
            {value:"funding agencies", name:"Agências de Fomento"}, 
            {value:"research institutes", name:"Institutos de Pesquisa"}, 
            {value:"colleges", name:"Universidades"},
            {value:"other", name:"Outra"}
        ];

        submitInstCtrl.cnpjRegex = "[0-9]{2}[\.][0-9]{3}[\.][0-9]{3}[\/][0-9]{4}[-][0-9]{2}";
        submitInstCtrl.phoneRegex = "([0-9]{2}[\\s][0-9]{8})";

        submitInstCtrl.submit = function submit() {
            var confirm = $mdDialog.confirm(event)
                .clickOutsideToClose(true)
                .title('Confirmar Cadastro')
                .textContent('Confirmar o cadastro dessa instituição?')
                .ariaLabel('Confirmar Cadastro')
                .targetEvent(event)
                .ok('Sim')
                .cancel('Não');

            $mdDialog.show(confirm).then(function() {
                InstitutionService.createInstitution(submitInstCtrl.institution).then(
                    function success() {
                        deleteInvite(submitInstCtrl.invite.key).then(
                            function success() {
                                goHome();            
                                showToast('Cadastro de instituição realizado com sucesso');
                            }, function error(response) {
                                showToast(response.data.msg);
                            }
                        );                    
                    }, function error(response) {
                        showToast(response.data.msg);
                    }
                );
            }, function() {
                showToast('Cancelado');
            });
        };

        submitInstCtrl.cancel = function cancel(event) {
            var confirm = $mdDialog.confirm()
                .clickOutsideToClose(true)
                .title('Cancelar Cadastro')
                .textContent('Cancelar o cadastro dessa instituição?')
                .ariaLabel('Cancelar Cadastro')
                .targetEvent(event)
                .ok('Sim')
                .cancel('Não');

            $mdDialog.show(confirm).then(function() {
                deleteInvite(submitInstCtrl.invite.key).then(
                    function success() {
                        goHome();            
                        showToast('Cadastro de instituição cancelado');
                    }, function error(response) {
                        showToast(response.data.msg);
                    }
                );
            }, function() {
                showToast('Cancelado');
            });
        };

         var goHome = function goToHome() {
            $state.go('app.home');
        };

        function showToast(msg) {
            $mdToast.show(
                $mdToast.simple()
                    .textContent(msg)
                    .action('FECHAR')
                    .highlightAction(true)
                    .hideDelay(5000)
                    .position('bottom right')
            );
        }


        // TODO: replace the use of this method by the InviteService
        // @author: Ruan Eloy   date: 11/07/17
        function deleteInvite(inviteKey) {
            console.log(inviteKey);
            var deferred = $q.defer();
            var INVITE_URI = '/api/invites/';
            $http.delete(INVITE_URI + inviteKey).then(function sucess(response) {
                deferred.resolve(response);
            }, function error(response) {
                deferred.reject(response);
            });
            return deferred.promise;
        }
    });
})();
