"use strict";

(function() {
    var app = angular.module('app');

    app.service("CropImageService", function CropImageService($mdDialog, $q) {
        var service = this;

        service.crop = function crop(image_file, event, areaType) {
            var deferred = $q.defer();

            $mdDialog.show({
                controller: "CropImageController",
                controllerAs: "cropImgCtrl",
                templateUrl: 'app/imageUpload/crop_image.html',
                parent: angular.element(document.body),
                targetEvent: event,
                clickOutsideToClose:true,
                locals: {
                    image_file : image_file,
                    areaType : areaType
                }
            }).then(function success(croppedImage) {
                deferred.resolve(croppedImage);
            }, function error() {
                deferred.reject();
            });

            return deferred.promise;
        };
    });
})();