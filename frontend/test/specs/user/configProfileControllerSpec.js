'use strict';

(describe('Test ConfigProfileController', function() {
    let configCtrl, q, scope, userService, createCrtl,
    authService, imageService, mdDialog, cropImageService, messageService,
    stateParams, observerRecorderService, pushNotificationService;

    let institution, other_institution, user, newUser, authUser;

    const setUpModels = () => {
        institution = {
            name: 'institution',
            key: '987654321'
        };
    
        other_institution = {
            name: 'other_institution',
            key: '3279847298'
        };
    
        user = new User({
            name: 'User',
            cpf: '121.445.044-07',
            email: 'teste@gmail.com',
            current_institution: institution,
            institutions: [institution],
            uploaded_images: [],
            institutions_admin: [],
            state: 'active'
        });
    
        newUser = new User({
            ...user,
            name: 'newUser'
        });
    };

    const fakeCallback = response => {
        return () => {
            return {
                then: (callback) => {
                    return callback(response);
                }
            };
        }
    }

    beforeEach(module('app'));

    beforeEach(inject(function($controller, $q, $rootScope, $mdDialog, UserService, 
        AuthService, ImageService, CropImageService, MessageService, $stateParams, ObserverRecorderService, PushNotificationService) {

        q = $q;
        scope = $rootScope.$new();
        imageService = ImageService;
        mdDialog = $mdDialog;
        userService = UserService;
        cropImageService = CropImageService;
        messageService = MessageService;
        authService = AuthService;
        stateParams = $stateParams;
        observerRecorderService = ObserverRecorderService;
        pushNotificationService = PushNotificationService;
        
        createCrtl = function() {
            return $controller('ConfigProfileController', {
                scope: scope,
                authService: authService,
                userService: userService,
                imageService: imageService,
                cropImageService : cropImageService,
                messageService: messageService
            });
        };
        
        setUpModels();
        authService.login(user);
        configCtrl = createCrtl();
        configCtrl.$onInit();
    }));

    describe('onInit()', () => {
        it('should call _setupUser', () => {
            spyOn(configCtrl, '_setupUser');
            configCtrl.$onInit();
            expect(configCtrl._setupUser).toHaveBeenCalled();
        });

        it('should set configProfileCtrl.pushNotification according to PushNotificationService.isPushNotificationActive', () => {
            spyOn(pushNotificationService, 'isPushNotificationActive').and.callFake(()=> q.when(true));
            configCtrl.$onInit();
            scope.$apply();
            expect(configCtrl.pushNotification).toBe(true);
            expect(pushNotificationService.isPushNotificationActive).toHaveBeenCalled();

            pushNotificationService.isPushNotificationActive.and.callFake(()=> q.when(false));
            configCtrl.$onInit();
            scope.$apply();
            expect(configCtrl.pushNotification).toBe(false);
            expect(pushNotificationService.isPushNotificationActive).toHaveBeenCalled();
        });
    });

    describe('_setupUser()', function() {

        it("should set user object and observer when the user can edit", function() {
            spyOn(configCtrl, 'canEdit').and.returnValue(true);
            spyOn(observerRecorderService, 'register');
            spyOn(configCtrl, '_checkUserName');
            authUser = authService.getCurrentUser();

            configCtrl._setupUser();
            
            expect(configCtrl.user).toEqual(authUser);
            expect(configCtrl.newUser).toEqual(configCtrl.user);
            expect(observerRecorderService.register).toHaveBeenCalledWith(authUser);
            expect(configCtrl._checkUserName).toHaveBeenCalled();
        });

        it("should get the user via when the user can not edit", function() {
            spyOn(configCtrl, 'canEdit').and.returnValue(false);
            spyOn(userService, 'getUser').and.callFake(fakeCallback(user));
            stateParams.userKey = "user-key";

            configCtrl._setupUser();
            
            expect(userService.getUser).toHaveBeenCalledWith(stateParams.userKey);
            expect(configCtrl.user).toEqual(user);
        });
    });

    describe('_checkUserName()', () => {

        it("should not delete user and newUser name prop when it is not 'UnKnown'", () => {
            configCtrl.user = user;
            configCtrl.newUser = newUser;
            configCtrl._checkUserName();
            expect(configCtrl.user.name).toBe(user.name);
            expect(configCtrl.newUser.name).toBe(newUser.name);
        });

        it("should set the user and newUser name to an empty string when it is 'UnKnown'", () => {
            configCtrl.user = {...user, name:'Unknown'};
            configCtrl.newUser = {...configCtrl.user};
            configCtrl._checkUserName();
            expect(configCtrl.user.name).toBe("");
            expect(configCtrl.newUser.name).toBe("");
        });
    });

    describe('canEdit', () => {
        it(`should be true when the loggend user is accessing
            its on profile page`, () => {
            user.key = "user-key";
            authService.getCurrentUser = () => user;
            stateParams.userKey = user.key;
            expect(configCtrl.canEdit()).toBe(true);
        });

        it(`should be false when the loggend user is accessing
            the profile page of another user`, () => {
            user.key = "user-key";
            authService.getCurrentUser = () => user;
            stateParams.userKey = "other-user-key";
            expect(configCtrl.canEdit()).toBe(false);
        });
    });

    describe('addImage()', function() {

        it('Should set a new image to the user', function() {
            const imageInput = createImage(100);
            const imageOutput = createImage(800);
            spyOn(imageService, 'compress').and.returnValue(q.when(imageOutput));
            spyOn(imageService, 'readFile');
            configCtrl.addImage(imageInput);
            scope.$apply();
            expect(imageService.compress).toHaveBeenCalledWith(imageInput, 800);
            expect(configCtrl.photo_user).toBe(imageOutput);
            expect(imageService.readFile).toHaveBeenCalled();
            expect(configCtrl.file).toBe(null);
        });
    });

    describe('cropImage()', function() {
        beforeEach(function() {
            const image = createImage(100);
            spyOn(cropImageService, 'crop').and.callFake(fakeCallback("Image"));
            spyOn(imageService, 'compress').and.callFake(fakeCallback(image));
            spyOn(imageService, 'readFile').and.callFake(function() {
                configCtrl.newUser.photo_url = "Base64 data of photo";
            });
        });

        it('should crop image in config user', function() {
            spyOn(configCtrl, 'addImage');
            const image = createImage(100);
            configCtrl.cropImage(image);
            expect(cropImageService.crop).toHaveBeenCalled();
            expect(configCtrl.addImage).toHaveBeenCalled();
        });
    });

    describe('finish()', function(){

        it('Should call _saveImage and _saveUser', function() {
            spyOn(configCtrl, '_saveImage').and.returnValue(q.when());
            spyOn(configCtrl, '_saveUser').and.returnValue(q.when());
            configCtrl.loadingSubmission = true;
            
            configCtrl.finish();
            scope.$apply();
            
            expect(configCtrl._saveImage).toHaveBeenCalled();
            expect(configCtrl._saveUser).toHaveBeenCalled();
            expect(configCtrl.loadingSubmission).toBe(false);
        });
    });

    describe('_saveImage', () => {
        
        it('should save the image if there is a new one', () => {
            const userImage = createImage(50);
            const data = {url: 'img-url'};
            configCtrl.photo_user = userImage;
            expect(configCtrl.user.photo_url).toBeUndefined();
            spyOn(imageService, 'saveImage').and.returnValue(q.when(data));
            spyOn(configCtrl.user.uploaded_images, 'push');

            configCtrl._saveImage();
            scope.$apply();

            expect(imageService.saveImage).toHaveBeenCalledWith(configCtrl.photo_user);
            expect(configCtrl.user.photo_url).toBe(data.url);
            expect(configCtrl.user.uploaded_images.push).toHaveBeenCalledWith(data.url);
        });

        it('should do nothing when there is no image to save', () => {
            configCtrl.photo_user = undefined;
            spyOn(imageService, 'saveImage');
            configCtrl._saveImage();
            expect(imageService.saveImage).not.toHaveBeenCalled();
        });
    });

    describe('_saveUser()', () => {

        it('should save the user and show a message', () => {
            const patch = {name: 'newName'};
            spyOn(configCtrl.newUser, 'isValid').and.returnValue(true);
            spyOn(observerRecorderService, 'generate').and.returnValue(patch);
            spyOn(userService, 'save').and.returnValue(q.when());
            spyOn(authService, 'save');
            spyOn(messageService, 'showInfoToast');

            configCtrl._saveUser();
            scope.$apply();
            
            expect(observerRecorderService.generate).toHaveBeenCalled();
            expect(userService.save).toHaveBeenCalledWith(patch);
            expect(authService.save).toHaveBeenCalledWith();
            expect(messageService.showInfoToast).toHaveBeenCalledWith("Edição concluída com sucesso");
        });

        it("Should show a message when the user is invalid", function(){
            spyOn(messageService, 'showErrorToast');
            spyOn(configCtrl, '_saveImage').and.returnValue(Promise.resolve());
            spyOn(configCtrl.newUser, 'isValid').and.returnValue(false);
            configCtrl._saveUser().should.be.resolved;
            expect(messageService.showErrorToast).toHaveBeenCalledWith("Campos obrigatórios não preenchidos corretamente.");
        });
    });

    describe('deleteAccount()', function() {

        let promise;

        beforeEach(function() {
            spyOn(mdDialog, 'show').and.callFake(fakeCallback());
            spyOn(userService, 'deleteAccount').and.callFake(fakeCallback());
            spyOn(authService, 'logout').and.callFake(fakeCallback());
            promise = configCtrl.deleteAccount();
        });

        it('Should call mdDialog.show()', function(done) {
            promise.then(function() {
                expect(mdDialog.show).toHaveBeenCalled();
                done();
            });
        });

        it('Should call userService.deleteAccount()', function(done) {
            promise.then(function() {
                expect(userService.deleteAccount).toHaveBeenCalled();
                done();
            });
        });

        it('Should call authService.logout()', function(done) {
            promise.then(function() {
                expect(authService.logout).toHaveBeenCalled();
                done();
            });
        });
    });

    describe('editProfile', function() {
        it('should call mdDialog.show', function() {
            spyOn(mdDialog, 'show');
            configCtrl.editProfile(institution, '$event');
            expect(mdDialog.show).toHaveBeenCalled();
        });
    });

    describe('goBack()', () => {
        it('should call the window back function', () => {
            spyOn(window.history, 'back');
            configCtrl.goBack();
            expect(window.history.back).toHaveBeenCalled();
        });
    });

    describe('pushChange', () => {
        beforeEach( function () {
            spyOn(configCtrl,'_subscribeUser');
            spyOn(configCtrl,'_unsubscribeUser');
        });

        it('should call subscribeUser user if configProfileCtrl.pushNotification is true', () => {
            configCtrl.pushNotification = true;
            configCtrl.pushChange();
            expect(configCtrl._subscribeUser).toHaveBeenCalled();
            expect(configCtrl._unsubscribeUser).not.toHaveBeenCalled();
        });

        it('should call unsubscribeUser user if configProfileCtrl.pushNotification is false', () => {
            configCtrl.pushNotification = false;
            configCtrl.pushChange();
            expect(configCtrl._subscribeUser).not.toHaveBeenCalled();
            expect(configCtrl._unsubscribeUser).toHaveBeenCalled()
        })
    });

    describe('_unsubscribeUser', () => {
        beforeEach( function () {
            spyOn(configCtrl,'_openDialog').and.callFake(() => q.when());
            spyOn(pushNotificationService, 'unsubscribeUserNotification');
            configCtrl.pushNotification = false;
        });

        it('should call PushNotificationService.unsubscribeUserNotification() if user confirm dialog', () => {
            configCtrl._unsubscribeUser();
            scope.$apply();
            expect(configCtrl._openDialog).toHaveBeenCalled();
            expect(pushNotificationService.unsubscribeUserNotification).toHaveBeenCalled();
            expect(configCtrl.pushNotification).toBe(false);
        });

        it('should set configProfileCtrl.pushNotification to true if user cancel dialog', () => {
            configCtrl._openDialog.and.callFake(() => q.reject());
            configCtrl._unsubscribeUser();
            scope.$apply();
            expect(configCtrl._openDialog).toHaveBeenCalled();
            expect(pushNotificationService.unsubscribeUserNotification).not.toHaveBeenCalled();
            expect(configCtrl.pushNotification).toBe(true);
        })
    });

    describe('_subscribeUser', () => {
        beforeEach( function () {
            spyOn(configCtrl,'_openDialog').and.callFake(() => q.when());
            spyOn(pushNotificationService, 'subscribeUserNotification');
            configCtrl.pushNotification = true;
        });

        it('should call PushNotificationService.subscribeUserNotification() if user confirm dialog', () => {
            configCtrl._subscribeUser();
            scope.$apply();
            expect(configCtrl._openDialog).toHaveBeenCalled();
            expect(pushNotificationService.subscribeUserNotification).toHaveBeenCalled();
            expect(configCtrl.pushNotification).toBe(true);
        });

        it('should set configProfileCtrl.pushNotification to false if user cancel dialog', () => {
            configCtrl._openDialog.and.callFake(() => q.reject());
            configCtrl._subscribeUser();
            scope.$apply();
            expect(configCtrl._openDialog).toHaveBeenCalled();
            expect(pushNotificationService.subscribeUserNotification).not.toHaveBeenCalled();
            expect(configCtrl.pushNotification).toBe(false);
        })
    });
}));