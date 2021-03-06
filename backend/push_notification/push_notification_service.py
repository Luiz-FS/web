# -*- coding: utf-8 -*-
"""Push Notification Service."""
from custom_exceptions import EntityException
from enum import Enum

__all__ = ['get_notification_props', 'NotificationType']

def get_notification_props(_type, entity=None):
    """This function represents the interface
    the service's provides to the application
    to get the notification properties.

    Args:
        _type -- the notification's type. type: NotificationType
        entity -- an optional parameter that can be
        used to determine the click_action property 
    """
    notification = NotificationProperties(_type, entity)
    return notification.get_props()

class NotificationType(Enum):
    """This Enum wraps the
    possible notification's type
    to make them more maintable 
    """
    like = 'LIKE_POST'
    comment = 'COMMENT'
    invite_user = 'USER'
    invite_user_adm = 'USER_ADM'
    link = 'LINK'
    delete_member = 'DELETE_MEMBER'
    remove_institution_link = 'REMOVE_INSTITUTION_LINK'
    create_post = 'CREATE_POST'
    delete_post = 'DELETE_POST'
    reply_comment = 'REPLY_COMMENT'
    deleted_user = 'DELETED_USER'
    left_institution = 'LEFT_INSTITUTION'
    invite = 'INVITE'
    deleted_institution = 'DELETED_INSTITUTION'
    deleted_event = 'DELETED_EVENT'
    updated_event = 'UPDATED_EVENT'

