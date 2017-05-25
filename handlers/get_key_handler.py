# -*- coding: utf-8 -*-
"""Get Key Timeline Handler."""

import json

from google.appengine.ext import ndb

from utils import Utils
from utils import login_required
from utils import json_response

from handlers.base_handler import BaseHandler


class GetKeyHandler(BaseHandler):
    """Handle generic key requests."""

    @json_response
    @login_required
    def get(self, user, url_string):
        """GET request passing url_safe."""
        obj_key = ndb.Key(urlsafe=url_string)
        obj = obj_key.get()
        self.response.write(json.dumps(
            Utils.toJson(obj, host=self.request.host)
        ))
