const Discord = require('discord.js');
const Character = require('./character.js');
const Player = require('./player.js');
const Party = require('./party.js');
const Combat = require('./combat.js');
const Item = require('./item.js')

const {prefix, token} = require('./config.json');
const client = new Discord.Client();
const fs = require('fs');

//Client Setup Function

client.once('ready', () => {
    let obj = JSON.parse(fs.readFileSync('./players.json'));
    Player.validate(obj);
    console.log("Player objects validated");
    
    console.log('Ready!');
})

/**Returns a random number between 1 and input
 * 
 * @param {Number} sides 
 * @returns A random number between 1 and input
 */
function rollDie(sides) {
    return Math.floor(Math.random() * sides + 1);
}

/**Starts a vote for party members
 * 
 * @param {Discord.Message} message 
 * @param {Party} party 
 * @param {String} title 
 * @param {String} desc 
 * @returns True if more yays than nays, else false
 */
const startVote = (message, party, title = "New vote started!", desc = "") => {
    return new Promise(async (success, failure) => {
        let voted = [];

        const filter = (reaction, user) => {
            if (user.id === reaction.message.author.id) {   //bypass check for bot's initial reactions
                return true;
            } else if (party.memberIDs.includes(user.id) && !voted.includes(user.id) && (reaction.emoji.name === '✅' || reaction.emoji.name === '⛔')) {
                voted.push(user.id);
                return true;
            }
            reaction.remove(user);  //BOT NEEDS HIGHER OR EQUAL PERMISSIONS THAN USER TO DO THIS!
            return false;
        }

        let voteMsg = colorMessage('AQUA', title, desc, `--Party members can react with '✅' or '⛔' to vote!\n(You can only vote once so choose carefully!)`)
        await message.channel.send(voteMsg)

        party.activeVote = true;
        let msgObj = message.channel.lastMessage;
        msgObj.awaitReactions(filter, {
            max: Number(party.memberIDs.length) + 2, 
            time: 15000, 
            errors: ['time']
        }).then(collected => {
            msgObj.clearReactions();
            let yay = collected.get('✅').count - 1;
            let nay = collected.get('⛔').count - 1;
            let verdict = (yay > nay ? 'passed!':'failed..'); //if yay > nay, = 'passed', else 'failed'
            msgObj.edit("", colorMessage('AQUA', "The votes are in!", `✅ ${yay} - ${nay} ⛔\n\nThe vote ${verdict}`))
            party.activeVote = false;
            success(yay > nay);
        }).catch(collected => {
            msgObj.clearReactions();
            let yay = collected.get('✅').count - 1;
            let nay = collected.get('⛔').count - 1;
            let verdict = (yay > nay ? 'passed!':'failed..'); //if yay > nay, = 'passed', else 'failed'
            msgObj.edit("", colorMessage('AQUA', "Time's up!", `✅ ${yay} - ${nay} ⛔\n\nThe vote ${verdict}`));
            party.activeVote = false;
            success(yay > nay);
        });
        await msgObj.react('✅');
        await msgObj.react('⛔');
    }); 
}


//Rich Embed Message functions

/**Generates an error message to display in chat
 * 
 * @param {String} errMsg 
 * @param {String} footer 
 * @returns RichEmbed error message
 */
const errMessage = (errMsg, footer = "") => {
    return new Discord.RichEmbed().setColor('#ff0000').setDescription(errMsg).setFooter(footer);
}

/**Generates a colored RichEmbed to display in chat
 * 
 * @param {String} color 
 * @param {String} title 
 * @param {String} msg 
 * @param {String} footer 
 * @param {Discord.User} user 
 */
const colorMessage = (color, title = "", msg = "", footer = "", user = "") => {
    let embed = new Discord.RichEmbed().setColor(color).setTitle(title).setDescription(msg).setFooter(footer);
    if (user != "") {
        embed.setAuthor(user.username, user.avatarURL)
    }
    return embed;
}


//Mr world-wide reference vars, probably should be moved or deleted
const classes = ['Swordsman', 'Berserker', 'Knight', 'Enchanter', 'Wizard', 'Sage', 'Assassin', 'Ranger'];
const races = ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Halfling', 'Half-Orc', 'Human', 'Tiefling'];

