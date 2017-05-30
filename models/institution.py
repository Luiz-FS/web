"""Institution Model."""
from google.appengine.ext import ndb


class Institution(ndb.Model):
    """Model of Institution."""

    name = ndb.StringProperty(required=True)

    cnpj = ndb.StringProperty()

    legal_nature = ndb.StringProperty(
        choices=set(["public", "private", "philanthropic"]))

    address = ndb.StringProperty()

    occupation_area = ndb.StringProperty()

    description = ndb.TextProperty()

    image_url = ndb.StringProperty()

    email = ndb.StringProperty()

    phone_number = ndb.StringProperty()

    # The admin user of this institution
    admin = ndb.KeyProperty(kind="User")

    # The parent institution
    # Value is None for institutions without parent
    # User query to retrieve children institutions
    parent_institution = ndb.KeyProperty(kind="Institution")

    # The ids of users who are members of this institution
    members = ndb.KeyProperty(kind="User", repeated=True)

    # Users subscribed to this institution's posts
    # All these followers receive copies of the posts
    # of this institution in their timeline.
    followers = ndb.KeyProperty(kind="User", repeated=True)

    # Posts created by members of this institution
    posts = ndb.KeyProperty(kind="Post", repeated=True)

    # TODO: First version don't have timeline. Do After
    # @author: Mayza Nunes 22/05/2017
    # timeline = ndb.KeyProperty(kind="Timeline")

    state = ndb.StringProperty(choices=set([
        'pending',
        'active',
        'inactive'
    ]), default='pending')

    def follow(self, user):
        """Add one user in collection of followers."""
        if(not (user in self.followers)):
            self.followers.append(user)
            self.put()
