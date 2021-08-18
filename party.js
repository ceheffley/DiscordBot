const Player = require('./player.js');

class Party {
    constructor(serverID, leaderID) {
        this._serverID = serverID;                                  //snowflake
        this._leaderID = leaderID;                                  //snowflake
        this._members = [Player.getPlayer(serverID, leaderID)];     //array[Player]
        this._memberIDs = [leaderID]                                //array[snowflake];
        this._isPublic = false;                                     //boolean
        this._invited = [];                                         //array[snowflake]
        this._activeVote = false;                                   //boolean
        this._combat = null;                                        //Combat
    }

    get serverID() {
        return this._serverID;
    }
    get leaderID() {
        return this._leaderID;
    }
    get members() {
        return this._members;
    }
    get memberIDs() {
        return this._memberIDs;
    }
    get isPublic() {
        return this._isPublic;
    }
    get invited() {
        return this._invited;
    }
    get activeVote() {
        return this._activeVote;
    }
    get combat() {
        return this._combat;
    }

    set leaderID(newLeader) {
        this._leaderID = newLeader;
    }
    set isPublic(value){
        this._isPublic = value;
    }
    set activeVote(bool) {
        this._activeVote = bool;
    }

    //Party command functions

    beginCombat(combatObj) {
        this._combat = combatObj;
    }

    endCombat() {
        return new Promise (success => {
            this._combat = null;


        //temp full heal for continued testing
        this._members.forEach(player => {
            player.currChar().heal(player.currChar().maxHP);
            player.currChar().resetAllStatus();
        })
        this._members.forEach(player => {
            if(player.currChar().alive != true) {
                player.currChar().alive = true;
            }
        });
        success();
        })
    }

    invitePlayer(userID) {
        this._invited.push(userID);
    }

    revokeInvite(userID) {
        this._invited.splice(this._invited.indexOf(userID), 1);
    }

    addUser(userID) {
        this._members.push(Player.getPlayer(this._serverID, userID));
        this._memberIDs.push(userID);
        playersInParties[this._serverID].push(userID);
        if (this._invited.includes(userID)) {
            this.revokeInvite(userID);
        }
    }
    
    removeUser(userID) {
        if (this._memberIDs.includes(userID)) {
            this._members.splice(this._members.indexOf(Player.getPlayer(this._serverID, userID)), 1);
            this._memberIDs.splice(this.memberIDs.indexOf(userID), 1);
            playersInParties[this._serverID].splice(playersInParties[this._serverID].indexOf(userID), 1);
            return true;
        }
        return false;
    }

    giveLeader(userID) {
        if (this._memberIDs.includes(userID)) {
            this._leaderID = userID;
            return true;
        }
        return false;
    }

    makePartyPublic(bool) {
        if (bool != this._isPublic) {
            this._isPublic = bool;
            return true;
        }
        return false;
    }
}

//Anon Object that holds {serverID: array[Party]}
let liveParties = {};
//Anon Object that holds {serverID: array[userID]}
let playersInParties = {};


//Checks if user is on playersInParties list
const isInParty = (serverID, userID) => {
    return Object.keys(playersInParties).includes(serverID) && playersInParties[serverID].includes(userID);
}

//Checks if user is leader of a Party instance
const findPartyOfLeader = (serverID, leaderID) => {
    let partyList = liveParties[serverID];
    if (partyList != undefined) {
        for (let i = 0; i < partyList.length; i++) {
            if (leaderID === partyList[i].leaderID) {
                return partyList[i];
            }
        }
    }
    return null;
}

//Finds party of user
const findPartyOfUser = (serverID, userID) => {
    let partyList = liveParties[serverID];
    if (partyList != undefined) {
        for (let i = 0; i < partyList.length; i++) {
            if (partyList[i].memberIDs.includes(userID)) {
                return partyList[i];
            }
        }
    }
    return null;
}

//Creates Party for with user as leader
const createParty = (serverID, userID) => {
    if (!Object.keys(playersInParties).includes(serverID)) { //If server for playersInParties not registered yet
        playersInParties[serverID] = [];
    } 

    if (!Object.keys(liveParties).includes(serverID)) { //If server for liveParties not registered yet
        liveParties[serverID] = [];
    }
    liveParties[serverID].push(new Party(serverID, userID)); //create new Party with user as leader
    playersInParties[serverID].push(userID);                 //register user as in a party
}

const deleteParty = (partyObj) => {
    partyObj.memberIDs.forEach(userID => {
        playersInParties[partyObj.serverID].splice(playersInParties[partyObj.serverID].indexOf(userID), 1);
    })
    liveParties[partyObj.serverID].splice(liveParties[partyObj.serverID].indexOf(partyObj), 1);
}


module.exports = {
    Party,
    isInParty,
    findPartyOfLeader,
    findPartyOfUser,
    createParty,
    deleteParty
}