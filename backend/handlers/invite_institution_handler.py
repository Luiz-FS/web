# -*- coding: utf-8 -*-
"""Invite Institution Handler."""

import json

from utils import login_required
from utils import json_response
from utils import is_admin
from utils import Utils
from custom_exceptions.notAuthorizedException import NotAuthorizedException
from handlers.base_handler import BaseHandler
from models.factory_invites import InviteFactory

class InviteInstitutionHandler(BaseHandler):
    """Invite Institution Handler."""

    @json_response
    @login_required
    def post(self, user):
        """Handle POST Requests."""
        data = json.loads(self.request.body)
        host = self.request.host

        type_of_invite = data.get('type_of_invite')
        Utils._assert(type_of_invite != 'INSTITUTION',
                      "invitation type not allowed", NotAuthorizedException)
        invite = InviteFactory.create(data, type_of_invite)

        institution = invite.institution_key.get()
        user.check_permission(
            'send_invite_inst',
            'User is not allowed to post invite', 
            institution.key.urlsafe())
        Utils._assert(institution.state == 'inactive',
                      "The institution has been deleted", NotAuthorizedException)

        invite.put()

        if(invite.stub_institution_key):
            invite.stub_institution_key.get().addInvite(invite)

        invite.sendInvite(user, host)

        make_invite = invite.make()

        self.response.write(json.dumps(make_invite))
