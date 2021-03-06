"""Invite user model."""
from . import Invite
from google.appengine.ext import ndb
from custom_exceptions import FieldException
from . import User
from . import Institution
from send_email_hierarchy import InviteUserEmailSender
from util import get_subject, Notification, NotificationsQueueManager

__all__ = ['InviteUser']

class InviteUser(Invite):
    """Model of invite user."""

    @staticmethod
    def create(data, invite=None):
        """Create a post and check required fields."""
        if not invite:
            invite = InviteUser()
        invite.invitee = data.get('invitee')
        invite = Invite.create(data, invite)
        return invite

    def send_email(self, host, body=None):
        """Method of send email of invite user."""
        subject = get_subject('INVITE')
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
        notification_type = "ACCEPT_INVITE_USER" if action == 'ACCEPT' else "REJECT_INVITE_USER"
        notification_message =  self.create_notification_message(
            user_key=invitee_key,
            current_institution_key=current_institution,
            sender_institution_key=self.institution_key
        )
        self.send_notification(
            current_institution=current_institution, 
            sender_key=invitee_key, 
            receiver_key=self.sender_key or self.admin_key,
            notification_type=notification_type,
            message=notification_message
        )

    def create_sent_invites_notification(self, current_institution_key):
        """
        Create a notification and enqueue it to be be sent
        when the invites are sent.
        
        Keyword arguments:
        current_institution -- Current institution of user.
        """
        sender_key = self.sender_key or self.admin_key

        message = self.create_notification_message(
            user_key=sender_key,
            current_institution_key=current_institution_key
        )

        notification = Notification(
            message=message,
            entity_key=self.key.urlsafe(),
            notification_type='USER_INVITES_SENT',
            receiver_key=sender_key.urlsafe()
        )

        notification_id = NotificationsQueueManager.create_notification_task(notification)
        return notification_id

    def make(self):
        """Create json of invite to user."""
        invite_user_json = super(InviteUser, self).make()
        invite_user_json['invitee'] = self.invitee
        invite_user_json['institution_key'] = self.institution_key.urlsafe()
        invite_user_json['type_of_invite'] = 'USER'
        return invite_user_json
