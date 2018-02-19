'use strict';

(describe('Test SubmitFormListenerService', function() {
    beforeEach(module('app'));

    var user = {
        'name': 'name',
        'key': '123456789',
        'state': 'active'
    }
    var state, scope, messageService, submitFormListenerService;

    beforeEach(inject(function($rootScope, MessageService, $state, SubmitFormListenerService, AuthService, $transitions) {
        messageService = MessageService;
        scope = $rootScope;
        state = $state;
        submitFormListenerService = SubmitFormListenerService;
        spyOn(messageService, 'showConfirmationDialog').and.callFake(function (){
            return {
                then: function(calback) {
                    calback();
                }
            };
        });

        AuthService.login(user);
    }));


    it('Should be call showConfirmationDialog()', function() {
        var element = {};
        scope.$apply();
        submitFormListenerService.addListener('vm.tst', element, scope);
        scope.$apply("vm.tst={name: 'tst'}");
        scope.$apply("vm.tst.name = 'test'");
        scope.$apply(function() {
            state.go('app.user.home');
        });

        expect(messageService.showConfirmationDialog).toHaveBeenCalledWith(
            'event', 
            '', 
            'Deseja sair sem salvar as alterações?');
    });

    it('Should not be call showConfirmationDialog()', function() {
        var element = {};
        scope.$apply();
        submitFormListenerService.addListener('vm.tst', element, scope);
        scope.$apply("vm.tst={name: 'tst'}");
        scope.$apply(function() {
            state.go('app.user.home');
        });

        expect(messageService.showConfirmationDialog).not.toHaveBeenCalled();
    });

    it('Should not be call showConfirmationDialog() if onsubmit is called', function() {
        var element = {};
        scope.$apply();
        submitFormListenerService.addListener('vm.tst', element, scope);
        scope.$apply("vm.tst={name: 'tst'}");
        scope.$apply("vm.tst.name = 'test'");
        element.onsubmit();
        scope.$apply(function() {
            state.go('app.user.home');
        });

        expect(messageService.showConfirmationDialog).not.toHaveBeenCalled();
    });
}));