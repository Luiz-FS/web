# -*- coding: utf-8 -*-
"""Institution Children Collection request handler test."""

import json
from test_base_handler import TestBaseHandler
from models import User
from models.institution import Institution
from models.institution import Address
from handlers.institution_children_request_collection_handler import InstitutionChildrenRequestCollectionHandler
import mocks

from mock import patch

ADMIN = {'email': 'user1@gmail.com'}
USER = {'email': 'otheruser@ccc.ufcg.edu.br'}


class InstitutionChildrenRequestCollectionHandlerTest(TestBaseHandler):
    """Test the handler InstitutionParentRequestCollectionHandler."""

    REQUEST_URI = "/api/institutions/(.*)/requests/institution_children"

    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        super(InstitutionChildrenRequestCollectionHandlerTest, cls).setUp()
        app = cls.webapp2.WSGIApplication(
            [(InstitutionChildrenRequestCollectionHandlerTest.REQUEST_URI, InstitutionChildrenRequestCollectionHandler),
             ], debug=True)
        cls.testapp = cls.webtest.TestApp(app)

    @patch('utils.verify_token', return_value=ADMIN)
    def test_post(self, verify_token):
        """Test method post of InstitutionParentRequestCollectionHandler."""
        admin = mocks.create_user(ADMIN['email'])
        institution = mocks.create_institution()
        admin.institutions_admin = [institution.key]
        admin.add_institution(institution.key)
        institution.admin = admin.key
        admin.add_permission("send_link_inst_request",
                             institution.key.urlsafe())
        admin.put()
        institution.put()
        other_user = mocks.create_user(USER['email'])
        inst_requested = mocks.create_institution()
        admin_requested = mocks.create_user(ADMIN['email'])
        admin.institutions_admin = [inst_requested.key]
        admin.add_institution(inst_requested.key)
        admin_requested.put()
        inst_requested.admin = admin_requested.key
        inst_requested.put()

        data = {
            'sender_key': admin.key.urlsafe(),
            'is_request': True,
            'admin_key': admin_requested.key.urlsafe(),
            'institution_key': institution.key.urlsafe(),
            'institution_requested_key': inst_requested.key.urlsafe(),
            'type_of_invite': 'REQUEST_INSTITUTION_CHILDREN'
        }

        request = self.testapp.post_json("/api/institutions/" + institution.key.urlsafe() + "/requests/institution_children", data,
                                         headers={'institution-authorization': institution.key.urlsafe()})

        request = json.loads(request._app_iter[0])

        institution = institution.key.get()

        self.assertEqual(
            request['sender'],
            admin.email,
            'Expected sender email is user1@gmail.com')
        self.assertEqual(
            request['admin_name'],
            admin_requested.name,
            'Expected admin is admin_requested is User Admin')
        self.assertEqual(
            request['type_of_invite'],
            'REQUEST_INSTITUTION_CHILDREN',
            'Expected sender type_of_invite is REQUEST_INSTITUTION_CHILDREN')
    
    @patch('utils.verify_token', return_value=ADMIN)
    def test_post_with_wrong_institution(self, verify_token):
        """Test post with wrong institution."""
        admin = mocks.create_user(ADMIN['email'])
        institution = mocks.create_institution()
        institution.add_member(admin)
        admin.add_institution(institution.key)
        admin.add_institution_admin(institution.key)
        admin.add_institution(institution.key)
        institution.set_admin(admin.key)
        admin.add_permission("send_link_inst_request",
                             institution.key.urlsafe())
        admin.put()
        institution.put()
        inst_requested = mocks.create_institution()
        admin_requested = mocks.create_user(USER['email'])
        inst_requested.add_member(admin_requested)
        admin.add_institution(inst_requested.key)
        admin.add_institution_admin(inst_requested.key)
        admin.add_institution(inst_requested.key)
        admin_requested.put()
        inst_requested.set_admin(admin_requested.key)
        inst_requested.put()

        data = {
            'sender_key': admin.key.urlsafe(),
            'is_request': True,
            'admin_key': admin_requested.key.urlsafe(),
            'institution_key': institution.key.urlsafe(),
            'institution_requested_key': inst_requested.key.urlsafe(),
            'type_of_invite': 'REQUEST_INSTITUTION_CHILDREN'
        }

        with self.assertRaises(Exception) as ex:
            self.testapp.post_json("/api/institutions/" + inst_requested.key.urlsafe() + "/requests/institution_children", data,
                                         headers={'institution-authorization': institution.key.urlsafe()})

        exception_message = self.get_message_exception(ex.exception.message)
        self.assertEqual(
            "Error! User is not allowed to send request",
            exception_message,
            "Expected error message is Error! User is not allowed to send request")

    @patch('utils.verify_token', return_value=USER)
    def test_post_user_not_admin(self, verify_token):
        # Test post request with user is not admin.
        admin = mocks.create_user(ADMIN['email'])
        institution = mocks.create_institution()
        admin.institutions_admin = [institution.key]
        institution.admin = admin.key
        admin.add_permission("send_link_inst_request",
                             institution.key.urlsafe())
        admin.put()
        institution.put()
        other_user = mocks.create_user(USER['email'])
        inst_requested = mocks.create_institution()
        admin_requested = mocks.create_user(ADMIN['email'])
        admin.institutions_admin = [inst_requested.key]
        admin_requested.put()
        inst_requested.admin = admin_requested.key
        inst_requested.put()
        data = {
            'sender_key': other_user.key.urlsafe(),
            'is_request': True,
            'admin_key': admin.key.urlsafe(),
            'institution_key': institution.key.urlsafe(),
            'institution_requested_key': inst_requested.key.urlsafe(),
            'type_of_invite': 'REQUEST_INSTITUTION_CHILDREN'
        }

        with self.assertRaises(Exception) as ex:
            self.testapp.post_json(
                "/api/institutions/" + institution.key.urlsafe() + "/requests/institution_children",
                data)

        exception_message = self.get_message_exception(ex.exception.message)
        self.assertEqual(
            "Error! User is not allowed to send request",
            exception_message,
            "Expected error message is Error! User is not allowed to send request")
