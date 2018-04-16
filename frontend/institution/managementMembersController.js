'use strict';
(function() {
    var app = angular.module('app');

    app.controller("ManagementMembersController", function InviteUserController(
        InviteService, $mdToast, $state, $mdDialog, InstitutionService, AuthService, MessageService,
        RequestInvitationService, ProfileService) {
        var manageMemberCtrl = this;
        var MAX_EMAILS_QUANTITY = 10;

        /** 
         * This number to equal 5Mb in bytes
         * that mean the limit size of CSV file accepted
        */
        var MAXIMUM_CSV_SIZE = 5242880;

        manageMemberCtrl.institution = {};
        manageMemberCtrl.invite = {};
        manageMemberCtrl.sent_invitations = [];
        manageMemberCtrl.sentInvitationsAdm = [];
        manageMemberCtrl.currentMember = "";
        manageMemberCtrl.members = [];

        manageMemberCtrl.showSendInvite = true;
        manageMemberCtrl.transferButtonColor = 'teal-500';
        manageMemberCtrl.isLoadingMembers = true;
        manageMemberCtrl.isLoadingInvite = false;
        manageMemberCtrl.showInvites = false;
        manageMemberCtrl.showRequests = false;
        manageMemberCtrl.showMembers = false;
        manageMemberCtrl.showAdministrator = false;
        manageMemberCtrl.requests = [];
        var empty_email = {email: ''};
        manageMemberCtrl.emails = [_.clone(empty_email)];

        var currentInstitutionKey = $state.params.institutionKey;
        var invite;

        manageMemberCtrl.user = AuthService.getCurrentUser();

        manageMemberCtrl.openRemoveMemberDialog = function openRemoveMemberDialog(ev, member_obj) {
             $mdDialog.show({
                templateUrl: 'app/institution/removeMemberDialog.html',
                controller: RemoveMemberController,
                controllerAs: "removeMemberCtrl",
                locals: {
                    member_obj: member_obj,
                },
                targetEvent: ev,
                clickOutsideToClose: true
            });
        };

        manageMemberCtrl.openTransferAdminDialog = function openTransferAdminDialog(ev) {
            $mdDialog.show({
                templateUrl: 'app/institution/transfer_admin_dialog.html',
                controller: 'TransferAdminController',
                controllerAs: 'transferAdminCtrl',
                locals: {
                    institution_members: manageMemberCtrl.members,
                    institution: manageMemberCtrl.institution
                },
                targetEvent: ev,
                clickOutsideToClose: true
            }).then(function success(response) {
                manageMemberCtrl.sentInvitationsAdm.push(response);
            }, function error() {});
        };

        manageMemberCtrl.openAcceptRequestDialog = function openAcceptRequestDialog(requestKey) {
            $mdDialog.show({
                controller: "RequestProcessingController",
                controllerAs: "requestCtrl",
                templateUrl: "app/requests/request_processing.html" ,
                parent: angular.element(document.body),
                targetEvent: event,
                clickOutsideToClose:true,
                locals: {key: requestKey},
                openFrom: '#fab-new-post',
                closeTo: angular.element(document.querySelector('#fab-new-post'))
            });
        };

        manageMemberCtrl.removeMember = function removeMember(member_obj) {
            _.remove(manageMemberCtrl.members, function(member) {
                return member.key === member_obj.key;
            });
            MessageService.showToast("Membro removido com sucesso.");
        };

        manageMemberCtrl.showUserProfile = function showUserProfile(userKey, ev) {
            ProfileService.showProfile(userKey, ev);
        };

        manageMemberCtrl.sendUserInvite = function sendInvite(loadedEmails) {
            manageMemberCtrl.invite.institution_key = currentInstitutionKey;
            manageMemberCtrl.invite.admin_key = manageMemberCtrl.user.key;
            manageMemberCtrl.invite.type_of_invite = 'USER';
            manageMemberCtrl.invite.sender_name = manageMemberCtrl.user.name;
            invite = new Invite(manageMemberCtrl.invite);

            var emails = getEmails(loadedEmails);
            var requestBody = {
                invite_body: invite,
                emails: emails
            }
            
            if (manageMemberCtrl.isValidAllEmails() && manageMemberCtrl.isUserInviteValid(invite)) {
                manageMemberCtrl.isLoadingInvite = true;
                var promise = InviteService.sendInvite(requestBody);
                promise.then(function success(response) {
                    refreshSentInvitations(requestBody.emails, response.data.invites);
                    manageMemberCtrl.clearInvite(); 
                    manageMemberCtrl.showInvites = true; 
                    manageMemberCtrl.showSendInvite = false;
                    manageMemberCtrl.isLoadingInvite = false;
                    MessageService.showToast(response.data.msg);
                }, function error(response) {
                    manageMemberCtrl.isLoadingInvite = false;
                    MessageService.showToast(response.data.msg);
                });
                return promise;
            }
        };

        function refreshSentInvitations(emails, invites) {
            var inviteToAdd = new Invite(manageMemberCtrl.invite);
            _.each(emails, function(email) {
                inviteToAdd.invitee = email;
                inviteToAdd.key = invites.reduce((acum, invite) => (invite.email === email) ? invite.key : acum, "");
                manageMemberCtrl.sent_invitations.push(_.clone(inviteToAdd));
            });
        }

        manageMemberCtrl.clearInvite = function clearInvite() {
            manageMemberCtrl.emails = [_.clone(empty_email)];
            manageMemberCtrl.invite = {};
        };

        manageMemberCtrl.isAdmin = function isAdmin(member) {
            return member.key === manageMemberCtrl.user.key;
        };

        manageMemberCtrl.hasRequested = function hasRequested() {
            return _.find(manageMemberCtrl.requests, request => request.status === 'sent');
        };

        function loadInstitution() {
            InstitutionService.getInstitution(currentInstitutionKey).then(function success(response) {
                manageMemberCtrl.institution = response.data;
                getMembers();
                getSentInvitations(response.data.sent_invitations);
                getRequests();
            }, function error(response) {
                $state.go('app.institution.timeline', {institutionKey: currentInstitutionKey});
                MessageService.showToast(response.data.msg);
            });
        }

        function getSentInvitations(invitations) {
            var isUserInvitation = createRequestSelector('sent', 'USER');
            manageMemberCtrl.sent_invitations = invitations.filter(isUserInvitation);
            manageMemberCtrl.sentInvitationsAdm = invitations.filter(invite => invite.type_of_invite === 'INVITE_USER_ADM');
        }

        function getMembers() {
            InstitutionService.getMembers(currentInstitutionKey).then(function success(response) {
                manageMemberCtrl.members = response.data;
                getAdmin();
                manageMemberCtrl.isLoadingMembers = false;
            }, function error(response) {
                manageMemberCtrl.isLoadingMembers = true;
                MessageService.showToast(response.data.msg);
            });
        }

        function getRequests() {
            RequestInvitationService.getRequests(currentInstitutionKey).then(function success(response) {
                var isUserRequest = createRequestSelector('sent', 'REQUEST_USER');
                manageMemberCtrl.requests = response.filter(isUserRequest);
            });
        }

        function getAdmin() {
            manageMemberCtrl.institution.admin = _.find(manageMemberCtrl.members, 
                function(member){
                    return member.key === manageMemberCtrl.institution.admin.key;
            });
        }

        function getEmail(user) {
            return user.email;
        }

        function getMember(inviteEmails) {
            var memberEmail;
            _.each(inviteEmails, function (email) {
                memberEmail = _.find(_.map(manageMemberCtrl.members, getEmail), function (emails) {
                    return _.includes(emails, email);
                });
            });
            return memberEmail;
        }

        function getInvitedEmail(inviteEmails) {
            var inviteSent;
            _.each(inviteEmails, function (email) {
                inviteSent = _.find(manageMemberCtrl.sent_invitations, function (sentInvitation) {
                    return sentInvitation.invitee === email;
                });
            });
            return inviteSent ? inviteSent.invitee : inviteSent;
        }

        manageMemberCtrl.toggleElement = function toggleElement(flagName) {
            manageMemberCtrl[flagName] = !manageMemberCtrl[flagName];
        };

        manageMemberCtrl.isUserInviteValid = function isUserInviteValid(invite) {
            var isValid = true;
            if (! invite.isValid()) {
                isValid = false;
                MessageService.showToast('Convite inválido!');
            }
            return isValid;
        };

        manageMemberCtrl.resendInvite = function resendInvite(inviteKey, event) {
            var confirm = $mdDialog.confirm({ onComplete: designOptions });
            confirm
                .clickOutsideToClose(false)
                .title('Reenviar convite')
                .textContent('Você deseja reenviar o convite?')
                .ariaLabel('Reenviar convite')
                .targetEvent(event)
                .ok('Reenviar convite')
                .cancel('Cancelar');
            var promise = $mdDialog.show(confirm);
            promise.then(function () {
                InviteService.resendInvite(inviteKey).then(function success() {
                    MessageService.showToast("Convite reenviado com sucesso.");
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                });
            }, function () {
                MessageService.showToast('Cancelado.');
            });
            return promise;
        };

        manageMemberCtrl.changeEmail = function changeEmail(field) {
            (field.email === empty_email.email) ? removeField(field) : addField();
        };

        manageMemberCtrl.removePendingAndMembersEmails = function removePendingAndMembersEmails(emails) {
            var requestedEmails = manageMemberCtrl.requests
                .map(request => {
                    return request.institutional_email;
                });

            var invitedEmails = manageMemberCtrl.sent_invitations
                .map(invite => {
                    return invite.invitee;
                });

            var membersEmails = manageMemberCtrl.members.reduce((emails, member) => [...emails, ...member.email], []);

            var emailsNotMembersAndNotInvited = emails.filter(email =>
                    !invitedEmails.includes(email) && !membersEmails.includes(email) 
                        && !requestedEmails.includes(email));

            return _.uniq(emailsNotMembersAndNotInvited);
        }

        manageMemberCtrl.isValidAllEmails = function isValidAllEmails() {
            var emails = manageMemberCtrl.emails.map(email => email.email);
            var correctArray = manageMemberCtrl.removePendingAndMembersEmails(emails);

            if(!_.isEqual(correctArray, emails)){
                MessageService.showToast("E-mails selecionados já foram convidados, " +
                                "requisitaram ser membro ou pertencem a algum" +
                                " membro da instituição.");
                return false;
            }
            return true;
        }

        function selectEmailsDialog(emails, ev) {
            $mdDialog.show({
                templateUrl: 'app/institution/select_emails.html',
                controller: "SelectEmailsController",
                controllerAs: "selectEmailsCtrl",
                locals: {
                    emails: _.uniq(emails),
                    manageMemberCtrl: manageMemberCtrl
                },
                bindToController: true,
                targetEvent: ev,
                clickOutsideToClose: true
            });
        }

        manageMemberCtrl.addCSV = function addCSV(files, ev) {
            var file = files[0];
            if(file && (file.size > MAXIMUM_CSV_SIZE)) {
                MessageService.showToast('O arquivo deve ser um CSV menor que 5 Mb');
            } else {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var emails = e.target.result.split('\n');
                    emails = emails.filter(email => email !== "");
                    selectEmailsDialog(emails, ev);
                }
                file && reader.readAsText(file);
            }
        };

        manageMemberCtrl.getMemberPhotoUrl = function getMemberPhotoUrl(key) {
            let member = getMemberByKey(key);
            return member.photo_url || '/app/images/avatar.png';
        };

        manageMemberCtrl.getMemberName = function getMembeName(key) {
            let member = getMemberByKey(key);
            return member.name || 'Nome do Membro';
        };

        manageMemberCtrl.disableTransferAdminButton = function disableTransferAdminButton() {
            let alreadySended = manageMemberCtrl.sentInvitationsAdm.reduce(
                (found, invite) => (invite.status === 'sent') ? true : found, 
                false
            );
            manageMemberCtrl.transferButtonColor =  (alreadySended) ? 'grey-300' : 'teal-500';
            return alreadySended;
        };

        function getMemberByKey(key) {
            return manageMemberCtrl.members.reduce((foundMember, member) => (member.key === key) ? member : foundMember, {});
        }

        function addField() {
            var isValidSize = _.size(manageMemberCtrl.emails) < MAX_EMAILS_QUANTITY;
            var hasEmptyField = _.find(manageMemberCtrl.emails, empty_email);
            (isValidSize && !hasEmptyField) ? manageMemberCtrl.emails.push(_.clone(empty_email)) : null;
        }

        function removeField(field) {
            manageMemberCtrl.emails.length === 1 ? null : 
                _.remove(manageMemberCtrl.emails, function(element) {
                    return element === field;
                });
        };

        function getEmails(loadedEmails) {
            if(loadedEmails && loadedEmails.length > 0) return loadedEmails;
            var emails = [];
            _.each(manageMemberCtrl.emails, function (email) {
                if (!_.isEmpty(email.email)) {
                    emails.push(email.email);
                }
            });
            return emails;
        }

        function designOptions() {
            var $dialog = angular.element(document.querySelector('md-dialog'));
            var $actionsSection = $dialog.find('md-dialog-actions');
            var $cancelButton = $actionsSection.children()[0];
            var $confirmButton = $actionsSection.children()[1];
            angular.element($confirmButton).removeClass('md-primary');
            angular.element($cancelButton).removeClass('md-primary');
            angular.element($confirmButton).addClass('green-button-text');
            angular.element($cancelButton).addClass('green-button-text');
        }

        function createRequestSelector(status, type_of_invite) {
            return function(request) {
                return request.status === status && request.type_of_invite === type_of_invite;
            }
        }

        function RemoveMemberController(member_obj) {
            var removeMemberCtrl = this;
            
            removeMemberCtrl.justification = "";
            removeMemberCtrl.member = member_obj;

            removeMemberCtrl.removeMember = function removeMember() {
                InstitutionService.removeMember(currentInstitutionKey, member_obj, removeMemberCtrl.justification).then(function success() {
                    manageMemberCtrl.removeMember(member_obj);
                    $mdDialog.cancel();
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                });
            };
            
            removeMemberCtrl.cancel = function cancel() {
                $mdDialog.cancel();
            };
        }
        
        loadInstitution();
    });

    app.controller("SelectEmailsController", function SelectEmailsController($mdDialog, AuthService, MessageService) {
        var selectEmailsCtrl = this;

        selectEmailsCtrl.user = AuthService.getCurrentUser();
        selectEmailsCtrl.selectedEmails = [];

        var INVALID_INDEX = -1;
        var MAX_EMAILS_QUANTITY = 50;

        selectEmailsCtrl.select = function select(email) {
            var index = selectEmailsCtrl.selectedEmails.indexOf(email);
            var emailExists = index > INVALID_INDEX;
            if(emailExists) {
                selectEmailsCtrl.selectedEmails.splice(index, 1);
            } else if (!selectEmailsCtrl.validateEmail(email)){
                MessageService.showToast("Não é possível selecionar esta opção. E-mail inválido.");
            } else {
                selectEmailsCtrl.selectedEmails.push(email);
            }
        };

        selectEmailsCtrl.exists = function exists(email) {
            return selectEmailsCtrl.selectedEmails.indexOf(email) !== -1;
        };

        selectEmailsCtrl.selectAllEmails = function selectAllEmails() {
            var filteredEmails = selectEmailsCtrl.emails.filter(email => selectEmailsCtrl.validateEmail(email));
            if(selectEmailsCtrl.emails && selectEmailsCtrl.selectedEmails.length === filteredEmails.length) {
                selectEmailsCtrl.selectedEmails = [];
            } else if(filteredEmails && selectEmailsCtrl.selectedEmails.length >= 0) {
                selectEmailsCtrl.selectedEmails = filteredEmails.slice(0);
            }
        };

        selectEmailsCtrl.isChecked = function isChecked() {
            if(selectEmailsCtrl.emails) {
                var filteredEmails = selectEmailsCtrl.emails.filter(email => selectEmailsCtrl.validateEmail(email));
                return selectEmailsCtrl.selectedEmails.length === filteredEmails.length;
            }
        };

        selectEmailsCtrl.closeDialog = function closeDialog() {
            $mdDialog.cancel();
        };

        selectEmailsCtrl.sendInvite = function sendInvite() {
            if(!_.isEmpty(selectEmailsCtrl.selectedEmails) && _.size(selectEmailsCtrl.selectedEmails) <= MAX_EMAILS_QUANTITY) {
                var emails = selectEmailsCtrl.manageMemberCtrl.removePendingAndMembersEmails(selectEmailsCtrl.selectedEmails)
                if(!_.isEmpty(emails)) {
                    selectEmailsCtrl.manageMemberCtrl.sendUserInvite(emails);
                } else {
                    MessageService.showToast("E-mails selecionados já foram convidados, requisitaram ser membro ou pertencem a algum membro da instituição.");
                }
                selectEmailsCtrl.closeDialog();
            } else if(selectEmailsCtrl.selectedEmails > MAX_EMAILS_QUANTITY) {
                MessageService.showToast("Limite máximo de " + MAX_EMAILS_QUANTITY + " e-mails selecionados excedido.");
            } else {
                MessageService.showToast("Pelo menos um e-mail deve ser selecionado.");
            }
        };

        selectEmailsCtrl.validateEmail = function validateEmail(email) {
            return Utils.validateEmail(email);
        }
    });

    app.controller('TransferAdminController', function(institution_members, institution, InviteService, MessageService, $mdDialog) {
        var transferAdminCtrl = this;
        transferAdminCtrl.institution_members = institution_members;
        transferAdminCtrl.member = null;
        transferAdminCtrl.selectedMember = null;

        transferAdminCtrl.searchMember = function searchMember(member) {
            if (transferAdminCtrl.member) {
                var foundMemberByEmail = _.find(member.email, function(email) {
                    return email.includes(transferAdminCtrl.member);
                });

                return foundMemberByEmail || member.name.includes(transferAdminCtrl.member);
            }
            return false;
        };

        transferAdminCtrl.selectMember = function selectMember(member) {
            transferAdminCtrl.selectedMember = member;
            transferAdminCtrl.member = member.email[0];
        };

        transferAdminCtrl.cancel = function cancel() {
            $mdDialog.cancel();
        };

        transferAdminCtrl.confirm = function confirm() {
            if (transferAdminCtrl.selectedMember) {
                if (transferAdminCtrl.selectedMember.key !== institution.admin.key) {
                    let data = {
                        institution_key: institution.key,
                        admin_key: institution.admin.key,
                        type_of_invite: 'USER_ADM',
                        sender_name: institution.admin.name,
                        invitee_key: transferAdminCtrl.selectedMember.key,
                        invitee: transferAdminCtrl.selectedMember.email[0]
                    };

                    let invite = new Invite(data);

                    InviteService.sendInviteUserAdm(invite).then(function success(response) {
                        invite.status = 'sent';
                        $mdDialog.hide(invite);
                        MessageService.showToast("Convite enviado com sucesso!");
                    }, function error(response) {
                        MessageService.showToast(response.data);
                    });
                } else {
                    MessageService.showToast('Você já é administrador da instituição, selecione outro membro!');
                }
            } else {
                MessageService.showToast('Selecione um memebro!');
            }
        };
    });
})();