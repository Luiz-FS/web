'use strict';

(function() {
    var app = angular.module("app");

    app.service("UserService", function UserService($http, $q) {
        var service = this;

        var USER_URI = "/api/user";

        service.addInstitution = function addInstitution(user, institutionKey) {
            var deffered = $q.defer();
            console.log(institutionKey);
            user.addInstitution(institutionKey);
            $http.put(USER_URI, user).then(function success(info) {
                deffered.resolve(info.data);
            }, function error(data) {
                deffered.reject(data);
            });
            return deffered.promise;
        };

        service.save = function save(user, newUser) {
            var deffered = $q.defer();
            var patch = jsonpatch.compare(user, newUser);
            $http.patch(USER_URI, patch).then(function success(info) {
                deffered.resolve(info.data);
            }, function error(data) {
                deffered.reject(data);
            });
            return deffered.promise;
        };
    });
})();