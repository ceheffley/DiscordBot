class Ability {
    constructor(userClass, actions, stats) {
        this._userClass = userClass;        //string
        this._actions = actions;
        this._stats = stats;
    } 

    get userClass() {
        return this._userClass;
    }
    get actions() {
        return this._actions;
    }
    get stats() {
        return this._stats;
    }

    autoTargetMonster(combat) {
        for (let i = 0; i < combat.monsters.length; i++) {
            if (combat.monsters[i].alive) {
                return i;
            }
        }        
    }

    damageAllEnemies(monsters, attackDamage, char, type = "none") {
        let damage = [];
        return new Promise((success) => {
            for (let i = 0; i < monsters.length; i++) {
                if (monsters[i].alive) {
                    monsters[i].damage(attackDamage, char, type)
                    .then((collected) => {
                        damage.push([monsters[i].name, collected, i+1]);
                    });
                }
            }
            success(damage);
        });
    }

    autoHealAlly(combat) {
        for (let i = 0; i < combat.characters.length; i++) {
            if ((combat.characters[i].hp < combat.characters[i].maxHP) && combat.characters[i].alive) {
                return i;
            }
        }
        return 0;
    }
}

const actions = [['attack', 'mon'], ['defend'], ['flee']];
const Modifier = require('./modifier.js');

class Swordsman extends Ability {
    constructor(stats) {
        super('Swordsman', actions.concat([['lunge', 'mon'], ['slash', 'mon']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //Lunge
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.lunge(char, target);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.lunge(char, target)
                }
                await Combat.updatePane(combat, `__${char.name}__ lunged at ${target.name} for ${damage} damage!`)
                success();
            }
            else if (index === 4) { //Slash
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.slash(char, target)
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.slash(char, target);
                }
                await Combat.updatePane(combat, `__${char.name}__ slashed at ${target.name} for ${damage} damage!`)
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    lunge(char, monster) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0] + this._stats[1]/2, char));
        })
    }

    slash(char, monster) {
        return new Promise(async (success) => {
            let initDamage = this._stats[0];
            if ((monster.maxHP/2) > monster.hp) {
                initDamage *= 3;
            }
            success(await monster.damage(initDamage, char));
        })
    }
}

class Berserker extends Ability {
    constructor(stats) {
        super('Berserker', actions.concat([['charge', 'mon'], ['sweep']]), stats);
    }
    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //Charge
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.charge(char, target);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.charge(char, target);
                }
                await Combat.updatePane(combat, `__${char.name}__ charged at ${target.name} for ${damage[0]} damage, but also took ${damage[1]} damage themselves!`)
                success();
            }
            else if (index === 4) { //Sweep
                damage = await this.sweep(char, combat.monsters)
                let str = `__${char.name}__ swept through the enemies, doing `;
                for (let i = 0; i < damage.length; i++) {
                    str += `${damage[i][1]} damage to (${damage[i][2]}) ${damage[i][0]}, `;
                }
                str = str.slice(0, -2);
                await Combat.updatePane(combat, str)
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    charge(char, monster) {
        return new Promise(async (success) => {
            let damage = [Math.floor(this._stats[0] * 2), Math.floor((Math.random() * 2) + 1)];
            await monster.damage(damage[0], char);
            await char.damage(damage[1], char);
            success(damage);
        })
    }

    sweep(char, monsters) {
        return new Promise(async (success) => {
            success(await this.damageAllEnemies(monsters, this._stats[0], char));
        })
    }
}

class Knight extends Ability {
    constructor(stats) {
        super('Knight', actions.concat([['protect'], ['slam', 'mon']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //Protect
                this.protect(char);
                await Combat.updatePane(combat, `__${char.name}__ becomes a shield for their team!`);
                success();
            }
            else if(index === 4) {   //Slam
                if (target != 0) {
                    target = combat.monsters[target - 1]
                    damage = await this.slam(char, target);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)]
                    damage = await this.slam(char, target);
                }
                await Combat.updatePane(combat, `__${char.name}__ slammed ${target.name} for ${damage} damage!`)
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    protect(char) {
        char.addStatus(['protect', 1], statusPhase.DEFEND);
    }

    slam(char, monster) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0] + this._stats[2] * 1.5, char)); //right now is str + con*1.5
        })
    }
}

