"use strict"

/*

    BMJsonResources

*/

window.BMJsonResources = class BMJsonResources extends BMNode {
    
    static initThisClass () {
        super.initThisClass()
        this.setIsSingleton(true)
		return this
    }
    
    initPrototype () {
        this.newSlot("extensions", ["json"])
    }

    init () {
        super.init()
        this.setTitle("Json")
        this.setNodeMinWidth(270)
        this.setNoteIsSubnodeCount(true)
        //this.setSubnodeClasses([BMJsonResource])
        this.watchOnceForNote("appDidInit")
        return this
    }
    
    /*
    prepareForFirstAccess () {
         super.prepareForFirstAccess()
       this.setupSubnodes()
        return this
    }
    */

    resourcePaths () {
        return ResourceLoader.resourceFilePathsWithExtensions(this.extensions())
    }
    
    appDidInit () {
        this.setupSubnodes()
        return this
    }

    setupSubnodes () {
        this.resourcePaths().forEach(path => this.addResourceWithPath(path))
        return this
    }

    addResourceWithPath (aPath) {
        const resource = this.justAdd()
        resource.setPath(aPath)
        return this
    }

}.initThisClass()


