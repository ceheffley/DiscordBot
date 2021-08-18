const Monster = require('./monster.js');

class Combat {
    constructor(serverID, channel, party, monsters) {
        this._serverID = serverID;              //snowflake
        this._channel = channel;                //channel obj
        this._party = party;                    //Party
        this._characters = [];                  //array[Character]
        this._deadChars = [];                   //array[userID]
        this._monsters = monsters;              //array[Monster]
        this._deadMons = [];                    //array[monsterID]
        this._currentTurn = 0;                  //number
        this._turnOrder = [];                   //array[Character/Monster]

        this._fleeVote = [];                    //array[userID]
        this._combatHeader = null;              //Message
        this._combatPane = null;                //Message
        this._paneMessages = [];                //array[string]

        //Store party characters to _characters
        party.members.forEach(player => {
            this._characters.push(player.currChar());
        });

        let allEntities = this._characters.concat(monsters);  //temp array with chars and monsters
        while (allEntities.length > 0) {
            let fastest = allEntities[0];
            for (let i = 1; i < allEntities.length; i++) {
                if (fastest instanceof Monster.Monster) {   
                    if (allEntities[i] instanceof Monster.Monster) {    //both are monster
                        if (allEntities[i].stats[1] > fastest.stats[1]) {
                            fastest = allEntities[i];
                        }
                    } else {    //fastest is monster, compare is player
                        if (allEntities[i].ability.stats[1] > fastest.stats[1]) {
                            fastest = allEntities[i];
                        }
                    }
                } else if (allEntities[i] instanceof Monster.Monster) { //fastest is player, compare is monster
                    if (allEntities[i].stats[1] > fastest.ability.stats[1]) {
                        fastest = allEntities[i];
                    }
                } else {    //both are player
                    if (allEntities[i].ability.stats[1] > fastest.ability.stats[1]) {
                        fastest = allEntities[i];
                    }
                }
                
            }
            this._turnOrder.push(fastest);
            allEntities.splice(allEntities.indexOf(fastest), 1);
        }
    }

    get serverID(){
        return this._serverID;
    }
    get channel(){
        return this._channel;
    }
    get party(){
        return this._party;
    }
    get characters(){
        return this._characters;
    }
    get deadChars() {
        return this._deadChars;
    }
    get monsters() {
        return this._monsters;
    }
    get deadMons() {
        return this._deadMons;
    }
    get currentTurn() {
        return this._currentTurn;
    }
    get turnOrder() {
        return this._turnOrder;
    }
    get fleeVote() {
        return this._fleeVote;
    }
    get combatHeader() {
        return this._combatHeader;
    }
    get combatPane() {
        return this._combatPane;
    }
    get paneMessages() {
        return this._paneMessages;
    }

    set combatHeader(message) {
        this._combatHeader = message;
    }
    set combatPane(message) {
        this._combatPane = message;
    }
    set paneMessages(array) {
        this._paneMessages = array;
    }

    addFleeVote(userID) {
            this._fleeVote.push(userID);
    }
    removeFleeVote(userID) {
        if (this._fleeVote.includes(userID)){
            this._fleeVote.splice(this._fleeVote.indexOf(userID), 1);
        }
    }

    charDied(char) {
        char.alive = false;
        this._deadChars.push(char.userID);
        this.removeFleeVote(char.userID);
    }

    monDied(mon) {
        mon.alive = false;
        this._deadMons.push(mon.monsterID);
    }

    charRevive(char, health = 0) {
        char.alive = true;
        this._deadChars.splice(this._deadChars.indexOf(char.userID), 1);
        if (health === 0) {
            char.heal(char.maxHP);
        } else {
            char.heal(health);
        }
    }

    updateTurn(){
        if ((this._turnOrder.length - 1) === this._currentTurn) {
            this._currentTurn = 0;
        }
        else {
            this._currentTurn++;
        }
    }
}

//---------------------------SINGLE USE FUNCTIONS-----------------------------------

/**Initiates and generates combat for Party
 * 
 * @param {Number} serverID
 * @param {Discord.Channel} channel Channel obj
 * @param {Party} party Party obj
 */
