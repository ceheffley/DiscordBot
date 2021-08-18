class Entity {
    constructor(name, level) {
        this._name = name;
        this._level = level;

        this._hp;
        this._maxHP;
        this._alive = true;
        this._status = {start: [], end: [], attack: [], defend: []}; //array[array[status, duration]]
    }

    get name() {
        return this._name;
    }
    get level() {
        return this._level;
    }
    get hp() {
        return this._hp;
    }
    get maxHP() {
        return this._maxHP;
    }
    get alive() {
        return this._alive;
    }
    get status() {
        return this._status;
    }

    set alive(bool) {
        this._alive = bool;
    }

    trueDamage(amount) {
        return new Promise(async (success) => {
            if (this._hp - amount > 0) {
                this._hp -= amount;
            } else {
                this._hp = 0;
            }
            success(amount);
        })
    }

    heal(amount = 0) {
        if (this._hp + amount < this._maxHP) {
            this._hp += amount;
            return amount;
        } else {
            amount = this._maxHP - this._hp;
            this._hp = this._maxHP;
            return amount;
        }
    }

    //---------------------STATUS FUNCTIONS------------------------

    resetAllStatus() {
        this._status = {start: [], end: [], attack: [], defend: []};
    }

    addStatus(status, phase) {// ['status', duration, {optional obj}], phase
        let index = this.indexOfStatus(status[0], phase);
        if (index != -1) {
            this._status[phase][index][1] += status[1];
        } else {
            this._status[phase].push(status);
        }
    }

    removeStatus(status, phase) {
        for (let i = 0; i < this.status[phase].length; i++) {
            if(this._status[phase][i][0] === status) {
                this._status.splice(i, 1);
                return true;
            }
        }
        return false;         
    }

    checkStatus(status, phase) { //status is str of status name, phase is str indicating key in obj
        for (let i = 0; i < this._status[phase].length; i++) {
            if(this._status[phase][i][0] === status) {
                return true;
            }
        }
        return false;
    }

    statusDuration(status, phase) {
        return new Promise(success => {
            for (let i = 0; i < this.status[phase].length; i++) {
                if(this._status[phase][i][0] === status) {
                    success(this._status[phase][i][1]);
                }
            }
            success(0);
        })
    }

    indexOfStatus(status, phase) {
        for (let i = 0; i < this.status[phase].length; i++) {
            if(this._status[phase][i][0] === status) {
                return i;
            }
        }
        return -1;        
    }

    updateStatus() { //ticks down status duration, removes as well
        return new Promise((success) => {
            let names = ['start', 'end', 'attack', 'defend'];
            for (let state = 0; state < names.length; state++) {
                for (let i = 0; i < this.status[names[state]].length; i++) {
                    if (typeof this._status[names[state]][i][1] === 'number') {
                        if(this._status[names[state]][i][1] != 1) {
                            this._status[names[state]][i][1]--;
                        } else {
                            this._status[names[state]].splice(i, 1);
                            i--;
                        }
                    }
                }
            }

            success();  
        })  
    }
}

module.exports = {
    Entity
}