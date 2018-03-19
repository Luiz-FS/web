# -*- coding: utf-8 -*-
"""Invite User Adm Handler test."""


import json
import mocks

from test_base_handler import TestBaseHandler
from google.appengine.ext import ndb
from models.invite_user_adm import InviteUserAdm
from handlers.invite_user_adm_handler import InviteUserAdmHandler
from worker import TransferAdminPermissionsHandler
import permissions

from mock import patch

def addAdminPermission(user, institution_key):
    for permission in permissions.DEFAULT_ADMIN_PERMISSIONS:
        if permission in user.permissions:
            user.permissions[permission].update({institution_key: True})
        else:
            user.permissions.update({permission: {institution_key: True}})

def hasAdminPermissions(user, institution_key):
    for permission in permissions.DEFAULT_ADMIN_PERMISSIONS:
        if not user.has_permission(permission, institution_key):
            return False
    return True

class InviteUserAdmHandlerTest(TestBaseHandler):
    """Invite User Adm Handler Test."""
   
    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        super(InviteUserAdmHandlerTest, cls).setUp()
        app = cls.webapp2.WSGIApplication(
            [("/api/invites/(.*)/institution_adm", InviteUserAdmHandler),
            ("/api/queue/transfer-admin-permissions", TransferAdminPermissionsHandler)
             ], debug=True)
        cls.testapp = cls.webtest.TestApp(app)
    
    def enqueue_task(self, handler_selector, params):
        self.testapp.post('/api/queue/' + handler_selector, params)

    @patch.object(InviteUserAdm, 'send_notification')
    @patch('handlers.invite_user_adm_handler.enqueue_task')
    @patch('utils.verify_token', return_value={'email': 'usr_test@test.com'})
    def test_put(self, verify_token, enqueue_task, send_notification):
        """Test put method  in inviteUserAdmHandler."""
        enqueue_task.side_effect = self.enqueue_task

        admin = mocks.create_user()
        new_admin = mocks.create_user()

        institution = mocks.create_institution()
        institution.set_admin(admin.key)
        institution.add_member(admin)
        institution.add_member(new_admin)

        admin.add_institution_admin(institution.key)
        addAdminPermission(admin, institution.key.urlsafe())

        institution.put()
        admin.put()
        new_admin.put()
    
        verify_token._mock_return_value = {'email': new_admin.email[0]}
        invite = mocks.create_invite(admin, institution.key, 'USER_ADM', new_admin.key.urlsafe())

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'new_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )

        self.testapp.put('/api/invites/%s/institution_adm' %(invite.key.urlsafe()))

        institution = institution.key.get()
        admin = admin.key.get()
        new_admin = new_admin.key.get()
        invite = invite.key.get()

        self.assertFalse(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin should not have super user permissions for this institution!'    
        )
        self.assertTrue(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin must have super user permissions for this institution!'
        )
        self.assertEquals(
            new_admin.key, 
            institution.admin,
            'New_admin must be the administrator of the institution!'
        )
        self.assertEquals(
            invite.status, 
            'accepted',
            'Invitation status must be equal to accepted!'
        )
    
    @patch.object(InviteUserAdm, 'send_notification')
    @patch('handlers.invite_user_adm_handler.enqueue_task')
    @patch('utils.verify_token', return_value={'email': 'usr_test@test.com'})
    def test_put_invite_in_hierarchy(self, verify_token, enqueue_task, send_notification):
        """Test put invite in hierarchy."""
        enqueue_task.side_effect = self.enqueue_task

        admin = mocks.create_user()
        new_admin = mocks.create_user()
        other_admin = mocks.create_user()

        institution = mocks.create_institution()
        second_inst = mocks.create_institution()
        third_inst = mocks.create_institution()

        institution.set_admin(admin.key)
        institution.add_member(admin)
        institution.add_member(new_admin)
        institution.children_institutions = [second_inst.key]

        second_inst.set_admin(other_admin.key)
        second_inst.add_member(other_admin)
        second_inst.parent_institution = institution.key
        second_inst.children_institutions = [third_inst.key]

        third_inst.set_admin(admin.key)
        third_inst.add_member(admin)
        third_inst.parent_institution = second_inst.key

        admin.add_institution_admin(institution.key)
        admin.add_institution_admin(third_inst.key)
        other_admin.add_institution_admin(second_inst.key)
        addAdminPermission(admin, institution.key.urlsafe())
        addAdminPermission(admin, second_inst.key.urlsafe())
        addAdminPermission(admin, third_inst.key.urlsafe())
        addAdminPermission(other_admin, second_inst.key.urlsafe())

        institution.put()
        second_inst.put()
        third_inst.put()
        admin.put()
        new_admin.put()
        other_admin.put()
    
        verify_token._mock_return_value = {'email': new_admin.email[0]}
        invite = mocks.create_invite(admin, institution.key, 'USER_ADM', new_admin.key.urlsafe())

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertTrue(
            hasAdminPermissions(admin, second_inst.key.urlsafe()),
            'Admin must have super user permissions for second_inst institution!'
        )
        self.assertTrue(
            hasAdminPermissions(admin, third_inst.key.urlsafe()),
            'Admin must have super user permissions for third_inst institution!'
        )
        self.assertTrue(
            hasAdminPermissions(other_admin, second_inst.key.urlsafe()),
            'other_admin must have super user permissions for second_inst institution!'    
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'new_admin should not have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, second_inst.key.urlsafe()),
            'new_admin should not have super user permissions for the second_inst institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, third_inst.key.urlsafe()),
            'new_admin should not have super user permissions for the third_inst institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )

        self.testapp.put('/api/invites/%s/institution_adm' %(invite.key.urlsafe()))

        institution = institution.key.get()
        second_inst = second_inst.key.get()
        third_inst = third_inst.key.get()
        admin = admin.key.get()
        new_admin = new_admin.key.get()
        other_admin.key.get()
        invite = invite.key.get()

        self.assertFalse(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'admin should not have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(admin, second_inst.key.urlsafe()),
            'admin should not have super user permissions for the third_inst institution!'
        )
        self.assertTrue(
            hasAdminPermissions(admin, third_inst.key.urlsafe()),
            'Admin must have super user permissions for third_inst institution!'    
        )
        self.assertTrue(
            hasAdminPermissions(other_admin, second_inst.key.urlsafe()),
            'other_admin must have super user permissions for second_inst institution!'
        )
        self.assertTrue(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'new_admin must have super user permissions for this institution!'
        )
        self.assertTrue(
            hasAdminPermissions(new_admin, second_inst.key.urlsafe()),
            'New_admin must have super user permissions for second_inst institution!'
        )
        self.assertTrue(
            hasAdminPermissions(new_admin, third_inst.key.urlsafe()),
            'New_admin must have super user permissions for third_inst institution!'
        )
        self.assertEquals(
            new_admin.key, 
            institution.admin,
            'New_admin must be the administrator of the institution!'
        )

    @patch('utils.verify_token', return_value={'email': 'usr_test@test.com'})
    def test_put_accepted_and_rejected_invite(self, verify_token):
        """Test put accepted and rejected invite."""
        admin = mocks.create_user()
        new_admin = mocks.create_user()

        institution = mocks.create_institution()
        institution.set_admin(admin.key)
        institution.add_member(admin)
        institution.add_member(new_admin)

        admin.add_institution_admin(institution.key)
        addAdminPermission(admin, institution.key.urlsafe())

        institution.put()
        admin.put()
        new_admin.put()
    
        invite = mocks.create_invite(admin, institution.key, 'USER_ADM', new_admin.key.urlsafe())
        invite.change_status('accepted')

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )

        with self.assertRaises(Exception) as raises_context:
            self.testapp.put('/api/invites/%s/institution_adm' %(invite.key.urlsafe()))
        
        institution = institution.key.get()
        admin = admin.key.get()
        new_admin = new_admin.key.get()

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )
        self.assertEquals(
            invite.status, 
            'accepted',
            'Invitation status must be equal to accepted!'
        )

        message_exception = self.get_message_exception(str(raises_context.exception))
        self.assertEqual(
            message_exception, 
            'Error! This invitation has already been processed',
            'Expected message of exception must be equal to Error! This invitation has already been processed'
        )

        invite.change_status('rejected')

        with self.assertRaises(Exception) as raises_context:
            self.testapp.put('/api/invites/%s/institution_adm' %(invite.key.urlsafe()))
        
        institution = institution.key.get()
        admin = admin.key.get()
        new_admin = new_admin.key.get()
        invite = invite.key.get()

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )
        self.assertEquals(
            invite.status, 
            'rejected',
            'Invitation status must be equal to rejected!'
        )

        message_exception = self.get_message_exception(str(raises_context.exception))
        self.assertEqual(
            message_exception, 
            'Error! This invitation has already been processed',
            'Expected message of exception must be equal to Error! This invitation has already been processed'
        )

    @patch('utils.verify_token', return_value={'email': 'usr_test@test.com'})
    def test_put_invite_not_allowed(self, verify_token):
        """Test put invite not allowed."""
        admin = mocks.create_user()
        new_admin = mocks.create_user()

        institution = mocks.create_institution()
        institution.set_admin(admin.key)
        institution.add_member(admin)
        institution.add_member(new_admin)

        admin.add_institution_admin(institution.key)
        addAdminPermission(admin, institution.key.urlsafe())

        institution.put()
        admin.put()
        new_admin.put()
    
        invite = mocks.create_invite(admin, institution.key, 'USER')

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'    
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )

        with self.assertRaises(Exception) as raises_context:
            self.testapp.put('/api/invites/%s/institution_adm' %(invite.key.urlsafe()))
        
        institution = institution.key.get()
        admin = admin.key.get()
        new_admin = new_admin.key.get()
        invite = invite.key.get()

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()), 
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )
        self.assertEquals(
            invite.status, 
            'sent',
            'Invitation status must be equal to sent!'
        )

        message_exception = self.get_message_exception(str(raises_context.exception))
        self.assertEqual(
            message_exception, 
            'Error! Invitation type not allowed',
            'Expected message of exception must be equal to Error! Invitation type not allowed'
        )

    @patch.object(InviteUserAdm, 'send_notification')
    @patch('utils.verify_token', return_value={'email': 'usr_test@test.com'})
    def test_delete(self, verify_token, send_notification):
        """Test reject invite."""
        admin = mocks.create_user()
        new_admin = mocks.create_user()

        institution = mocks.create_institution()
        institution.set_admin(admin.key)
        institution.add_member(admin)
        institution.add_member(new_admin)

        admin.add_institution_admin(institution.key)
        addAdminPermission(admin, institution.key.urlsafe())

        institution.put()
        admin.put()
        new_admin.put()
    
        invite = mocks.create_invite(admin, institution.key, 'USER_ADM', new_admin.key.urlsafe())
        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()), 
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )

        self.testapp.delete('/api/invites/%s/institution_adm' %(invite.key.urlsafe()))
        
        institution = institution.key.get()
        admin = admin.key.get()
        new_admin = new_admin.key.get()
        invite = invite.key.get()

        self.assertTrue(
            hasAdminPermissions(admin, institution.key.urlsafe()),
            'Admin must have super user permissions for this institution!'
        )
        self.assertFalse(
            hasAdminPermissions(new_admin, institution.key.urlsafe()),
            'New_admin should not have super user permissions for this institution!'
        )
        self.assertEquals(
            admin.key, 
            institution.admin,
            'Admin must be the administrator of the institution!'
        )
        self.assertEquals(
            invite.status, 
            'rejected',
            'Invitation status must be equal to rejected!'
        )
