# -*- coding: utf-8 -*-
"""User Timeline handler test."""

from test_base_handler import TestBaseHandler
from models.user import User
from models.institution import Institution
from handlers.post_handler import PostHandler
from handlers.post_collection_handler import PostCollectionHandler
from handlers.user_timeline_handler import UserTimelineHandler
from google.appengine.ext import ndb


class UserTimelineHandlerTest(TestBaseHandler):
    """User Timeline handler test."""

    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        super(UserTimelineHandlerTest, cls).setUp()
        app = cls.webapp2.WSGIApplication(
            [("/api/user/timeline", UserTimelineHandler),
             ("/api/posts/(.*)", PostHandler),
             ("/api/posts", PostCollectionHandler)
             ], debug=True)
        cls.testapp = cls.webtest.TestApp(app)
        initModels(cls)

    def test_get(self):
        """Test the user_timeline_handler get method."""
        # Pretend an authentication
        self.os.environ['REMOTE_USER'] = 'mayzabeel@gmail.com'
        self.os.environ['USER_EMAIL'] = 'mayzabeel@gmail.com'
        # Added a post in datastore
        self.testapp.post_json("/api/posts", self.post_mayza)

        # Call the get method
        post = self.testapp.get("/api/user/timeline")
        # Update the objects
        post = (post.json)[0]
        key_post = ndb.Key(urlsafe=post['key'])
        post_obj = key_post.get()

        # Verify if the post was published and your informations
        self.assertEqual(post_obj.title, 'Novo edital do CERTBIO',
                         "The title expected was new post")
        self.assertEqual(post_obj.text, "At vero eos et accusamus et iusto odio",
                         "The text expected was new post")
        self.assertEqual(post_obj.state, 'published',
                         "The state of post should be published")

        # Call the delete method
        self.testapp.delete("/api/posts/%s" % post_obj.key.urlsafe())

        # Call the get method
        post = self.testapp.get("/api/user/timeline")
        # Update the objects
        post = (post.json)[0]
        key_post = ndb.Key(urlsafe=post['key'])
        post_obj = key_post.get()

        # Verify if the post was deleted and your informations
        self.assertEqual(post["title"], None,
                         "The title expected was null")
        self.assertEqual(post["text"], None,
                         "The text expected was null")
        self.assertEqual(post["state"], 'deleted',
                         "The state of post should be deleted")


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
    # new Institution CERTBIO
    cls.certbio = Institution()
    cls.certbio.name = 'CERTBIO'
    cls.certbio.cnpj = '18.104.068/0001-86'
    cls.certbio.legal_nature = 'public'
    cls.certbio.address = 'Universidade Federal de Campina Grande'
    cls.certbio.occupation_area = ''
    cls.certbio.description = 'Ensaio Químico'
    cls.certbio.email = 'certbio@ufcg.edu.br'
    cls.certbio.phone_number = '(83) 3322 4455'
    cls.certbio.members = [cls.mayza.key]
    cls.certbio.followers = [cls.mayza.key]
    cls.certbio.posts = []
    cls.certbio.admin = cls.mayza.key
    cls.certbio.put()
    # POST of Mayza To Certbio Institution
    cls.post_mayza = {
        'title': "Novo edital do CERTBIO",
        'text': "At vero eos et accusamus et iusto odio",
        'institution': cls.certbio.key.urlsafe()
    }
    cls.mayza.institutions = [cls.certbio.key]
    cls.mayza.follows = [cls.certbio.key]
    cls.mayza.put()
