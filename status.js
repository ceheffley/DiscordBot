const endTurnStatus = (target) => { //runs through end turn status, returns str to be update to pane
    let list = "";
    return new Promise(async (success) => {
        for (status of target.status.end) {
            switch (status[0]) {
                case "poison":
                    target.trueDamage(status[1]);
                    list += `${target.name} took ${status[1]} poison damage!, `;
                    break;
                case "bleed":
                    let mod = 0.1;
                    if (target.statusDuration('bleed', 'end') > 200) {
                        mod = 0.25;
                    } else if (target.statusDuration('bleed', 'end') > 100) {
                        mod = 0.15;
                    }
                    let damage = await target.damage(Math.floor(target.maxHP * mod));
                    list += `${target.name} suffers from their wounds, taking ${damage} damage!, `;
                    break;
                default:
                    break;
            }
        }
        list = list.slice(0, -2);
        success(list); 
    });    
}

const startTurnStatus = (target) => {
    let list = '';
    let skipTurn = 0;
    return new Promise((success) => {
        target.status.start.forEach(status => {
            switch (status[0]) {
                case "enrich":
                    let healed = target.heal(Math.floor(target.maxHP * 0.1));
                    list += `An enriched ${target.name} recovers ${healed} health!, `;
                    break;
                case "root":
                    skipTurn = 1;
                    list += `${target.name} was rooted and couldn't take their turn!, `;               
                    break;
                case "skip": //for entities entering the fight later, so they can't automattically attack
                    skipTurn = 1;
                    break;
                default:
                    break;
            }
        })
        list = list.slice(0, -2);
        success([list, skipTurn]); 
    });    
}

const interruptStatus = (target, party) => {
    return new Promise((success) => {
        party.forEach(member => {
            if(member != target) {
                member.status.defend.forEach(status => {
                    switch (status[0]) {
                        case "protect":
                            member.addStatus(['protectActive', 1], 'defend')
                            member.status.defend.splice(member.indexOfStatus(['protect', 1], 'defend'), 1);
                            success(member);
                            break;
                        default:
                            break;
                    }
                })
            }

        })
        success(target);
    })
}



module.exports = {
    endTurnStatus,
    startTurnStatus,
    interruptStatus
}