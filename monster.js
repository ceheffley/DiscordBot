const Entity = require('./entity.js');

class Monster extends Entity.Entity {
    constructor (name = "Oogabooga", level = 1, hp = 1, stats = [1,1,1,1,1,1], weakTo = [damageType.NONE], resists = [damageType.NONE], expValue = 1, goldRange = [1, 10]) {
        super(name, level);
        this._hp = hp;
        this._maxHP = hp;
        this._stats = stats;
        this._monsterID;            //position in monster array (int)
          
        this._weakTo = weakTo;
        this._resists = resists;

        this._expValue = expValue;
        this._goldRange = goldRange;
    }

    get stats() {
        return this._stats;
    }
    get monsterID() {
        return this._monsterID;
    }
    get weakTo() {
        return this._weakTo;
    }
    get resists() {
        return this._resists;
    }
    get expValue() {
        return this._expValue;
    }
    get goldRange() {
        return this._goldRange;
    }
    
    initID(monsterID) {
        this._monsterID = monsterID;
    }

    damage(initAmount = 0, attacker = 'none', type = 'none') {
        const Modifier = require('./modifier.js');
        return new Promise(async (success) => {
            let amount = await Modifier.calcFinalDamage(initAmount, this, attacker, type);
            let string;
            if (this._weakTo.includes(type)) {
                amount = Math.floor(amount * 1.5)
                string = "***" + amount + "***";
            } else if (this._resists.includes(type)) {
                amount = Math.floor(amount / 1.5)
                string = "``" + amount + "``";
            } else {
                string = "**" + amount + "**";
            }

            if (this._hp - amount > 0) {
                this._hp -= amount;
            } else {
                this._hp = 0;
            }
            success(string);
        });
    }
}

//------------------Damage Types Enum---------------------

let damageType = {
    NONE: 'none',
    LIGHT: 'light',
    DARK: 'dark',
    NATURE: 'nature',
    COSMIC: 'cosmic',
    FIRE: 'fire',
    ICE: 'ice',
    ELECTRIC: 'electric',
    WIND: 'wind'
}

let statusPhase = {
    START: 'start',
    END: 'end',
    ATTACK: 'attack',
    DEFEND: 'defend'
}

//------------------Monster Subclasses--------------------

class Oogabooga extends Monster {
    constructor (level = 1, hp = 1, stats = [1,1,1,1,1,1]) {
        super("Oogabooga", level, hp, stats, [], [], 30, [1, 3]);
    }

    attack(combat) {
        return new Promise(async (success) => {
            let lowestChar = await simpleTargeting(combat.characters);
            let damage = this._stats[0];
            success(`Oogabooga attacked __${lowestChar.name}__ for ${await(lowestChar.damage(damage, this))} damage!`)
        });
    }
}

class Kronk extends Monster {
    constructor (level = 1, hp = 1, stats = [1,1,1,1,1,1]) {
        super("Kronk", level, hp, stats, [damageType.ICE], [damageType.ELECTRIC], 25, [2, 4]);
    }

    attack(combat) {
        return new Promise(async (success) => {
            let damage = this._stats[0];
            let data = await damageAll(mon, combat.characters, damage, damageType.NATURE);

            let str = `Kronk hits the ground hard, dealing `;
            for (let i = 0; i < data.length; i++) {
                if (i === data.length - 2) {
                    str += `and ${data[i][1]} damage to __${data[i][0]}__, `;
                } else {
                    str += `${data[i][1]} damage to __${data[i][0]}__, `;
                }
            }
            str = str.slice(0, -2) + "!";
            //str += "!"
            success(str) //returns character that was damaged and damage dealt for message purposes.
        });
    }
}

class LeSnek extends Monster {
    constructor (level = 1, hp = 1, stats = [1,1,1,1,1,1]) {
        super("Le Snek", level, hp, stats, [], [], 35, [1, 1]);
    }

    attack(combat) {
        return new Promise(async (success) => {
            let lowestChar = await simpleTargeting(combat.characters);
            let damage = this._stats[0];
            await this.poison(lowestChar);
            success(`Le Snek bit __${lowestChar.name}__ for ${await(lowestChar.damage(damage, this))} damage and applied poison for 1 turn!`)
        });
    }

    poison(character) {
        return new Promise(async (success) => {
            if (character.checkStatus('poison', statusPhase.END)) {
                character.status.end[character.indexOfStatus('poison', statusPhase.END)][1]++;
                success();
            }
            else {
                character.addStatus(['poison', 2], statusPhase.END);
                success();
            }
        });
    }
}

class Goon extends Monster {
    constructor (level = 1, hp = 1, stats = [1, 1, 1, 1, 1, 1]) {
        super("Goon", level, hp, stats, [], [], 5, [0, 1]);
    }

