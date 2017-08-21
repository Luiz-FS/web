'use strict';

(function() {
    var app = angular.module("app");

    app.controller("ConfigProfileController", function ConfigProfileController($state, InstitutionService,
            AuthService, UserService, ImageService, $rootScope, $mdToast, $q, MessageService, $mdDialog) {
        var configProfileCtrl = this;

        // Variable used to observe the changes on the user model.
        var observer;

        configProfileCtrl.newUser = AuthService.getCurrentUser();
        configProfileCtrl.loading = false;

        var HAVE_ONLY_ONE_INSTITUTION_MSG = "Esta é a única instituição ao qual você é vinculado." +
                " Ao remover o vínculo você não poderá mais acessar o sistema," +
                " exceto por meio de novo convite. Deseja remover?";

        var HAVE_MORE_THAN_ONE_INSTITUTION_MSG = "Ao remover o vínculo com esta instituição," +
            " você deixará de ser membro" +
            " e não poderá mais publicar na mesma," +
            " no entanto seus posts existentes serão mantidos. Deseja remover?";

        configProfileCtrl.addImage = function(image) {
            var newSize = 800;

            ImageService.compress(image, newSize).then(function success(data) {
                configProfileCtrl.photo_user = data;
                ImageService.readFile(data, setImage);
                configProfileCtrl.file = null;
            }, function error(error) {
                MessageService.showToast(error);
            });
        };

        function setImage(image) {
            $rootScope.$apply(function() {
                configProfileCtrl.newUser.photo_url = image.src;
            });
        }

        configProfileCtrl.finish = function finish() {
            if (configProfileCtrl.photo_user) {
                configProfileCtrl.loading = true;
                ImageService.saveImage(configProfileCtrl.photo_user).then(function(data) {
                    configProfileCtrl.newUser.photo_url = data.url;
                    configProfileCtrl.newUser.uploaded_images.push(data.url);
                    saveUser();
                    configProfileCtrl.loading = false;
                });
            } else {
                return saveUser();
            }
        };

        function saveUser() {
            var deffered = $q.defer();
            if (configProfileCtrl.newUser.isValid()) {
                var patch = jsonpatch.generate(observer);
                UserService.save(patch).then(function success() {
                    AuthService.reload().then(function success() {
                        $state.go("app.home");
                        deffered.resolve();
                    });
                });
            } else {
                MessageService.showToast("Campos obrigatórios não preenchidos corretamente.");
                deffered.reject();
            }
            return deffered.promise;
        }

        configProfileCtrl.showButton = function() {
            return !configProfileCtrl.loading;
        };

        configProfileCtrl.removeInstitution = function removeInstitution(institution) {
            if (!isAdmin(institution.key)) {
                var confirm = $mdDialog.confirm();
                    confirm
                        .clickOutsideToClose(false)
                        .title('Remover vínculo com ' + institution.name)
                        .textContent(haveMoreThanOneInstitution() ? HAVE_MORE_THAN_ONE_INSTITUTION_MSG : HAVE_ONLY_ONE_INSTITUTION_MSG)
                        .ariaLabel('Remover instituicao')
                        .targetEvent(event)
                        .ok('Sim')
                        .cancel('Não');
                        var promise = $mdDialog.show(confirm);
                    promise.then(function() {
                        deleteInstitution(institution.key);
                    }, function() {
                        MessageService.showToast('Cancelado');
                    });
                    return promise;
            } else {
                MessageService.showToast('Desvínculo não permitido. Você é administrador dessa instituição.');
            }
        };

        function isAdmin(institution_key) {
            return configProfileCtrl.newUser.isAdmin(institution_key);
        }

        function haveMoreThanOneInstitution() {
            return configProfileCtrl.newUser.institutions.length > 1;
        }

        function deleteInstitution(institution_key) {
            var promise = UserService.deleteInstitution(institution_key);
            promise.then(function success() {
                AuthService.logout();
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
            return promise;
        }

        function isAdminOfAnyInstitution() {
            return configProfileCtrl.newUser.institutions_admin.length > 0;
        }

        configProfileCtrl.deleteAccount = function deleteAccount() {
            if (!isAdminOfAnyInstitution()) {
                var confirm = $mdDialog.confirm();
                    confirm
                        .clickOutsideToClose(false)
                        .title('Excluir conta')
                        .textContent('Ao excluir sua conta você não poderá mais acessar o sistema, exceto por meio de novo convite.' +
                                ' Deseja realmente excluir sua conta?')
                        .ariaLabel('Excluir conta')
                        .targetEvent(event)
                        .ok('Sim')
                        .cancel('Não');
                        var promise = $mdDialog.show(confirm);
                    promise.then(function() {
                        configProfileCtrl.newUser.state = 'inactive';
                        deleteUser();
                    }, function() {
                        MessageService.showToast('Cancelado');
                    });
                return promise;
            } else {
                MessageService.showToast('Não é possível excluir sua conta enquanto você for administrador de uma instituição.');
            }
        };

        function deleteUser() {
            var patch = jsonpatch.generate(observer);
            var promise = UserService.save(patch);
            promise.then(function success() {
                AuthService.logout();
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
            return promise;
        }

        (function main() {
            observer = jsonpatch.observe(configProfileCtrl.newUser);

            if (configProfileCtrl.newUser.name === 'Unknown') {
                delete configProfileCtrl.newUser.name;
            }
        })();
    });
})();