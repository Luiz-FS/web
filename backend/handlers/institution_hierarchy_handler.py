# -*- coding: utf-8 -*-
"""Institution Hierarchy Handler."""

from google.appengine.ext import ndb

from utils import Utils
from utils import login_required
from utils import json_response
from custom_exceptions.notAuthorizedException import NotAuthorizedException
from custom_exceptions.entityException import EntityException

from models.institution import Institution

from service_messages import send_message_notification
from service_entities import enqueue_task
import json

from handlers.base_handler import BaseHandler


class InstitutionHierarchyHandler(BaseHandler):
    """Institution Hierarchy Handler."""

    @json_response
    @login_required
    @ndb.transactional(xg=True)
    def delete(self, user, institution_key, institution_link):
        """
        Handle delete link between institutions.

        This handler remove the link between two institutions. 
        If the parameter isParent is true, it means that the removal 
        request has been made from a child institution, otherwise 
        the request has been made by a parent institution.
        """

        user.check_permission('remove_link',
                              "User is not allowed to remove link between institutions",
                              institution_key)

        is_parent = self.request.get('isParent')
        # If isParent is true, this attribute 
        # holds the reference of the child intitution.
        institution = ndb.Key(urlsafe=institution_key).get()
        # If isParent is true, this attribute 
        # holds the reference of the parent intitution.
        institution_link = ndb.Key(urlsafe=institution_link).get()

        Utils._assert(not type(institution) is Institution,
                      "Key is not an institution", EntityException)
        Utils._assert(not type(institution_link) is Institution,
                      "Key is not an institution", EntityException)
        Utils._assert(institution.state == 'inactive',
                      "The institution has been deleted", NotAuthorizedException)
        Utils._assert(institution_link.state == 'inactive',
                      "The institution has been deleted", NotAuthorizedException)

        institution.remove_link(institution_link, is_parent)
        admin = institution_link.admin

        if is_parent == "true":
            enqueue_task('remove-admin-permissions', {'institution_key': institution.key.urlsafe(), 'user': admin.urlsafe()})
        else:
            enqueue_task('remove-admin-permissions', {'institution_key': institution_link.key.urlsafe(), 'user': user.key.urlsafe()})
        
        entity_type = 'INSTITUTION'
        send_message_notification(
            admin.urlsafe(),
            user.key.urlsafe(),
            entity_type,
            institution_link.key.urlsafe(),
            user.current_institution
        )
