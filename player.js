const fs = require('fs');

class Player {

    //Returning player constructor
    constructor(serverID, userID, index, charArray) {
        this._serverID = serverID;           //snowflake
        this._userID = userID;               //snowflake
        this._index = index;                 //number
        this._charArray = charArray          //Character[]
    }

    get serverID() {
        return this._serverID;
    }
    get userID() {
        return this._userID;
    }
    get index() {
        return this._index;
    }
    get charArray() {
        return this._charArray;
    }
    
    set index(index) {
        this._index = index;
    }

    //Get the new current Character
    currChar() {
        return this._charArray[this._index];
    }

    addCharacter(charObj) {
        this._charArray.push(charObj);
        charObj.generateHitDice();
        console.log("New character has been added!");
    }

    removeCharacter(index) { 
        this._charArray.splice(index, 1);
    };
}

let pList = {}; //is written to automatically by validate()

const hasServer = (serverID) => {
    return Object.keys(pList).includes(serverID);
}


const hasUser = (serverID, userID) => {
    try {
        hasServer(serverID);
        return Object.keys(pList[serverID]).includes(userID);
    } catch (error) {
        console.error(error);
    }
}

//Adds new Player object to pList and JSON
const addNewUser = (serverID, userID) => {
    if (!hasServer(serverID)) {
        pList[serverID] = {};
    }
    pList[serverID][userID] = new Player(serverID, userID, 0, []);

    const Character = require('./character.js');
    Character.updateJSON(pList, './players.json');
}

//Checks if Player is exists in pList
const isNewUser = (serverID, userID) => {
    return (!hasServer(serverID) || !hasUser(serverID, userID));
}

//Get Player instance. Only run on validated Players
const getPlayer = (serverID, userID) => {
    return pList[serverID][userID];
}

//Validate Player and Characters for User on Server (runs on startup)
const validate = (obj) => {
    for (serverID in obj) {
        pList[serverID] = {};
        for (userID in obj[serverID]) {
            
            pList[serverID][userID] = Object.assign(new Player, obj[serverID][userID]);

            const Character = require('./character.js');
            const Ability = require('./ability.js');
            const Item = require('./item.js');
    
            cArray = pList[serverID][userID].charArray;

            for (let i = 0; i < cArray.length; i++) { 
                cArray.splice(i, 1, Object.assign(new Character.Character, cArray[i]));
                
                cArray[i].ability = Ability.generateAbility(cArray[i].ability._userClass, cArray[i].ability._stats);
                
                for (let j = 0; j < cArray[i].weapons.length; j++) {
                    cArray[i].weapons.splice(j, 1, Object.assign(new Item.Weapon, cArray[i].weapons[j]));
                }
                for (let k = 0; k < cArray[i].armor.length; k++) {
                    cArray[i].armor.splice(k, 1, Object.assign(new Item.Armor, cArray[i].armor[k]));
                }
            }
        }
    }
}

module.exports = {
    Player,
    pList,
    hasServer,
    hasUser,
    addNewUser,
    isNewUser,
    getPlayer,
    validate
}