# -*- coding: utf-8 -*-
"""Tests of model request institution parent."""

from ..test_base import TestBase
from models.request_institution_parent import RequestInstitutionParent
from models.request_institution_children import RequestInstitutionChildren
from models.institution import Institution
from models.institution import Address
from custom_exceptions.fieldException import FieldException
from models.user import User


class RequestInstitutionParentTest(TestBase):
    """Class request institution parent tests."""

    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        cls.test = cls.testbed.Testbed()
        cls.test.activate()
        cls.policy = cls.datastore.PseudoRandomHRConsistencyPolicy(
            probability=1)
        cls.test.init_datastore_v3_stub(consistency_policy=cls.policy)
        cls.test.init_memcache_stub()
        initModels(cls)

    def test_create_request(self):
        """Test create new request."""
        data = {
            'sender_key': self.other_user.key.urlsafe(),
            'is_request': True,
            'admin_key': self.user_admin.key.urlsafe(),
            'institution_key': self.inst_test.key.urlsafe(),
            'institution_requested_key': self.inst_requested.key.urlsafe(),
            'type_of_invite': 'REQUEST_INSTITUTION_PARENT'
        }

        request = RequestInstitutionParent.create(data)
        request.put()

        self.assertEqual(
            request.sender_key,
            self.other_user.key,
            'The sender of request expected was other user')

        self.assertTrue(
            request.is_request,
            "The atribute is_request must be equal True")

        self.assertEqual(
            request.institution_key,
            self.inst_test.key,
            'The key of institution expected was inst test')

        self.assertEqual(
            request.institution_requested_key,
            self.inst_requested.key,
            'The key of institution requested expected was inst test')

        with self.assertRaises(FieldException) as ex:
            data = {
                'sender_key': self.other_user.key.urlsafe(),
                'is_request': True,
                'admin_key': self.user_admin.key.urlsafe(),
                'institution_key': self.inst_test.key.urlsafe(),
                'institution_requested_key': self.inst_requested_children.key.urlsafe(),
                'type_of_invite': 'REQUEST_INSTITUTION_PARENT'
            }

            RequestInstitutionParent.create(data)

        self.assertEqual(
            'The sender is already invited',
            str(ex.exception),
            'The sender is already invited')

    def test_create_request_for_institution_linked(self):
        """Test cretae invalid request."""
        with self.assertRaises(FieldException) as ex:
            data = {
                'sender_key': self.other_user.key.urlsafe(),
                'is_request': True,
                'admin_key': self.user_admin.key.urlsafe(),
                'institution_key': self.inst_requested.key.urlsafe(),
                'institution_requested_key': self.inst_requested_children.key.urlsafe(),
                'type_of_invite': 'REQUEST_INSTITUTION_PARENT'
            }

            RequestInstitutionParent.create(data)

        self.assertEqual(
            'The institutions is already a linked',
            str(ex.exception),
            'Expected message is The institutions is already a linked')

    def test_create_request_for_institution_with_parent(self):
        """Test cretae invalid request."""
        with self.assertRaises(FieldException) as ex:
            data = {
                'sender_key': self.other_user.key.urlsafe(),
                'is_request': True,
                'admin_key': self.user_admin.key.urlsafe(),
                'institution_key': self.inst_test.key.urlsafe(),
                'institution_requested_key': self.inst_requested_children.key.urlsafe(),
                'type_of_invite': 'REQUEST_INSTITUTION_CHILDREN'
            }

            RequestInstitutionChildren.create(data)

        self.assertEqual(
            'The institution invited has already parent',
            str(ex.exception),
            'The institution invited has already parent')

    def test_make_request_parent_institution(self):
        """Test method make por parent institution request."""
        data = {'sender_key': self.other_user.key.urlsafe(),
                'is_request': True,
                'admin_key': self.user_admin.key.urlsafe(),
                'institution_key': self.inst_test.key.urlsafe(),
                'institution_requested_key': self.inst_requested.key.urlsafe(),
                'type_of_invite': 'REQUEST_INSTITUTION_PARENT'
                }

        request = RequestInstitutionParent.create(data)
        request.put()

        make = {
            'status': 'sent',
            'institution_admin': {
                'name': self.inst_test.name
            },
            'sender': self.other_user.email,
            'institution_requested_key': self.inst_requested.key.urlsafe(),
            'admin_name': self.user_admin.name,
            'key': request.key.urlsafe(),
            'type_of_invite': 'REQUEST_INSTITUTION_PARENT',
            'institution_key': self.inst_test.key.urlsafe(),
            'institution': {
                'phone_number': None,
                'description': None,
                'name': 'inst test',
                'key': self.inst_test.key.urlsafe(),
                'address': 'street 01, neighbourhood, ' +
                'city, state, 000, country',
                'email': None,
                'photo_url': None
            },
        }

        request_make = request.make()
        for key in make.keys():
            if key == "institution":
                make_institution = make[key]
                request_institution = request_make[key]
                for inst_key in make_institution.keys():
                    self.assertEqual(
                        str(make_institution[inst_key]).encode('utf-8'),
                        str(request_institution[inst_key]).encode('utf-8'),
                        "The make object must be equal to variable make"
                    )
            else:
                self.assertEqual(
                    str(make[key]).encode('utf-8'),
                    str(request_make[key]).encode('utf-8'),
                    "The make object must be equal to variable make"
                )

    def test_make_request_children_institution(self):
        """Test method make for children institution request."""
        data = {'sender_key': self.other_user.key.urlsafe(),
                'is_request': True,
                'admin_key': self.user_admin.key.urlsafe(),
                'institution_key': self.inst_test.key.urlsafe(),
                'institution_requested_key': self.inst_requested.key.urlsafe(),
                'type_of_invite': 'REQUEST_INSTITUTION_CHILDREN'
                }

        request = RequestInstitutionChildren.create(data)
        request.put()

        make = {
            'status': 'sent',
            'institution_admin': {
                'name': self.inst_test.name
            },
            'sender': self.other_user.email,
            'institution_requested_key': self.inst_requested.key.urlsafe(),
            'admin_name': self.user_admin.name,
            'key': request.key.urlsafe(),
            'type_of_invite': 'REQUEST_INSTITUTION_CHILDREN',
            'institution_key': self.inst_test.key.urlsafe(),
            'institution': {
                'phone_number': None,
                'description': None,
                'name': 'inst test',
                'key': self.inst_test.key.urlsafe(),
                'address': 'street 01, neighbourhood, ' +
                'city, state, 000, country',
                'email': None,
                'photo_url': None
            },
        }

        request_make = request.make()
        for key in make.keys():
            if key == "institution":
                make_institution = make[key]
                request_institution = request_make[key]
                for inst_key in make_institution.keys():
                    self.assertEqual(
                        str(make_institution[inst_key]).encode('utf-8'),
                        str(request_institution[inst_key]).encode('utf-8'),
                        "The make object must be equal to variable make"
                    )
            else:
                self.assertEqual(
                    str(make[key]).encode('utf-8'),
                    str(request_make[key]).encode('utf-8'),
                    "The make object must be equal to variable make"
                )