const startCombat = async (serverID, channel, party) => {

    let avgLvl = 0;
    party.members.forEach(player => {
        avgLvl += player.currChar().level;
    })
    avgLvl /= party.members.length;

    let monsters = await Monster.generateMonsters(party, avgLvl);
    console.log(monsters.length);
    //Set all monsterIDs
    for (let i = 0; i < monsters.length; i++) {
        //console.log(monsters);
        monsters[i].initID(i + 1);
    }
    const combat = new Combat(serverID, channel, party, monsters)
    party.beginCombat(combat);

    const Index = require('./index.js');
    let list = `A wild `;
    monsters.forEach(monster => {
        list += `${monster.name}, `;
    })
    list = list.slice(0, -2);
    list += ` appears!`;
    await channel.send(Index.colorMessage('ORANGE', "Combat begins!", list));
 
    if (combat.turnOrder[0] instanceof Monster.Monster) {
        monsterTurn(combat, channel.lastMessage.author.id);
    } else {
        awaitAction(combat, channel.lastMessage.author.id);
    }
}


//--------------------------------UPDATE COMBAT CHAT-----------------------------------

/**Updates the Combat's header message
 * 
 * @param {Combat} combat Combat obj
 * @param {Number} userID char.userID
 * @param {String} title Header title
 * @param {String} list Header contents
 * @param {String} status Status string list from displayStatus()
 */
const updateHeader = (combat, userID, title, list, status) => {
    const Index = require('./index.js');

    return new Promise(async (success) => {
        const user = await Index.client.fetchUser(userID);

        let embed = Index.colorMessage('#ffff00', title + status, list, "React to choose an action:", user);

        if (combat.combatHeader === null) {
            await combat.channel.send("_")
            combat.combatHeader = combat.channel.lastMessage;
            await combat.combatHeader.edit(embed);
            
        } else {
            await combat.combatHeader.edit(embed);
        }
        success();
    })
}

/**Updates the Combat's log message
 * 
 * @param {Combat} combat Combat obj
 * @param {String} string Entry to be added to log
 * @param {String} color Embed color
 */
const updatePane = (combat, string, color = 'ORANGE') => {
    const Index = require('./index.js');

    return new Promise(async (success) => {
        if (combat.combatPane === null) {
            await combat.channel.send(Index.colorMessage(color, "", string))
            combat.combatPane = combat.channel.lastMessage;
            combat.paneMessages.push(string);
            success();
            
        } else {
            if (combat.paneMessages.length === 10) {
                combat.paneMessages.shift();
            }
            
            combat.paneMessages.push(string);
            
            let str = "";
            combat.paneMessages.forEach(msg => {
                str += msg + "\n";//"**" + msg + "**\n";
            });
            await combat.combatPane.edit(Index.colorMessage(color, "", str));
            success();
        }
    });
}

/**Waits for reaction from Character's Player, passes to determineNextTargetPane() on reaction,
 * otherwise skips turn.
 * 
 * @param {Combat} combat Combat obj
 * @param {Character} char Character obj
 * @param {Number} botID 
 */
const chooseAction = async (combat, char, botID) => {
    let index = 0;

    let actionEmojis = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"]
    actionEmojis = actionEmojis.slice(0, char.ability.actions.length);

    const reactFilter = (reaction, user) => {
        if (user.id === botID) {   //bypass check for bot's initial reactions
            return true;
        } else if (user.id === char.userID && actionEmojis.includes(reaction.emoji.name)) {
            index = actionEmojis.indexOf(reaction.emoji.name);
            return true;
        }
        reaction.remove(user);  //BOT NEEDS HIGHER OR EQUAL PERMISSIONS THAN USER TO DO THIS!
        return false;
    }

    combat.combatHeader.awaitReactions(reactFilter, {max: actionEmojis.length + 1, time: 20000, errors: ['time']})
        .then(() => {
            combat.combatHeader.clearReactions();
            determineNextTargetPane(combat, char, index, botID);
        })
        .catch(() => {
            combat.combatHeader.clearReactions();
            updatePane(combat, `__${char.name}__ didn't act in time and missed their turn!`).then(() => nextTurn(combat, botID));
        });
    

    for (emoji of actionEmojis) {
        await combat.combatHeader.react(emoji);
    }
}

