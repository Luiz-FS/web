# -*- coding: utf-8 -*-
"""Invite Handler Test."""

import json
import mocks

from test_base_handler import TestBaseHandler
from search_module.search_institution import SearchInstitution
from models.invite_user import InviteUser
from models.invite import Invite
from models.invite_institution import InviteInstitution
from handlers.invite_handler import InviteHandler
from mock import patch

CURRENT_INSTITUTION = {'name': 'currentInstitution'}
CURRENT_INST_STRING = json.dumps(CURRENT_INSTITUTION)

class InviteHandlerTest(TestBaseHandler):
    """Invite Handler Test."""

    INVITE_URI = "/api/invites/(.*)"

    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        super(InviteHandlerTest, cls).setUp()

        methods = set(cls.webapp2.WSGIApplication.allowed_methods)
        methods.add('PATCH')
        cls.webapp2.WSGIApplication.allowed_methods = frozenset(methods)

        app = cls.webapp2.WSGIApplication(
            [(InviteHandlerTest.INVITE_URI, InviteHandler),
             ], debug=True)
        cls.testapp = cls.webtest.TestApp(app)
        
        # create models
        # new User
        cls.user_admin = mocks.create_user('useradmin@test.com')
        # Other user
        cls.other_user = mocks.create_user('otheruser@test.com')
        # new Institution inst test
        cls.inst_test = mocks.create_institution()
        cls.inst_test.admin = cls.user_admin.key
        cls.inst_test.put()
        # New invite user
        cls.data = {
            'invitee': 'otheruser@test.com',
            'admin_key': cls.user_admin.key.urlsafe(),
            'institution_key': cls.inst_test.key.urlsafe(),
            'type_of_invite': 'USER'
        }
        cls.invite = InviteUser.create(cls.data)
        cls.invite.put()


    @patch('utils.verify_token', return_value={'email': 'otheruser@test.com'})
    def test_get(self, verify_token):
        """Test method get of InviteHandler."""
        response = self.testapp.get('/api/invites/' +
                                    self.invite.key.urlsafe())
        invite = json.loads(response._app_iter[0])

        self.assertEqual(
            invite,
            self.invite.make(),
            "Expected invite should be equal to make")

    @patch.object(Invite, 'send_notification')
    @patch('utils.verify_token', return_value={'email': 'otheruser@test.com'})
    def test_delete(self, verify_token, send_notification):
        """Test method delete of InviteHandler."""
        # create innvite institution
        self.data['suggestion_institution_name'] = 'new Institution'
        self.data['type_of_invite'] = 'INSTITUTION'
        invite_institution = InviteInstitution.create(self.data)
        invite_institution.admin_key = self.user_admin.key
        invite_institution.put()
        # get stub institution
        stub_institution = invite_institution.stub_institution_key.get()
        search_institution = SearchInstitution()
        stub_inst_document = search_institution.getDocuments(
            stub_institution.name,
            'pending'
        )
        searched_inst = stub_inst_document[0]

        self.assertEqual(
            stub_institution.state,
            'pending', 'The stub institution state should be pending'
        )

        self.assertEqual(
            searched_inst.get('name'),
            stub_institution.name,
            "The searched institution should have \
            the same name as the stub institution"
        )

        self.assertEqual(
            searched_inst.get('state'),
            'pending', "The searched institution state should be pending"
        )

        self.testapp.delete('/api/invites/%s' % invite_institution.key.urlsafe())

        # update invite_institution, stub_institution and stub_inst_document
        invite_institution = invite_institution.key.get()
        stub_institution = invite_institution.stub_institution_key.get()
        stub_inst_document = search_institution.getDocuments(
            stub_institution.name,
            'inactive'
        )
        searched_inst = stub_inst_document[0]

        self.assertEqual(
            invite_institution.status,
            'rejected',
            "Expected status should be equal to rejected")

        self.assertEqual(
            stub_institution.state,
            'inactive', 'The stub institution state should be inactive'
        )

        self.assertEqual(
            searched_inst.get('name'),
            stub_institution.name,
            "The searched institution should have \
            the same name as the stub institution"
        )

        self.assertEqual(
            searched_inst.get('state'),
            'inactive', "The searched institution state should be inactive"
        )
        # assert the notification was sent
        send_notification.assert_called_with(
            current_institution=None, # The first invite the user doesn't have current_institution 
            sender_key=self.other_user.key,
            receiver_key=self.user_admin.key,
            entity_type='REJECT_INVITE_INSTITUTION'
        )

    @patch.object(Invite, 'send_notification')
    @patch('utils.verify_token', return_value={'email': 'otheruser@test.com'})
    def test_patch(self, verify_token, send_notification):
        """Test method patch of InviteHandler."""
        profile = '{"email": "otheruser@test.com", "office": "Developer", "institution_key": "%s"}' % self.inst_test.key.urlsafe()
        json_patch = '[{"op": "add", "path": "/institution_profiles/-", "value": ' + profile + '}]'
        self.testapp.patch(
            '/api/invites/%s'
            % self.invite.key.urlsafe(),
            json_patch
        )
    
        invite = self.invite.key.get()
        self.assertEqual(
            invite.status,
            'accepted',
            "Expected status should be equal to accepted")

        user = self.other_user.key.get()

        self.assertEqual(
            user.institutions[0],
            self.inst_test.key,
            "Expected institutions should be equal to inst_test")

        self.assertEqual(
            len(user.institution_profiles),
            1,
            "Expected len of institutions_profiles should be equal to 1")

        self.assertEqual(
            user.state,
            'active',
            "Expected state should be equal to active")

        send_notification.assert_called_with(
            current_institution=None, # The first invite the user doesn't have current_institution 
            sender_key=self.other_user.key, 
            receiver_key=self.user_admin.key,
            entity_type="ACCEPT_INVITE_USER"
        )

    @patch.object(Invite, 'send_notification')
    @patch('utils.verify_token', return_value={'email': 'otheruser@test.com'})
    def test_patch_fail(self, verify_token, send_notification):
        """Test patch fail in InviteHandler because the profile has not office."""
        profile = '{"email": "otheruser@test.com"}'
        json_patch = '[{"op": "add", "path": "/institution_profiles/-", "value": ' + profile + '}]'

        with self.assertRaises(Exception) as ex:
            self.testapp.patch(
                '/api/invites/%s'% self.invite.key.urlsafe(),
                json_patch
            )

        exception_message = self.get_message_exception(str(ex.exception))

        self.assertEqual(
            exception_message,
            'Error! The profile is invalid.',
            "Expected exception_message should be equal to 'Error! The profile is invalid.'")
        
        # assert the notification was not sent
        send_notification.assert_not_called()
    
    @patch('utils.verify_token', return_value={'email': 'otheruser@test.com'})
    def test_patch_with_a_user_that_is_already_a_member(self, verify_token):
        """Test a patch invite_user when the user is already a member."""
        self.inst_test.add_member(self.other_user)
        self.other_user.add_institution(self.inst_test.key)

        with self.assertRaises(Exception) as raises_context:
            self.testapp.patch(
                '/api/invites/%s'
                % self.invite.key.urlsafe()
            )

        message_exception = self.get_message_exception(
            str(raises_context.exception))

        self.assertEqual(
            message_exception,
            "Error! The user is already a member",
            "Expected exception message must be equal to "
            "Error! The user is already a member")
