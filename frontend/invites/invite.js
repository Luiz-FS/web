"use strict";

function Invite(data) {
    data = data || {};
    _.extend(this, data);
}

Invite.prototype.isValid = function isValid() {
    var isInviteeNecessary = this.type_of_invite != 'USER';
    var hasNoInvitee = (_.isUndefined(this.invitee) || _.isEmpty(this.invitee)) && isInviteeNecessary;
    var hasNoType = _.isUndefined(this.type_of_invite) || _.isEmpty(this.type_of_invite);

    if (hasNoInvitee || hasNoType) {
        return false;
    }
    return true;
};