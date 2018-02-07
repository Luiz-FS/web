# -*- coding: utf-8 -*-
"""Vote Handler."""

from google.appengine.ext import ndb
from utils import login_required
from utils import json_response
from handlers.base_handler import BaseHandler
from custom_exceptions.notAuthorizedException import NotAuthorizedException
from utils import Utils
import json

@ndb.transactional(retries=10)
def update_vote(survey_key, user_dict, options_selected):
    survey = survey_key.get()
    survey.vote(user_dict, options_selected)
    survey.put()

class VoteHandler(BaseHandler):
    """Vote Handler."""

    @json_response
    @login_required
    def post(self, user, survey_key):
        """Handle POST Requests."""
        survey_key = ndb.Key(urlsafe=survey_key)
        survey = survey_key.get()
        # The array contains options
        options_selected = json.loads(self.request.body)

        institution = survey.institution.get()
        Utils._assert(institution.state == 'inactive',
                      "The institution has been deleted", NotAuthorizedException)

        user_dict = {'name': user.name,
                     'photo_url': user.photo_url,
                     'key': user.key.urlsafe()}

        update_vote(survey_key, user_dict, options_selected)