class Enchanter extends Ability {
    constructor(stats) {
        super('Enchanter', actions.concat([['heal', 'char'], ['conduit', 'mon', 'char', 'ethereal']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //Heal
                if (target != 0) {    
                    target = combat.characters[target - 1];
                    damage = await this.healSpell(char, target);
                    await Combat.updatePane(combat, `__${char.name}__ healed ${target.name} for ${damage} health!`)
                    success();
                } else {
                    target = combat.characters[this.autoHealAlly(combat)];
                    damage = await this.healSpell(char, target);
                    if (damage != 0) {
                        await Combat.updatePane(combat, `__${char.name}__ healed ${target.name} for ${damage} health!`)
                    } else {
                        await Combat.updatePane(combat, `Your party is at full health, so your heal went to waste!`)
                    }
                    success();
                }
            } else if (index === 4) {  //Conduit
                let enemy;
                let ally;
                console.log(target);
                if (target[0] != 0) {
                    enemy = combat.monsters[target[0] - 1];
                } else {
                    enemy = combat.monsters[this.autoTargetMonster(combat)];
                }
                if (target[1] != 0) {
                    ally = combat.characters[target[1] - 1];
                } else {
                    ally = char;
                }

                damage = await this.conduit(char, enemy, ally, type);
                if (ally === char) {
                    await Combat.updatePane(combat, `__${char.name}__ siphoned raw energy from ${enemy.name} for ${damage} damage and made it into a ${type} ward for themself! `);
                } else {
                    await Combat.updatePane(combat, `__${char.name}__ siphoned raw energy from ${enemy.name} for ${damage} damage and made it into a ${type} ward for ${ally.name}!`);
                }
                
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    healSpell(char, target) {
        return new Promise(async (success) => {
            let health = target.heal(await Modifier.calcHealMod(this._stats[4]/3), char);
            success(health);
        })
    }

    conduit(char, monster, ally, type) {
        return new Promise(async (success) => {
            switch(type) {
                case damageType.LIGHT:
                    ally.addStatus(['resistLight', 1], statusPhase.DEFEND);
                    break;
                case damageType.DARK:
                    ally.addStatus(['resistDark', 1], statusPhase.DEFEND);
                    break;
                case damageType.NATURE:
                    ally.addStatus(['resistNature', 1], statusPhase.DEFEND);
                    break;
                case damageType.COSMIC:
                    ally.addStatus(['resistCosmic', 1], statusPhase.DEFEND);
                    break;
            }
            //ally.addStatus([''])
            success(await monster.damage(this._stats[4], char));
        })
    }
}

class Wizard extends Ability {
    constructor(stats) {
        super('Wizard', actions.concat([['invoke', 'mon', 'arcane'], ['arcana', 'mon']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //invoke
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.invoke(char, target, type);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.invoke(char, target, type);
                }
                await Combat.updatePane(combat, `__${char.name}__ invoked ${type} magic at ${target.name} for ${damage} damage!`)
                success();
            }
            else if (index === 4) { //Arcana
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.arcana(char, target);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.arcana(char, target);
                }
                await Combat.updatePane(combat, `__${char.name}__ channeled arcana at ${target.name}, dealing ${damage} damage and gaining resistance to arcane magic for 1 round!`)
                success();
            }
        });
    }
    
    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    invoke(char, monster, type) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[3]*1.25, char, type));
        })
    }

    arcana(char, monster) {
        return new Promise(async (success) => {
            char.addStatus(['resistFire', 1], statusPhase.DEFEND);
            char.addStatus(['resistIce', 1], statusPhase.DEFEND);
            char.addStatus(['resistElectric', 1], statusPhase.DEFEND);
            char.addStatus(['resistWind', 1], statusPhase.DEFEND);
            success(await monster.damage(this._stats[3], char));
        })
    }
}

