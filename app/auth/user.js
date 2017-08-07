"use strict";

function User(data) {
    data = data || {};
    _.extend(this, data);

    if (this.institutions && !this.current_institution) {
        this.current_institution = this.institutions[0];
    }
}

var SENT = "sent";

var USER = "USER";

var INVITE_INSTITUTIONS_TYPE = ['INSTITUTION', 'INSTITUTION_PARENT', 'INSTITUTION_CHILDREN'];

User.prototype.changeInstitution = function changeInstitution(institution) {
    this.current_institution = _.find(this.institutions, {'key': institution.key});
    window.sessionStorage.userInfo = JSON.stringify(this);
};

User.prototype.follow = function follow(institution) {
    this.follows.push(institution);
};

User.prototype.unfollow = function unfollow(institution) {
    _.remove(this.follows, function(followingInst){
    	return followingInst.key == institution.key;
    });
};

User.prototype.isFollower = function isFollower(institution) {
	var isFollower = false;
    _.forEach(this.follows, function(followingInst) {
        if(followingInst.key == institution.key){
            isFollower = true;
        }
    });
    return isFollower;
};

User.prototype.isAdmin = function isAdmin(keyInstitution) {
    var managed_institution = _.find(this.institutions_admin, function(institution) {
      return getKey(institution) == keyInstitution; });
    return managed_institution;
};

User.prototype.isMember = function isMember(institutionKey){
    return _.includes(_.map(this.institutions, getKeyObj), institutionKey);
};

User.prototype.addInstitution = function addInstitution(institutionKey){
    this.institutions.push(institutionKey);
};


User.prototype.isValid = function isValid() {
    if (_.isUndefined(this.name) || _.isEmpty(this.name)) {
        return false;
    }

    if (_.isUndefined(this.email) || _.isEmpty(this.email)) {
        return false;
    }

    var cpfNotNull = this.cpf !== null;
    if (cpfNotNull && (_.isUndefined(this.cpf) || _.isEmpty(this.cpf))) {
        return false;
    }
    return true;
};

User.prototype.getPendingInvitationOf = function getPendingInvitationOf(invitationType){
    if(invitationType === USER){
        return this.getPendingInviteUser();
    } else{
        return this.getPendingInviteInst(this);
    }
};

User.prototype.getPendingInviteUser = function getInviteUser(){
    return _.find(this.invites, {'type_of_invite': USER, 'status': SENT});
};

User.prototype.getPendingInviteInst = function getInviteInst(){
    return _.find(this.invites, function(invite) {
        return _.includes(INVITE_INSTITUTIONS_TYPE, invite.type_of_invite) &&
            invite.status === SENT;
    });
};

User.prototype.removeInvite = function removeInvite(invite) {
    _.remove(this.invites, function(foundinvite){
        return invite.stub_institution_key == foundinvite.stub_institution_key;
    });
};

function getKeyObj(obj) {
    if(obj.key){
      return obj.key;
    }
}

function getKey(obj){
	var key = obj.split("/");
	key = key[key.length -1];

    return key;
}