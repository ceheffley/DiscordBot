class Equipment {
    constructor (level, rarity) {
        this._reqLvl = level;
        this._rarity = rarity;
    }

    get reqLvl() {
        return this._reqLvl;
    }
    get rarity() {
        return this._rarity;
    }
}

class Weapon extends Equipment {
    constructor (level, rarity, type, dmgType, name) {
        super(level, rarity);
        this._damageType = dmgType;
        this._type = type;
        this._name = name;
        switch (type) { //like this so we can make diff weapons have diff damage
            case 'sword':
                this._damage = level;
                break;
            case 'battleaxe':
                this._damage = level;
                break;
            case 'lance':
                this._damage = level;
                break;
            case 'hammer':
                this._damage = level;
                break;
            case 'staff':
                this._damage = level;
                break;
            case 'knife':
                this._damage = level;
                break;
            case 'bow':
                this._damage = level;
                break;
            default: //shouldn't be reached
                this._damage = level;
                break;
        }
    }

    get damage() {
        return this._damage;
    }
    get damageType() {
        return this._damageType;
    }
    get name() {
        return this._name;
    }
    get type() {
        return this._type;
    }
}

class Armor extends Equipment {
    constructor (level, rarity, type, resistType, name) {
        super(level, rarity);
        this._resistType = resistType;
        this._type = type;
        this._name = name;
        switch (type) { //like this so we can make diff armor have diff defense
            case 'helmet':
                this._defense = level;
                break;
            case 'chestplate':
                this._defense = level;
                break;
            case 'gauntlets':
                this._defense = level;
                break;
            case 'greaves':
                this._defense = level;
                break;
            default: //shouldn't be reached
                this._defense = level;
                break;
        }
    }

    get defense() {
        return this._defense;
    }
    get resistType() {
        return this._damageType;
    }
    get name() {
        return this._name;
    }
    get type() {
        return this._type;
    }
}

const generateEquipment = (userClass, userLevel, odds = [50, 25, 15, 7, 3]) => {
    return new Promise ((success) => {
        if (Math.random() >= .5) {
            success(generateWeapon(userClass, userLevel, odds));
        } else {
            success(generateArmor(userLevel, odds));
        }
    })
}

const generateWeapon = (userClass, userLevel, odds = [50, 25, 15, 7, 3]) => {
    return new Promise (async (success) => {
        let rarity = await determineRarity(odds);
        let damageType = '';
        if (rarity === 'common') {
            damageType = 'none';
        } else if (rarity === 'uncommon') {
            damageType = damageTypes[Math.floor(Math.random() * 3)];
        } else if (rarity === 'rare') {
            damageType = damageTypes[Math.floor(Math.random() * 5)];
        } else if (rarity === 'epic') {
            damageType = damageTypes[Math.floor(Math.random() * 6 + 1)];
        } else if (rarity === 'legendary') {
            damageType = damageTypes[Math.floor(Math.random() * 8 + 1)];
        }

        const type = types[userClass][Math.floor(Math.random() * types[userClass].length)];

        let level = Math.floor(Math.random() * 4 - 2 + userLevel);
        if (level < 1) {
            level = 1;
        }
        if (level > 20) {
            level = 20;
        }

        const name = await generateWeaponName(type, rarity, damageType);

        success(new Weapon(level, rarity, type, damageType, name));
    })
}

const generateWeaponName = (type, rarity, damageType) => {
    return new Promise(success => {
        let name = '';
        if (damageType != 'none') {
            name = `${damageType.charAt(0).toUpperCase()}${damageType.slice(1)} ${type} `;
        } else {
            name = `${type.charAt(0).toUpperCase()}${type.slice(1)} `;
        }
        name += 'of ' + randomWeaponWord(rarity);
        success(name);
    })
}

const randomWeaponWord = (rarity) => {
    //will put in different options for different rarities probably
    return weaponWords[Math.floor(Math.random() * weaponWords.length)];
}

const generateArmor = (userLevel, odds = [50, 25, 15, 7, 3]) => {
    return new Promise (async (success) => {
        let rarity = await determineRarity(odds);
        let resistType = '';
        if (rarity === 'common') {
            resistType = 'none';
        } else if (rarity === 'uncommon') {
            resistType = damageTypes[Math.floor(Math.random() * 3)];
        } else if (rarity === 'rare') {
            resistType = damageTypes[Math.floor(Math.random() * 5)];
        } else if (rarity === 'epic') {
            resistType = damageTypes[Math.floor(Math.random() * 6 + 1)];
        } else if (rarity === 'legendary') {
            resistType = damageTypes[Math.floor(Math.random() * 8 + 1)];
        }

        let type = Math.floor(Math.random()*4);
        if (type === 0) {
            type = 'helmet';
        } else if (type === 1) {
            type = 'chestplate';
        } else if (type === 2) {
            type = 'gauntlets';
        } else if (type === 3) {
            type = 'greaves';
        }

        let level = Math.floor(Math.random() * 4 - 2 + userLevel);
        if (level < 1) {
            level = 1;
        }
        if (level > 20) {
            level = 20;
        }

        const name = await generateArmorName(type, rarity, resistType);

        success(new Armor(level, rarity, type, resistType, name));
    })
}

const generateArmorName = (type, rarity, resistType) => {
    return new Promise(success => {
        let name = '';
        if (resistType != 'none') {
            name = `${resistType.charAt(0).toUpperCase()}${resistType.slice(1)} resistant ${type} `;
        } else {
            name = `${type.charAt(0).toUpperCase()}${type.slice(1)} `;
        }
        name += 'of ' + randomArmorWord(rarity);
        success(name);
    })
}

const randomArmorWord = (rarity) => {
    //will put in different options for different rarities probably
    return armorWords[Math.floor(Math.random() * armorWords.length)];
}

const determineRarity = (odds = [50, 25, 15, 7, 3]) => {
    return new Promise((success) => {
        let rarity = Math.random() * 100;
        while (rarity >= 0) {
            rarity -= odds[0];
            odds.shift();
            if (odds.length === 0) {
                break; //shouldnt happen
            }
        }
        if (odds.length === 5) {
                success('common');
            } else if (odds.length === 4) {
                success('uncommon');
            } else if (odds.length === 3) {
                success('rare');
            } else if (odds.length === 2) {
                success('epic');
            } else if (odds.length === 1) {
                success('legendary');
            } else {
                success('common');
        }
    })
}

//Damage types

const damageTypes = ['none', 'fire', 'ice', 'electric', 'wind', 'light', 'dark', 'nature', 'cosmic'];

//Class weapon types 
const types = {
    Swordsman: ['sword', 'battleaxe', 'lance'], 
    Berserker: ['sword', 'battleaxe', 'hammer'], 
    Knight: ['sword', 'lance', 'hammer'], 
    Enchanter: ['staff', 'knife'], 
    Wizard: ['staff', 'knife'], 
    Sage: ['staff', 'hammer'], 
    Assassin: ['knife', 'sword'], 
    Ranger: ['bow', 'knife']
} 

//weapon words
const weaponWords = ['killing', 'murder'];
//armor words
const armorWords = ['protection', 'defending'];

module.exports = {
    Equipment,
    Weapon,
    Armor,
    generateEquipment,
    generateWeapon,
    generateArmor
}