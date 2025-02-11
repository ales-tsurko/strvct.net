"use strict"

/*

    BMServerMessage

*/

window.BMServerMessage = class BMServerMessage extends ProtoClass {

    static incrementInstanceCount () {
        if (Type.isUndefined(this._instanceCount)) {
            Object.defineSlot(this, "_instanceCount", 0)
        }
        return this._instanceCount ++
    }

    initPrototype () {
        this.newSlot("serverConnection", null)
        this.newSlot("id", null)
        this.newSlot("name", null)
        this.newSlot("data", null)
    }

    init () {
        super.init()
        this.setId(BMServerMessage.incrementInstanceCount());
    }

    send () {
        const messageString = JSON.stringify({
            id: this.id(),
            name: this.name(),
            data: this.data()
        });

        //console.log('BMServerMessage send: ' + messageString);

        this.serverConnection().pendingMessages().atPut(this.id(), this);
        this.serverConnection().serverConn().send(messageString);

        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    resolve (value) {
        this._resolve(value);
    }

    reject (reason) {
        this._reject(reason);
    }
    
}.initThisClass()