/**May pop up a target selection message
 * 
 * @param {Combat} combat Combat obj
 * @param {Character} char Character obj
 * @param {Number} index index of chosen action
 * @param {Number} botID 
 */
const targetSelectPane = async (combat, char, index, botID, targets = [], magic = []) => {
    let entity = char.ability.actions[index][1 + targets.length];
    const Index = require('./index.js');

    if (entity === 'none') {
        attackHandler(combat, char, index, 0).then(() => nextTurn(combat, botID));
        return;
    }

    let actionEmojis = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"]
    let idList = [];
    let cancel = false;

    //Filter
    const reactFilter = (reaction, user) => {
        if (user.id === botID) {   //bypass check for bot's initial reactions
            return true;
        } else if (user.id === char.userID && actionEmojis.includes(reaction.emoji.name)) {
            if (reaction.emoji.name != '↩') {
                targets.push(idList[actionEmojis.indexOf(reaction.emoji.name)]);
            } else {
                cancel = true;
            }
            return true;
        }
        reaction.remove(user);  //BOT NEEDS HIGHER OR EQUAL PERMISSIONS THAN USER TO DO THIS!
        return false;
    }
    //End filter

    let msg;

    //Target monsters
    if (entity === 'mon') {
        actionEmojis = actionEmojis.slice(0, combat.monsters.length);

        for (let i = 0; i < combat.monsters.length; i++) {
            if (!combat.monsters[i].alive) {
                actionEmojis.splice(i, 1);
            } else {
                idList.push(i+1);//push monID to idList
            }
        }
        msg = Index.colorMessage('#ff0000', "Choose a monster to target:", "", "React to choose a monster:");

    } 
    //Target characters
    else if (entity === 'char') {
        actionEmojis = actionEmojis.slice(0, combat.characters.length);

        for (let i = 0; i < combat.characters.length; i++) {
            if (!combat.characters[i].alive) {
                actionEmojis.splice(i, 1);
            } else {
                idList.push(i+1);//push char's position to idList
            }
        }
        msg = Index.colorMessage('#00ff00', "Choose an ally to target:", "", "React to choose an ally:");
    }
    
    actionEmojis.push('↩');
    await combat.channel.send(msg);
    msg = combat.channel.lastMessage;

    msg.awaitReactions(reactFilter, {max: actionEmojis.length + 1, time: 20000, errors: ['time']})
        .then(() => {
            msg.delete();
            determineNextTargetPane(combat, char, index, botID, targets, magic, cancel);
        })
        .catch(() => {
            msg.delete();
            targets.push(0);
            determineNextTargetPane(combat, char, index, botID, targets, magic, cancel);
        })
    
    for (emoji of actionEmojis) {
        await msg.react(emoji);
    }
}

/**Displays a magic type selection message
 * 
 * @param {Combat} combat Combat obj
 * @param {Character} char Character obj
 * @param {Number} index index of chosen action
 * @param {Array<Number>} targets array of targeted Entity(s) of the action
 * @param {Number} botID 
 */
