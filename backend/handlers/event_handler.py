# -*- coding: utf-8 -*-
"""Event Handler."""
import json
from google.appengine.ext import ndb

from models.event import Event
from utils import Utils
from utils import login_required
from utils import NotAuthorizedException
from utils import json_response
from util.json_patch import JsonPatch
from handlers.base_handler import BaseHandler


def is_event_author(method):
    """Check if the user is the author of the event."""
    def check_authorization(self, user, key, *args):
        obj_key = ndb.Key(urlsafe=key)
        event = obj_key.get()
        institution = event.institution_key.get()
        Utils._assert(event.author_key != user.key and
                      institution.admin != user.key,
                      'User is not allowed to edit this post',
                      NotAuthorizedException)
        method(self, user, key, *args)
    return check_authorization


class EventHandler(BaseHandler):
    """Event Handler."""

    @json_response
    @login_required
    def get(self, user, url_string):
        """Handle GET Requests."""
        event_key = ndb.Key(urlsafe=url_string)
        event = event_key.get()

        assert type(event) is Event, "Key is not an Event"
        event_json = Event.make(event)

        self.response.write(json.dumps(
            event_json
        ))

    @json_response
    @login_required
    @is_event_author
    def delete(self, user, key):
        """Change event state from 'published' to 'deleted'."""
        event_key = ndb.Key(urlsafe=key)
        event = event_key.get()
        event.state = 'deleted'
        event.last_modified_by = user.key
        event.last_modified_by_name = user.name
        event.put()

    @json_response
    @login_required
    @is_event_author
    def patch(self, user, key):
        """Handler PATCH Requests."""
        patch = self.request.body

        event = ndb.Key(urlsafe=key).get()
        event.verify_patch(patch)

        """Apply patch."""
        JsonPatch.load(patch, event)

        """Update event."""
        event.put()
