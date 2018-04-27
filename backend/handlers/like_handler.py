# -*- coding: utf-8 -*-
"""Like Handler."""

import json
from google.appengine.ext import ndb
from utils import login_required
from utils import json_response
from handlers.base_handler import BaseHandler
from models.post import Like
from custom_exceptions.notAuthorizedException import NotAuthorizedException
from custom_exceptions.entityException import EntityException
from service_entities import enqueue_task
from service_messages import send_message_notification
from utils import Utils

__all__ = ['LikeHandler']

class LikeException(Exception):
    """Like Exception."""

    def __init__(self, message=None):
        """Init method."""
        super(LikeException, self).__init__(
            message or 'User already made this action in publication.')


class LikeHandler(BaseHandler):
    """Like Handler."""

    @json_response
    @login_required
    def get(self, user, post_key, comment_id=None, reply_id=None):
        """Handler GET Requests."""
        post = ndb.Key(urlsafe=post_key).get()
        if comment_id:
            comment = post.get_comment(comment_id)
            if(reply_id):
                reply = comment.get('replies').get(reply_id)
                likes = reply.get('likes')
            else:
                likes = comment.get('likes')
        else:
            likes = [Like.make(like, self.request.host) for like in post.likes]

        self.response.write(json.dumps(likes))

    @json_response
    @login_required
    def post(self, user, post_key, comment_id=None, reply_id=None):
        """Handle POST Requests."""
        """This method is only meant to give like in post, comment or reply and send notification."""
        post = ndb.Key(urlsafe=post_key).get()
        Utils._assert(post.state == 'deleted',
                      "This post has been deleted", EntityException)
        if comment_id:            
            comment = post.like_comment(user, comment_id, reply_id)

            entity_type = 'LIKE_COMMENT'
            user_is_the_author = comment['author_key'] == user.key.urlsafe()
            if not user_is_the_author:
                receiver_key = comment['author_key']
                send_message_notification(
                    receiver_key,
                    user.key.urlsafe(), 
                    entity_type, 
                    post_key,
                    user.current_institution
                ) 
        else: 
            post = post.like(user.key)

            entity_type = 'LIKE_POST'
            params = {
                    'receiver_key': post.author.urlsafe(),
                    'sender_key': user.key.urlsafe(),
                    'entity_key': post.key.urlsafe(),
                    'entity_type': entity_type,
                    'current_institution': user.current_institution.urlsafe()
                }

            enqueue_task('post-notification', params)

    """TODO:  Create dislike_comment method and replace 
            ndb.transactional to internal scopes.
        @author: Maiana Brito 12/04/2018
    """
    @json_response
    @login_required
    @ndb.transactional(xg=True)
    def delete(self, user, post_key, comment_id=None, reply_id=None):
        """Handle DELETE Requests."""
        """This method is only meant to dislike in post."""
        post = ndb.Key(urlsafe=post_key).get()
        institution = post.institution.get()

        Utils._assert(institution.state == 'inactive',
                      "The institution has been deleted", NotAuthorizedException)
        
        if comment_id:
            comment = post.get_comment(comment_id)
            if reply_id:
                comment = comment.get('replies').get(reply_id)

            likes = comment.get('likes')

            Utils._assert(user.key.urlsafe() not in likes,
                      "User hasn't liked this comment.", LikeException)
            likes.remove(user.key.urlsafe())
            post.put()
        else:
            Utils._assert(not user.is_liked_post(post.key),
                      "User hasn't liked this publication.", LikeException)
            user.dislike_post(post.key)
            post.dislike(user.key)