    attack(combat) {
        return new Promise(async (success) => {
            let lowestChar = await simpleTargeting(combat.characters);
            let damage = this._stats[0];
            success(`Goon ran into __${lowestChar.name}__ for ${await(lowestChar.damage(damage, this))} damage!`);
        })
    }
}

class Goonmaster extends Monster {
    constructor (level = 1, hp = 1, stats = [2, 2, 2, 2, 2, 2]) {
        super ("Goonmaster", level, hp, stats, [], [], 50, [3, 6]);
        let _goons = 0;
    }

    attack(combat) {
        return new Promise(async success => {
            this._goons = 0;
            console.log(combat.monsters);
            combat.monsters.forEach(monster => {
                if (monster.name === "Goon" && monster.alive) {
                    this._goons++;
                }
            })
                
            if (Math.random() > (this._goons / 3)) { //if there are 3 goons, cannot spawn goon
                await this.spawnGoon(combat);
                success(`Goonmaster cracks his whip into the air and a Goon jumps into the fray!`);
            } else {
                let lowestChar = await simpleTargeting(combat.characters);
                let damage = this._stats[0];
                success(`Goonmaster snaps his whip at __${lowestChar.name}__ for ${await(lowestChar.damage(damage, this))} damage!`)
            }
        })
    }

    spawnGoon(combat) {
        return new Promise(success => {
            let goonStats = [];
            this._stats.forEach(stat => {
                goonStats.push(Math.floor(stat / 2));
            })
            let goon = new Goon(this._level, this._hp / 5, goonStats);
            goon.addStatus(['skip', 1], statusPhase.START);
            goon.initID(combat.monsters.length + 1);
            combat.monsters.push(goon);
            combat.turnOrder.push(goon);
            success();
        })

    }
}


const simpleTargeting = (characters) => {   //find lowest health character, returns current lowest HP character
    return new Promise(async (success) => {
        let lowestChar;
        for (char of characters) {
            if (char.alive) {
                lowestChar = char;
                break;
            }
        }
        characters.forEach(char => {
            if (char.alive && lowestChar.hp > char.hp) {
                lowestChar = char;
            }
        })
        const Status = require('./status.js');        
        success(await Status.interruptStatus(lowestChar, characters));
    });
}

const damageAll = async (mon, characters, totalDamage, type = 'none') => {
    return new Promise(async success => {
        let data = [];
        for (char of characters) {
            if (char.alive) {
                data.push([char.name, await char.damage(totalDamage, mon, type)]);
            }
        }
        
        const Status = require('./status.js');
        success(await Status.interruptStatus(data, characters)); //if someone using protect, they tank it ALL (i think)
    })
}


//---------------------Monster Generator--------------------------

const generateMonsters = (party, avgLvl = 1) => {
    return new Promise((success) => {
        const monList = [["Goonmaster"]]//[["Oogabooga", "Kronk", "Le Snek"], ["Jeremy Clarkson"]];
        let monsters = [];
        let monObjs = [];

        //-----Determine Monsters

        if (avgLvl <= 100) {    //temp for testing
            monsters.push(monList[0][Math.floor(Math.random() * monList[0].length)]) //pick a random monster from [0] in monList
            //monsters.push(monList[0][Math.floor(Math.random() * 3)]) //pick a random monster from [0] in monList
        }
        console.log(monsters);

        //-----Create Monster Objects
        let healthMod = party.members.length;

        monsters.forEach(monster => {
            switch(monster) {
                case "Oogabooga":
                    monObjs.push(new Oogabooga(Math.floor((Math.random() * 2) + avgLvl), Math.floor(((Math.random() * 6) + 32) * healthMod), [2,1,1,1,1,1]));
                    break;
                case "Kronk":
                    monObjs.push(new Kronk(Math.floor((Math.random() * 2) + avgLvl), Math.floor(((Math.random() * 15) + 42) * healthMod), [1,1,3,1,1,1]));
                    break;
                case "Le Snek":
                    monObjs.push(new LeSnek(Math.floor((Math.random() * 2) + avgLvl), Math.floor(((Math.random() * 10) + 25) * healthMod), [1,1,3,1,1,1]));
                    break;
                case "Goon":
                    monObjs.push(new Goon(Math.floor((Math.random() * 2) + avgLvl), Math.floor(((Math.random() * 5) + 15) * healthMod), [1, 1, 1, 1, 1, 1]));
                    break;
                case "Goonmaster":
                    monObjs.push(new Goonmaster(Math.floor((Math.random() * 2) + avgLvl), Math.floor(((Math.random() * 15) + 22) * healthMod), [2, 2, 2, 2, 2, 2]));
                    break;
            }
        })
        console.log(monObjs);
        console.log(monObjs.length);
        success(monObjs);
    })
}

module.exports = {
    Monster,
    Oogabooga,
    generateMonsters
}