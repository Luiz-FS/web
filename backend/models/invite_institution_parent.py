"""Invite institution parent model."""
from . import InviteInstitution

__all__ = ['InviteInstitutionParent']

class InviteInstitutionParent(InviteInstitution):
    """Model of invite institution parent."""

    @staticmethod
    def create(data):
        """Create a post and check required fields."""
        invite = InviteInstitutionParent()
        invite = InviteInstitution.create(data, invite)

        return invite

    def create_conection_institution(self, institution):
        """Method of creating connection between invitation and institution parent."""
        institution.create_parent_connection(self)

    def make(self):
        """Create json of invite to parent institution."""
        invite_parent_json = super(InviteInstitutionParent, self).make()
        invite_parent_json['type_of_invite'] = 'INSTITUTION_PARENT'
        return invite_parent_json

    def send_reject_response_notification(self, current_institution, invitee_key):
        """Define the notification's entity type when the invite is rejected."""
        notification_type = 'REJECT_INSTITUTION_LINK'
        notification_message = self.create_notification_message(user_key=invitee_key, 
            current_institution_key=current_institution, sender_institution_key=self.stub_institution_key, 
            receiver_institution_key=self.institution_key)

        self.send_response(current_institution, invitee_key, notification_type, message=notification_message)
