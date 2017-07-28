# -*- coding: utf-8 -*-
"""Institution Followers Handler."""

from google.appengine.ext import ndb
import json

from utils import login_required
from utils import Utils
from utils import json_response

from models.institution import Institution

from handlers.base_handler import BaseHandler


class InstitutionFollowersHandler(BaseHandler):
    """Handle GET and POST followers of specific institution."""

    @json_response
    @login_required
    def get(self, user, url_string):
        """Get followers of specific institution."""
        institution_key = ndb.Key(urlsafe=url_string)
        institution = institution_key.get()

        array = [member.get() for member in institution.followers]

        self.response.write(json.dumps(Utils.toJson(array)))

    @json_response
    @login_required
    @ndb.transactional(xg=True)
    def post(self, user, url_string):
        """Add follower in the institution."""
        institution_key = ndb.Key(urlsafe=url_string)
        institution = institution_key.get()

        if(not type(institution) is Institution):
            raise Exception("Key is not an Institution")

        institution.follow(user.key)
        user.follow(institution_key)

    @json_response
    @login_required
    @ndb.transactional(xg=True)
    def delete(self, user, url_string):
        """Remove follower in the institution."""
        institution_key = ndb.Key(urlsafe=url_string)
        institution = institution_key.get()

        if(not type(institution) is Institution):
            raise Exception("Key is not an Institution")

        institution.unfollow(user.key)
        user.unfollow(institution_key)
