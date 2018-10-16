'use strict';

(fdescribe('Test CommentController', function() {
    beforeEach(module('app'));
    
    const POSTS_URI = "/api/posts";
    let commentCtrl, scope, httpBackend, mdDialog;
    let commentService, profileService;
    
    let user = {
        name: 'name',
        key: 'user-key',
        state: 'active'
    };

    let reply = {
        text: "reply", 
        id: 1,
        likes: []
    };

    let comment = {
        text: "comment",
        id: 5,
        data_comments: [],
        replies: {},
        author_key: user.key,
        likes: []
    };

    let post = {
        title: 'post principal', author_key: user.key,
        key: "123456", comments: "/api/posts/123456/comments",
        likes: "/api/posts/123456/likes", 
        number_of_likes: 0, number_of_comments: 0,
        state: 'published'
    };
    
    const fakeCallback = function(){
        return {
            then: function(callback) {
                return callback();
            }
        };
    };

    beforeEach(inject(function ($controller, $httpBackend, $mdDialog,
            AuthService, $rootScope, CommentService, ProfileService) {
        httpBackend = $httpBackend;
        mdDialog = $mdDialog;
        commentService = CommentService;
        profileService = ProfileService;

        AuthService.login(user);

        scope = $rootScope.$new();
        commentCtrl = $controller('CommentController', {
            scope: scope
        });

        commentCtrl.user = AuthService.getCurrentUser();
        commentCtrl.comment = {...comment};
        commentCtrl.post = {...post};
        commentCtrl.setReplyId();
        commentCtrl.loadCommentBody();
    }));

    afterEach(function() {
        scope.$destroy();
        httpBackend.verifyNoOutstandingExpectation();
        httpBackend.verifyNoOutstandingRequest();
    });

    describe('setReplyId', function() {
        it('shoult set replyId to null', function() {
            commentCtrl.reply = null;
            commentCtrl.setReplyId();
            expect(commentCtrl.replyId).toEqual(null);
        });

        it('shoult set replyId to null', function() {
            commentCtrl.reply = reply;
            commentCtrl.setReplyId();
            expect(commentCtrl.replyId).toEqual(reply.id);
        });
    });

    describe('canDeleteComment()', function() {
        it('Should be true when the user is the author', function() {
            expect(commentCtrl.canDeleteComment()).toBeTruthy();
        });

        it('Should be false when the user is not the author', function() {
            commentCtrl.comment = {author_key: "other-key", text: "testando"};
            commentCtrl.loadCommentBody();
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });

        it('Should be false when the post is deleted', function() {
            commentCtrl.post.state = 'deleted';
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });

        it('Should be false when the comment has replies', function() {
            commentCtrl.comment.replies = {1: reply};
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });
    });

    describe('canReply()', function() {
        it('Should return true', function() {
            commentCtrl.post.state = "active";
            commentCtrl.showReplies = true;
            expect(commentCtrl.canReply()).toBeTruthy();
        });

        it('Should return false', function() {
            commentCtrl.post.state = "deleted";
            commentCtrl.showReplies = true;
            expect(commentCtrl.canReply()).toBeFalsy();
        });

        it('Should return false', function() {
            commentCtrl.post.state = "active";
            commentCtrl.post.institution_state = 'inactive';
            commentCtrl.showReplies = true;
            expect(commentCtrl.canReply()).toBeFalsy();
        });
    });

    describe('confirmCommentDeletion()', function(){

        it('Should delete the comment', function() {
            spyOn(mdDialog, 'confirm').and.callThrough();
            spyOn(mdDialog, 'show').and.callFake(fakeCallback);
            spyOn(commentService, 'deleteComment').and.callThrough();
            commentCtrl.post.data_comments = [comment];
            httpBackend.expect('DELETE', POSTS_URI + '/' + post.key + '/comments/' + "5").respond(comment);
            commentCtrl.confirmCommentDeletion("$event");
            httpBackend.flush();
            expect(commentService.deleteComment).toHaveBeenCalledWith(commentCtrl.post.key, 5);
            expect(commentCtrl.post.data_comments).toEqual([]);
            expect(mdDialog.confirm).toHaveBeenCalled();
            expect(mdDialog.show).toHaveBeenCalled();
        });

        it('Should call deleteReply', function() {
            comment.replies[reply.id] = reply;
            commentCtrl.reply = reply;
            commentCtrl.setReplyId();
            commentCtrl.loadCommentBody();
            
            spyOn(mdDialog, 'confirm').and.callThrough();
            spyOn(mdDialog, 'show').and.callFake(fakeCallback);
            spyOn(commentService, 'deleteReply').and.callThrough();
            
            httpBackend.expect(
                'DELETE', POSTS_URI + '/' + post.key + '/comments/'+ comment.id +'/replies/'+ reply.id
            ).respond(reply);
            commentCtrl.confirmCommentDeletion("$event", reply);
            httpBackend.flush();

            expect(commentService.deleteReply).toHaveBeenCalledWith(commentCtrl.post.key, comment.id, reply.id);
            expect(commentCtrl.comment.replies).toEqual({});
            expect(mdDialog.confirm).toHaveBeenCalled();
            expect(mdDialog.show).toHaveBeenCalled();
        });
    });

    describe('isDeletedPost', function() {
        it('should be true when the post is deleted', function() {
            commentCtrl.post.state = 'deleted';
            expect(commentCtrl.isDeletedPost()).toBeTruthy();
        });

        it('should be false when the post is published', function() {
            commentCtrl.post.state = 'published';
            expect(commentCtrl.isDeletedPost()).toBeFalsy();
        });
    });

    describe('isLikedByUser', function() {
        it('should be true when the post is liked by the user', function() {
            commentCtrl.addLike();
            expect(commentCtrl.isLikedByUser()).toBeTruthy();
        });

        it('should be false when the post is not liked by the user', function() {
            commentCtrl.removeLike();
            expect(commentCtrl.isLikedByUser()).toBeFalsy();
        });
    });

    xdescribe('showUserProfile', function() {
        spyOn(profileService, 'showProfile').and.callThrough();
        let event = {};
        commentCtrl.showUserProfile(user.key, event);
        expect(profileService.showProfile).toHaveBeenCalledWith(user.key, event);
    });

    describe('getReplies', function() {
        it('should get the comment replies', function () {
            expect(commentCtrl.getReplies()).toEqual([]);
            commentCtrl.comment.replies[reply.id] = {...reply};
            // add reply to comment
            const commentReplies = Object.values(commentCtrl.comment.replies);
            expect(commentCtrl.getReplies()).toEqual(commentReplies);
        });

        it('should return an empty list when the comment is a reply', function () {
            commentCtrl.comment.replies[reply.id] = {...reply};
            commentCtrl.reply = {...reply};
            expect(commentCtrl.getReplies()).toEqual([]);
        });
    });

    describe('numberOfLikes', function () {
        it('should return the number of likes of a comment', function () {
            commentCtrl.comment.likes = [];
            expect(commentCtrl.numberOfLikes()).toEqual(0);
            commentCtrl.comment.likes = [{id: 'like01'}, {id: 'like02'}];
            expect(commentCtrl.numberOfLikes()).toEqual(2);
        });

        it('should return the number of likes of a reply', function () {
            commentCtrl.reply = {...reply, likes:[]};
            commentCtrl.loadCommentBody();
            expect(commentCtrl.numberOfLikes()).toEqual(0);
            commentCtrl.reply = {
                ...reply, 
                likes: [{id: 'like01'}, {id: 'like02'}]
            };
            commentCtrl.loadCommentBody();
            expect(commentCtrl.numberOfLikes()).toEqual(2);
        });
    }); 

    describe('numberOfReplies', function () {
        it('should return the number of replies of a comment', function() {
            commentCtrl.comment.replies = {};
            expect(commentCtrl.numberOfReplies()).toEqual(0);
            commentCtrl.comment.replies = {1: {}, 2: {}};
            expect(commentCtrl.numberOfReplies()).toEqual(2);
        });
    });

    describe('canDeleteComment', function () {
        beforeEach(function() {
            commentCtrl.comment.likes = [];
            commentCtrl.comment.replies = {};
            commentCtrl.comment.author_key = user.key;
            commentCtrl.post.state = 'published';
        })

        it('should be true when the post has no activity', function () {
            expect(commentCtrl.canDeleteComment()).toBeTruthy();
        });

        it('should be false when the post is deleted', function () {
            commentCtrl.post.state = 'deleted';
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });

        it('should be false when the comment has likes', function () {
            commentCtrl.addLike();
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });

        it('should be false when the comment has replies', function () {
            commentCtrl.comment.replies = {1:reply};
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });

        it('should be false when the user is not the post author', function () {
            commentCtrl.comment.author_key = 'other-user-key';
            expect(commentCtrl.canDeleteComment()).toBeFalsy();
        });
    });



    describe('', function () {});


}));