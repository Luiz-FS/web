"""Invite user model."""
from invite import Invite
from google.appengine.ext import ndb
from custom_exceptions.fieldException import FieldException
from models.user import User
from models.institution import Institution
from send_email_hierarchy.invite_user_email_sender import InviteUserEmailSender
from util.strings_pt_br import get_string


class InviteUser(Invite):
    """Model of invite user."""

    @staticmethod
    def create(data):
        """Create a post and check required fields."""
        invite = InviteUser()
        invite.invitee = data.get('invitee')
        invite = Invite.create(data, invite)
        return invite

    def send_email(self, host, body=None):
        """Method of send email of invite user."""
        subject = get_string('INVITE_EMAIL_SUBJECT')
        email_sender = InviteUserEmailSender(**{
            'receiver': self.invitee,
            'invite_key': self.key.urlsafe(),
            'subject': subject,
            'institution': self.institution_key.get().name,
            'inviter': self.sender_name
        })
        email_sender.send_email()

    def send_response_notification(self, current_institution, invitee_key, action):
        """Send notification to sender of invite when invite is accepted or rejected."""
        entity_type = "ACCEPT_INVITE_USER" if action == 'ACCEPT' else "REJECT_INVITE_USER"
        self.send_notification(
            current_institution=current_institution, 
            sender_key=invitee_key, 
            receiver_key=self.sender_key or self.admin_key,
            entity_type=entity_type
        )

    def make(self):
        """Create json of invite to user."""
        invite_user_json = super(InviteUser, self).make()
        invite_user_json['invitee'] = self.invitee
        invite_user_json['institution_key'] = self.institution_key.urlsafe()
        invite_user_json['type_of_invite'] = 'USER'
        return invite_user_json
