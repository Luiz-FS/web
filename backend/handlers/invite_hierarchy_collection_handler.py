# -*- coding: utf-8 -*-
"""Invite Hierarchy Collection Handler."""

import re
import json
from . import BaseHandler
from custom_exceptions import NotAuthorizedException
from google.appengine.ext import ndb
from util import login_required
from utils import json_response
from utils import Utils
from models import InviteFactory
from service_entities import enqueue_task

__all__ = ['InviteHierarchyCollectionHandler']

class InviteHierarchyCollectionHandler(BaseHandler):
    
    @login_required
    @json_response
    def post(self, user):
        """Handler POST invites.
        
        This method creates invites for:
        New institution to be added in the hierarchy.
        """
        body = json.loads(self.request.body)
        data = body['data']
        host = self.request.host
        invite = data['invite_body']
        type_of_invite = invite.get('type_of_invite')

        # This pattern checks whether the invitation type is INSTITUTION_CHILDREN or INSTITUTION_PARENT
        invite_pattern = re.compile('^INSTITUTION_(CHILDREN|PARENT)$')
        Utils._assert(
            not invite_pattern.match(type_of_invite),
            "invitation type not allowed", 
            NotAuthorizedException
        )

        institution = ndb.Key(urlsafe=invite['institution_key']).get()
        can_invite_inst = user.has_permission(
            "send_link_inst_invite", institution.key.urlsafe())

        Utils._assert(
            not can_invite_inst,
            "User is not allowed to send hierarchy invites", 
            NotAuthorizedException
        )

        invite = createInvite(invite)
        enqueue_task('send-invite', {
            'invites_keys': json.dumps([invite.key.urlsafe()]), 
            'host': host,
            'current_institution': user.current_institution.urlsafe()
        })

        self.response.write(json.dumps({'msg': 'The invite are being processed.', 'invite' : invite.make()}))


@ndb.transactional(xg=True)
def createInvite(data):
    """Create an invite."""
    invite = InviteFactory.create(data, data['type_of_invite'])
    invite.put()

    if(invite.stub_institution_key):
        invite.stub_institution_key.get().addInvite(invite)
    
    return invite
