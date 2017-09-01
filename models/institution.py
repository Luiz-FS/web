"""Institution Model."""
from google.appengine.ext import ndb

import search_module


def get_occupation_area(data):
    """Get the institution occupation area."""
    if data.get('occupation_area') == 'other':
        return data.get('other_area')
    return data.get('occupation_area')


class Address(ndb.Model):
    """Address model."""

    number = ndb.StringProperty()

    street = ndb.StringProperty()

    neighbourhood = ndb.StringProperty()

    city = ndb.StringProperty()

    state = ndb.StringProperty()

    cep = ndb.StringProperty()

    country = ndb.StringProperty()

    # House Number, Street Name, City, State, Zip, Country
    def get_full_address(self):
        """Get the full address."""
        full_address = "%s %s, %s, %s, %s, %s" % (self.number, self.street,
                                                  self.city, self.state,
                                                  self.zip, self.country)
        return full_address


class Institution(ndb.Model):
    """Model of Institution."""

    name = ndb.StringProperty(required=True)

    acronym = ndb.StringProperty()

    cnpj = ndb.StringProperty()

    legal_nature = ndb.StringProperty(
        choices=set(["public", "private", "philanthropic"]))

    address = ndb.StructuredProperty(Address)

    occupation_area = ndb.StringProperty() 

    description = ndb.TextProperty()

    photo_url = ndb.StringProperty()

    portfolio_url = ndb.StringProperty(indexed=False)

    # Email of the admin
    email = ndb.StringProperty()

    # Institutional email
    institutional_email = ndb.StringProperty()

    website_url = ndb.StringProperty(indexed=False)

    phone_number = ndb.StringProperty()

    # Bollean that represents if the institution is empowered or not.
    empowered = ndb.BooleanProperty(indexed=False, default=False)

    # Name of the leader
    leader = ndb.StringProperty()

    # The admin user of this institution
    admin = ndb.KeyProperty(kind="User")

    # The parent institution
    # Value is None for institutions without parent
    # User query to retrieve children institutions
    parent_institution = ndb.KeyProperty(kind="Institution")

    # The children institutions
    # Value is None for institutions without children
    children_institutions = ndb.KeyProperty(kind="Institution", repeated=True)

    # Key of invite to create institution
    invite = ndb.KeyProperty(kind="Invite")

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
        if user not in self.followers:
            self.followers.append(user)
            self.put()

    def unfollow(self, user):
        """Remove one user in collection of followers."""
        if user in self.followers and user not in self.members:
            self.followers.remove(user)
            self.put()

    def add_member(self, member):
        """Add a new member to the institution."""
        if member.key not in self.members:
            self.members.append(member.key)
            self.put()

    def remove_member(self, member):
        """Remove a member from institution."""
        if member.key in self.members:
            self.members.remove(member.key)
            self.put()

    def addInvite(self, invite):
        """Add invite in institution."""
        self.invite = invite.key
        self.put()


    @staticmethod
    @ndb.transactional(xg=True)
    def create_parent_connection(institution, invite):
        """Makes connections between parent and daughter institution."""
        institution.children_institutions = [invite.institution_key]
        institution.put()

        institution_children = invite.institution_key.get()
        institution_children.parent_institution = institution.key
        institution_children.put()

        return institution

    @staticmethod
    @ndb.transactional(xg=True)
    def create_children_connection(institution, invite):
        """Makes connections between daughter and parent institution."""
        institution.parent_institution = invite.institution_key
        institution.put()

        parent_institution = invite.institution_key.get()
        parent_institution.children_institutions.append(institution.key)
        parent_institution.put()

        return institution

    @staticmethod
    @ndb.transactional(xg=True)
    def create_inst_stub(invite):
        """Create a stub of institution."""
        institution_stub = Institution()
        institution_stub.name = invite.suggestion_institution_name
        institution_stub.email = invite.invitee
        institution_stub.state = 'pending'

        institution_stub.put()
        search_module.createDocument(institution_stub)

        return institution_stub

    @ndb.transactional(xg=True)
    def createInstitutionWithStub(self, user, inviteKey, institution):
        invite = ndb.Key(urlsafe=inviteKey).get()

        invite.status = 'accepted'
        invite.put()

        institution.admin = user.key
        institution.members.append(user.key)
        institution.followers.append(user.key)
        institution.state = 'active'
        if (institution.photo_url is None):
            institution.photo_url = "/images/institution.jpg"
        institution.put()

        user.add_institution(institution.key)

        user.institutions_admin.append(institution.key)
        user.state = "active"
        user.follows.append(institution.key)
        user.put()

        return institution

    @ndb.transactional(xg=True)
    def remove_institution(self, remove_hierarchy, user):
        """Remove an institution.

        Keyword arguments:
        remove_hierarchy -- string the represents if the institution's hiearchy
        will be removed
        user -- the admin of the institution.
        """
        self.state = "inactive"
        search_module.deleteDocument(self.key.urlsafe())
        user.unfollow(self.key)
        user.remove_institution(self.key)
        # Remove the hierarchy
        if remove_hierarchy == "true":
            self.remove_institution_hierarchy(remove_hierarchy, user)
        # Change the parent's and children's pointers
        elif self.parent_institution:
            self.remove_parent_connection()
        # Change the children's pointers if there is no parent
        else:
            self.set_parent_for_none()
        self.put()

    def remove_link(self, institution_link, is_parent):
        """Remove the connection between self and institution_link."""
        if is_parent == "true":
            self.parent_institution = None
        else:
            self.children_institutions.remove(institution_link.key)
        self.put()

    def remove_institution_hierarchy(self, remove_hierarchy, user):
        """Remove institution's hierarchy."""
        for child in self.children_institutions:
                child = child.get()
                child.remove_institution(remove_hierarchy, user)

    def remove_parent_connection(self):
        """Change parent connection when remove an institution."""
        parent = self.parent_institution.get()
        parent.children_institutions.remove(self.key)
        for child in self.children_institutions:
            parent.children_institutions.append(child)
            child = child.get()
            child.parent_institution = parent.key
            child.put()
        parent.put()

    def set_parent_for_none(self):
        """Set parent of the children institutions for none when remove an institution."""
        for child in self.children_institutions:
            child = child.get()
            child.parent_institution = None
            child.put()

    @ndb.transactional(xg=True)
    def remove_institution_from_users(self, remove_hierarchy):
        """Remove institution from members/followers list.

        This method allows this procedure to be done in a queue.
        """
        for follower in self.followers:
            follower = follower.get()
            follower.unfollow(self.key)
        for member in self.members:
            member = member.get()
            member.remove_institution(self.key)
        if remove_hierarchy == "true":
            for child in self.children_institutions:
                child = child.get()
                child.remove_institution_from_users(remove_hierarchy)

    def make(self, attributes):
        """Create an institution dictionary with specific filds."""
        institution = {}
        for attribute in attributes:
            attr_value = getattr(self, attribute)
            if(isinstance(attr_value, ndb.Key)):
                if attribute != 'parent_institution':
                    attr_value = self.key.urlsafe()
                elif self.parent_institution:
                    attr_value = self.parent_institution.urlsafe()
            if((attribute == "invite") and attr_value):
                invite_key = self.key.get().invite
                attr_value = {
                    'suggestion_institution_name': invite_key.get().suggestion_institution_name,
                    'key': invite_key.urlsafe()
                }
            institution[attribute] = attr_value
        return institution
