"use strict";

(function() {
    var app = angular.module('app');

    app.service("PdfService", function PdfService($q, $firebaseStorage, $http) {
        var service = this;
        var fileFolder = "files/";
        var INDEX_FILE_NAME = 0;
        var INDEX_FILE_TYPE = 1;
        var PDF_TYPE = "application/pdf";
        var MAXIMUM_SIZE = 5242880; // 5Mb in bytes

        service.save = function save(file, currentUrl) {
            var deferred = $q.defer();

            if(!isValidPdf(file)) {
                deferred.reject("O arquivo deve ser um pdf menor que 5 Mb");
                return deferred.promise;
            }

            if(currentUrl) {
                var currentFileRef = firebase.storage().refFromURL(currentUrl);
                currentFileRef.delete().then(function success() {
                }, function error() {
                    return deferred.promise;
                });
            }
            
            var filename = createFileName(file);
            var storageRef = firebase.storage().ref();
            var fileReference = storageRef.child(fileFolder + filename);
            var metadata = { contentType: 'file/pdf' };
            var uploadTask = $firebaseStorage(fileReference).$put(file, metadata);

            uploadTask.$complete(function(snapshot) {
                var data = {
                    url: snapshot.downloadURL
                };
                deferred.resolve(data);
            });

            uploadTask.$error(function(error) {
                deferred.reject(error);
            });

            return deferred.promise;
        };

        function createFileName(file) {
            var fileProperties = file.name.split(".");
            var filename = fileProperties[INDEX_FILE_NAME]  + "-" + (new Date()).getTime() + "." + fileProperties[INDEX_FILE_TYPE];
            return filename;
        }

        service.getReadableURL = function getReadableURL(url, callback, pdf) {
            $http.get(url, {responseType:'arraybuffer'}).then(function success(response) {
                var blob = new Blob([response.data], {type:'application/pdf'});
                var url = URL.createObjectURL(blob);
                callback(url, pdf);
            });
        };

        function isValidPdf(file) {
            if(file) {
                var correctType = file.type === PDF_TYPE;
                var correctSize = file.size <= MAXIMUM_SIZE;
                return correctType && correctSize;
            }
            return false;
        }
    });
})();