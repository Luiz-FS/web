"use strict";

(function () {
    /**
     * Comment Component
     * The attributes are:
     * user - the logged User
     * post - the one in wich the comments are going to be loaded
     * comment - the comment that is going to be loaded or
     * the comment that is parent of the reply
     * reply - when defined, the reply is loaded instead of its comment parent
     */
    angular.module('app')
        .controller("CommentController", CommentController)
        .component('comment', {
            templateUrl: 'app/comment/comment.html',
            controller: "CommentController",
            controllerAs: 'commentCtrl',
            bindings: {
                user: '=',
                post: '=',
                comment: '=',
                reply: '='
            }
        });

    function CommentController(CommentService, MessageService, ProfileService, $state, AuthService, STATES) {
        const commentCtrl = this;

        commentCtrl.user = AuthService.getCurrentUser();

        // Model to store data of a new reply on a comment
        commentCtrl.newReply = null;

        // Controll the disablement of actions
        commentCtrl.saving = false;

        commentCtrl.$onInit = function () {
            commentCtrl.post = new Post(commentCtrl.post);
            commentCtrl.onDelete = commentCtrl.reply ? commentCtrl.deleteReply : commentCtrl.deleteComment;
            commentCtrl.setReplyId();
            commentCtrl.setCurrentComment();
            commentCtrl.setShowReplies();
        };
        
        commentCtrl.setReplyId = function () {
            commentCtrl.replyId = commentCtrl.reply ? commentCtrl.reply.id : null;
        }

        commentCtrl.setCurrentComment = function () {
            commentCtrl.currentComment = commentCtrl.reply ? commentCtrl.reply : commentCtrl.comment;
        };

        commentCtrl.setShowReplies = function() {
            commentCtrl.showReplies = $state.current.name === STATES.POST;
        }

        commentCtrl.like = function () {
            commentCtrl.saving = true;
            CommentService.like(commentCtrl.post.key, commentCtrl.comment.id, commentCtrl.replyId)
                .then(function () {                    
                    commentCtrl.addLike();
                }).catch(function () {
                    MessageService.showErrorToast("Não foi possível curtir o comentário");
                }).finally(function () {
                    commentCtrl.saving = false;
                });
        };

        commentCtrl.dislike = function () {
            commentCtrl.saving = true;
            CommentService.dislike(commentCtrl.post.key, commentCtrl.comment.id, commentCtrl.replyId)
                .then(function sucess() {
                    commentCtrl.removeLike();
                }).catch(function error() {
                    MessageService.showErrorToast("Não foi possível descurtir o comentário");
                }).finally(function() {
                    commentCtrl.saving = false;
                });
        };

        commentCtrl.replyComment = function replyComment() {
            if (commentCtrl.newReply) {
                commentCtrl.saving = true;
                var institutionKey = commentCtrl.user.current_institution.key;
                CommentService.replyComment(
                    commentCtrl.post.key, commentCtrl.newReply, institutionKey, commentCtrl.comment.id
                ).then(function success(data) {
                    commentCtrl.comment.replies[data.id] = data;
                }).catch(function error() {
                    MessageService.showErrorToast("Não foi possível responder ao comentário");
                }).finally(function() {
                    commentCtrl.newReply = null;
                    commentCtrl.saving = false;
                });
            }
        };

        commentCtrl.deleteReply = function deleteReply() {
            CommentService.deleteReply(commentCtrl.post.key, commentCtrl.comment.id, commentCtrl.replyId)
                .then(function success() {
                    delete commentCtrl.comment.replies[commentCtrl.replyId];
                    MessageService.showInfoToast('Comentário excluído com sucesso');
                });
        };

        commentCtrl.deleteComment = function deleteComment() {
            CommentService.deleteComment(commentCtrl.post.key, commentCtrl.comment.id).then(
                function success() {
                    commentCtrl.post.deleteComment(commentCtrl.comment.id);
                    MessageService.showInfoToast('Comentário excluído com sucesso');
                });
        };

        commentCtrl.commentDeletionDialog = function (event) {
            MessageService.showConfirmationDialog(event, 'Excluir Comentário',
                'Este comentário será excluído e desaparecerá do referente post.'
            ).then(function () {
                commentCtrl.onDelete();
            }).catch(function () {
                MessageService.showInfoToast('Cancelado');
            });
        };

        commentCtrl.addLike = function() {
            commentCtrl.currentComment.likes.push(commentCtrl.user.key);
        }

        commentCtrl.removeLike = function() {
            commentCtrl.currentComment.likes = commentCtrl.currentComment.likes
                .filter(userKey => userKey !== commentCtrl.user.key);
        }

        commentCtrl.isDeletedPost = function isDeletedPost() {
            return commentCtrl.post.state === 'deleted';
        };

        commentCtrl.isLikedByUser = function isLikedByUser() {
            return _.includes(commentCtrl.currentComment.likes, commentCtrl.user.key);
        };

        commentCtrl.showUserProfile = function showUserProfile(userKey, ev) {
            ProfileService.showProfile(userKey, ev);
        };

        commentCtrl.getReplies = function getReplies() {
            return commentCtrl.reply ? [] : _.values(commentCtrl.currentComment.replies);
        };

        commentCtrl.numberOfLikes = function numberOfLikes() {
            return _.size(commentCtrl.currentComment.likes);
        };

        commentCtrl.numberOfReplies = function numberOfReplies() {
            return _.size(commentCtrl.currentComment.replies);
        };

        commentCtrl.canDeleteComment = function canDeleteComment() {
            const hasActivity = commentCtrl.numberOfReplies() > 0 || commentCtrl.numberOfLikes() > 0;
            const userIsAuthor = commentCtrl.currentComment.author_key == commentCtrl.user.key
            return !hasActivity && !commentCtrl.isDeletedPost() && userIsAuthor;
        };

        commentCtrl.canReply = function canReply() {
            const isCommentReply = commentCtrl.reply;
            
            return commentCtrl.showReplies && !commentCtrl.isDeletedPost() &&
                !commentCtrl.isInstInactive() && !isCommentReply;
        };

        commentCtrl.hideReplies = function hideReplies() {
            const noReplies = commentCtrl.numberOfReplies() === 0;
            return commentCtrl.isDeletedPost() && noReplies || commentCtrl.saving;
        };

        commentCtrl.disableButton = function disableButton() {
            return commentCtrl.saving || commentCtrl.isDeletedPost() || commentCtrl.isInstInactive();
        };

        commentCtrl.isInstInactive = function isInstInactive() {
            return commentCtrl.post.institution_state === 'inactive';
        };

        commentCtrl.numberOfLikesMessage = function numberOfLikesMessage() {
            const likesAmount = commentCtrl.numberOfLikes();
            let message = likesAmount > 1 ? likesAmount + ' pessoas curtiram' : '1 pessoa curtiu';
            message = likesAmount === 0 ? 'Nenhuma curtida' : message;
            return message;
        };

        commentCtrl.numberOfRepliesMessage = function numberOfRepliesMessage() {
            const repliesAmount = commentCtrl.numberOfReplies();
            let message = repliesAmount > 1 ? repliesAmount + ' respostas' : '1 resposta';
            message = repliesAmount === 0 ? 'Nenhuma resposta' : message;
            return message;
        }

        commentCtrl.toggleReplies = function toggleReplies() {
            commentCtrl.showReplies = !commentCtrl.showReplies;
        };
    };
})();