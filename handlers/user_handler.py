# -*- coding: utf-8 -*-
"""User Handler."""

import json

from utils import Utils
from models.invite import Invite
from utils import login_required
from utils import json_response

from util.json_patch import JsonPatch

from handlers.base_handler import BaseHandler

from google.appengine.ext import ndb


def getInvites(user_email):
    """Query that return list of invites for this user."""
    invites = []

    queryInvites = Invite.query(Invite.invitee == user_email, Invite.status == 'sent')
    invites = [invite.make() for invite in queryInvites]

    return invites


def makeUser(user, request):
    """TODO: Move this method to User when utils.py is refactored.

    @author Andre L Abrantes - 20-06-2017
    """
    user_json = Utils.toJson(user, host=request.host)
    user_json['logout'] = 'http://%s/logout?redirect=%s' %\
        (request.host, request.path)
    user_json['institutions'] = []
    for institution in user.institutions:
        user_json['institutions'].append(
            Utils.toJson(institution.get())
        )
    user_json['follows'] = [institution_key.get().make(
        ['acronym', 'photo_url', 'key', 'parent_institution']) for institution_key in user.follows]
    return user_json


def remove_user_from_institutions(user):
    """Remove user from all your institutions."""
    for institution_key in user.institutions:
        institution = institution_key.get()
        institution.remove_member(user)
        institution.unfollow(user.key)


class UserHandler(BaseHandler):
    """User Handler."""

    @json_response
    @login_required
    def get(self, user):
        """Handle GET Requests."""
        user_json = makeUser(user, self.request)
        user_json['invites'] = getInvites(user.email)
        self.response.write(json.dumps(user_json))

    @login_required
    @ndb.transactional(xg=True)
    def put(self, user, invite_key):
        """Handler PUT Requests."""
        data = json.loads(self.request.body)

        institution_key = ndb.Key(urlsafe=data['institutions'][-1])

        invite = ndb.Key(urlsafe=invite_key).get()
        invite.change_status('accepted')

        user.add_institution(institution_key)
        user.follow(institution_key)
        user.change_state('active')

        institution = institution_key.get()

        institution.add_member(user)
        institution.follow(user.key)

        self.response.write(json.dumps(makeUser(user, self.request)))

    @login_required
    def delete(self, user, institution_key):
        """Handler DELETE Requests."""
        institution_key = ndb.Key(urlsafe=institution_key)
        institution = institution_key.get()

        user.remove_institution(institution_key)

        institution.remove_member(user)
        institution.unfollow(user.key)

    @json_response
    @login_required
    def patch(self, user):
        """Handler PATCH Requests."""
        data = self.request.body

        """Apply patch."""
        JsonPatch.load(data, user)

        if(user.state == 'inactive'):
            remove_user_from_institutions(user)
            user.disable_account()

        """Update user."""
        user.put()

        self.response.write(json.dumps(makeUser(user, self.request)))