//when client recieves any message
client.on('message', message => {

    //Commands:
    if (message.content.startsWith(`${prefix}`)) {

        //Start command for new users
        if(Player.isNewUser(message.guild.id, message.author.id)){
            if(message.content === (`${prefix}start`)) {
                Player.addNewUser(message.guild.id, message.author.id);
                message.channel.send(colorMessage('GREEN', `Welcome to the guild, adventurer ${message.author.username}!`, `You'll be ready to go on quests any minute now! But first, you need to make yourself a character!`, `--Type '&recruit' to begin creating your first character!`));
            } else{
                message.channel.send(colorMessage('AQUA', "", `Welcome to the D&D bot! It seems you're new in town, ${message.author}. You should go register at the guild so you can get adventuring!`, `--Use '&start' to begin your adventure`));
            }
        
        } else {
        
            //help command
            if(message.content === `${prefix}help`){
                let title = 'Hello! Welcome to the D&D bot!\nCommands are:\n';
                let list = '**&characters | &c**: Lists your characters.\n';
                list += '**&recruit**: Create a character to join your roster.\n';
                list += '**&switch** <num>: Switches your currently equiped character.\n'
                list += '**&dismiss** <num>: Permanently remove a character.\n'
                list += '**&sheet** <num> **| &sheets** <num>: Displays character sheets. If no number provided, uses your current character.\n'
                list += `**&party help**: bring up a list of the party commands.\n`;
                list += `**&combat**: begin a battle (requires a party)\n`;
                message.channel.send(colorMessage('AQUA', title, list));
            }


            //------------------Character Commands-----------------------


            //Generate Character for Player
            else if(message.content === `${prefix}recruit`) {
                let party = Party.findPartyOfUser(message.guild.id, message.author.id)
                if ((party === null) || (party.combat === null)) {
                    let stats = [0, 0, 0, 0, 0, 0];
                    let charStats = [0, 0, 0, 0, 0, 0];
                    for(i = 0; i < 6; i++){
                        let rollingStat = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
                        rollingStat.sort(function(a, b){return a - b});
                        stats[i] = rollingStat[1] + rollingStat[2] + rollingStat[3];
                    }
                    statNames = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
                    assignStat(0, stats, charStats, statNames);
                } //inCombat check
            }

            //Delete a Character from Player
            else if(message.content.startsWith(`${prefix}dismiss`)) {
                let party = Party.findPartyOfUser(message.guild.id, message.author.id)
                let player = Player.getPlayer(message.guild.id, message.author.id)
                if (party === null || (party.combat === null)) {
                    if (player.charArray.length > 0) {
                        let number = Number(message.content.substring(8, message.content.length));

                        if(Number.isInteger(number) && (number > 0 && number <= player.charArray.length)) {
                            
                            if (number - 1 != player.index) {
                                message.reply(colorMessage('DARK_RED', "Dismissing a character:", `Are you certain that you want to dismiss **${player.charArray[number - 1].name}**? (Type 'yes' to confirm)`, `This action cannot be undone!`));
                                const filter = m => ((m.author.id === message.author.id) && (m.channel.id === message.channel.id));
                                message.channel.awaitMessages(filter, {
                                    max: 1,
                                    time:60000
                                }).then(collected => {
                                    if(collected.first().content.toUpperCase() === 'YES'){
                                        message.reply(colorMessage('GREEN', "", `You have dismissed **${player.charArray[number - 1].name}**...`));
                                        player.removeCharacter(number - 1);
                                        if (player.index > number - 1) {
                                            player.index--;   //index--;
                                        }
                                        Character.updateJSON(Player.pList, './players.json');
                                    } else {
                                        message.reply(colorMessage('GOLD', "", 'Phew! Your character is safe for another day.'));
                                    }
                                })
                            } else {
                                message.channel.send(errMessage(`You can't dismiss your active character! If you want to replace your character, make one with '&recruit' first!`));
                            }
                            
                        } else {
                            message.channel.send(errMessage(`That's not a valid character number to dismiss!`, `--Check your characters using '&characters' and use '&dismiss <number>' to dismiss certain characters.`));
                        }
                    }else {
                        message.reply(errMessage("It seems you don't have any characters yet. Create one with '&recruit'!"));
                    }
                }//inCombat check
            }

            //Switch current Character of Player
            else if(message.content.startsWith(`${prefix}switch`)) {
                let party = Party.findPartyOfUser(message.guild.id, message.author.id)
                let player = Player.getPlayer(message.guild.id, message.author.id);
                if (party === null || (party.combat === null)) {
                    if (player.charArray.length > 1) {
                        let number = Number(message.content.substring(7, message.content.length));

                        if(Number.isInteger(number) && (number > 0 && number <= player.charArray.length)) {
                            if (number - 1 != player.index) {

                                player.index = number - 1;
                                message.reply(colorMessage('GREEN', "", `You have switched to using **${player.currChar().name}**!`));
                                
                                Character.updateJSON(Player.pList, './players.json'); 
                            } else {
                                message.channel.send(errMessage(`You're already using that character!`));
                            }
                            
                        } else {
                            message.channel.send(errMessage(`That's not a valid character number to switch with!`, `--Check your characters using '&characters' and use '&switch <number>' to switch characters.`));
                        }
                    } else {
                        message.reply(errMessage("It seems you don't have enough characters yet. Create one with '&recruit'!"));
                    }
                } //inCombat check
            }

            //List all of Player's Characters
            else if((message.content === `${prefix}characters`)||(message.content === `${prefix}c`)) {
                let player = Player.getPlayer(message.guild.id, message.author.id);
                if (player.charArray.length > 0) {
                    let title = "Your characters are: ";
                    let list = "";
                    let cArray = player.charArray;
                    for (let i = 0; i < cArray.length; i++) {
                        list += `${i + 1}.) `;
                        if (i === player.index) {
                            list += ":star: ";
                        }
                        list += `**${cArray[i].name}**, the Lv. ${cArray[i].level} ${cArray[i].race} ${cArray[i].ability.userClass}\n`;
                    }
                    message.channel.send(colorMessage('AQUA', title, list));
                } else {
                    message.reply(errMessage("It seems you don't have any characters yet. Create one with '&recruit'!"));
                }
            }

            //Display Player's current Character's info
            else if(message.content.startsWith(`${prefix}sheet`)) {
                let player = Player.getPlayer(message.guild.id, message.author.id);
                if (player.charArray.length > 0) {
                    let sCheck = 6;
                    if (message.content[6] === 's') {
                        sCheck++;
                    }

                    let number = Number(message.content.substring(sCheck, message.content.length));
                    let cArray = player.charArray;
                    if (!Number.isInteger(number) || number === 0){
                        number = player.index + 1;
                    }
                    
                    if (number > 0 && number <= cArray.length) {
                        let char = cArray[number - 1];
                        let statNames = ['-Str:', '-Dex:', '-Con:', '-Int:', '-Wis:', '-Cha:'];

                        let title = `**${char.name}**, the Lv. ${char.level} ${char.race} ${char.ability.userClass}\n`;
                        if (number - 1 === player.index) {
                            title = `:star: **${char.name}**, the Lv. ${char.level} ${char.race} ${char.ability.userClass} :star:\n`;
                        }
                        
                        let list = `**HP**: ${char.hp} / ${char.maxHP}\n`;
                        list += `**Exp**: ${char.exp} / ${100 * char.level}\n`;
                        list += `**Ability Scores**:\n`;
                        for (let i = 0; i < char.ability.stats.length; i++) {
                            list += `${statNames[i]} ${char.ability.stats[i]} (mod: ${modifier(char.ability.stats[i])}\n`;
                        }
                        list += `_Initiative_: ${modifier(char.ability.stats[1])}\n`;
                        list += `**Hit Dice**: ${char.level}d${char.hitDice}\n`;
                        list += `**Gold**: $${char.gold}\n`
                        
                        message.channel.send(colorMessage('GOLD', title, list, "", message.author)); 
                    } else {
                        message.channel.send(errMessage(`You don't have that number of characters!`, `--Check your characters using '&characters'!`));
                    }
                }else {
                    message.reply(errMessage("It seems you don't have any characters yet. Create one with '&recruit'!"));
                }
            } //&sheet

            //Displays Character's weapons
            else if (message.content.startsWith(`${prefix}weapons`)) {
                let player = Player.getPlayer(message.guild.id, message.author.id);
                if (player.charArray[player.index].weapons.length > 0) {
                    let title = "Your weapons are: ";
                    let list = "";
                    let wArray = player.charArray[player.index].weapons;
                    for (let i = 0; i < wArray.length; i++) {
                        list += `${i + 1}.) `;
                        list += `The ${wArray[i].rarity} **${wArray[i].name}** (Required level: ${wArray[i].reqLvl}, attack damage: ${wArray[i].damage})\n`;
                    }
                    message.channel.send(colorMessage('AQUA', title, list));
                } else {
                    message.reply(errMessage("It seems you don't have any weapons yet. Go slay some monsters to get one!"));
                }                
            }

            //Displays Character's armor
            else if (message.content.startsWith(`${prefix}armor`)) {
                let player = Player.getPlayer(message.guild.id, message.author.id);
                if (player.charArray[player.index].armor.length > 0) {
                    let title = "Your armor pieces are: ";
                    let list = "";
                    let aArray = player.charArray[player.index].armor;
                    for (let i = 0; i < aArray.length; i++) {
                        list += `${i + 1}.) `;
                        list += `The ${aArray[i].rarity} **${aArray[i].name}** (Required level: ${aArray[i].reqLvl}, defense: ${aArray[i].defense})\n`;
                    }
                    message.channel.send(colorMessage('AQUA', title, list));
                } else {
                    message.reply(errMessage("It seems you don't have any armor yet. Go slay some monsters to get some!"));
                }                
            }


            //--------------------Combat Commands---------------------------


            //Initiate a vote to start combat
            else if (message.content === `${prefix}combat`) {
                party = Party.findPartyOfLeader(message.guild.id, message.author.id);
                if (party != null) {
                    if (party.combat === null) {
                        let noChars = []
                        for (let i = 0; i < party.memberIDs.length; i++) {
                            if (Player.getPlayer(message.guild.id, party.memberIDs[i]).charArray.length === 0) {
                                noChars.push(`<@${party.memberIDs[i]}>`);
                            }
                        }
                        if (noChars.length === 0) {
                            startVote(message, party, "Time for Battle!", "Pass the vote to initiate combat").then((bool) => {
                                if (bool) {
                                    Combat.startCombat(message.guild.id, message.channel, party);
                                } else {
                                    message.channel.send(colorMessage('AQUA', "", "Looks like the party's not quite ready yet."));
                                }
                            });  
                        } else {
                            message.channel.send(errMessage(`The following party members don't have characters: ${noChars}`, "--Recruit characters by using '&recruit'!"))
                        }
                    } else {
                        message.channel.send(errMessage(`Your party is already in combat!`));
                    }
                } else {
                    if (Party.isInParty(message.guild.id, message.author.id)) {
                        message.channel.send(errMessage(`Only the party leader can begin combat!`));
                    } else {
                        message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                    }
                }
            }


            //---------------------Party Commands--------------------


            //Check if message starts with '&party'
            else if (message.content.startsWith(`${prefix}party`)) {
                let str = message.content.substring(7, message.content.length);
                //'&party' becomes '&party info'
                if (str.length === 0) {
                    str = 'info';
                }

                //Lists party commands
                if (str === 'help') {
                    let title = 'Party Commands:';
                    let list = '**&party create**: creates a party\n';
                    list += `**&party info** | **&party info <@user>**: shows party info of a player, defaults to you\n`;
                    list += '**&party promote <@user>**: promotes a player to party leader\n';
                    list += '**&party vote: start a vote for your party\n';
                    list += '**&party join <@user>**: joins a player\'s party\n';
                    list += '**&party disband**: disbands your party\n';
                    list += '**&party leave**: leave your party\n';
                    list += '**&party kick <@user>**: kicks a player from your party\n';
                    list += `**&party private/public**: sets your party's status to public or private (private by default)\n`;
                    list += `**&party invite <@user>**: lets a player join your private party, can invite multiple at once\n`;
                    list += `**&party revoke <@user>**: revokes permission to join your private party, can revoke multiple at once\n`;
                    message.channel.send('AQUA', title, list);
                } 

                //Display Player's current Party info
                else if (str.startsWith('info')) {
                    if ((str === 'info')) {
                        let party = Party.findPartyOfUser(message.guild.id, message.author.id);
                        if (party != null) {
                            let title = `Party Info:`;
                            let list = `Party leader: <@${party.leaderID}>\n`;
                            list += `Other members: `;
                            if (party.memberIDs.length > 1) {
                                party.memberIDs.forEach(userID => {
                                    if (userID != party.leaderID) {
                                        list += `<@${userID}>, `;
                                    }
                                });
                                list = list.slice(0, -2);
                            } else {
                                list += `None`;
                            }
                            list += `\nPlayers invited to party: `;
                            if (party.invited.length > 0) {
                                party.invited.forEach(user => {
                                    list += `<@${user}>, `;
                                });
                                list = list.slice(0, -2);
                            } else {
                                list += `None`;
                            }

                            if(party.isPublic === true) {
                                list += `\nParty status: public`;
                            } else {
                                list += `\nParty status: private`;
                            }
                            message.channel.send(colorMessage('AQUA', title, list));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }
                    } else if (message.mentions.users.size === 1 && Party.isInParty(message.guild.id, message.mentions.users.first().id)) {
                            let party = Party.findPartyOfUser(message.guild.id, message.mentions.users.first().id);
                            let title = `${message.mentions.users.first().username}'s Party:`;
                            let list = `Party leader: <@${party.leaderID}>\n`;
                            list += `Other members: `;
                            if (party.memberIDs.length > 1) {
                                party.memberIDs.forEach(userID => {
                                    if (userID != party.leaderID) {
                                        list += `<@${user}>, `;
                                    }
                                });
                                list = list.slice(0, -2);
                            } else {
                                list += `None`;
                            }
                            list += `\nPlayers invited to party: `;
                            if (party.invited.length > 0) {
                                party.invited.forEach(user => {
                                    list += `<@${user}>, `;
                                });
                                list = list.slice(0, -2);
                            } else {
                                list += `None`;
                            }

                            if(party.isPublic === true) {
                                list += `\nParty status: public`;
                            } else {
                                list += `\nParty status: private`;
                            }
                            message.channel.send(colorMessage('AQUA', title, list));
                    } else {
                        if (message.mentions.users.size != 1) {
                            message.channel.send(errMessage(`You can only get party info of one player at a time!`));
                        } else {
                            message.channel.send(errMessage(`This player is not currently in a party`));
                        }
                    }
                }
                
                //Creates a new Party for Player
                else if (str === 'create') {
                    if (!Party.isInParty(message.guild.id, message.author.id)) {
                        Party.createParty(message.guild.id, message.author.id);
                        message.reply(colorMessage('GREEN', "You have successfully formed a party!", "Now recruit fellow adventurers and explore!"));
                    } else {
                        message.reply(errMessage("You're already in a party!"));
                    }
                } 

                //Deletes Player's Party [Party Leader only]
                else if (str === 'disband') {
                    const party = Party.findPartyOfLeader(message.guild.id, message.author.id);
                    if (party != null) {
                        if (party.combat === null) {
                            Party.deleteParty(party);
                            message.channel.send(colorMessage('GREEN', "", `Your party has been disbanded!`));
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`You need to be the party leader to disband!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }
                    }
                } 
                
                //Join a specific Player's Party
                else if (str.startsWith('join')) {
                    if (!Party.isInParty(message.guild.id, message.author.id)) {
                        const party = Party.findPartyOfLeader(message.guild.id, message.mentions.users.first().id);
                        if ((message.mentions.users.size === 1) && (party != null)) {
                            if (party.combat === null) {
                                if(party.isPublic || party.invited.includes(message.author.id)) {
                                    party.addUser(message.author.id);
                                    message.channel.send(colorMessage('GREEN', "", `<@${message.author.id}> has successfully joined <@${message.mentions.users.first().id}>'s party!`));
                                } else {
                                    message.channel.send(errMessage(`This player's party is private.`));
                                }
                            }
                        } else { 
                            message.channel.send(errMessage(`You need to mention (@) the leader of an open party to join it!`));
                        }
                    } else {
                        message.channel.send(errMessage(`You are already in a party!`, `--Use &party leave to leave your party first.`));
                    }
                }

                //Player leaves their Party
                else if (str === 'leave') {
                    const party = Party.findPartyOfUser(message.guild.id, message.author.id);
                    if (party != null) {
                        if (party.combat === null) {
                            if (message.author.id != party.leaderID) {
                                party.removeUser(message.author.id);
                                message.channel.send(colorMessage('GREEN', "", `You have left the party.`));
                            } else {
                                message.channel.send(errMessage(`The leader can't leave their party for dead!`, `---Use '&promote <@user>' or '&disband' in order to leave your party.`));
                            }
                        }
                    } else {
                        message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                    }
                }
                
                //Remove specific Player from your Party [Party Leader only]
                else if (str.startsWith('kick')) {
                    party = Party.findPartyOfLeader(message.guild.id, message.author.id);
                    if (party != null) {
                        if (party.combat === null) {
                            if (message.mentions.users.size === 1) {
                                if (message.mentions.users.first().id != message.author.id){
                                    if(party.removeUser(message.mentions.users.first().id)) {
                                        message.channel.send(colorMessage('DARK_RED', "", `**<@${message.mentions.users.first().id}> has been kicked from the party.**`));
                                    } else {
                                        message.channel.send(errMessage(`That player isn't in your party!`));
                                    }
                                } else {
                                    message.channel.send(errMessage(`The leader can't leave their party for dead!`));
                                }
                            } else if (message.mentions.users.size === 0) {
                                message.channel.send(errMessage(`You need to mention (@) a player to kick!`));
                            } else {
                                message.channel.send(errMessage(`You may only kick one member at a time!`));
                            }
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`Only the party leader can kick!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }
                    }
                } 
                
                //Transfer Party leadership to another Player [Party Leader only]
                else if (str.startsWith('promote')) {
                    party = Party.findPartyOfLeader(message.guild.id, message.author.id)
                    if (party != null) {
                        if (party.combat === null) {
                            if (message.mentions.users.size === 1) {
                                if (message.mentions.users.first().id != message.author.id){
                                    if (party.giveLeader(message.mentions.users.first().id)) {
                                        message.channel.send(colorMessage('GREEN', "", `**<@${message.mentions.users.first().id}> has been promoted to party leader.**`));
                                    } else {
                                        message.channel.send(errMessage(`That player is not in your party!`));
                                    }
                                } else {
                                    message.channel.send(errMessage(`You're already the leader!`));
                                }
                            } else if (message.mentions.users.size === 0) {
                                message.channel.send(errMessage(`You need to mention (@) a player to promote!`));
                            } else {
                                message.channel.send(errMessage(`You can only promote one person to leader!`));
                            }
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`Only the party leader can promote!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }
                    }
                }
                
                //Allow specific Player to join your Party [Party Leader only]
                else if (str.startsWith('invite')) {
                    let party = Party.findPartyOfLeader(message.guild.id, message.author.id)
                    if (party != null) {
                        if (message.mentions.users.size === 0) {    //no mentions
                            message.channel.send(errMessage(`You need to mention (@) at least one user to invite them!`));
                            
                        } else if (message.mentions.users.size === 1) {  //one mention
                            let userID = message.mentions.users.first().id;
                            if (userID != message.author.id) {
                                if ((!party.invited.includes(userID)) && (!party.memberIDs.includes(userID))) {
                                    party.invitePlayer(userID);
                                    message.channel.send(colorMessage('GREEN', "", `You have invited <@${userID}> to join your party!`));
                                } else if (party.memberIDs.includes(userID)) {
                                    message.channel.send(errMessage(`That player is already in your party!`));
                                } else {
                                    message.channel.send(errMessage(`That player is already invited!`));
                                }
                            } else {
                                message.channel.send(errMessage(`You can't invite yourself!`));
                            }
                        } else {    //2+ mentions
                            const partySize = Number(party.invited.length);
                            let list = `You have invited: `;
                            message.mentions.users.array().forEach(user => {
                                if (user.id != message.author.id && !party.invited.includes(user.id) && !party.memberIDs.includes(user.id)){
                                    party.invitePlayer(user.id);
                                    list += `<@${user.id}>, `
                                }
                            })
                            if (partySize === party.invited.length) {
                                message.channel.send(errMessage(`Those players are either already invited, in your party, or invalid!`));
                            } else {
                                list = list.slice(0, -2);
                                message.channel.send(colorMessage('GREEN', "", list));
                            }
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`Only the party leader can invite!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }
                    }
                }

                //Prevent invited Player from joining your Party [Party Leader only]
                else if (str.startsWith('revoke')) {
                    let party = Party.findPartyOfLeader(message.guild.id, message.author.id)
                    if (party != null) {
                        if (message.mentions.users.size === 0) {    //no mentions
                            message.channel.send(errMessage(`You need to mention (@) at least one user to revoke their invite!`));
                            
                        } else if (message.mentions.users.size === 1) {  //one mention
                            let userID = message.mentions.users.first().id;
                            if (userID != message.author.id) {
                                if (party.invited.includes(userID)) {
                                    party.revokeInvite(userID);
                                    message.channel.send(colorMessage('DARK_RED', "", `You have revoked <@${userID}>'s invite...`));
                                } else {
                                    message.channel.send(errMessage(`That player isn't currently invited!`));
                                }
                            } else {
                                message.channel.send(errMessage(`You can't revoke yourself!`));
                            }
                        } else {    //2+ mentions
                            const partySize = Number(party.invited.length);
                            let list = `You have revoked the following user's invites: `;
                            message.mentions.users.array().forEach(user => {
                                if (user.id != message.author.id && party.invited.includes(user.id)){
                                    party.revokeInvite(user.id);
                                    list += `<@${user.id}>, `
                                }
                            })
                            if (partySize === party.invited.length) {
                                message.channel.send(errMessage(`Those players are either not currently invited, or invalid!`));
                            } else {
                                list = list.slice(0, -2);
                                message.channel.send(colorMessage('DARK_RED', "", list));
                            }
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`Only the party leader can revoke invites!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }
                    }
                }
                
                //Set Party to private [Party Leader only]
                else if (str === 'private') {
                    const party = Party.findPartyOfLeader(message.guild.id, message.author.id);
                    if (party != null) {
                        if(party.makePartyPublic(false)){
                            message.channel.send(colorMessage('GREEN', "", `You have set your party to private.`));
                        } else {
                            message.channel.send(errMessage(`Your party is already private!`));
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`Only the party leader can set the party status!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }                        
                    }
                } 
                
                //Set Party to public [Party Leader only]
                else if (str === 'public') {
                    const party = Party.findPartyOfLeader(message.guild.id, message.author.id);
                    if (party != null) {
                        if(party.makePartyPublic(true)){
                            message.channel.send(colorMessage('GREEN', "", `You have set your party to public.`));
                        } else {
                            message.channel.send(errMessage(`Your party is already public!`));
                        }
                    } else {
                        if (Party.isInParty(message.guild.id, message.author.id)) {
                            message.channel.send(errMessage(`Only the party leader can set the party status!`));
                        } else {
                            message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                        }                        
                    }
                } 

                //Start a vote for Party members
                else if (str.startsWith('vote')) {
                    const party = Party.findPartyOfUser(message.guild.id, message.author.id);
                    if (party != null) {
                        if (party.combat === null) {
                            if (!party.activeVote) {
                                startVote(message, party);
                            } else {
                                message.channel.send(errMessage("There's already an active vote for your party!", "--Click a reaction on the active vote to vote!"));
                            }
                        }
                    }
                    else {
                        message.channel.send(errMessage(`You are not in a party!`, `--Type '&party help' to get started.`));
                    }
                }
                
                else {
                    message.channel.send(errMessage(`This is not a party command... Do "&party help" to see a list of party commands.`));
                }
            } //end of party commands
        }
    }

    /**Determine D&D-style modifier
     * 
     * @param {Number} stat 
     * @returns The calculated modifier
     */
    function modifier(stat){
        return Math.floor((stat-10)/2);
    }


    //Character Creation Functions:


    //assigns stats
    function assignStat(assigningStat, stats, charStats, statNames){
        if(assigningStat > 5){
            assignClass(charStats);
            return;
        } else if (assigningStat === 0) {
            message.channel.send(colorMessage('GOLD',`Making character for ${message.author.username}`, `Your remaining stats are **${stats}**\nSelect the number you want to assign to **${statNames[assigningStat]}**:`));
        } else {
            message.reply(colorMessage('GOLD', "", `Your remaining stats are **${stats}**\nSelect the number you want to assign to **${statNames[assigningStat]}**:`));
        }
        const filter = m => (m.author.id === message.author.id && (m.channel.id === message.channel.id));
        message.channel.awaitMessages(filter, {
            max: 1,
            time:60000
        }).then(collected => {
            if (collected.size > 0) {
                let number = Number(collected.first().content);
                if (Number.isInteger(number) && stats.includes(number)) {
                    charStats[assigningStat] = number;
                    new Promise(function(success){
                        stats.splice(stats.indexOf(number), 1); //Splices only the index from the list           
                        success();
                    }).then(assignStat(assigningStat + 1, stats, charStats, statNames));
                } else {
                    message.channel.send(errMessage(`That was an invalid response, please reply with only a number from the list`));
                    assignStat(assigningStat, stats, charStats, statNames);
                }
            } else {
                message.channel.send(errMessage(`What, cat gotch'r tongue? I asked you a question!`));
                assignStat(assigningStat, stats, charStats, statNames);
            }
        })
    }

    //assigns class
    function assignClass(charStats){
        const filter = m => (m.author.id === message.author.id && (m.channel.id === message.channel.id));
        message.reply(colorMessage('GOLD', `Select your class by number from the following:`, `1: Swordsman, 2: Berserker, 3: Knight, 4: Enchanter, 5: Wizard, 6: Sage, 7: Assassin, 8: Ranger`));
        message.channel.awaitMessages(filter, {
            max: 1,
            time:60000
        }).then(collected => {
            if (collected.size > 0) {
                let selected = Number(collected.first().content);
                if(Number.isInteger(selected) && (selected > 0) && (selected <= 8)){
                    let selectedStr = String(classes[selected-1]);
                    new Promise(function(success){
                        charStats.push(selectedStr);
                        success();
                    }).then(assignRace(charStats));
                } else {
                    message.channel.send(errMessage(`Please select a valid number 1-8`));
                    assignClass(charStats);
                }
            } else {
                message.channel.send(errMessage(`What, cat gotch'r tongue? I asked you a question!`));
                assignClass(charStats);
            }
        })
    }
    
    //assigns race
    function assignRace(charStats){
        const filter = m => (m.author.id === message.author.id && (m.channel.id === message.channel.id));
        message.reply(colorMessage('GOLD', `Select your race by number from the following:`, `1: Dragonborn, 2: Dwarf, 3: Elf, 4: Gnome, 5: Half-Elf, 6: Halfling, 7: Half-Orc, 8: Human, 9: Tiefling`));
        message.channel.awaitMessages(filter, {
            max: 1,
            time:60000
        }).then(collected => {
            if (collected.size > 0) {
                let selected = Number(collected.first().content);
                if(Number.isInteger(selected) && (selected>0) && (selected<10)){
                    selected = races[selected-1];
                    new Promise(function(success, failure){
                        charStats.push(selected);
                        success();
                    }).then(assignName(charStats));
                } else {
                    message.channel.send(`Select a valid number 1-9`);
                    assignRace(charStats);
                }
            } else {
                message.channel.send(errMessage(`What, cat gotch'r tongue? I asked you a question!`));
                assignRace(charStats);
            }
        })
    }

    //assigns name
    function assignName(charStats){
        const filter = m => (m.author.id === message.author.id && (m.channel.id === message.channel.id));
        message.channel.send(colorMessage('GOLD', `Finally, tell me your name:`));
        message.channel.awaitMessages(filter, {
            max: 1,
            time:60000
        }).then(collected => {
            if (collected.size > 0) {
                new Promise(function(success, failure){
                    charStats.push(collected.first().content);
                    Character.makeCharacter(message.guild.id, message.author.id, collected.first().content, charStats[6], charStats[7], charStats.slice(0, 6));
                    success();
                }).then(message.channel.send('Character successfully created!'));
            } else {
                message.channel.send(errMessage(`Oh c'mon now, you're so close! Last one, I swear.`));
                assignName(charStats);
            }
        })
    }
})

module.exports = {
    client,
    colorMessage,
    errMessage
}

client.login(token);