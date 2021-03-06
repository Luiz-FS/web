"use strict";

(function() {

    var app = angular.module("app");

    app.controller("NotificationController", function NotificationController(NotificationService, 
            AuthService, $state, STATES) {
        var notificationCtrl = this;

        const institutionalNotificationTypes = ['LEFT_INSTITUTION', 'DELETED_INSTITUTION', 
            'TRANSFER_ADM_PERMISSIONS', 'INVITE', 'REMOVE_INSTITUTION_LINK', 
            'REQUEST_INSTITUTION_CHILDREN', 'REQUEST_INSTITUTION_PARENT', 'REQUEST_INSTITUTION', 
            'ACCEPT_INSTITUTION_LINK', 'ACCEPTED_LINK', 'REJECTED_LINK', 
            'REJECT_INSTITUTION_LINK', 'ACCEPT_INVITE_INSTITUTION', 'REJECT_INVITE_INSTITUTION', 
            'ACCEPT_INVITE_HIERARCHY'
        ];

        const ALL_NOTIFICATIONS = 'Todas as notificações';
        const INSTITUTIONAL_NOTIFICATIONS = 'Notificações Institucionais';
        const UNREAD_NOTIFICATIONS = 'Notificações não lidas';
        const ALL_AS_READ = 'Marcar todas como lidas';

        notificationCtrl.user = AuthService.getCurrentUser();

        notificationCtrl.notifications = [];
        notificationCtrl.allNotifications = [];

        notificationCtrl.markAsRead = function markAsRead(notification) {
            return NotificationService.markAsRead(notification);
        };

        notificationCtrl.showNotifications = function showNotifications($mdMenu, $event) {
            const shouldGoToState = notificationCtrl.shouldGoToState || 
                                    notificationCtrl.notifications.length === 0;
            shouldGoToState ? notificationCtrl.seeAll(): $mdMenu.open($event);
        };

        notificationCtrl.clearAll = function clearAll() {
            NotificationService.markAllAsRead();
        };

        notificationCtrl.numberUnreadNotifications = function numberUnreadNotifications() {
            return notificationCtrl.notifications.length < 100 ?
                    notificationCtrl.notifications.length : "+99";
        };

        notificationCtrl.seeAll = function seeAll() {
            $state.go(STATES.NOTIFICATION);
        };

        notificationCtrl.isMobileScreen = (mobileScreenSize) => {
            return Utils.isMobileScreen(mobileScreenSize);
        };

        /**
         * It maps the option selected to the correct function.
         * Each function has an specific behavior that can be
         * intuitively understood by reading the option.
         * @param {string} option
         */
        notificationCtrl.selectNotificationAction = (option) => {
            const optionsMap = {
                [ALL_NOTIFICATIONS]: () => { notificationCtrl.notificationsToShow = notificationCtrl.allNotifications },
                [INSTITUTIONAL_NOTIFICATIONS]: () => { 
                    notificationCtrl.notificationsToShow = notificationCtrl.allNotifications.filter(not => _.includes(institutionalNotificationTypes, not.entity_type))
                },
                [UNREAD_NOTIFICATIONS]: () => { notificationCtrl.notificationsToShow = notificationCtrl.notifications },
                [ALL_AS_READ]: () => { notificationCtrl.clearAll() }
            }

            return optionsMap[option]();
        };

        

        function getMobileToolbarMenuItems() {
            const toolbarMobileMenuItems = [];

            toolbarMobileMenuItems.push({
                options: [ALL_NOTIFICATIONS, INSTITUTIONAL_NOTIFICATIONS, UNREAD_NOTIFICATIONS, ALL_AS_READ],
                action: option => {notificationCtrl.selectNotificationAction(option)},
                title: 'NOTIFICAÇÕES'
            });

            return toolbarMobileMenuItems;
        };

        notificationCtrl.$onInit = () => {
            notificationCtrl.allNotifications = NotificationService.getAllNotifications();
            notificationCtrl.notifications = NotificationService.getUnreadNotifications();
            notificationCtrl.notificationsToShow = notificationCtrl.allNotifications;
            notificationCtrl.toolbarMobileMenuItems = getMobileToolbarMenuItems();
        };
    });
})();