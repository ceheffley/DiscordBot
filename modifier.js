const calcFinalDamage = (damage, defender = 'none', attacker = 'none', type = damageType.NONE) => {
    let mod = 1;

    return new Promise((success) => {
        if (attacker != 'none') {
            attacker.status.attack.forEach(status => {
                switch (status[0]) {
                    case "buff":
                        mod *= 2;
                        break;
                    case "stalking":
                        if (defender.monsterID === status[2].target) {
                            mod *= 2;
                        }
                        break;
                    default:
                        break;
                }
            })
        }

        if (defender != 'none') {
            defender.status.defend.forEach(status => {
                switch (status[0]) {
                    case "defend":
                        mod /= 2;
                        break;
                    case 'protectActive':
                        mod /= 1.25;
                        defender.status.defend.splice(defender.indexOfStatus(['protectActive', 1], 'defend'), 1);                    
                        break;
                    case 'resistFire':
                        if (type === damageType.FIRE) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistIce':
                        if (type === damageType.ICE) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistElectric':
                        if (type === damageType.ELECTRIC) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistWind':
                        if (type === damageType.WIND) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistLight':
                        if (type === damageType.LIGHT) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistDark':
                        if (type === damageType.DARK) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistNature':
                        if (type === damageType.NATURE) {
                            mod /= 1.5;
                        }
                        break;
                    case 'resistCosmic':
                        if (type === damageType.COSMIC) {
                            mod /= 1.5;
                        }
                        break;                                   
                    default:
                        break;
                }
            });
        }
        success(Math.floor(damage * mod)); 
    });
}

const calcHealMod = (amount, healer = null, type = damageType.NONE) => {
    let healMod = 1;

    return new Promise((success) => {
        if (healer != null) {
            healer.status.defend.forEach(status => {
                switch (status[0]) {
                    case "blessed":
                        healMod *= 1.5;
                        break;
                    default:
                        break;
                }
            })
        }
        success(Math.floor(amount * healMod)); 
    });
}

//------------------Combat Enums---------------------

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

module.exports = {
    calcFinalDamage,
    calcHealMod
}