"""Event Model."""
import json
from datetime import datetime
from google.appengine.ext import ndb
from custom_exceptions import FieldException
from models import Address
from search_module import SearchEvent
from custom_exceptions import NotAllowedException
from service_messages import create_message

__all__ = ['Event']

class Event(ndb.Model):
    """Model of a event."""

    # Title of the event
    title = ndb.StringProperty(required=True)

    # Image uploaded
    photo_url = ndb.StringProperty(indexed=False)

    # Urls of videos
    video_url = ndb.JsonProperty(indexed=False, repeated=True)

    # Userful link to the event
    useful_links = ndb.JsonProperty(indexed=False, repeated=True)

    # Official site of event
    official_site = ndb.StringProperty()

    # Programation of event
    programation = ndb.StringProperty(indexed=False)

    address = ndb.StructuredProperty(Address)

    # Text about the event
    text = ndb.TextProperty()

    # User who is the author of the event
    author_key = ndb.KeyProperty(kind="User", required=True)

    # URL photo of author
    author_photo = ndb.StringProperty(required=True)

    # Name of Author
    author_name = ndb.StringProperty(required=True)

    # Institution to which this event belongs
    institution_key = ndb.KeyProperty(kind="Institution", required=True)

    # URL photo of institution
    institution_image = ndb.StringProperty(required=True)

    # Name of Institution
    institution_name = ndb.StringProperty(required=True)

    # Institution's acronym
    institution_acronym = ndb.StringProperty()

    # User who modified the event
    last_modified_by = ndb.KeyProperty(kind="User")

    # Name of user who modified
    last_modified_by_name = ndb.StringProperty()

    # Date and time of last modified
    last_modified_date = ndb.DateTimeProperty(auto_now=True)

    state = ndb.StringProperty(choices=set([
        'draft',
        'published',
        'deleted'
    ]), default='published')

    # Date and time of a initial time of a event
    start_time = ndb.DateTimeProperty(required=True)

    # Date and time of a end time of a event
    end_time = ndb.DateTimeProperty(required=True)

    # Local of the event
    local = ndb.StringProperty(required=True)

    followers = ndb.KeyProperty(kind="User", repeated=True)

    def isValid(self, is_patch=False):
        """Check if is valid event."""
        date_now = datetime.today()

        if (self.end_time is None) or (self.start_time is None):
            raise FieldException("Event must contains start time and end time")
        if self.end_time < self.start_time:
            raise FieldException("The end time can not be before the start time")
        if date_now > self.end_time and not is_patch:
            raise FieldException("The end time must be after the current time")

    def verify_patch(self, patch):
        """Check if the patch is valid."""
        INDEX_AFTER_SLASH = 1
        has_ended = datetime.today() > self.end_time
        forbidden_props = ["title", "official_site", "address", "local"]
        patch_props = [update['path'][INDEX_AFTER_SLASH:] for update in json.loads(patch)]

        for p in patch_props:
            p = "address" if "address" in p else p
            if has_ended and p in forbidden_props:
                raise FieldException("The event basic data can not be changed after it has ended")

    @staticmethod
    def create(data, author, institution):
        """Create an event."""
        event = Event()
        event.text = data.get('text')
        event.programation = data.get('programation')
        event.video_url = data.get('video_url', [])
        event.title = data.get('title')
        event.photo_url = data.get('photo_url')
        event.useful_links = data.get('useful_links', [])
        event.official_site = data.get('official_site')
        event.author_key = author.key
        event.author_photo = author.photo_url
        event.author_name = author.name
        event.institution_key = institution.key
        event.institution_name = institution.name
        event.institution_acronym = institution.acronym
        event.institution_image = institution.photo_url
        event.last_modified_by = author.key
        event.last_modified_by_name = author.name
        event.local = data.get('local')
        event.start_time = datetime.strptime(
            data.get('start_time'), "%Y-%m-%dT%H:%M:%S")
        event.end_time = datetime.strptime(
            data.get('end_time'), "%Y-%m-%dT%H:%M:%S")
        event.address = Address.create(data.get('address'))
        event.followers.append(author.key)

        event.isValid()

        return event

    @staticmethod
    def make(event):
        """Create personalized json of event."""
        INTERNATIONAL_ZONE = 'Z'
        start_time = event.start_time.isoformat() + INTERNATIONAL_ZONE
        end_time = event.end_time.isoformat() + INTERNATIONAL_ZONE
        last_modified_date = event.last_modified_date.isoformat()
        return {
            'title': event.title,
            'text': event.text,
            'programation': event.programation,
            'video_url': event.video_url,
            'useful_links': event.useful_links,
            'official_site': event.official_site,
            'address': event.address.make() if event.address else {},
            'local': event.local,
            'start_time': start_time,
            'end_time': end_time,
            'last_modified_date': last_modified_date,
            'state': event.state,
            'author': event.author_name,
            'author_img': event.author_photo,
            'last_modified_by': event.last_modified_by_name,
            'institution_name': event.institution_name,
            'institution_image': event.institution_image,
            'photo_url': event.photo_url,
            'author_key': event.author_key.urlsafe(),
            'institution_key': event.institution_key.urlsafe(),
            'key': event.key.urlsafe(),
            'institution_acronym': event.institution_acronym,
            'followers': [key.urlsafe() for key in event.followers]
        }

    def _post_put_hook(self, future):
        """This method is called after each Event.put()."""
        search_event = SearchEvent()
        search_event.createDocument(future.get_result().get())

    def __setattr__(self, attr, value):
        """
        Method of set attributes.

        if the attribute is of type date and the value passed is a string,
        it converts to type datetime.
        """
        is_value_datetime = isinstance(value, datetime)
        is_attr_data = attr == 'start_time' or attr == 'end_time'

        if is_attr_data and not is_value_datetime:
            value = datetime.strptime(value, "%Y-%m-%dT%H:%M:%S")
        super(Event, self).__setattr__(attr, value)
    
    def add_follower(self, user):
        """Add a subscriber."""
        is_active = user.state == 'active'
        is_not_a_follower = not user.key in self.followers 

        if is_active and is_not_a_follower:
            self.followers.append(user.key)
            self.put()
        else:
            raise NotAllowedException("%s" %(not is_active and "The user is not active"
                or not is_not_a_follower and "The user is a follower yet"))
            

    def remove_follower(self, user):
        """Remove a subscriber."""
        is_a_follower = user.key in self.followers
        is_not_the_author = self.author_key != user.key

        if is_a_follower and is_not_the_author:
            self.followers.remove(user.key)
            self.put()
        else:
            raise NotAllowedException("%s" %(not is_a_follower and 'The user is not a follower' 
                or not is_not_the_author and "The user is the author"))
    
    def create_notification_message(self, user_key, current_institution_key, sender_institution_key=None):
        """ Create message that will be used in notification.
            user_key -- The user key that made the action.
            current_institution_key -- The institution that user was in the moment that made the action.
            sender_institution_key -- The institution by which the post was created,
                if it hasn't been defined yet, the sender institution should be the current institution. 
        """
        return create_message(
            sender_key= user_key,
            current_institution_key=current_institution_key,
            sender_institution_key=sender_institution_key or current_institution_key
        )
    
    def __getitem__(self, key):
        if key in self.to_dict():
            return self.to_dict()[key]
        super(Event, self).__getitem__(attr, value)
