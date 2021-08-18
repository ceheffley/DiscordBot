const Player = require('./player.js');
const Entity = require('./entity.js');

class Character extends Entity.Entity  {
    constructor(serverID, userID, name, race) {
        super(name, 1);
        this._serverID = serverID;          //snowflake
        this._userID = userID;              //snowflake
        this._race = race;                  //string
        this._ability;                      //Ability sub-class

        this._gold = 0;                     //number
        this._exp = 0;                      //number
        this._items = [];                   //array[objs]
        this._armor = [];                   //array[objs]
        this._weapons = [];                 //array[objs]

        this._hitDice = 8;                  //number                 //array[array[status, duration]]
    }

    get serverID() {
        return this._serverID;
    }
    get userID() {
        return this._userID;
    }
    get race() {
        return this._race;
    }
    get ability() {
        return this._ability;
    }
    get gold() {
        return this._gold;
    }
    get exp() {
        return this._exp;
    }
    get items() {
        return this._items;
    }
    get armor() {
        return this._armor;
    }
    get weapons() {
        return this._weapons;
    }
    get hitDice() {
        return this._hitDice;
    }
    
    set ability(ability) {
        this._ability = ability;
    }
    set gold(gold) {
        this._gold = gold;
    }

    //Stats functions

    updateStats(newStats) {
        this._ability.stats = newStats;
    }

    generateHitDice() {
        if((this._ability.userClass === 'Berserker')) {
            this._hitDice = 12;
        } else if((this._ability.userClass === 'Knight')||(this._ability.userClass === 'Sage')||(this._ability.userClass === 'Ranger')){
            this._hitDice = 10;
        } else if((this._ability.userClass === 'Enchanter')||(this._ability.userClass === 'Wizard')){
            this._hitDice = 6;
        }
        this._maxHP = this._hitDice + Math.floor((this._ability.stats[2]-10)/2);
        this._hp = this._maxHP;
    }

    gainExp(exp) {
        this._exp += exp;
        if (this._exp >= 100 * this._level) {
            this._exp -= 100 * this._level;
            this._level++;
            return true;
        }
        return false;
    }

    //Combat functions
    
    damage(initAmount = 0, attacker = 'none', type = 'none') {
        const Modifier = require('./modifier.js');
        return new Promise(async (success) => {
            let amount = await Modifier.calcFinalDamage(initAmount, this, attacker, type);
            if (this._hp - amount > 0) {
                this._hp -= amount;
            } else {
                this._hp = 0;
            }
            success(amount);
        });
    }

    displayStatus(emojis) {
        return new Promise((success) => {
            let list = "";
            let names = ['start', 'end', 'attack', 'defend'];
            names.forEach(state => {
                for (let i = 0; i < this.status[state].length; i++) {
                    switch (this._status[state][i][0]) {
                        case 'poison':
                            list += `${emojis.get("608427777485701160")} (${this._status[state][i][1]}) `;//`☠️ (${this._status[state][i][1]})`; 
                            break;
                        case 'stalking':     
                            list += `🏹 (#${this._status[state][i][2].target}) `;
                            break;
                        default:
                            break;
                    }
                }
            })

            success(list);
        })
    }

}

const makeCharacter = (serverID, userID, name, userClass, race, stats) => {
    
    const player = Player.pList[serverID][userID];
    if (player instanceof Player.Player) {
        character = new Character(serverID, userID, name, race)
        const Ability = require('./ability.js');
        character.ability = Ability.generateAbility(userClass, stats);
        player.addCharacter(character);
        updateJSON(Player.pList, './players.json');
    }
}

/**Update JSON file 'target' with 'obj'
 * 
 * @param {Object} obj the entire object to be saved
 * @param {String} target the file address of the JSON file
 */
const updateJSON = (obj, target) => {
    const fs = require('fs');
    fs.writeFile(target, JSON.stringify(obj), 'utf8', err => {
        if (err) throw err;
        console.log(`JSON updated to ${target}`);
    });
} 

module.exports = {
    Character,
    makeCharacter,
    updateJSON
};