"use strict"

/*

    BMNotification

*/

window.BMNotification = class BMNotification extends ProtoClass {
    initPrototype () {
        this.newSlot("name", null)
        this.newSlot("sender", null)
        this.newSlot("info", null)
        this.newSlot("center", null) // NotificationCenter that owns this
        this.newSlot("senderStack", null)
    }

    init() {
        super.init()
    }

    senderId () {
        return this.sender().typeId()
    }

    setSender (obj) {
        assert(Type.isObject(obj))
        this._sender = obj
        //this._senderId = obj.typeId())
        return this
    }
    
    isEqual (obs) {
        if (this === obs) { 
            return true 
        }
        
        /*
        const sameName = this.name() === obs.name() 
        const sameSenderId = this.senderId() === obs.senderId() 
        // TODO: testing equivalence of info?
        return sameName && sameSenderId
        */
        // not sure if compiler is smart enough to skip 2nd part
        return this.name() === obs.name()  && this.senderId() === obs.senderId() 
    }

    isPosted () {
        return this.center().hasNotification(this)
    }
    
    post () {
        if (true || this.center().isDebugging()) {
            //console.log(typeof(this.senderId()) + "." + this.senderId() + " posting note " + this.name() + " and recording stack for debug")
            const e = new Error()
            e.name = "" //"Notification Post Stack"
            e.message = this.senderId() + " posting note '" + this.name() + "'" 
            this.setSenderStack(e.stack);
        }

        //console.log("   queuing post " + this.senderId() + " '" + this.name() + "'" )
       
        this.center().addNotification(this)
        return this
    }
    
    /*
    schedulePost () {
	     window.SyncScheduler.shared().scheduleTargetAndMethod(this, "post")
    }
    */

    description () {
        const s = this.senderId() ? this.senderId() : "null"
        const n = this.name() ? this.name() : "null"
        return s + " " + n
    }
}.initThisClass()

