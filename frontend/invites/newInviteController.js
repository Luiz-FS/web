'use strict';

(function() {
   var app = angular.module('app');

   app.controller('NewInviteController', function NewInviteController(InstitutionService, AuthService, UserService, InviteService, $mdToast,
    $mdDialog, MessageService, $state) {
        var newInviteCtrl = this;

        newInviteCtrl.institution = null;

        newInviteCtrl.inviteKey = $state.params.key;

        newInviteCtrl.acceptedInvite = false;

        newInviteCtrl.user = AuthService.getCurrentUser();

        newInviteCtrl.phoneRegex = "[0-9]{2}[\\s][0-9]{4,5}[-][0-9]{4,5}";

        newInviteCtrl.loading = true;

        var observer;

        var institutionKey;

        newInviteCtrl.acceptInvite = function acceptInvite(event) {
            newInviteCtrl.acceptedInvite = true;
            if (newInviteCtrl.invite.type_of_invite === "USER") {
                if(isValidProfile()) {
                    if (!userIsAMember()) {
                        newInviteCtrl.addInstitution(event);
                    } else {
                        MessageService.showToast('Você já é membro dessa instituição');
                        newInviteCtrl.deleteInvite();
                    }
                }
            } else {
                newInviteCtrl.goToInstForm();
            }
        };

        newInviteCtrl.saveInstProfile = function configInstProfile() {
            var profile = {phone: newInviteCtrl.phone,
                    branch_line: newInviteCtrl.branch_line,
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

            var promise = InviteService.acceptInvite(patch, newInviteCtrl.inviteKey);
                promise.then(function success(userSaved) {
                    newInviteCtrl.user.removeInvite(newInviteCtrl.inviteKey);
                    newInviteCtrl.user.institutions = userSaved.institutions;
                    newInviteCtrl.user.institution_profiles = userSaved.institution_profiles;
                    newInviteCtrl.user.follows = userSaved.follows;
                    newInviteCtrl.user.state = 'active';
                    newInviteCtrl.user.changeInstitution(newInviteCtrl.institution);
                    AuthService.save();
                    $state.go("app.user.home");
                    _.isEmpty(newInviteCtrl.user.invites) && showAlert(event);
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                });
            return promise;
        };

        newInviteCtrl.goToInstForm =function goToInstForm() {
            $state.go('create_institution_form', {
                senderName: getCurrentName(),
                institutionKey: institutionKey,
                inviteKey: newInviteCtrl.inviteKey
            });
        };

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
                   newInviteCtrl.deleteInvite();
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

        newInviteCtrl.deleteInvite = function deleteInvite() {
            var promise = InviteService.deleteInvite(newInviteCtrl.inviteKey);
            promise.then(function success() {
                newInviteCtrl.user.removeInvite(newInviteCtrl.inviteKey);
                AuthService.save();
                if(newInviteCtrl.user.isInactive()) {
                    $state.go("user_inactive");
                } else {
                    $state.go("app.user.home");
                }
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
            return promise;
        }

        function showAlert(event) {
            $mdDialog.show({
                templateUrl: 'app/invites/welcome_dialog.html',
                controller: function WelcomeController() {
                    var controller = this;
                    controller.next = false;
                    controller.cancel = function() {
                        $mdDialog.cancel();
                    };
                },
                controllerAs: "controller",
                targetEvent: event,
                clickOutsideToClose: false
            });
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
                    $state.go("app.user.home");
                    MessageService.showToast("Você já utilizou este convite.");
                }
                newInviteCtrl.loading = false;
            }, function error(response) {
                MessageService.showToast(response.data.msg);
                newInviteCtrl.loading = true;
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

        function userIsAMember() {
            var userIsMember = false;
            _.each(newInviteCtrl.user.institutions, function (institution) {
                userIsMember = institution.key === newInviteCtrl.institution.key;
            });
            return userIsMember;
        }

        loadInvite();
   });
})();