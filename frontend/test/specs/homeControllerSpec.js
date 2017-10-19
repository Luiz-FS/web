'use strict';

(describe('Test HomeController', function() {

    var homeCtrl, httpBackend, scope, createCtrl, mdDialog, state;

    var institutions = [{
        acronym: 'Certbio',
        key: '123456789',
        photo_url: "photo_url"
    }];

    var user = {
        name: 'Tiago',
        follows: institutions
    };

    var posts = [{
        author: 'Mayza Nunes',
        author_key: "111111",
        title: 'Post de Mayza',
        text: 'Lorem ipsum'
    }];

    // Event of Splab by Maiana
    var event = {'title': 'Inauguration',
        'text': 'Inauguration of system E-CIS',
        'local': 'Brasilia',
        'photo_url': null,
        'start_time': new Date(),
        'end_time': new Date(),
    };

    beforeEach(module('app'));

    beforeEach(inject(function($controller, $httpBackend, $rootScope, $q, InstitutionService,
            PostService, $mdDialog, $state, AuthService) {
        httpBackend = $httpBackend;
        scope = $rootScope.$new();
        mdDialog = $mdDialog;
        state = $state;
        httpBackend.expect('GET', '/api/user/timeline?page=0&&fetchs=3').respond({posts: posts});
        httpBackend.when('GET', "/api/events").respond([event]);
        httpBackend.when('GET', 'main/main.html').respond(200);
        httpBackend.when('GET', 'home/home.html').respond(200);
        httpBackend.when('GET', 'error/error.html').respond(200);

        AuthService.getCurrentUser = function() {
            return new User(user);
        };

        createCtrl = function() {
            return $controller('HomeController', {
                scope: scope
            });
        };
        homeCtrl = createCtrl();
        httpBackend.flush();
    }));

    afterEach(function() {
        httpBackend.verifyNoOutstandingExpectation();
        httpBackend.verifyNoOutstandingRequest();
    });

    describe('HomeController properties', function() {

        it('should exist a user and his name is Tiago', function() {
            expect(homeCtrl.user.name).toEqual('Tiago');
        });

        it('should exist an post in posts array', function() {
            expect(homeCtrl.posts.length).toBe(1);
        });

        it('should exist a post', function() {
            expect(homeCtrl.posts).toContain({
                author: 'Mayza Nunes',
                author_key: '111111',
                title: 'Post de Mayza',
                text: 'Lorem ipsum'
            });
        });

        it('should exist an institution in institutions array', function() {
            expect(homeCtrl.followingInstitutions.length).toBe(1);
        });

        it('should exist an institution with name and key equal Certbio and 123456789, respectively', function() {
            expect(homeCtrl.followingInstitutions[0]).toEqual({
                acronym: 'Certbio', key: '123456789', photo_url: 'photo_url'});
        });

        it('should be false the instMenuExpanded propertie', function() {
            expect(homeCtrl.instMenuExpanded).toBe(false);
        });
    });

    describe('HomeController functions', function() {

        describe('goToInstitution()', function() {

            it('should call state.go()', function() {
                spyOn(state, 'go');
                homeCtrl.goToInstitution('123456789');
                expect(state.go).toHaveBeenCalledWith('app.institution', {institutionKey: '123456789'});
            });
        });

        describe('newPost()', function() {

            it('should call mdDialog.show()', function() {
                spyOn(mdDialog, 'show');
                homeCtrl.newPost('$event');
                expect(mdDialog.show).toHaveBeenCalled();
            });
        });

        describe('expandInstMenu()' , function() {

            it('should be true the instMenuExpanded propertie', function() {
                homeCtrl.expandInstMenu();
                expect(homeCtrl.instMenuExpanded).toBe(true);
            });
        });
    });
}));