class NotificationProperties(object):
    """This class has several private
    methods, each one for an especific
    notification's type. These methods
    return an object with the notification
    properties.
    To access them, the instance is initialized
    with a notification_method which is set based on
    the _type property received by the constructor,
    this method is called in get_props, the unique
    public method.
    """

    def __init__(self, _type, entity):
        """Set the notification_method based on the _type.
        types object helps this operation by maping a notification's
        type to its especific method.
        The entity, also, is set here.
        """
        types = {
            NotificationType.like: self.__get_like_props,
            NotificationType.comment: self.__get_comment_props,
            NotificationType.invite_user: self.__get_invite_user_props,
            NotificationType.invite_user_adm: self.__get_invite_user_adm_props,
            NotificationType.link: self.__get_link_props,
            NotificationType.delete_member: self.__get_delete_member_props,
            NotificationType.remove_institution_link: self.__get_remove_inst_link_props,
            NotificationType.create_post: self.__get_create_post_props,
            NotificationType.delete_post: self.__get_delete_post_props,
            NotificationType.reply_comment: self.__get_reply_comment_props,
            NotificationType.deleted_user: self.__get_deleted_user_props,
            NotificationType.left_institution: self.__get_left_institution_props,
            NotificationType.invite: self.__get_invite_props,
            NotificationType.deleted_institution: self.__get_deleted_institution_props,
            NotificationType.deleted_event: self.__get_deleted_event_props,
            NotificationType.updated_event: self.__get_updated_event_props
        }
        self.entity = entity
        self.notification_method = types[_type] 
        
    def get_props(self):
        """Just returns the result of
        notification_method().
        """
        return self.notification_method()
 
    def __get_like_props(self):
        """Responsible for return the right
        properties for the like notification.
        self.entity can't be None once it is
        used to set the url of the click_action property.
        """
        if not self.entity:
            raise EntityException(
                'A LIKE_POST notification requires the entity.')

        url = '/posts/%s' % self.entity.key.urlsafe()

        return {
            'title': 'Publicação curtida',
            'body_message': 'Uma publicação de seu interesse foi curtida',
            'click_action': url,
            'type': 'LIKE_POST'
        }

    def __get_comment_props(self):
        """Responsible for return the right
        properties for the comment notification.
        self.entity can't be None once it is
        used to set the url of the click_action property.
        """
        if not self.entity:
            raise EntityException(
                'A COMMENT notification requires the entity.')
        url = "/posts/%s" % self.entity.key.urlsafe()

        return {
            'title': 'Publicação comentada',
            'body_message': 'Uma publicação do seu interesse foi comentada',
            'click_action': url,
            'type': 'COMMENT'
        }

    def __get_invite_user_props(self):
        """Responsible for return the right
        properties for the invite_user notification.
        """
        url = "/notifications"

        return {
            'title': 'Novo convite',
            'body_message': 'Você recebeu um novo convite para ser membro de uma instituição',
            'click_action': url,
            'type': 'USER'
        }

    def __get_invite_user_adm_props(self):
        """Responsible for return the right
        properties for the invite_user_adm notification.
        """
        url = "/notifications"

        return {
            'title': 'Novo convite',
            'body_message': 'Você recebeu um novo convite para ser administrador de uma instituição',
            'click_action': url,
            'type': 'USER_ADM'
        }

    def __get_link_props(self):
        """Responsible for return the right
        properties for the link notification.
        """
        url = "/institution/%s/inviteInstitution" % self.entity.key.urlsafe()

        return {
            'title': 'Solicitação de vínculo',
            'body_message': 'Uma instituição que você administra recebeu uma nova solicitação de vínculo',
            'click_action': url,
            'type': 'LINK'
        }
    
    def __get_delete_member_props(self):
        url = '/institution/%s/home' %self.entity.key.urlsafe()

        return {
            'title': 'Remoção de vínculo',
            'body_message': 'Você foi removido da instituição %s' %self.entity.name,
            'click_action': url,
            'type': 'DELETE_MEMBER'
        }
    
    def __get_remove_inst_link_props(self):
        url = '/institution/%s/inviteInstitution' %self.entity.key.urlsafe()

        return {
            'title': 'Remoção de vínculo',
            'body_message': 'A instituição %s teve um de seus vínculos removidos' %self.entity.name,
            'click_action': url,
            'type': 'REMOVE_INSTITUTION_LINK'
        }

    def __get_create_post_props(self):
        url = '/posts/%s' %self.entity.key.urlsafe()

        return {
            'title': 'Novo post criado',
            'body_message': '%s criou um novo post' %self.entity.author.urlsafe(),
            'click_action': url,
            'type': 'CREATE_POST'
        }
    
    def __get_delete_post_props(self):
        url = '/'
        admin_name = self.entity.institution.get().admin.get().name

        return {
            'title': 'Post deletado',
            'body_message': '%s deletou seu post' %admin_name,
            'click_action': url,
            'type': 'DELETE_POST'
        }
    
    def __get_reply_comment_props(self):
        url = '/posts/%s' %self.entity.key.urlsafe()

        return {
            'title': 'Novo comentário',
            'body_message': 'Seu comentário tem uma nova resposta',
            'click_action': url,
            'type': 'REPLY_COMMENT'
        }
    
    def __get_deleted_user_props(self):
        return {
            'title': 'Usuário inativo',
            'body_message': '%s não está mais ativo na plataforma' %self.entity.name,
            'click_action': '/',
            'type': 'DELETED_USER'
        }

    def __get_left_institution_props(self):
        return {
            'title': 'Remoção de vínculo de membro',
            'body_message': '%s removeu o vínculo com uma das instituições que você administra' %self.entity.name,
            'click_action': '/',
            'type': 'LEFT_INSTITUTION'
        }
    
    def __get_invite_props(self):
        url = '%s/new_invite' %self.entity.key.urlsafe()
        return {
            'title': 'Novo convite',
            'body_message': 'Você tem um novo convite',
            'click_action': url,
            'type': 'INVITE'
        }
    
    def __get_deleted_institution_props(self):
        return {
            'title': 'Instituição removida',
            'body_message': 'A instituição %s foi removida' %self.entity.name,
            'click_action': '/',
            'type':'DELETED_INSTITUTION'
        }
    
    def __get_deleted_event_props(self):
        return {
            'title': 'Evento removido',
            'body_message': 'O evento %s foi removido' %self.entity.title,
            'click_action': '/',
            'type': 'DELETED_EVENT'
        }
    
    def __get_updated_event_props(self):
        return {
            'title': 'Evento editado',
            'body_message': 'O evento %s foi editado' %self.entity.title,
            'click_action': '/event/%s/details' %self.entity.key.urlsafe(),
            'type': 'UPDATED_EVENT'
        }