const magicSelectPane = async (combat, char, index, botID, targets = [], magic = []) => {
    let type = char.ability.actions[index][1 + targets.length];
    const Index = require('./index.js');

    let magicEmojis = ['💡', '✴', '🍃', '🌙', '🔥', '❄', '⚡', '💨'];
    let damageType = ['light', 'dark', 'nature', 'cosmic', 'fire', 'ice', 'electric', 'wind'];
    let cancel = false;
    //Filter
    const reactFilter = (reaction, user) => {
        if (user.id === botID) {   //bypass check for bot's initial reactions
            return true;
        } else if (user.id === char.userID && magicEmojis.includes(reaction.emoji.name)) {
            if (reaction.emoji.name != '↩') {
                magic.push(damageType[magicEmojis.indexOf(reaction.emoji.name)]);
            } else {
                cancel = true;
            }
            return true;
        }
        reaction.remove(user);  //BOT NEEDS HIGHER OR EQUAL PERMISSIONS THAN USER TO DO THIS!
        return false;
    }
    //End filter

    //Reduce castable magic types
    if (type === 'arcane') {
        magicEmojis.splice(0, 4);
        damageType.splice(0, 4);
    } else if (type === 'ethereal') {
        magicEmojis.splice(4, 4);
        damageType.splice(4, 4);
    }
    magicEmojis.push('↩');

    await combat.channel.send(Index.colorMessage('#ff00ff', "Choose a magic type:", "", "React to choose a type:"));
    let msg = combat.channel.lastMessage;

    msg.awaitReactions(reactFilter, {max: magicEmojis.length + 1, time: 20000, errors: ['time']})
        .then(() => {
            msg.delete();
            determineNextTargetPane(combat, char, index, botID, targets, magic, cancel);
        })
        .catch(() => {
            msg.delete();
            magic.push(0);
            determineNextTargetPane(combat, char, index, botID, targets, magic, cancel);
        })
    
    for (emoji of magicEmojis) {
        await msg.react(emoji);
    }
}

const determineNextTargetPane = (combat, char, index, botID, targets = [], magic = [], cancel = false) => {
    let remainingTargets = (char.ability.actions[index].length - 1) - targets.length - magic.length; //num: total targeting actions - completed ones
    let reset = false;
    if (cancel) {
        if (targets.length + magic.length === 0) {
            reset = true;
        } else {
            let lastTarget = char.ability.actions[index][char.ability.actions[index].length - remainingTargets - 1];
    
            if (lastTarget === 'ethereal' || lastTarget === 'arcane' || lastTarget === 'magic') {
                magic.pop();
            } else {
                targets.pop();
            }
            remainingTargets++;
        }
    }

    if (!reset) {
        if (remainingTargets > 0) {
            let nextTarget = char.ability.actions[index][char.ability.actions[index].length - remainingTargets]; //total targeting actions + 1 - remainingTargets
            if (nextTarget === 'ethereal' || nextTarget === 'arcane' || nextTarget === 'magic') {
                magicSelectPane(combat, char, index, botID, targets, magic);
            } else {
                targetSelectPane(combat, char, index, botID, targets, magic);
            }
        } else {
            attackHandler(combat, char, index, targets, magic).then(() => nextTurn(combat, botID));
        }
    } else {
        chooseAction(combat, char, botID);
    }
}


//---------------------COMBAT FUNCTIONS------------------------


/**Player action phase:
 * Updates header and pane ->
 * Waits for action input ->
 * Passes to targetSelectPane()
 * 
 * @param {Combat} combat Combat obj
 * @param {Number} botID 
 */
const awaitAction = async (combat, botID) => {
    const char = combat.turnOrder[combat.currentTurn];

    // Start of Turn effects
    if (combat.fleeVote.includes(char.userID)) { //remove Flee flag
        combat.removeFleeVote(char.userID);
    }
    await char.updateStatus(); //updates status

    let title = `**${char.name}'s turn!**\n`;
    let list = `**HP:** ${char.hp}\n`
    list += `**Monsters alive in combat:** `
    for (let i = 0; i < combat.monsters.length; i++) {
        if (combat.monsters[i].alive){
            list += `(**${i+1}**) ${combat.monsters[i].name}, `;
        }
    }
    list = list.slice(0, -2);
    list += `\n**Characters alive in combat:** `
    for (let i = 0; i < combat.characters.length; i++) {
        if (combat.characters[i].alive){
            list += `(**${i+1}**) __${combat.characters[i].name}__ **hp**: ${combat.characters[i].hp}/${combat.characters[i].maxHP}, `;
        }
    }
    list = list.slice(0, -2);
    list += `\n**Valid actions:** attack, defend, flee, `;
    for (let i = 3; i < char.ability.actions.length; i++) {
        list += `${char.ability.actions[i][0]}, `;
    }
    list = list.slice(0, -2);

    await updateHeader(combat, char.userID, title, list, await char.displayStatus(combat.channel.client.emojis));
    await updatePane(combat, `**-${char.name}'s turn (<@${char.userID}>):**`, "#0000ff");
    
    chooseAction(combat, char, botID);
}

