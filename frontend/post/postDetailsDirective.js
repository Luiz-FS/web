(function() {
    'use strict';

    var app = angular.module('app');

    app.controller('PostDetailsController', function(PostService, AuthService, CommentService, $mdToast, $state,
        $mdDialog, NotificationService, MessageService, ngClipboard, ProfileService) {

        var postDetailsCtrl = this;

        var LIMIT_POST_CHARACTERS = 1000;

        postDetailsCtrl.showLikes = false;
        postDetailsCtrl.showComments = false;
        postDetailsCtrl.savingComment = false;
        postDetailsCtrl.savingLike = false;

        var URL_POST = '#/posts/';
        postDetailsCtrl.user = AuthService.getCurrentUser();

        postDetailsCtrl.deletePost = function deletePost(ev) {
            var confirm = $mdDialog.confirm()
                .clickOutsideToClose(true)
                .title('Excluir Post')
                .textContent('Este post será excluído e desaparecerá para os usuários que seguem a instituição.')
                .ariaLabel('Deletar postagem')
                .targetEvent(ev)
                .ok('Excluir')
                .cancel('Cancelar');

            $mdDialog.show(confirm).then(function() {
                PostService.deletePost(postDetailsCtrl.post).then(function success() {
                    postDetailsCtrl.post.state = 'deleted';
                    MessageService.showToast('Post excluído com sucesso');
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                });
            }, function() {
                MessageService.showToast('Cancelado');
            });
        };

        postDetailsCtrl.isAuthorized = function isAuthorized() {
            return postDetailsCtrl.isPostAuthor() || isInstitutionAdmin();
        };

        postDetailsCtrl.isDeleted = function isDeleted(object) {
            return object.state == 'deleted';
        };

        postDetailsCtrl.isDeletedEvent = function isDeletedEvent(post) {
            if(post.shared_event){
                return postDetailsCtrl.isDeleted(post.shared_event);
            }
        };

        postDetailsCtrl.isHidden = function isHidden() {
            var isDeleted = postDetailsCtrl.post.state === "deleted";
            return isDeleted && !postDetailsCtrl.postHasActivity();
        };

        postDetailsCtrl.isShared = function isShared() {
            return postDetailsCtrl.post.shared_post ||
                postDetailsCtrl.post.shared_event;
        };

        postDetailsCtrl.postHasActivity = function postHasActivity() {
            var hasNoComments = postDetailsCtrl.post.number_of_comments === 0;
            var hasNoLikes = postDetailsCtrl.post.number_of_likes === 0;

            return !hasNoComments || !hasNoLikes;
        };

        postDetailsCtrl.showSharedPost = function showSharedPost() {
            return postDetailsCtrl.post.shared_post &&
                !postDetailsCtrl.isDeleted(postDetailsCtrl.post);
        };

        postDetailsCtrl.showSharedEvent = function showSharedEvent() {
            return postDetailsCtrl.post.shared_event &&
                !postDetailsCtrl.isDeleted(postDetailsCtrl.post) &&
                !postDetailsCtrl.isDeleted(postDetailsCtrl.post.shared_event);
        };

        postDetailsCtrl.showTextPost = function showTextPost(){
            return !postDetailsCtrl.isDeleted(postDetailsCtrl.post) &&
                     !postDetailsCtrl.isShared();
        };

        postDetailsCtrl.showButtonDelete = function showButtonDelete() {
            return postDetailsCtrl.isAuthorized() &&
                !postDetailsCtrl.isDeleted(postDetailsCtrl.post);
        };

        postDetailsCtrl.disableButtonLike = function disableButtonLike() {
            return postDetailsCtrl.savingLike ||
                postDetailsCtrl.isDeleted(postDetailsCtrl.post) || postDetailsCtrl.isInstInactive();
        };

        postDetailsCtrl.showButtonEdit = function showButtonEdit() {
            return postDetailsCtrl.isPostAuthor() && !postDetailsCtrl.isDeleted(postDetailsCtrl.post) &&
                    !postDetailsCtrl.postHasActivity() && !postDetailsCtrl.isShared();
        };

        postDetailsCtrl.generateLink = function generateLink(){
            var currentUrl = (window.location.href).split('#');
            var url = currentUrl[0] + URL_POST + postDetailsCtrl.post.key;
            ngClipboard.toClipboard(url);
            MessageService.showToast("O link foi copiado");
        };

        postDetailsCtrl.likeOrDislikePost = function likeOrDislikePost() {
            var promise;
            if(!postDetailsCtrl.isLikedByUser()) {
                promise = likePost();
            } else {
                promise = dislikePost();
            }
            return promise;
        };

        postDetailsCtrl.editPost = function editPost(event) {
            $mdDialog.show({
                controller: function DialogController() {},
                controllerAs: "controller",
                templateUrl: 'app/home/post_dialog.html',
                parent: angular.element(document.body),
                targetEvent: event,
                clickOutsideToClose:true,
                locals: {
                    originalPost: postDetailsCtrl.post,
                    isEditing: true
                },
                bindToController: true
            }).then(function success(editedPost) {
                postDetailsCtrl.post.title = editedPost.title;
                postDetailsCtrl.post.text = editedPost.text;
                postDetailsCtrl.post.photo_url = editedPost.photo_url;
                postDetailsCtrl.post.pdf_files = editedPost.pdf_files;
                postDetailsCtrl.post.video_url = editedPost.video_url;
            }, function error() {});
        };

        postDetailsCtrl.share = function share(post, event) {
            post = getOriginalPost(postDetailsCtrl.post);
            $mdDialog.show({
                controller: "SharePostController",
                controllerAs: "sharePostCtrl",
                templateUrl: 'app/post/share_post_dialog.html',
                parent: angular.element(document.body),
                targetEvent: event,
                clickOutsideToClose:true,
                locals: {
                    user : postDetailsCtrl.user,
                    posts: postDetailsCtrl.posts,
                    post: post,
                    addPost: postDetailsCtrl.addPost
                }
            });
        };

        function getOriginalPost(post){
            if(post.shared_post){
                return post.shared_post;
            } else if(post.shared_event){
                return post.shared_event;
            }
            return post;
        }

        function likePost() {
            postDetailsCtrl.savingLike = true;
            var promise = PostService.likePost(postDetailsCtrl.post);
            promise.then(function success() {
                addPostKeyToUser(postDetailsCtrl.post.key);
                postDetailsCtrl.post.number_of_likes += 1;
                postDetailsCtrl.savingLike = false;
                postDetailsCtrl.getLikes(postDetailsCtrl.post);
            }, function error(response) {
                MessageService.showToast(response.data.msg);
                $state.go('app.home');
                postDetailsCtrl.savingLike = false;
            });
            return promise;
        }

        function dislikePost() {
            postDetailsCtrl.savingLike = true;
            var promise = PostService.dislikePost(postDetailsCtrl.post);
            promise.then(function success() {
                removePostKeyFromUser(postDetailsCtrl.post.key);
                postDetailsCtrl.post.number_of_likes -= 1;
                postDetailsCtrl.savingLike = false;
                postDetailsCtrl.getLikes(postDetailsCtrl.post);
            }, function error() {
                $state.go('app.home');
                postDetailsCtrl.savingLike = false;
            });
            return promise;
        }

        postDetailsCtrl.isLikedByUser = function isLikedByUser() {
            var likedPostsKeys = _.map(postDetailsCtrl.user.liked_posts, getKeyFromUrl);
            return _.includes(likedPostsKeys, postDetailsCtrl.post.key);
        };

        function addPostKeyToUser(key) {
            postDetailsCtrl.user.liked_posts.push(key);
            AuthService.save();
        }

        function removePostKeyFromUser(key) {
            _.remove(postDetailsCtrl.user.liked_posts, foundPost => getKeyFromUrl(foundPost) === key);
            AuthService.save();
        }

        function getKeyFromUrl(url) {
            var key = url;
            if(url.indexOf("/api/key/") != -1) {
                var splitedUrl = url.split("/api/key/");
                key = splitedUrl[1];
            }
            return key;
        }

        postDetailsCtrl.goToInstitution = function goToInstitution(institutionKey) {
            $state.go('app.institution', {institutionKey: institutionKey});
        };

        postDetailsCtrl.goToPost = function goToPost(post) {
             $state.go('app.post', {key: post.key});
        };

        postDetailsCtrl.goToEvent = function goToEvent(event) {
            $state.go('app.event', {eventKey: event.key});
        };

        postDetailsCtrl.getValues = function getValues(object) {
            return _.values(object);
        };

        postDetailsCtrl.loadComments = function refreshComments() {
            var promise  =  CommentService.getComments(postDetailsCtrl.post.comments);
            promise.then(function success(response) {
                postDetailsCtrl.post.data_comments = response.data;
                postDetailsCtrl.post.number_of_comments = _.size(postDetailsCtrl.post.data_comments);
            }, function error(response) {
                MessageService.showToast(response.data.msg);
            });
            return promise;
        };

        postDetailsCtrl.getComments = function getComments() {
            postDetailsCtrl.showComments = !postDetailsCtrl.showComments;
            if (postDetailsCtrl.showComments){
                return postDetailsCtrl.loadComments();
            } else {
                postDetailsCtrl.post.data_comments = [];
            }
        };

        postDetailsCtrl.getLikes = function getLikes() {
            var likesUri = postDetailsCtrl.post.likes;
            postDetailsCtrl.showLikes = !postDetailsCtrl.showLikes;
            if(postDetailsCtrl.showLikes) {
                var promise = PostService.getLikes(likesUri);
                promise.then(function success(response) {
                    postDetailsCtrl.post.data_likes = response.data;
                    postDetailsCtrl.post.number_of_likes = _.size(postDetailsCtrl.post.data_likes);
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                });
                return promise;
            }else{
                postDetailsCtrl.post.data_likes = [];
            }
        };

        function addComment(post, comment) {
            var postComments = postDetailsCtrl.post.data_comments;
            postComments[comment.id] = comment;
            post.number_of_comments += 1;
        }

        postDetailsCtrl.createComment = function createComment() {
            var newComment = postDetailsCtrl.newComment;
            var institutionKey = postDetailsCtrl.user.current_institution.key;
            var promise;
            if (!_.isEmpty(newComment)) {
                postDetailsCtrl.savingComment = true;
                promise = CommentService.createComment(postDetailsCtrl.post.key, newComment, institutionKey);
                promise.then(function success(response) {
                    postDetailsCtrl.newComment = '';
                    addComment(postDetailsCtrl.post, response.data);
                    postDetailsCtrl.savingComment = false;
                }, function error(response) {
                    AuthService.reload().then(function success() {
                        postDetailsCtrl.savingComment = false;
                        MessageService.showToast(response.data.msg);
                        $state.go('app.home');
                    });
                });
            } else {
                MessageService.showToast("Comentário não pode ser vazio.");
            }
            return promise;
        };

        postDetailsCtrl.isPostAuthor = function isPostAuthor() {
            return postDetailsCtrl.post.author_key == postDetailsCtrl.user.key;
        };

        function isInstitutionAdmin() {
            return _.includes(_.map(postDetailsCtrl.user.institutions_admin, getKeyFromUrl), postDetailsCtrl.post.institution_key);
        }

        var URL_PATTERN = /(((www.)|(http(s)?:\/\/))[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
        var REPLACE_URL = "<a href=\'$1\' target='_blank'>$1</a>";

        /**
        * replace urls in a string with links to make the urls clickable.
        * If urls don't containing http or https, this function add the https.
        * @param {object} receivedPost - The post to be recognized.
        * @return {object} The post with clickable urls.
        * OBS: This function returns a new Post because this result is only for show in view.
        * It is not necessary to change the original Post.
        */
        postDetailsCtrl.postToURL =  function postToURL(receivedPost) {
            var post = new Post(receivedPost, receivedPost.institutionKey);
            post.text = postDetailsCtrl.recognizeUrl(post.text);
            return post;
        };

        postDetailsCtrl.recognizeUrl =  function recognizeUrl(text) {
            var urlsInText = text.match(URL_PATTERN);
            text = addHttpsToUrl(text, urlsInText);
            text = adjustText(text);
            return text;
        };

        postDetailsCtrl.showImage = function showImage(post) {
            var postObj = new Post(post);
            return postObj.hasImage() && !postObj.isDeleted();
        };

        postDetailsCtrl.showVideo = function showVideo(post) {
            var postObj = new Post(post);
            return postObj.hasVideo() && !postObj.isDeleted();
        };

        postDetailsCtrl.getVideoUrl = function getVideoUrl(post) {
            var postObj = new Post(post);
            return postObj.getVideoUrl();
        };

        postDetailsCtrl.isLongPostTimeline = function isLongPostTimeline(text){
            if(text){
                var numberOfChar = text.length;
                return !postDetailsCtrl.isPostPage &&
                    numberOfChar >= LIMIT_POST_CHARACTERS;
            }
        };

        postDetailsCtrl.showUserProfile = function showUserProfile(userKey, ev) {
            ProfileService.showProfile(userKey, ev);
        };

        postDetailsCtrl.isInstInactive = function isInstInactive() {
            return postDetailsCtrl.post.institution_state === 'inactive';
        };

        function adjustText(text){
            if(postDetailsCtrl.isLongPostTimeline(text)){
                text = text.substring(0, LIMIT_POST_CHARACTERS) + "...";
            }
            return text.replace(URL_PATTERN,REPLACE_URL);
        }

        function addHttpsToUrl(text, urls) {
            if(urls) {
                var http = "http://";
                for (var i = 0; i < urls.length; i++) {
                    if(urls[i].slice(0, 4) !== "http") {
                        text = text.replace(urls[i], http + urls[i]);
                    }
                }
            }
            return text;
        }    
    });

    app.directive("postDetails", function() {
        return {
            restrict: 'E',
            templateUrl: "app/post/post_details.html",
            controllerAs: "postDetailsCtrl",
            controller: "PostDetailsController",
            scope: {},
            bindToController: {
                posts: '=',
                post: '=',
                isPostPage: '=',
                addPost: '='
            }
        };
    });

    app.controller('CommentController', function CommentController(CommentService, MessageService, ProfileService) {
        var commentCtrl = this;

        // Model to store data of a new reply on a comment
        commentCtrl.newReply = null;

        // Controll the disablement of actions
        commentCtrl.saving = false;

        commentCtrl.likeOrDislike = function likeOrDislike(reply) {
            var replyId = reply ? reply.id : undefined;
            if (commentCtrl.isLikedByUser(reply)) {
                CommentService.dislike(commentCtrl.post.key, commentCtrl.comment.id, replyId).then(
                    function sucess() {
                        if (reply) {
                            _.remove(reply.likes, function(key) {
                                return commentCtrl.user.key === key;
                            });
                        } else {
                            _.remove(commentCtrl.comment.likes, function(key) {
                                return commentCtrl.user.key === key;
                            });
                        }
                    }
                );
            } else {
                CommentService.like(commentCtrl.post.key, commentCtrl.comment.id, replyId).then(
                    function sucess() {
                        if (reply) {
                            reply.likes.push(commentCtrl.user.key);
                        } else {
                            commentCtrl.comment.likes.push(commentCtrl.user.key);
                        }
                    }
                );
            }
        };

        commentCtrl.isLikedByUser = function isLikedByUser(reply) {
            if (reply) {
                return _.includes(reply.likes, commentCtrl.user.key);
            }
            return _.includes(commentCtrl.comment.likes, commentCtrl.user.key);
        };

        commentCtrl.showUserProfile = function showUserProfile(userKey, ev) {
            ProfileService.showProfile(userKey, ev);
        };

        commentCtrl.getReplies = function getReplies() {
            return _.values(commentCtrl.comment.replies);
        };

        commentCtrl.numberOfLikes = function numberOfLikes(reply) {
            if (reply) {
                return _.size(reply.likes);
            }
            return _.size(commentCtrl.comment.likes);
        };

        commentCtrl.numberOfReplies = function numberOfReplies() {
            return _.size(commentCtrl.comment.replies);
        };

        commentCtrl.replyComment = function replyComment() {
            if (commentCtrl.newReply) {
                commentCtrl.saving = true;
                var institutionKey = commentCtrl.user.current_institution.key;
                var promise = CommentService.replyComment(
                    commentCtrl.post.key,
                    commentCtrl.newReply,
                    institutionKey,
                    commentCtrl.comment.id
                );

                promise.then(function success(response) {
                    var data = response.data;
                    commentCtrl.comment.replies[data.id] = data;

                    commentCtrl.newReply = null;
                    commentCtrl.saving = false;
                },function error(error) {
                    MessageService.showToast(error.data.msg);
                });
            }
        };

        commentCtrl.deleteReply = function deleteReply(reply) {
            CommentService.deleteReply(commentCtrl.post.key, commentCtrl.comment.id, reply.id).then(
                function success() {
                    delete commentCtrl.comment.replies[reply.id];
                    MessageService.showToast('Comentário excluído com sucesso');
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                }
            );
        };

        commentCtrl.deleteComment = function deleteComment() {
            CommentService.deleteComment(commentCtrl.post.key, commentCtrl.comment.id).then(
                function success() {
                    delete commentCtrl.post.data_comments[commentCtrl.comment.id];
                    commentCtrl.post.number_of_comments--;
                    MessageService.showToast('Comentário excluído com sucesso');
                }, function error(response) {
                    MessageService.showToast(response.data.msg);
                }
            );
        };

        commentCtrl.confirmCommentDeletion = function confirmCommentDeletion(event, reply) {
            if(commentCtrl.post.state !== 'deleted') {
                MessageService.showConfirmationDialog(event, 'Excluir Comentário',
                    'Este comentário será excluído e desaparecerá do referente post.'
                ).then(function() {
                    if (reply) {
                        commentCtrl.deleteReply(reply);
                    } else {
                        commentCtrl.deleteComment();
                    }
                }, function() {
                    MessageService.showToast('Cancelado');
                });
            }
        };

        commentCtrl.canDeleteComment = function canDeleteComment(reply) {
            var deletedPost = commentCtrl.post.state === 'deleted';
            if (reply) {
                var replyHasActivity = commentCtrl.numberOfLikes(reply) > 0;
                return !replyHasActivity &&
                    reply.author_key == commentCtrl.user.key && !deletedPost;
            }
            var commentHasActivity = commentCtrl.numberOfReplies() > 0 ||
                commentCtrl.numberOfLikes() > 0;
            return !commentHasActivity &&
                commentCtrl.comment.author_key == commentCtrl.user.key && !deletedPost;
        };

        commentCtrl.canReply = function canReply() {
            return commentCtrl.post.state === 'deleted';
        };

        commentCtrl.showReplies = function showReplies() {
            if(commentCtrl.post.state === 'deleted') {
                var noReplies = commentCtrl.numberOfReplies() === 0;
                return commentCtrl.saving || noReplies;
            }
            return commentCtrl.saving;
        };

        commentCtrl.disableButton = function disableButton() {
            var postDeleted = commentCtrl.post.state === 'deleted';
            return commentCtrl.saving || postDeleted || commentCtrl.isInstInactive();
        };

        commentCtrl.isInstInactive = function isInstInactive() {
            return commentCtrl.post.institution_state === 'inactive';
        };
    });

    app.directive("comment", function() {
        return {
            restrict: 'E',
            templateUrl: "app/post/comment.html",
            controllerAs: "commentCtrl",
            controller: "CommentController",
            scope: {},
            bindToController: {
                comment: '=',
                post: '=',
                user: '='
            }
        };
    });

    app.controller("SharePostController", function SharePostController(user, posts, post, addPost, $mdDialog, PostService,
        MessageService, $state) {
        var shareCtrl = this;

        var LIMIT_POST_CHARACTERS = 200;
        var URL_PATTERN = /(((www.)|(http(s)?:\/\/))[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
        var REPLACE_URL = "<a href=\'$1\' target='_blank'>$1</a>";

        shareCtrl.user = user;

        shareCtrl.post = new Post(post, post.institution_key);
        shareCtrl.post.text = adjustText(post.text);
        shareCtrl.posts = posts;
        shareCtrl.addPost = addPost;

        shareCtrl.newPost = new Post({}, shareCtrl.user.current_institution.key);

        shareCtrl.cancelDialog = function cancelDialog() {
            $mdDialog.cancel();
        };

        shareCtrl.showImage = function showImage() {
            var postObj = new Post(shareCtrl.post);
            return postObj.hasImage() && !postObj.isDeleted();
        };

        shareCtrl.showVideo = function showVideo() {
            var postObj = new Post(shareCtrl.post);
            return postObj.hasVideo() && !postObj.isDeleted();
        };

        shareCtrl.getVideoUrl = function getVideoUrl() {
            var postObj = new Post(shareCtrl.post);
            return postObj.getVideoUrl();
        };

        shareCtrl.share = function share() {
            makePost(shareCtrl.post);
            PostService.createPost(shareCtrl.newPost).then(function success(response) {
                MessageService.showToast('Compartilhado com sucesso!');
                $mdDialog.hide();
                shareCtrl.addPostTimeline(response.data);
            }, function error(response) {
                $mdDialog.hide();
                MessageService.showToast(response.data.msg);
            });
        };

        shareCtrl.addPostTimeline = function addPostTimeline(post) {
            if (shareCtrl.addPost){
                shareCtrl.posts.push(post);
            }
        };

        shareCtrl.isEvent = function isEvent(){
            var hasLocal = !_.isUndefined(shareCtrl.post.local);
            var hasStartTime = !_.isUndefined(shareCtrl.post.start_time);
            var hasEndTime = !_.isUndefined(shareCtrl.post.end_time);
            return hasLocal && hasStartTime && hasEndTime;
        };

        shareCtrl.goTo = function goTo(){
            shareCtrl.cancelDialog();
            if(shareCtrl.isEvent()){
                $state.go('app.event', {eventKey: shareCtrl.post.key});
            }
            $state.go('app.post', {postKey: shareCtrl.post.key});
        };

        function makePost(post){
            if(shareCtrl.isEvent()){
                shareCtrl.newPost.shared_event = post.key;
            } else {
                shareCtrl.newPost.shared_post = post.key;
            }
            shareCtrl.newPost.pdf_files = [];
        }

        function adjustText(text){
            if(text){
                if(text.length > LIMIT_POST_CHARACTERS){
                    text = text.substring(0, LIMIT_POST_CHARACTERS) + "...";
                }
                return text.replace(URL_PATTERN,REPLACE_URL);
            }
        }
    });
})();