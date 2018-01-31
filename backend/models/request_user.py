# -*- coding: utf-8 -*-
"""Request user model."""
from invite import Invite
from google.appengine.ext import ndb
from custom_exceptions.fieldException import FieldException
from models.institution import Institution


class RequestUser(Invite):
    """Model of request user."""

    @staticmethod
    def senderIsMember(sender_key, institution):
        user = ndb.Key(urlsafe=sender_key).get()
        if user:
            instmember = Institution.query(Institution.members.IN(
                [user.key]),
                Institution.key == institution.key)
            return instmember.count() > 0
        return False

    @staticmethod
    def senderIsInvited(sender_key, institutionKey):
        sender_key = ndb.Key(urlsafe=sender_key)
        request = RequestUser.query(
            RequestUser.institution_key == institutionKey,
            RequestUser.status == 'sent',
            RequestUser.sender_key == sender_key)

        return request.count() > 0

    def isValid(self):
        institution = self.institution_key.get()
        sender = self.sender_key.urlsafe()
        if not sender:
            raise FieldException("The request require sender_key")
        if RequestUser.senderIsMember(sender, institution):
            raise FieldException("The sender is already a member")
        if RequestUser.senderIsInvited(sender, institution.key):
            raise FieldException("The sender is already invited")

    @staticmethod
    def create(data):
        """Create a request user."""
        request = RequestUser()
        request.sender_key = ndb.Key(urlsafe=data.get('sender_key'))
        request.sender_name = data.get('sender_name')
        request.office = data.get('office')
        request.institutional_email = data.get('institutional_email')
        request.institution_requested_key = ndb.Key(urlsafe=data.get('institution_key'))
        request = Invite.create(data, request)
        request.isValid()
        return request

    def send_email(self, host, body=None):
        """Method of send email of invite user."""
        institution_key = self.institution_key.urlsafe()
        invite_key = self.key.urlsafe()
        admin_email = self.admin_key.get().email[0]

        # TODO Set this message
        body = body or """Oi:
        Voce tem um novo convite. Acesse:
        http://%s/institution/%s/%s/new_invite/USER

        Equipe da Plataforma CIS """ % (host, institution_key, invite_key)
        super(RequestUser, self).send_email(host, admin_email, body)

    def send_response_email(self, host, operation):
        """Method to send email of sender user when invite is accepted or rejected."""
        institution_name = self.institution_key.get().name
        rejectMessage = """Olá,
        Lamentamos informar mas o seu pedido não foi aceito pela instituição %s.
        Sugerimos que fale com o seu superior para que seja enviado um convite.

        Equipe da Plataforma CIS""" % (institution_name)

        acceptMessage = """Olá,
        Você foi aceito na plataforma como membro da instituição
        %s, seja bem vindo a Plataforma CIS.
        Realize seu login no link abaixo:
        http://%s/signin

        Equipe da Plataforma CIS""" % (institution_name, host)

        sender_email = self.sender_key.get().email[0]
        body = acceptMessage if operation == "ACCEPT" else rejectMessage
        super(RequestUser, self).send_email(host, sender_email, body)

    def send_notification(self, current_institution):
        """Method of send notification of invite user."""
        entity_type = 'REQUEST_USER'
        super(RequestUser, self).send_notification(
            current_institution=current_institution, 
            sender_key=self.admin_key,
            entity_type=entity_type
        )

    def make(self):
        """Create json of invite to user."""
        invite_user_json = super(RequestUser, self).make()
        invite_user_json['sender'] = self.sender_key.get().email
        invite_user_json['sender_name'] = self.sender_name
        invite_user_json['sender_key'] = self.sender_key.urlsafe()
        invite_user_json['office'] = self.office
        invite_user_json['institutional_email'] = self.institutional_email
        invite_user_json['institution_key'] = self.institution_key.urlsafe()
        invite_user_json['type_of_invite'] = 'REQUEST_USER'
        invite_user_json['photo_url'] = self.sender_key.get().photo_url
        return invite_user_json