/**Determines what ability was selected and passes to Ability class
 * 
 * @param {Combat} combat Combat obj
 * @param {Character} char Character obj
 * @param {Number} index index of action
 * @param {Array<Number>} target array of targeted Entity(s) of action
 */
const attackHandler = (combat, char, index, target = [], magic = []) => {

    return new Promise(async (success) => {
        if (target.length === 1) {
            target = target[0];
        }
        if (magic.length === 1) {
            magic = magic[0];
        }

        if (index <= 2) {
            switch(index) {
                case 0:
                    if (target != 0) {
                        let damage = await char.ability.attack(char, combat.monsters[target - 1], magic)
    
                        await updatePane(combat, `__${char.name}__ attacked ${combat.monsters[target - 1].name} for ${damage} damage!`)
                        success();
                    } else {
                        let damage = await char.ability.attack(char, combat.monsters[char.ability.autoTargetMonster(combat)], magic)
                    
                        await updatePane(combat, `__${char.name}__ attacked ${combat.monsters[char.ability.autoTargetMonster(combat)].name} for ${damage} damage!`)
                        success();
                    }
                    break;
                case 1:
                    char.addStatus(['defend', 1], 'defend');
                    await updatePane(combat, `__${char.name}__ defended like a rotisserie chicken.`)
                    success();
                    break;
                case 2:
                    await updatePane(combat, `__${char.name}__ would like to run away!`)
                    combat.addFleeVote(char.userID);
                    success();
                    break;
            }
        } else {
            await char.ability.abilitySelect(combat, char, index, target, magic);
            success();
        }
    })
}


/**Monster action phase:
 * Passes to monster.attack() -->
 * Updates pane --> 
 * Next turn
 * 
 * @param {Combat} combat Combat obj
 * @param {Number} botID 
 */
const monsterTurn = async (combat, botID) => {
    const monster = combat.turnOrder[combat.currentTurn];
    await monster.updateStatus();
    await updatePane(combat, await monster.attack(combat));
    nextTurn(combat, botID);
}

/**Handles transition to next Entity's turn:
 * 
 * @param {Combat} combat Combat obj
 * @param {number} botID 
 */
const nextTurn = async (combat, botID) => {
    
    //Checks if all characters or all monsters are dead
    let combatOver = await new Promise(async verdict => {

        //any end-of-turn effects happen here
        const Status = require('./status.js');
        const statusStr = await Status.endTurnStatus(combat.turnOrder[combat.currentTurn]);
        if (statusStr != '') {
            await updatePane(combat, statusStr);
        }

        //Checks if any characters died by end of turn, if all dead then returns true
        for (char of combat.characters) {
            if (char.hp === 0 && !combat.deadChars.includes(char.userID)) {
                await updatePane(combat, `__*${char.name} has fallen!*__`, 'RED');
                combat.charDied(char);
                if (combat.deadChars.length === combat.characters.length) {
                    endCombat(combat, false, false);
                    verdict(true);
                }
            }
        }
        
        //Checks if any monsters died by end of turn, if all dead then returns true
        for (mon of combat.monsters) {
            if (mon.hp === 0 && !combat.deadMons.includes(mon.monsterID)) {
                await updatePane(combat, `***${mon.name} has been slain!***`, 'PURPLE');
                combat.monDied(mon);
                if (combat.deadMons.length === combat.monsters.length) {
                    endCombat(combat, true);
                    verdict(true);
                } 
            }
        }

        //Checks if fleeVote passed by alive characters, if so then returns true, else returns false
        if (combat.deadChars.length != combat.characters.length && combat.fleeVote.length === (combat.characters.length - combat.deadChars.length)) {
            endCombat(combat, false, true);
            verdict(true);
        } else {
            verdict(false);
        }
    })

    //Checks if combat should be ended
    if (!combatOver) {
        //Officially begin next turn checks (see if next on turn list is still alive, moves on if not)
        combat.updateTurn();
        let valid = false;
        Status = require('./status.js');
        let status = [];

        do {
            let upNext = combat.turnOrder[combat.currentTurn];
            if (upNext instanceof Monster.Monster) {
                if (combat.deadMons.includes(upNext.monsterID)) {
                    combat.updateTurn();
                } else {
                    status = await Status.startTurnStatus(upNext);
                    if(status[0] != '') {
                        await updatePane(combat, status[0]);                        
                    }
                    if (status[1] === 0) { //if current entity's turn is not skipped
                        valid = true;
                    } else {
                        await upNext.updateStatus();
                        combat.updateTurn();
                    }
                }
            } else {
                if (combat.deadChars.includes(upNext.userID)) {
                    combat.updateTurn();
                } else {
                    status = await Status.startTurnStatus(upNext); //[list, skipTurn]
                    if(status[0] != '') {
                        await updatePane(combat, status[0]);                        
                    }
                    if (status[1] === 0) {
                        valid = true;
                    } else {
                        await upNext.updateStatus();
                        combat.updateTurn();
                    }
                }
            }
        } while (!valid);
        //End next turn checks

        if (combat.turnOrder[combat.currentTurn] instanceof Monster.Monster) {
            monsterTurn(combat, botID);
        } else {
            awaitAction(combat, botID);
        }
    }
}

