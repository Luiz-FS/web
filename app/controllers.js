(function() {
    var app = angular.module('app');

    app.controller("MainController", function MainController($mdSidenav, $state, AuthService) {
        var mainCtrl = this;

        Object.defineProperty(mainCtrl, 'user', {
            get: function() {
                return AuthService.user;
            }
        });

        mainCtrl.toggle = function toggle() {
            $mdSidenav('leftNav').toggle();
        };

        mainCtrl.settings = [{
            name: 'Início',
            stateTo: 'app.home',
            icon: 'home',
            enabled: true
        }, {
            name: 'Nova Instituição',
            stateTo: 'app.institution',
            icon: 'account_balance',
            enabled: true
        }, {
            name: 'Novo Usuário',
            stateTo: 'user.new',
            icon: 'person_add',
            enabled: true
        }, ];

        mainCtrl.goTo = function goTo(state) {
            $state.go(state);
            mainCtrl.toggle();
        };
    });

    app.controller("HomeController", function HomeController(InstitutionService, PostService, $mdDialog, AuthService) {
        var homeCtrl = this;
        homeCtrl.posts = []

        Object.defineProperty(homeCtrl, 'user', {
            get: function() {
                return AuthService.user;
            }
        });

        homeCtrl.createdAt = function(post) {
            if (post) {
                post.created_at = new Date();
            }
        };

        /** TODO 
            Autor: Mayza Nunes 18/05/2016
            Error treatment
        **/
        var loadPosts = function(){
            PostService.get().then(function(response) {
                homeCtrl.posts = response.data;
            });
        };

        /** TODO 
            Autor: Mayza Nunes 18/05/2016
            Error treatment
        **/
        homeCtrl.post = function(post) {
            PostService.post(post)
        };

        loadPosts();
    });

    app.controller("NewInstitutionController", function NewInstitutionController() {
        var newInstCtrl = this;
    });

    app.controller("LoginController", function LoginController(AuthService) {
        var loginCtrl = this;

        loginCtrl.limpar = function limpar() {
            loginCtrl.user = {};
        };

        loginCtrl.login = function login() {
            console.log(url)
        };
    });
})();