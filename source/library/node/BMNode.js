"use strict"

/*

    BMNode
 
    The base class of model objects that supports the protocol 
    used to sync with views (subclasses of NodeView).

    The BMStorableNode subclass is used to sync the model to
    the persistence system.


        Notifications (intended for views):

            - didUpdateNode // lets views know they need to scheduleSyncFromNode
            - shouldFocusSubnode // request that the UI focus on the sender

        Update messages sent to self:
            - didUpdateSlotParentNode(oldValue, newValue)
            
            - didChangeSubnodeList // hook to resort if needed and call didReorderParentSubnodes
            - prepareForFirstAccess // sent to self on first access to subnodes
            - prepareToAccess // sent to sent whenever a subnode is accessed

        Update messages sent to parent:
            - didUpdateNode // let parent know a subnode has changed

        Update messages sent to subnodes:
            - didReorderParentSubnodes // sent on subnode order change

        Protocol helpers:
            - watchOnceForNote(aNote) // typically used to watch for appDidInit

*/

window.BMNode = class BMNode extends ProtoClass {
    
    static availableAsNodePrimitive() {
        return true
    }

    static primitiveNodeClasses () {
        const classes = BMNode.allSubclasses()
        return classes.filter(aClass => aClass.availableAsNodePrimitive())
    }

    // --- for CreatorNode Prototypes ---

    static visibleClassName () {
        let name = this.type()
        name = name.sansPrefix("BM")
        name = name.sansSuffix("Field")
        name = name.sansSuffix("Node")
        return name
    }

    static availableAsNodePrimitive () {
        return false
    }

    static nodeCreate () {
        // we implemnet this on BMNode class and prototype so 
        // it works for both instance and class creator prototypes
        return this.clone()
    }

    static nodeCreateName () {
        return this.visibleClassName()
    }

    // --- mime types ---

    static canOpenMimeType (mimeTypeString) {
        return false
    }

    static openMimeChunk (dataChunk) {
        return null
    }

    // ----

    initPrototype () {
        
        // row view summary

        this.newSlot("title", null).setDuplicateOp("copyValue")
        
        {
            const slot = this.newSlot("nodeType", null)
            slot.setCanInspect(true)
            slot.setLabel("type")
            slot.setSlotType("String")
            //slot.setInspectorPath("Subtitle")
            slot.setCanEditInspection(false)
        }

        {
            const slot = this.newSlot("subtitle", null)
            slot.setDuplicateOp("copyValue")
            slot.setCanInspect(true)
            slot.setLabel("value")
            slot.setSlotType("String")
            slot.setInspectorPath("Subtitle")
        }

        this.newSlot("note", null).setDuplicateOp("copyValue")

        {
            const slot = this.newSlot("noteIconName", null)
            slot.setDuplicateOp("copyValue")
            slot.setCanInspect(true)
            slot.setLabel("icon")
            slot.setSlotType("String")
            slot.setValidValuesClosure(() => BMIconResources.shared().iconNames())
            slot.setInspectorPath("Note")
        }


        //this.newSlot("isDebuggingPersistence", false)

        // parent node, subnodes

        this.newSlot("parentNode", null)
        this.newSlot("nodeCanReorderSubnodes", false)
        this.newSlot("subnodes", null).setInitProto(SubnodesArray).setDoesHookSetter(true)
        this.newSlot("shouldStoreSubnodes", true).setDuplicateOp("duplicate") //.setShouldStore(true)
        this.newSlot("subnodeClasses", []) //.setInitProto([]) // ui will present creator node if more than one option

        // notification notes

        this.newSlot("didUpdateNodeNote", null) // private
        this.newSlot("shouldFocusSubnodeNote", null) // private
        this.newSlot("shouldFocusAndExpandSubnodeNote", null) // private

        // view related, but computed on node

        this.newSlot("subtitleIsSubnodeCount", false).setDuplicateOp("copyValue")
        this.newSlot("nodeVisibleClassName", null).setDuplicateOp("copyValue")
        this.newSlot("noteIsSubnodeCount", false).setDuplicateOp("copyValue")
        this.newSlot("nodeEmptyLabel", null) // shown in view when there are no subnodes

        // view settings

        this.newSlot("viewClassName", null)
        this.newSlot("nodeThumbnailUrl", null)
        this.newSlot("nodeCanEditTitle", false).setDuplicateOp("copyValue")

        {
            const slot = this.newSlot("nodeCanEditSubtitle", false)
            slot.setDuplicateOp("copyValue")
            slot.setCanInspect(true)
            slot.setLabel("editable")
            slot.setSlotType("Boolean")
            slot.setInspectorPath("Subtitle")
        }

        {
            const slot = this.newSlot("nodeIsVertical", true)
            slot.setDuplicateOp("copyValue")
            slot.setCanInspect(true)
            slot.setLabel("is vertical")
            slot.setSlotType("Boolean")
            slot.setInspectorPath("Layout")
            slot.setShouldStoreSlot(true)
        }

        this.newSlot("nodeRowIsSelectable", true).setDuplicateOp("copyValue")
        this.newSlot("nodeRowsStartAtBottom", false).setDuplicateOp("copyValue")

        {
            const slot = this.newSlot("nodeMinRowHeight", 0)
            slot.setDuplicateOp("copyValue")
            slot.setShouldStoreSlot(true)
            slot.setInspectorPath("style")
        }

        {
            const slot = this.newSlot("nodeMinRowWidth", 0)
            slot.setDuplicateOp("copyValue")
            slot.setShouldStoreSlot(true)
            slot.setInspectorPath("style")
        }

        // html

        this.newSlot("acceptsFileDrop", false)

        // view style overrides

        this.newSlot("viewDict", null)
        this.newSlot("nodeColumnStyles", null)
        this.newSlot("nodeRowStyles", null)

        // view footer

        this.newSlot("nodeHasFooter", false)
        this.newSlot("nodeInputFieldMethod", null)

        // column settings - TODO: auto adjust to fit?

        this.newSlot("nodeMinWidth", 200).setDuplicateOp("copyValue")
        
        {
            const slot = this.newSlot("nodeFillsRemainingWidth", false).setDuplicateOp("copyValue")
            slot.setSlotType("Boolean")
            slot.setLabel("fills remaining")
            slot.setCanEditInspection(false)
            slot.setCanInspect(false)
            slot.setInspectorPath("Layout")
        }

        {
            const slot = this.newSlot("nodeFillsWindow", false)
            slot.setSlotType("Boolean")
            slot.setLabel("fills window")
            slot.setCanEditInspection(true)
            slot.setCanInspect(true)
            slot.setShouldStoreSlot(true)
            slot.setInspectorPath("Layout")
        }

        {
            const slot = this.newSlot("themeClassName", "DefaultThemeClass")
            slot.setShouldStoreSlot(true)
            slot.setCanInspect(true)
            slot.setSlotType("String")
            slot.setLabel("Theme Class")
            slot.setSyncsToView(true)
            slot.setInspectorPath("Style")
        }

        this.newSlot("nodeUsesColumnBackgroundColor", true).setDuplicateOp("copyValue")
        this.newSlot("canDelete", false).setDuplicateOp("copyValue")
        this.newSlot("nodeCanEditRowHeight", false).setDuplicateOp("copyValue")
        this.newSlot("nodeCanEditColumnWidth", false).setDuplicateOp("copyValue")

        // inspector

        this.newSlot("nodeCanInspect", true).setDuplicateOp("copyValue")
        this.newSlot("nodeInspector", null)

        // actions

        this.newSlot("actions", null).setInitProto(Array)
    }

    nodeOrientation () {
        return this.nodeIsVertical() ? "right" : "down" 
    }

    init () {
        super.init()

        this.setDidUpdateNodeNote(BMNotificationCenter.shared().newNote().setSender(this).setName("didUpdateNode"))
        this.setShouldFocusSubnodeNote(BMNotificationCenter.shared().newNote().setSender(this).setName("shouldFocusSubnode"))
        this.setShouldFocusAndExpandSubnodeNote(BMNotificationCenter.shared().newNote().setSender(this).setName("shouldFocusAndExpandSubnode"))

        this._nodeMinWidth = 180
        
        //this.setNodeColumnStyles(this.sharedNodeColumnStyles())
        //this.setNodeRowStyles(this.sharedNodeRowStyles())

        this.setNodeColumnStyles(BMViewStyles.clone())
        //this.setNodeRowStyles(BMViewStyles.clone())
        this.setViewDict({})

        this.watchSubnodes()

        return this
    }

    nodeType () {
        return this.type()
    }

    prepareToRetire () {
        super.prepareToRetire() // will remove notification observations
        this._subnodes.removeMutationObserver(this)
    }

    nodeCreate () {
        // we implemnet this on BMNode class and prototype so 
        // it works for both instance and class creator prototypes
        return this.duplicate()
    }
    
    nodeCreateName () {
        return this.title()
    }

    duplicate () {
        const dup = super.duplicate()
        if (!this.shouldStore() || this.shouldStoreSubnodes()) {
            dup.copySubnodes(this.subnodes().map(sn => sn.duplicate()))
        }
        return dup
    }

    pid () {
        return this.puuid()
    }

    nodeInspector () {
        if (!this._nodeInspector) {
            this._nodeInspector = BMNode.clone().setNodeMinWidth(150)
            this.initNodeInspector()
        }
        return this._nodeInspector
    }

    initNodeInspector () {
        this.setupInspectorFromSlots()
        return this
    }

    setupInspectorFromSlots() {
        const slots = this.thisPrototype().allSlots()
        slots.ownForEachKV((name, slot) => {
            const field = slot.newInspectorField()
            if (field) {
                field.setTarget(this)
                let node = this.nodeInspector().createNodePath(slot.inspectorPath())
                node.addSubnode(field)
            }
        })
        return this
    }    


    createNodePath (aPath, pathSubnodeType = "BMFolderNode") {
        let node = this

        if (!aPath) {
            return node
        }

        const components = aPath.split("/")
        components.forEach(component => {
            node = this.subnodeWithTitleIfAbsentInsertClosure(component, () => {
                const node = window[pathSubnodeType].clone()
                node.setTitle(component)
                node.setNodeMinWidth(300)
                return node
            })
        })

        return node
    }

    customizeNodeRowStyles () {
        if (!this.getOwnProperty("_nodeRowStyles")) {
            //const styles = BMViewStyles.shared().sharedWhiteOnBlackStyle().setIsMutable(false)
            // NOTE: We can't use the shared style because column bg colors change

            const styles = BMViewStyles.clone()
            styles.selected().setColor("white")
            styles.unselected().setColor("#aaa")
            this._nodeRowStyles = styles
        }
        return this._nodeRowStyles
    }

    sharedNodeColumnStyles () {
        if (!BMNode.hasOwnProperty("_nodeColumnStyles")) {
            const styles = BMViewStyles.clone()
            //styles.selected().setColor("white")
            //styles.unselected().setColor("#aaa")
            BMNode._nodeColumnStyles = styles
        }
        return BMNode._nodeColumnStyles
    }

    sharedNodeRowStyles () {
        if (!BMNode._nodeRowStyles) {
            const styles = BMViewStyles.clone()
            BMNode._nodeRowStyles = styles
            styles.selected().setColor("white")
            styles.unselected().setColor("#aaa")
        }
        return BMNode._nodeRowStyles
    }

    // column view style
    
    setNodeColumnBackgroundColor (c) {
	    if (this.nodeColumnStyles()) {
            this.setNodeColumnStyles(BMViewStyles.clone())
	    }
	    
        this.nodeColumnStyles().selected().setBackgroundColor(c)
        this.nodeColumnStyles().unselected().setBackgroundColor(c)
        return this
    }

    nodeColumnBackgroundColor () {
	    if (this.nodeColumnStyles()) {
		    return this.nodeColumnStyles().selected().backgroundColor()
	    }
	    return null
    }
    
    // -----------------------
    
    nodeVisibleClassName () {
        if (this._nodeVisibleClassName) {
            return this._nodeVisibleClassName
        }
		
        return this.type().sansPrefix("BM")
    }

    // --- fields ---
    
    addLinkFieldForNode (aNode) {
        const field = BMLinkField.clone().setName(aNode.title()).setValue(aNode)
        return this.addStoredField(field)
    }
    
    addField (aField) {
        throw new Error("addField shouldn't be called - use BMFieldSetNode")
        return this.addSubnode(aField)
    }
        
    nodeRowLink () {
        // used by UI row views to browse into next column
        return this
    }

    // nodeRowLinkMethods
    // used by UI row views to choose the node ref to use for the next column
    // if returns null, the row won't open another column
    // 
    // The two typical use cases are :
    //
    // 1) A pointer row which links to some other node.
    //
    // 2) A means to toggle between viewing the row's node or
    //    skipping to one of its subnodes. This allows a node
    //    to have inspector separated from "subnode" browsing.
    //    Example: a Server object might have the subnodes:
    //    [ StringFieldNode (for server name),  
    //      ActionNode (to connect/disconnect),
    //      ServerClientsNode (holds list of connected server clients)
    //

    thisNode () {
        return this
    }

    nodeRowLinkMethods () {
        return ["thisNode"]
    }

    defaultNodeRowLinkMethod () {

    }

    // subtitle and note
    
    subtitle () {

        if (this.subtitleIsSubnodeCount() && this.subnodesCount()) {
            return this.subnodesCount()
        }
        
        return this._subtitle
    }
    
    note () {
        //console.log(this.title() + " noteIsSubnodeCount: " + this.noteIsSubnodeCount())
        if (this.noteIsSubnodeCount() && this.subnodesCount()) {
            return this.subnodesCount()
        }
        
        return this._note
    }

    nodeHeaderTitle () {
        return this.title()
    }

    // --- viewClassName ---
    
    /*
    viewClassName () {
        if (!this._viewClassName) {
            return this.type() + "View" //.sansPrefix("BM")
        }
        
        return this._viewClassName
    }
    */
    
    viewClass () {        
        const name = this.viewClassName()
        if (name) {
            return window[name]
        }

	  	return this.firstAncestorWithMatchingPostfixClass("View")
    }

    // --- nodeRowViewClass ---
    
    /*
    rowNode () {
        return this
    }
    */

    nodeRowViewClass () {   
	  	return this.firstAncestorWithMatchingPostfixClass("RowView")
    }

    // --- subnodes ----------------------------------------
    
    
    setParentNode (aNode) {
        if (aNode !== this._parentNode) { 
            if (this._parentNode && aNode) {
                console.warn(this.type() + " setParentNode(" + aNode.type() + ")  already has parent " + this._parentNode.type())
            }
            
            const oldNode = this._parentNode
            this._parentNode = aNode
            this.didUpdateSlotParentNode(oldNode, aNode)
        }
        return this
    }

    didUpdateSlotParentNode (oldValue, newValue) {
        // for subclasses to override
    }

    rootNode () {
        const pn = this.parentNode()
        if (pn) {
            return pn.rootNode()
        }
        return this
    }

    // subnodes

    subnodeCount () {
        return this._subnodes.length
    }

    hasSubnodes () {
        return this.subnodeCount() > 0
    }

    justAddSubnode (aSubnode) {
        return this.justAddSubnodeAt(aSubnode, this.subnodeCount())
    }
	
    justAddSubnodeAt (aSubnode, anIndex) {
        this.subnodes().atInsert(anIndex, aSubnode)
        aSubnode.setParentNode(this)
        return aSubnode        
    }

    addSubnodeAt (aSubnode, anIndex) {
        assert(anIndex >= 0)
        this.justAddSubnodeAt(aSubnode, anIndex)
        //this.didChangeSubnodeList() // happens automatically from hooked array
        return aSubnode
    }

    replaceSubnodeWith (aSubnode, newSubnode) {
        const index = this.indexOfSubnode(aSubnode)
        assert(index !== -1)
        this.removeSubnode(aSubnode)
        this.addSubnodeAt(newSubnode, index)
        return newSubnode
    }

    moveSubnodesToIndex (movedSubnodes, anIndex) {
        this.subnodes().moveItemsToIndex(movedSubnodes, anIndex)
        return this
    }

    addSubnode (aSubnode) {
        return this.addSubnodeAt(aSubnode, this.subnodeCount())
    }

    addLinkSubnode (aNode) {
        /*
        if(aNode.parentNode()) {
            console.warn("adding a link subnode to a node with no parent (yet)")
        }
        */
        const link = BMLinkNode.clone().setLinkedNode(aNode)
        this.addSubnode(link)
        return link
    }

    addSubnodes (subnodes) {
        subnodes.forEach(subnode => this.addSubnode(subnode))
        return this
    }

    addSubnodesIfAbsent (subnodes) {
        subnodes.forEach(subnode => this.addSubnodeIfAbsent(subnode))
        return this
    }
    
    addSubnodeIfAbsent (aSubnode) {
        if(!this.hasSubnode(aSubnode)) {
            this.addSubnode(aSubnode)
            return true
        }
        return false
    }

    subnodeProto () {
        return this.subnodeClasses().first()
    }

    setSubnodeProto (aProto) {
        this.subnodeClasses().removeAll()
        this.subnodeClasses().appendIfAbsent(aProto)
        return this
    }

    acceptedSubnodeTypes () {
        const types = []
        this.subnodeClasses().forEach(c => types.push(c.type()))
        return types
    }

    acceptsAddingSubnode (aSubnode) {
        if (aSubnode === this) {
            return false
        }

        /*
        if (this.hasSubnode(aSubnode)) {
            return false
        }
        */
        //const type = aSunode.type()
        const ancestors = aSubnode.thisClass().ancestorClassesTypesIncludingSelf()
        const match = this.acceptedSubnodeTypes().detect(type => ancestors.contains(type))
        return !Type.isNullOrUndefined(match)
    }

    onBrowserDropChunk (dataChunk) {
        const mimeType = dataChunk.mimeType()
        const canOpenNodes = BMNode.allSubclasses().select((aClass) => aClass.canOpenMimeType(mimeType))
        const okTypes = this.acceptedSubnodeTypes()
        const canUseNodes = canOpenNodes /// canOpenNodes.select(nodeType => okTypes.contains(nodeType))

        if (canUseNodes.length) {

            if (canUseNodes.length === 1) {
                const match = canUseNodes.first()

                const newNode = match.openMimeChunk(dataChunk)
                this.addSubnode(newNode)

                /*
                if (this.acceptsAddingSubnode(match)) {
                    this.addSubnode(match)
                }
                */
            } else {
                // TODO: add CreatorNode with those types and
                // hook to instantiate from mime data
            }
        }
    }

    // --------
	
    isEqual (aNode) {
	    return this === aNode
    }

    hash () {
        // don't assume hash() always returns the puuid as
        // subclasses can override to measure equality in their own way
        return this.puuid()
    }

    createSubnodesIndex () {
        this.subnodes().setIndexClosure( v => v.hash() )
        return this
    }
	
    hasSubnode (aSubnode) {
        const subnodes = this.subnodes()
        if (subnodes.length > 100) {
            this.createSubnodesIndex()
            return subnodes.indexHasItem(aSubnode) 
        }
        //return subnodes.detect(subnode => subnode === aSubnode)
        return subnodes.detect(subnode => subnode.isEqual(aSubnode))
    }
    
    justRemoveSubnode (aSubnode) { // private method 
        this.subnodes().remove(aSubnode)
        
        if (aSubnode.parentNode() === this) {
            aSubnode.setParentNode(null)
        }
        
        return aSubnode
    }
    
    removeSubnode (aSubnode) {
        this.justRemoveSubnode(aSubnode)
        //this.didChangeSubnodeList() handled by hooked array
        return aSubnode
    }

    removeSubnodes (subnodeList) {
        subnodeList.forEach(sn => this.removeSubnode(sn))
        return this
    }
    
    removeAllSubnodes () {
	    if (this.subnodeCount()) {
    		this.subnodes().slice().forEach((subnode) => {
    			this.justRemoveSubnode(subnode)
    		})
    		
            //this.didChangeSubnodeList() handled by hooked array but this could be more efficient
        }
        return this
    }

    didReorderParentSubnodes () {
    }

    onDidReorderSubnodes () {
        this.subnodes().forEach(subnode => subnode.didReorderParentSubnodes())
    }

    didChangeSubnodeList () {
        //this.subnodes().forEach(subnode => assert(subnode.parentNode() === this)) // TODO: remove after debugging
        this.scheduleMethod("onDidReorderSubnodes")
        //this.subnodes().forEach(subnode => subnode.didReorderParentSubnodes())
        this.didUpdateNode()
        return this
    }

    copySubnodes (newSubnodes) {
        this.subnodes().copyFrom(newSubnodes)
        return this
    }

    nodeReorderSudnodesTo (newSubnodes) {
        this.copySubnodes(newSubnodes)
        return this
    }

    orderFirst () {
        this.parentNode().orderSubnodeFirst(this)
        return this
    }

    orderLast () {
        this.parentNode().orderSubnodeLast(this)
        return this  
    }

    orderSubnodeFirst (aSubnode) {
        assert(this.hasSubnode(aSubnode))
        const subnodes = this.subnodes().shallowCopy()
        subnodes.remove(aSubnode)
        subnodes.atInsert(0, aSubnode)
        this.nodeReorderSudnodesTo(subnodes)
        return this
    }

    orderSubnodeLast (aSubnode) {
        assert(this.hasSubnode(aSubnode))
        const subnodes = this.subnodes().shallowCopy()
        subnodes.remove(aSubnode)
        subnodes.push(aSubnode)
        this.nodeReorderSudnodesTo(subnodes)
        return this
    }
    
    // --- update / sync system ----------------------------
    
    scheduleSyncToView () {
        this.didUpdateNode()
        //window.SyncScheduler.shared().scheduleTargetAndMethod(this, "syncToView")
        return this
    }

    didUpdateNode () {
        if (!this.hasDoneInit()) {
            return
        }

        const note = this.didUpdateNodeNote()

        if (note) {
            //console.log("Node '" + this.title() + "' POST didUpdateNode")
            note.post()
        }

        
        // TODO: make this more efficient, as we don't always need it
        
        if (this.parentNode()) {
            assert(this.parentNode() !== this)
            this.parentNode().didUpdateNode()
        }
         
    }

    didUpdateSlot (aSlot, oldValue, newValue) {
        super.didUpdateSlot(aSlot, oldValue, newValue)

        if (aSlot.syncsToView()) { 
            this.scheduleSyncToView()
        }
    }

    indexOfSubnode (aSubnode) {
        return this.subnodes().indexOf(aSubnode);
    }

    subnodeIndexInParent () {
        const p = this.parentNode()
        if (p) {
            return p.indexOfSubnode(this)
        }
        return 0
    }

    nodeDepth () {
        const p = this.parentNode()
        if (p) {
            return p.nodeDepth() + 1
        }
        return 0
    }

    // --- shelf ---
	
    shelfSubnodes () {
        return []
    }

    shelfIconName () {
	    return null
    }
	
    shelfIconUrl () {
	    return null
    }

    // ---------------------------------------
    
    prepareForFirstAccess () {
        // subclasses can override 
    }

    prepareToAccess () {
        // this should be called whenever subnodes need to be accessed
        if (!this._didPrepareForFirstAccess) {
            this._didPrepareForFirstAccess = true
            this.prepareForFirstAccess()
        }
    }
    
    prepareToSyncToView () {
        this.prepareToAccess();
    }

    // --- parent chain notifications ---
    
    tellParentNodes (msg, aNode) {
        const f = this[msg]
        if (f && f.apply(this, [aNode])) {
            return
        }

        const p = this.parentNode()
        if (p) {
            p.tellParentNodes(msg, aNode)
        }
    }
    
    // --- node path ------------------------
    
    nodePath () {
        if (this.parentNode()) {
            const parts = this.parentNode().nodePath()
            parts.push(this)
            return parts
        }
        return [this]
    }

    nodePathArrayForPathComponents (pathComponents, results = []) {
        results.push(this)

        const link = this.nodeRowLink()
        if (link && link !== this) {
            return link.nodePathArrayForPathComponents(pathComponents) 
        }

        const pathComponent = pathComponents.first()
        if (pathComponent) {
            const nextNode = this.firstSubnodeWithTitle(pathComponent)
            if (nextNode) {
                return nextNode.nodePathArrayForPathComponents(pathComponents.rest())
            }
        }
        return results
    }
    
    nodePathString () {
        return this.nodePath().map(node => node.title()).join("/")
    }
    
    nodeAtSubpathString (pathString) {
        return this.nodeAtSubpath(pathString.split("/"));        
    }
    
    nodeAtSubpath (subpathArray) {
        if (subpathArray.length) {
            const t = subpathArray.first()

            let subnode = null
            if (Type.isArray(t)) {
                // supports a path component that is an ordered list of subnodes titles 
                subnode = this.firstSubnodeWithTitles(t)
            } else {
                subnode = this.firstSubnodeWithTitle(t)
            }

            if (subnode) {
                return subnode.nodeAtSubpath(subpathArray.rest())
            }
            return null
        }        
        return this
    }

    // --- log ------------------------
    
    log (msg) {
        //const s = this.nodePathString() + " --  " + msg
        if (this.isDebugging()) {
        	console.log("[" +  this.nodePathString() + "] " + msg)
        }
    }
    
    // --- standard actions -----------------------------
    
    addAction (actionString) {
        if (!this.actions().contains(actionString)) {
	        this.actions().push(actionString)
            this.didUpdateNode()
        }
        return this
    }

    removeAction (actionString) {
        if (this.actions().contains(actionString)) {
        	this.actions().remove(actionString)
            this.didUpdateNode()
        }
        return this
    }
    
    addActions (actionStringList) {
        actionStringList.forEach( (action) => {
            this.addAction(action)
        })
        return this
    }
    
    hasAction (actionName) {
        return this.actions().contains(actionName)
    }
    
    performAction (actionName) {
        return this[actionName].apply(this)
    }
    
    postShouldFocusSubnode (aSubnode) {
        assert(aSubnode)
        this.shouldFocusSubnodeNote().setInfo(aSubnode).post()
        return this
    }

    postShouldFocusAndExpandSubnode (aSubnode) {
        assert(aSubnode)
        this.shouldFocusAndExpandSubnodeNote().setInfo(aSubnode).post()
        return this
    }
    
    justAddAt (anIndex) {
        const classes = this.subnodeClasses().shallowCopy()

        let newSubnode = null
        if (classes.length === 0) {
            newSubnode = null
        } else if (classes.length === 1) {
            newSubnode = classes.first().clone()
        } else {
            newSubnode = BMCreatorNode.clone()
            newSubnode.addSubnodesForObjects(classes)
        }

        if (newSubnode) {
            this.addSubnodeAt(newSubnode, anIndex)
        }
        return newSubnode
    }

    justAdd (anIndex) {  
        return this.justAddAt(this.subnodeCount())
    }

    addAt (anIndex) {
        const newSubnode = this.justAddAt(anIndex)
        if (newSubnode) {
            this.didUpdateNode()
            this.postShouldFocusAndExpandSubnode(newSubnode)
        }
        return newSubnode
    }

    add () {  
        return this.addAt(this.subnodeCount())
    }

    removeFromParentNode () {
        if (this.parentNode()) {
            this.parentNode().removeSubnode(this)
        } else {
            throw new Error("missing parentNode")
        }
        return this
    }
	
    delete () {
        this.removeFromParentNode()
        return this
    }

    /*
    nodeParentHasDeleteAction () {
        const p = this.parentNode()
        return p && p.hasAction("delete")
    }
    */

    /*
    canDelete () {
        if (this._canDelete) {
            return true
        }

        return this.nodeParentHasDeleteAction()
    }
    */

    canSelfAddSubnode () {
        return this.hasAction("add")
    }

    // --- utility -----------------------------
    
    parentNodeOfType (className) {
        if (this.type() === className) {
            return this
        }
        
        if (this.parentNode()) {
            return this.parentNode().parentNodeOfType(className)
        }
        
        return null
    }

    parentNodes () {
        const node = this.parentNode()
        const results = []
		
        while (node) {
            results.push(node)
            node = this.parentNode()
        }
        return results
    }
	
    parentNodeTypes () {
        return this.parentNodes().map(node => node.type())
    }
    
    // --- subnode lookup -----------------------------
    
    subnodesSans (aSubnode) {
	    return this.subnodes().select(subnode => subnode !== aSubnode)
    }
	
    firstSubnodeOfType (aProto) {
        return this.subnodes().detect(subnode => subnode.type() === aProto.type())
    }

    removeFirstSubnodeWithTitle (aString) {
        const sn = this.firstSubnodeWithTitle(aString)
        if (sn) {
            sn.delete()
        }
        return this
    }

    firstSubnodeWithTitle (aString) {
        return this.subnodes().detect(subnode => subnode.title() === aString)
    }

    firstSubnodeWithTitles (titlesArray) {
        for (let i = 0; i < titlesArray.length; i++) {
            const title = titlesArray[i]
            const subnode = this.firstSubnodeWithTitle(title)
            if (subnode) {
                return subnode
            }
        }
        return null
    }

    firstSubnodeWithSubtitle (aString) {
        return this.subnodes().detect(subnode => subnode.subtitle() === aString)
    }

    rootNode () {
        const root = this.defaultStore().rootObject()
        root.setTitle("root")
        return root
    }

    rootSubnodeWithTitleForProto(aString, aProto) {
        return this.rootNode().subnodeWithTitleIfAbsentInsertProto(aString, aProto)
    }

    subnodeWithTitleIfAbsentInsertProto(aString, aProto) {
        let subnode = this.firstSubnodeWithTitle(aString)

        if (subnode) {
            if (subnode.type() !== aProto.type()) {
                const newSubnode = aProto.clone()
                newSubnode.copyFrom(subnode)
                // TODO: Do we need to replace all references in pool and reload?
                this.replaceSubnodeWith(subnode, newSubnode)
                this.removeOtherSubnodeWithSameTitle(newSubnode)
                return newSubnode
            }

            this.removeOtherSubnodeWithSameTitle(subnode)
            return subnode
        }

        return this.subnodeWithTitleIfAbsentInsertClosure(aString, () => aProto.clone())
    }

    removeSubnodesWithTitle (aString) {
        this.subnodes().select(sn => sn.title() === aString).forEach(sn => sn.delete())
        return this
    }

    /*
    removeOtherSubnodeInstances (aSubnode) {
        assert(this.hasSubnode(aSubnode))
        this.subnodes().shallowCopy().forEach((sn) => {
            if (sn !== aSubnode) {
                if (sn.thisClass() === aSubnode.thisClass()) {
                    this.removeSubnode(sn)
                }
            }
        })
        return this
    }
    */

    removeOtherSubnodeWithSameTitle (aSubnode) {
        assert(this.hasSubnode(aSubnode))
        this.subnodes().shallowCopy().forEach((sn) => {
            if (sn !== aSubnode) {
                if (sn.title() === aSubnode.title()) {
                    this.removeSubnode(sn)
                }
            }
        })
        return this
    }

    subnodeWithTitleIfAbsentInsertClosure (aString, aClosure) {
        let subnode = this.firstSubnodeWithTitle(aString)

        if (!subnode && aClosure) {
            subnode = aClosure()
            subnode.setTitle(aString)
            if (subnode.type() === "BMThemeResources") {
                console.log("debug")
            }
            this.addSubnode(subnode)
        }

        return subnode
    }
        
    sendRespondingSubnodes (aMethodName, argumentList) {
        this.subnodes().forEach((subnode) => { 
            if (subnode[aMethodName]) {
                subnode[aMethodName].apply(subnode, argumentList)
            }
        })
        return this
    }
    
    // --- subnodes -----------------------------
    
    subnodesCount () {
        return this.subnodes().length
    }

    onDidMutateObject (anObject) {
        if (anObject === this._subnodes) {
            this.didChangeSubnodeList()
        }
    }

    watchSubnodes () {
        this._subnodes.addMutationObserver(this)
        return this
    }

    didUpdateSlotSubnodes (oldValue, newValue) {
        if (oldValue) {
            oldValue.removeMutationObserver(this)
        }

        this.watchSubnodes()
        if (this._subnodes.contains(null)) {
            this._subnodes.filterInPlace(sn => !(sn === null) )
        }
        this._subnodes.forEach(sn => sn.setParentNode(this))
        this.didChangeSubnodeList() // not handles automatically
        return this
    }
    
    assertSubnodesHaveParentNodes () {
        const missing = this.subnodes().detect(subnode => !subnode.parentNode())
        if (missing) {
            throw new Error("missing parent node on subnode " + missing.type())
        }
        return this
    }
    
    // --- sorting helper ---

    makeSortSubnodesByTitle () {
        this.setSubnodeSortFunc( (a, b) => a.title().localeCompare(b.title()) )
        return this
    }

    // --- subnode sorting ---
	
    setSubnodeSortFunc (f) {
        this.subnodes().setSortFunc(f)
	    return this
    }
	
    doesSortSubnodes () {
	    return this.subnodes().doesSort()
    }
    
    // --- subnode indexing ---
	
    lazyIndexedSubnodes () {
        if (!this.subnodes().indexClosure()) {
            this.subnodes().setIndexClosure( sn => sn.hash() )
        }
	    return this.subnodes()
    }
	
    subnodeWithHash (h) {
        return this.lazyIndexedSubnodes().itemForIndexKey(h)
    }
	
    removeSubnodeWithHash (h) {
	    const subnode = this.subnodeWithHash(h)
	    if (subnode) {
	        this.removeSubnode(subnode)
	    }
	    return this
    }
	
    hasSubnodeWithHash (h) {
	    return this.lazyIndexedSubnodes().hasIndexKey(h)
    }
    
    // --- node view badge ---

    nodeViewShouldBadge () {
        return false
    }

    nodeViewBadgeTitle () {
        return null
    }
	
    // visibility
	
    nodeBecameVisible () {
	    return this
    }

    // --- notification helpers --- 

    watchOnceForNote (aNoteName) {
        const obs = BMNotificationCenter.shared().newObservation()
        obs.setName(aNoteName)
        obs.setObserver(this)
        obs.setIsOneShot(true)
        obs.watch()
        //this.debugLog(".watchOnceForNote('" + aNoteName + "')")
        return obs
    }

    postNoteNamed (aNoteName) {
        const note = window.BMNotificationCenter.shared().newNote()
        note.setSender(this)
        note.setName(aNoteName)
        note.post()
        //this.debugLog(".postNoteNamed('" + aNoteName + "')")
        return note
    }

    scheduleSelfFor (aMethodName, milliseconds) {
        return window.SyncScheduler.shared().scheduleTargetAndMethod(this, aMethodName, milliseconds)
    }

    // -- selection requests ---

    onRequestSelectionOfDecendantNode () {
        return false // allow propogation up the parentNode line
    }

    onRequestSelectionOfNode () {
        this.tellParentNodes("onRequestSelectionOfDecendantNode", this)
        return this
    }

    onTapOfNode () {
        this.tellParentNodes("onTapOfDecendantNode", this)
        return this
    }

    // tracking observer count 
    // usefull for releasing inspectors when no longer needed

    /*
    onStartObserving () {

    }

    onStopObserving () {
        const isStillObserved = BMNotificationCenter.shared().hasObservationsForTargetId(this.typeId())
        if (!isStillObserved) {
            this.onNoMoreObservers()
        }
    }

    onNoMoreObservers () {

    }
    */

    summary () {
        return this.title() + " " + this.subtitle()
    }

    debugTypeId () {
        return super.debugTypeId() + " '" + this.title() + "'"
    }

}.initThisClass()