/**Ends combat and dispenses rewards or punishments depending on outcome
 * 
 * @param {Combat} combat Combat obj
 * @param {Boolean} isWinner combat victory outcome
 * @param {Boolean} fled combat fled
 */
const endCombat = async (combat, isWinner = false, fled = false) => {
    const Index = require('./index.js');
    const Character = require('./character.js');
    const Player = require('./player.js');
    const Item = require('./item.js');
    if (isWinner) {
        
        let totalLevel = 0;
        let totalExp = 0;
        let totalGold = 0;
        let list = "Here are your rewards:\n\n"

        //Reward (xp, gold, etc) handled here
        for (mon of combat.monsters) {
            totalExp += mon.expValue;
            totalGold += Math.floor(Math.random() * (mon.goldRange[1] - mon.goldRange[0])) + mon.goldRange[0];
            console.log(totalExp + ", " + totalGold);
        }
        totalExp *= combat.characters.length;
        totalGold *= combat.characters.length;

        for (char of combat.characters) {
            totalLevel += char.level;
            console.log("totalLevel: " + totalLevel);
        }

        for (char of combat.characters) {
            let getEquip = Math.floor(Math.random()*2);
            console.log(getEquip);
            if (getEquip) {
                let equipment = await Item.generateEquipment(char.ability.userClass, char.level);
                list += `__${char.name}__ obtained a **${equipment.rarity}** ${equipment.name}!\n`
                if (equipment instanceof Item.Armor) {
                    char.armor.push(equipment);
                } else {
                    char.weapons.push(equipment);
                }
            }
            let exp = Math.floor(totalExp * (char.level / totalLevel));
            let gainLevel = char.gainExp(exp);
            let gold = Math.floor(totalGold * (char.level / totalLevel));
            char.gold += gold;
            list += `__${char.name}__ gained ${exp} experience and ${gold} gold!\n`
            if (gainLevel) {
                list += `**${char.name} leveled up!**\n*Level ${char.level - 1} -> ${char.level}*\n`;
            }
            list += `\n`;
        }
        

        combat.channel.send(Index.colorMessage('GREEN', "You have emerged victorious!", list));

    } else if (fled) {
        combat.channel.send(Index.colorMessage('BLUE', "Your party ran away!"));
    } else {
        combat.channel.send(Index.colorMessage('DARK_RED', "Your party got wiped out...")); 
    }

    //party.endCombat() currently also heals party to full [temp for testing]
    await combat.party.endCombat();

    Character.updateJSON(Player.pList, './players.json');
}   


module.exports = {
    Combat,
    startCombat,
    updatePane
}