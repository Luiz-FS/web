'use strict';
(function () {
    var app = angular.module('app');

    app.controller("EventDetailsController", function EventDetailsController(MessageService, EventService,
        $state, $mdDialog, AuthService, $q) {

        var eventCtrl = this;
        var content = document.getElementById("content");

        var moreEvents = true;
        var actualPage = 0;

        eventCtrl.user = AuthService.getCurrentUser();
        eventCtrl.isLoadingEvents = true;
        eventCtrl.showImage = true;
        
        eventCtrl.share = function share(ev, event) {
            $mdDialog.show({
                controller: "SharePostController",
                controllerAs: "sharePostCtrl",
                templateUrl: 'app/post/share_post_dialog.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    user: eventCtrl.user,
                    posts: [],
                    post: event,
                    addPost: true
                }
            });
        };

        eventCtrl.confirmDeleteEvent = function confirmDeleteEvent(ev, event) {
            var dialog = MessageService.showConfirmationDialog(ev, 'Excluir Evento', 'Este evento será removido.');
            dialog.then(function () {
                deleteEvent(event);
            }, function () {
                MessageService.showToast('Cancelado');
            });
        };

        function deleteEvent(event) {
            let promise = EventService.deleteEvent(event);
            promise.then(function success() {
                MessageService.showToast('Evento removido com sucesso!');
                $state.go('app.user.events');
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
            return promise;
        }

        eventCtrl.recognizeUrl = function recognizeUrl(text) {
            if (text) {
                return Utils.recognizeUrl(text);
            }
        };

        eventCtrl.canChange = function canChange(event) {
            return eventCtrl.isEventAuthor(event) || isInstitutionAdmin(event);
        };

        eventCtrl.canEdit = function canEdit(event) {
            return eventCtrl.isEventAuthor(event);
        };

        eventCtrl.editEvent = function editEvent(ev, event) {
            /* TODO: FIX this function to work in event page
            * @author: Tiago Pereira - 11/01/2018
            */
            $mdDialog.show({
                controller: 'EventDialogController',
                controllerAs: "controller",
                templateUrl: 'app/event/event_dialog.html',
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    event: _.clone(event),
                    isEditing: true
                },
                bindToController: true
            }).then(function success(event){
                (event && event.title && eventCtrl.event !== event) ?  
                    eventCtrl.event = event : null;
                eventCtrl.showImage = hasImage(event);
            })
        };

        function hasImage(event) {
            var emptyPhoto = event && event.photo_url == "";
            var nullPhoto = event && event.photo_url == null;
            return !(emptyPhoto || nullPhoto);
        }

        eventCtrl.isEventAuthor = function isEventAuthor(event) {
            if (event) return Utils.getKeyFromUrl(event.author_key) === eventCtrl.user.key;
        };

        eventCtrl.goToEvent = function goToEvent(event) {
            $state.go('app.user.event', { eventKey: event.key });
        };

        eventCtrl.endInOtherMonth = function endInOtherMonth() {
            if (eventCtrl.event) {
                const startMonth = new Date(eventCtrl.event.start_time).getMonth();
                const endMonth = new Date(eventCtrl.event.end_time).getMonth();
                return startMonth !== endMonth;
            }
        };

        eventCtrl.getVideoUrl = function getVideoUrl(video_url) {
            if (video_url) {
                var params = _.split(video_url, '=');
                var id = params[params.length - 1];
                return 'https://www.youtube.com/embed/' + id;
            }
        };

        eventCtrl.getOfficialSite = function getOfficialSite() {
            if(eventCtrl.event)
                return Utils.limitString(eventCtrl.event.official_site, 80);
        };

        eventCtrl.endInTheSameDay = function endInTheSameDay() {
            if (eventCtrl.event) {
                const startDay = new Date(eventCtrl.event.start_time).getDay();
                const endDay = new Date(eventCtrl.event.end_time).getDay();
                return startDay === endDay && !eventCtrl.endInOtherMonth();
            }
        };

        function isInstitutionAdmin(event) {
            console.log(_.includes(_.map(eventCtrl.user.institutions_admin, Utils.getKeyFromUrl),
            Utils.getKeyFromUrl(event.institution_key)));
            return _.includes(_.map(eventCtrl.user.institutions_admin, Utils.getKeyFromUrl),
                Utils.getKeyFromUrl(event.institution_key));
        }
    });
    
    app.directive("eventDetails", function () {
        return {
            restrict: 'E',
            templateUrl: "app/event/event_details.html",
            controllerAs: "eventDetailsCtrl",
            controller: "EventDetailsController",
            scope: {},
            bindToController: {
                event: '=',
                isEventPage: '=',
            }
        };
    });
})();