def initModels(cls):
    """Init the models."""
    # new User
    cls.user_admin = User()
    cls.user_admin.name = 'User Admin'
    cls.user_admin.email = ['useradmin@test.com']
    cls.user_admin.put()
    # Other user
    cls.other_user = User()
    cls.other_user.name = 'Other User'
    cls.other_user.email = ['otheruser@test.com']
    cls.other_user.put()
    # new institution address
    cls.address = Address()
    cls.address.number = '01'
    cls.address.street = 'street'
    cls.address.neighbourhood = 'neighbourhood'
    cls.address.city = 'city'
    cls.address.state = 'state'
    cls.address.city = 'city'
    cls.address.cep = '000'
    cls.address.country = 'country'
    # new Institution inst test
    cls.inst_test = Institution()
    cls.inst_test.name = 'inst test'
    cls.inst_test.members = [cls.user_admin.key]
    cls.inst_test.followers = [cls.user_admin.key]
    cls.inst_test.admin = cls.user_admin.key
    cls.inst_test.address = cls.address
    cls.inst_test.put()
    # new Institution inst requested to be parent of inst test
    cls.inst_requested = Institution()
    cls.inst_requested.name = 'inst requested'
    cls.inst_requested.members = [cls.user_admin.key]
    cls.inst_requested.followers = [cls.user_admin.key]
    cls.inst_requested.admin = cls.user_admin.key
    cls.inst_requested.address = cls.address
    cls.inst_requested.put()
    # new Institution children of inst requested
    cls.inst_requested_children = Institution()
    cls.inst_requested_children.name = 'Children of Inst Requested'
    cls.inst_requested_children.members = [cls.user_admin.key]
    cls.inst_requested_children.followers = [cls.user_admin.key]
    cls.inst_requested_children.admin = cls.user_admin.key
    cls.inst_requested_children.parent_institution = cls.inst_requested.key
    cls.inst_requested_children.address = cls.address
    cls.inst_requested_children.put()
    # new Institution inst requested update with children institutions
    cls.inst_requested.children_institutions = [cls.inst_requested_children.key]
    cls.inst_requested.put()
    # Update institutions admin from User admin
    cls.user_admin.institutions_admin = [cls.inst_test.key, cls.inst_requested_children.key]
    cls.user_admin.put()
