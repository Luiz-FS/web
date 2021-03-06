"use strict";

(function() {
    var app = angular.module('app');

    app.controller('RequestProcessingController', function RequestProcessingController(AuthService, RequestInvitationService,
        MessageService, InstitutionService, request, updateRequest, $state, $mdDialog, STATES) {
        var requestController = this;

        var REQUEST_INSTITUTION = "REQUEST_INSTITUTION";
        var REQUEST_USER = "REQUEST_USER";
        
        requestController.user = AuthService.getCurrentUser();
        
        requestController.institution = null;
        requestController.parent = null;
        requestController.children = null;
        requestController.isRejecting = false;

        requestController.acceptRequest = function acceptRequest() {
            resolveRequest()
            .then(function success() {
                updateRequest(request, 'accepted');
                requestController.hideDialog();
                MessageService.showInfoToast("Solicitação aceita!");
                refreshUser();
            });
        };

        function refreshUser() {
            AuthService.reload();
        }

        function resolveRequest() {
            switch(request.type_of_invite) {
                case REQUEST_INSTITUTION:
                    return RequestInvitationService.acceptRequestInst(request.key);
                case REQUEST_USER:
                    return RequestInvitationService.acceptRequest(request.key);
            }
        }

        requestController.rejectRequest = function rejectRequest(event){
            const confirm = $mdDialog.confirm()
                .title('Rejeitar Instituição')
                .textContent('Tem certeza que deseja rejeitar?')
                .targetEvent(event)
                .ok('CONFIRMAR')
                .cancel('CANCELAR');

            $mdDialog
                .show(confirm)
                .then(requestController.confirmReject)
                .catch(requestController.cancelReject);
        };

        requestController.confirmReject = function confirmReject() {
            deleteRequest()
            .then(function success() {
                updateRequest(request, 'rejected');
                requestController.hideDialog();
                MessageService.showInfoToast("Solicitação rejeitada!");
            });
        };

        requestController.cancelReject = function cancelReject() {
            $mdDialog.cancel();
            MessageService.showInfoToast('Cancelado');
        };

        function deleteRequest() {
            switch(request.type_of_invite) {
                case REQUEST_INSTITUTION:
                    return RequestInvitationService.rejectRequestInst(request.key);
                case REQUEST_USER:
                    return RequestInvitationService.rejectRequest(request.key);
            }
        }

        requestController.getFullAddress = function getFullAddress(institution) {
            var instObj = new Institution(institution);
            return instObj.getFullAddress();
        };

        requestController.hideDialog = function hideDialog() {
            $mdDialog.hide(request.key);
        };

        requestController.getSizeGtSmDialog = function getSizeGtSmDialog() {
            return request.status === 'sent' && !requestController.isRejecting ? '45' : '25';
        };

        requestController.getChildrenInstName = function getChildrenInstName(size) {
            return requestController.children ? 
              (requestController.children.name || requestController.children.sender_name) : "";
        };

        requestController.getChildrenInstEmail = function getChildrenInstEmail(size) {
            return requestController.children ? 
                (requestController.children.institutional_email) : "";
        };	

        requestController.isAnotherCountry = function isAnotherCountry() {
            return requestController.parent && requestController.parent.address.country !== 'Brasil';
        };

        function loadInstitution() {
            var institutionKey = request.institution_key;
            InstitutionService.getInstitution(institutionKey).then(function success(response) {
                requestController.institution = response;
                formatPositions();
                getLegalNature();
                getActuationArea();
            });
        }

        function formatPositions() {
            switch(request.type_of_invite) {
                case REQUEST_INSTITUTION:
                    requestController.parent = requestController.institution;
                    break;
                case REQUEST_USER:
                    requestController.parent = requestController.institution;
                    requestController.children = request;
            }
        }

        requestController.goToInstitution = function goToInstitution(institutionKey) {
            window.open(makeUrl(institutionKey), '_blank');
        };

        requestController.confirmLinkRemoval = function confirmLinkRemoval() {
            const isParent = true;
            const institutionKey = requestController.children.key;
            const institutionLinkKey = requestController.children.parent_institution.key;

            InstitutionService.removeLink(institutionKey, institutionLinkKey, isParent).then(function success() {
                MessageService.showInfoToast('Vínculo removido.');
                delete requestController.children.parent_institution;
            });
        };

        requestController.isRequestUser = function isRequestUser() {
            return request.type_of_invite == REQUEST_USER;
        };

        function makeUrl(institutionKey){
            var currentUrl = window.location.href;
            currentUrl = currentUrl.split('#');
            return currentUrl[0] + $state.href(STATES.INST_TIMELINE, {institutionKey: institutionKey});
        }

        function getLegalNature() {
            InstitutionService.getLegalNatures().then(function success(response) {
                requestController.instLegalNature = _.get(response,
                    requestController.parent.legal_nature);
            });
        }

        function getActuationArea() {
            InstitutionService.getActuationAreas().then(function success(response) {
                requestController.instActuationArea = _.get(response,
                    requestController.parent.actuation_area);
            });
        }

        requestController.showProperty = prop => Utils.showProperty(prop);

        (function main () {
            if(request.status == 'sent') loadInstitution();
        })();
    });
})();
