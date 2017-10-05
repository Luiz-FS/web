'use strict';

(function() {
   var app = angular.module('app');

   app.controller('NewInviteController', function NewInviteController(InstitutionService, AuthService, UserService, InviteService, $mdToast,
    $mdDialog, MessageService, $state) {
        var newInviteCtrl = this;

        newInviteCtrl.institution = null;

        newInviteCtrl.inviteKey = $state.params.key;

        newInviteCtrl.user = AuthService.getCurrentUser();

        newInviteCtrl.phoneRegex = "[0-9]{2}[\\s][0-9]{4,5}[-][0-9]{4,5}";

        var observer;

        var institutionKey;

        newInviteCtrl.acceptInvite = function acceptInvite(event) {
            if (newInviteCtrl.invite.type_of_invite === "USER") {
                if(isValidProfile()) {
                    newInviteCtrl.addInstitution(event);
                }
            } else {
                newInviteCtrl.updateStubInstitution();
            }
        };

        newInviteCtrl.saveInstProfile = function configInstProfile() {
            var profile = {phone: newInviteCtrl.phone,
                    email: newInviteCtrl.email,
                    office: newInviteCtrl.office,
                    institution_key: newInviteCtrl.institution.key,
                    institution_name: newInviteCtrl.institution.name,
                    institution_photo_url: newInviteCtrl.institution.photo_url};
            newInviteCtrl.user.addProfile(profile);
            newInviteCtrl.user.name = getCurrentName();
            AuthService.save();
            var patch = jsonpatch.generate(observer);
            return patch;
        };

        newInviteCtrl.addInstitution =  function addInstitution(event) {
            var patch = newInviteCtrl.saveInstProfile();
            newInviteCtrl.user.addInstitution(newInviteCtrl.institution.key);

            var promise = InviteService.acceptInvite(patch, newInviteCtrl.inviteKey);
                promise.then(function success(userSaved) {
                    newInviteCtrl.user.removeInvite(newInviteCtrl.inviteKey);
                    newInviteCtrl.user.institutions = userSaved.institutions;
                    newInviteCtrl.user.follows = userSaved.follows;
                    newInviteCtrl.user.state = 'active';
                    newInviteCtrl.user.current_institution = newInviteCtrl.institution;
                    AuthService.save();
                    $state.go("app.home");
                    showAlert(event, newInviteCtrl.institution.name);
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                });
            return promise;
        };

        newInviteCtrl.updateStubInstitution =function updateStubInstitution() {
            var dataProfile = {
                sender_name : getCurrentName()
            };
            var promise = InstitutionService.save(dataProfile, institutionKey, newInviteCtrl.inviteKey);
            promise.then(
                function success(institutionSaved){
                    MessageService.showToast('Cadastro de instituição realizado com sucesso');
                    newInviteCtrl.user.removeInvite(newInviteCtrl.inviteKey);
                    newInviteCtrl.user.institutions.push(institutionSaved);
                    newInviteCtrl.user.institutions_admin.push(institutionSaved.key);
                    newInviteCtrl.user.follow(institutionSaved);
                    newInviteCtrl.user.addProfile(createProfile(institutionSaved));
                    newInviteCtrl.user.current_institution = institutionSaved;
                    newInviteCtrl.user.state = 'active';
                    newInviteCtrl.user.name = getCurrentName();
                    AuthService.save();
                    $state.go('app.manage_institution.edit_info', {institutionKey: institutionSaved.key});
                },
                function error(response) {
                    MessageService.showToast(response.data.msg);
            });
            return promise;
        };

        function createProfile(new_institution) {
            return {
                email: null,
                institution_key: new_institution.key,
                institution_name: new_institution.name,
                institution_photo_url: new_institution.photo_url,
                office: 'Administrador',
                phone: null
            };
        }

        newInviteCtrl.isInviteUser = function isInviteUser(){
            return newInviteCtrl.invite && newInviteCtrl.invite.type_of_invite === "USER";
        };

        newInviteCtrl.isUserInfoImcomplete = function isUserInfoImcomplete() {
            var isNewUser = newInviteCtrl.user.name === "";
            return newInviteCtrl.isInviteUser() || isNewUser;
        };

        newInviteCtrl.rejectInvite = function rejectInvite(event){
            var confirm = $mdDialog.confirm();
                confirm
                    .clickOutsideToClose(false)
                    .title('Rejeitar convite')
                    .textContent("Ao rejeitar o convite, seu convite será removido e não poderá ser aceito posteriormente." +
                         " Deseja rejeitar?")
                    .ariaLabel('Rejeitar convite')
                    .targetEvent(event)
                    .ok('Sim')
                    .cancel('Não');
                    var promise = $mdDialog.show(confirm);
                promise.then(function() {
                    deleteInvite();
                }, function() {
                    MessageService.showToast('Cancelado');
                });
                return promise;
        };

        newInviteCtrl.checkUserName = function checkUserName() {
            if(newInviteCtrl.user.name === 'Unknown') {
                newInviteCtrl.user.name = '';
            }
            return _.isEmpty(newInviteCtrl.user.name);
        };

        newInviteCtrl.getFullAddress = function getFullAddress() {
            var instObj = new Institution(newInviteCtrl.institution);
            return instObj.getFullAddress();
        };

        function deleteInvite() {
            var promise = InviteService.deleteInvite(newInviteCtrl.inviteKey);
            promise.then(function success() {
                AuthService.reload().then(function() {
                    if(newInviteCtrl.user.isInactive()) {
                        $state.go("user_inactive");
                    } else {
                        $state.go("app.home");
                    }
                });
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
            return promise;
        }

        function showAlert(event, institutionName) {
             $mdDialog.show(
               $mdDialog.alert()
                 .parent(angular.element(document.querySelector('#popupContainer')))
                 .clickOutsideToClose(true)
                 .title('Bem-vindo')
                 .textContent('Você agora é membro de ' + institutionName)
                 .ariaLabel('Novo membro')
                 .ok('Ok')
                 .targetEvent(event)
             );
        }

        function loadInvite(){
            observer = jsonpatch.observe(newInviteCtrl.user);
            jsonpatch.unobserve(newInviteCtrl.user.current_institution, observer);
            newInviteCtrl.checkUserName();
            InviteService.getInvite(newInviteCtrl.inviteKey).then(function success(response) {
                newInviteCtrl.invite = new Invite(response.data);
                if(newInviteCtrl.invite.status === 'sent') {
                    institutionKey = (newInviteCtrl.invite.type_of_invite === "USER") ? newInviteCtrl.invite.institution_key : newInviteCtrl.invite.stub_institution.key;
                    newInviteCtrl.institution = newInviteCtrl.invite.institution;
                } else {
                    $state.go("app.home");
                    MessageService.showToast("Você já utilizou este convite.");
                }
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
        }

        function isValidProfile() {
            if(!newInviteCtrl.office) {
                MessageService.showToast("Cargo institucional deve ser preenchido.");
                return false;
            }
            return true;
        }

        function getCurrentName() {
            return newInviteCtrl.user_name ? newInviteCtrl.user_name : newInviteCtrl.user.name;
        }

        loadInvite();
   });
})();