class Sage extends Ability {
    constructor(stats) {
        super('Sage', actions.concat([['enrich', 'char'], ['root', 'mon']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let dur = 0;
            if(index === 3) {   //Enrich
                if (target != 0) {
                    target = combat.characters[target - 1];
                    dur = await this.enrich(target);
                } else {
                    target = combat.characters[this.autoHealAlly(combat)];
                    dur = await this.enrich(target);
                }
                await Combat.updatePane(combat, `__${char.name}__ surrounds ${target.name} with natural magic, slightly healing them for ${dur} turns!`);
                success();
            }
            else if (index === 4) { //Root
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    await this.root(target);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    await this.root(target);
                }
                await Combat.updatePane(combat, `__${char.name}__ rooted ${target.name} for 1 round!`)
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    enrich(ally) {
        return new Promise((success) => {
            if (ally.checkStatus('enrich', statusPhase.START)) {
                let dur = Math.floor(Math.random() * 2 + 1);
                ally.status.start[ally.indexOfStatus('enrich', statusPhase.START)][1] += dur;
                success(dur);
            }
            else {
                ally.addStatus(['enrich', 3], statusPhase.START);
                success(3);
            }
        })
    }

    root(monster) {
        return new Promise((success) => {
            if (monster.checkStatus('root', statusPhase.START)) {
                monster.status.start[monster.indexOfStatus('root', statusPhase.START)][1] = 1;
                success();
            }
            else {
                monster.addStatus(['root', 1], statusPhase.START);
                success();
            }            
        })
    }

}

class Assassin extends Ability {
    constructor(stats) {
        super('Assassin', actions.concat([['shank', 'mon'], ['bleed', 'mon']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //Shank
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.shank(char, target);
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.shank(char, target)
                }
                await Combat.updatePane(combat, `__${char.name}__ shanked ${target.name} for ${damage} damage!`)
                success();
            }
            else if (index === 4) { //Bleed
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.bleed(char, target)
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.bleed(char, target);
                }
                await Combat.updatePane(combat, `__${char.name}__ deftly slices open ${target.name}, dealing ${damage}!`)
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    shank(char, monster) {
        return new Promise(async (success) => {
            if(monster.checkStatus('shanked', statusPhase.START)) {
                success(await monster.damage(this._stats[0], char));
            } else {
                monster.addStatus(['shanked', '∞'], statusPhase.START);
                success(await monster.damage(this._stats[0] * 1.75, char));
            }
        })
    }

    bleed(char, monster) {
        return new Promise(async (success) => {
            let damage = await monster.damage(this._stats[0] * .75, char) + " damage";
            monster.addStatus(['bleed', 100], statusPhase.END);
            let duration = await monster.statusDuration('bleed', statusPhase.END)
            if (duration > 200) {
                damage += " and causing extreme bleeding";
            } else if (duration > 100) {
                damage += " and causing severe bleeding";
            } else {
                damage += " and making them start to bleed out";
            }
            success(damage);
        })
    }
}

class Ranger extends Ability {
    constructor(stats) {
        super('Ranger', actions.concat([['shoot', 'mon'], ['stalk', 'mon']]), stats);
    }

    abilitySelect(combat, char, index, target, type = damageType.NONE) {
        const Combat = require('./combat.js');
        return new Promise(async (success) => {
            let damage = 0;
            if(index === 3) {   //Shoot
                if (Math.random() > .15) {
                    if (target != 0) {
                        target = combat.monsters[target - 1];
                        damage = await this.shoot(char, target);
                    } else {
                        target = combat.monsters[this.autoTargetMonster(combat)];
                        damage = await this.shoot(char, target)
                    }
                    await Combat.updatePane(combat, `__${char.name}__ shot ${target.name} for ${damage} damage!`)
                } else {
                    await Combat.updatePane(combat, `__${char.name}__ shot wide and missed their target!`);
                }
                success();
            }
            else if (index === 4) { //Stalk
                if (target != 0) {
                    target = combat.monsters[target - 1];
                    damage = await this.stalk(char, target)
                } else {
                    target = combat.monsters[this.autoTargetMonster(combat)];
                    damage = await this.stalk(char, target);
                }
                if (damage != -1) {
                    await Combat.updatePane(combat, `__${char.name}__ starts stalking ${target.name}, dealing bonus damage to them!`);
                } else {
                    await Combat.updatePane(combat, `__${char.name}__ tries to stalk a different target, but already has a target!`);
                }
                success();
            }
        });
    }

    attack(char, monster, type = damageType.NONE) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[0], char, type));
        })
    }

    shoot(char, monster) {
        return new Promise(async (success) => {
            success(await monster.damage(this._stats[1] * 1.5, char));
        })
    }

    stalk(char, monster) {
        return new Promise(async (success) => {
            char.addStatus(['stalking', "∞", {target: monster.monsterID, name: monster.name}], statusPhase.ATTACK);
            //monster.addStatus(['hunted', "∞", {target: char.userID}], statusPhase.ATTACK);
            success();
        })
    }
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

let statusPhase = {
    START: 'start',
    END: 'end',
    ATTACK: 'attack',
    DEFEND: 'defend'
}

//------------------Ability Generator----------------------

const generateAbility = (userClass, stats) => {
    switch(userClass) {
        case('Swordsman'):
            return new Swordsman(stats);
        case('Berserker'):
            return new Berserker(stats);
        case('Knight'):
            return new Knight(stats);
        case('Enchanter'):
            return new Enchanter(stats);
        case('Wizard'):
            return new Wizard(stats);
        case('Sage'):
            return new Sage(stats);
        case('Assassin'):
            return new Assassin(stats);
        case('Ranger'):
            return new Ranger(stats);
    }
}

module.exports = {
    generateAbility
}