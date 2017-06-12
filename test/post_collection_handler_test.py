# -*- coding: utf-8 -*-
"""Post handler test."""

from test_base import TestBase
from models.user import User
from models.institution import Institution
from handlers.post_collection_handler import PostCollectionHandler
from google.appengine.ext import ndb
import json


class PostHandlerTest(TestBase):
    """Test the post_handler class."""

    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        cls.test = cls.testbed.Testbed()
        cls.test.activate()
        cls.policy = cls.datastore.PseudoRandomHRConsistencyPolicy(
            probability=1)
        cls.test.init_datastore_v3_stub(consistency_policy=cls.policy)
        cls.test.init_memcache_stub()
        cls.ndb.get_context().set_cache_policy(False)
        app = cls.webapp2.WSGIApplication(
            [("/api/post", PostCollectionHandler),
             ], debug=True)
        cls.testapp = cls.webtest.TestApp(app)
        initModels(cls)

    def test_post(self):
        """Test the post_collection_handler's post method."""
        # Pretend an authentication
        self.os.environ['REMOTE_USER'] = 'mayzabeel@gmail.com'
        self.os.environ['USER_EMAIL'] = 'mayzabeel@gmail.com'
        # Make the request and assign the answer to post
        post = self.testapp.post_json("/api/post", {'title': 'new post',
                                                    'institution':
                                                    self.certbio.key.urlsafe(),
                                                    'text':
                                                    'testing new post'})
        # Retrieve the entities
        post = json.loads(post._app_iter[0])
        key_post = ndb.Key(urlsafe=post['key'])
        post_obj = key_post.get()
        self.certbio = self.certbio.key.get()
        self.mayza = self.mayza.key.get()
        # Check if the post's key is in institution and user
        self.assertTrue(key_post in self.mayza.posts,
                        "The post is not in user.posts")
        self.assertTrue(key_post in self.certbio.posts,
                        "The post is not in institution.posts")
        # Check if the post's attributes are the expected
        self.assertEqual(post_obj.title, 'new post',
                         "The title expected was new post")
        self.assertFalse(post_obj.title == 'newpost',
                         "The title shouldn't be newpost")
        self.assertEqual(post_obj.institution, self.certbio.key,
                         "The post's institution is not the expected one")
        self.assertEqual(post_obj.text,
                         'testing new post',
                         "The post's text is not the expected one")

        self.os.environ['REMOTE_USER'] = 'raoni.smaneoto@ccc.ufcg.edu.br'
        self.os.environ['USER_EMAIL'] = 'raoni.smaneoto@ccc.ufcg.edu.br'
        # Make the request and assign the answer to post
        post = self.testapp.post_json("/api/post", {'title': 'another post',
                                                    'institution':
                                                    self.certbio.key.urlsafe(),
                                                    'text':
                                                    'testing another post'})
        # Retrieve the entities
        post = json.loads(post._app_iter[0])
        key_post = ndb.Key(urlsafe=post['key'])
        post_obj = key_post.get()
        self.certbio = self.certbio.key.get()
        self.raoni = self.raoni.key.get()
        # Check if the post's key is in institution and user
        self.assertTrue(key_post in self.raoni.posts,
                        "The post is not in user.posts")
        self.assertTrue(key_post in self.certbio.posts,
                        "The post is not in institution.posts")
        # Check if the post's attributes are the expected
        self.assertEqual(post_obj.title, 'another post',
                         "The title expected was another post")
        self.assertFalse(post_obj.title == 'anotherpost',
                         "The title shouldn't be anotherpost")
        self.assertEqual(post_obj.institution, self.certbio.key,
                         "The post's institution is not the expected one")
        self.assertEqual(post_obj.text,
                         'testing another post',
                         "The post's text is not the expected one")

        # TODO:
        # Fix the post method.
        # The try except block prevents that FieldException be raised
        # @author Raoni Smaneoto 11-06-2017
        with self.assertRaises(Exception):
            self.testapp.post_json("/api/post", {'institution':
                                                 self.certbio.key.urlsafe(),
                                                 'text':
                                                 'testing another post'})

        with self.assertRaises(Exception):
            self.testapp.post_json("/api/post", {'institution':
                                                 self.certbio.key.urlsafe(),
                                                 'title':
                                                 'testing another post'})


def initModels(cls):
    """Init the models."""
    # new User Mayza
    cls.mayza = User()
    cls.mayza.name = 'Mayza Nunes'
    cls.mayza.cpf = '089.675.908-90'
    cls.mayza.email = 'mayzabeel@gmail.com'
    cls.mayza.institutions = []
    cls.mayza.follows = []
    cls.mayza.institutions_admin = []
    cls.mayza.notifications = []
    cls.mayza.posts = []
    cls.mayza.put()
    # new User Raoni
    cls.raoni = User()
    cls.raoni.name = 'Raoni Smaneoto'
    cls.raoni.cpf = '089.675.908-65'
    cls.raoni.email = 'raoni.smaneoto@ccc.ufcg.edu.br'
    cls.raoni.institutions = []
    cls.raoni.follows = []
    cls.raoni.institutions_admin = []
    cls.raoni.notifications = []
    cls.raoni.posts = []
    cls.raoni.put()
    # new Institution CERTBIO
    cls.certbio = Institution()
    cls.certbio.name = 'CERTBIO'
    cls.certbio.cnpj = '18.104.068/0001-86'
    cls.certbio.legal_nature = 'public'
    cls.certbio.address = 'Universidade Federal de Campina Grande'
    cls.certbio.occupation_area = ''
    cls.certbio.description = 'Ensaio Químico - Determinação de Material Volátil por \
            Gravimetria e Ensaio Biológico - Ensaio de Citotoxicidade'
    cls.certbio.email = 'certbio@ufcg.edu.br'
    cls.certbio.phone_number = '(83) 3322 4455'
    cls.certbio.members = [cls.mayza.key, cls.raoni.key]
    cls.certbio.followers = [cls.mayza.key, cls.raoni.key]
    cls.certbio.posts = []
    cls.certbio.admin = cls.mayza.key
    cls.certbio.put()
