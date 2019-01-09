(function() {
    'use strict';

    var app = angular.module("app");

    app.service("AuthService", function AuthService($q, $state, $window, UserService, 
        MessageService, STATES) {
        var service = this;

        var authObj = firebase.auth();
        var userInfo;
        let tokenLoaded = false;
        service.resolveTokenPromise;
        let loadTokenPromise;
        let refreshInterval;
        const provider = new firebase.auth.GoogleAuthProvider();
        
        /**
         * Function to get token of logged user.
         * If the first token has not yet been loaded, it returns a promise 
         * that will be resolved as soon as the token is loaded. 
         * If the token has already been loaded, it returns the token.
         */
        service.getUserToken = async () => {
            if (!tokenLoaded && !loadTokenPromise) {
                loadTokenPromise = new Promise((resolve) => {
                    service.resolveTokenPromise = resolve;
                });
            } else if (tokenLoaded) {
                return userInfo.accessToken;
            }

            return loadTokenPromise;
        };

        /**
         * Function to get token id of user and update object userInfo
         * @param {firebaseUser} user 
         */
        service._getIdToken = function getIdToken(user) {
            const resolvePromise = token => {
                if (service.resolveTokenPromise) {
                    service.resolveTokenPromise(token);
                    service.resolveTokenPromise = null;
                }

                tokenLoaded = true;
            };

            return user.getIdToken(true).then(function(userToken) {
                if (userInfo) {
                    userInfo.accessToken = userToken;
                    service.save();
                }

                resolvePromise(userToken);
                return userToken;
            }).catch(() => {
                resolvePromise(userInfo.accessToken);
                return userInfo.accessToken;
            });
        }

        authObj.onAuthStateChanged(function(user) {
            const timeToRefresh = 3500000;
            if (user) {
                service._getIdToken(user);
                refreshInterval = setInterval(() => {
                    service._getIdToken(user);
                }, timeToRefresh);
            }
          });

        /**
        * Store listeners to be executed when user logout is called.
        */
        var onLogoutListeners = [];

        var versionAvailable = false;

        Object.defineProperty(service, 'user', {
            get: function() {
                return userInfo;
            }
        });

        // It receives the app version and verify if it matches with
        // the actual frontend version, setting up the private variable
        // versionAvailable with true, if matches, or false, otherwise.
        service.setAppVersion = function setAppVersion(appVersion) {
            if (appVersion) {
                if (appVersion === Config.APP_VERSION) {
                    versionAvailable = false;
                } else {
                    versionAvailable = true;
                } 
            }
        };

        service.newVersionAvailable = function newVersionAvailable() {
            return versionAvailable;
        };

        service.setupUser = function setupUser(idToken, emailVerified) {
            var deferred = $q.defer();
            var firebaseUser = {
                accessToken : idToken,
                emailVerified: emailVerified
            };

            userInfo = firebaseUser;

            UserService.load().then(function success(userLoaded) {
                configUser(userLoaded, firebaseUser);
                deferred.resolve(userInfo);
            }, function error(error) {
                MessageService.showToast(error);
                deferred.reject(error);
            });
            return deferred.promise;
        };

        function login(loginMethodPromisse) {
            return authObj.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function() {
                return loginMethodPromisse.then(function(response) {
                    return response.user;
                });
            }).then(function(user) {
                if (user.emailVerified) {
                    return user.getIdToken(true).then(function(idToken) {
                        return service.setupUser(idToken, user.emailVerified).then(function success(userInfo) {
                            return userInfo;
                        });
                    });
                } else {
                    service.sendEmailVerification(user);
                    throw "Error! Email not verified.";
                }
            });
        }

        service.loginWithGoogle = function loginWithGoogle() {
            return login(authObj.signInWithPopup(provider));
        };

        service.loginWithEmailAndPassword = function loginWithEmailAndPassword(email, password) {
            return login(authObj.signInWithEmailAndPassword(email, password));
        };

        service.logout = function logout() {
            authObj.signOut();
            delete $window.localStorage.userInfo;
            userInfo = undefined;
            clearInterval(refreshInterval);

            executeLogoutListeners();

            $state.go(STATES.SIGNIN);
        };

        service.getCurrentUser = function getCurrentUser() {
            return userInfo;
        };

        service.isLoggedIn = function isLoggedIn() {
            if (userInfo) {
                return true;
            }
            return false;
        };

        service.save = function() {
            $window.localStorage.userInfo = JSON.stringify(userInfo);
        };

        service.$onLogout = function $onLogout(callback) {
            onLogoutListeners.push(callback);
        };

        /**
        * Execute each function stored to be thriggered when user logout
        * is called.
        */
        function executeLogoutListeners() {
            _.each(onLogoutListeners, function(callback) {
                callback();
            });
        }

        function configUser(userLoaded, firebaseUser) {
            userInfo = new User(userLoaded);
            _.extend(userInfo, firebaseUser);
            $window.localStorage.userInfo = JSON.stringify(userInfo);
        }

        function init() {
            if ($window.localStorage.userInfo) {
                var parse = JSON.parse($window.localStorage.userInfo);
                userInfo = new User(parse);
            }
        }

        init();
    });
})();