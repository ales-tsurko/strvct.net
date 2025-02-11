"use strict"

/* 

    BrowserColumn

*/

window.BrowserColumn = class BrowserColumn extends NodeView {
    
    initPrototype () {
        this.newSlot("rows", null)
        this.newSlot("allowsCursorNavigation", true)
        this.newSlot("defaultRowStyles", null)
        this.newSlot("rowStyles", null)
        this.newSlot("rowPlaceHolder", null)
        this.newSlot("hasPausedSync", false)
    }

    init () {
        super.init()
        this.setDisplay("flex")
        this.setFlexDirection("column")
        this.setPosition("relative")
        this.setWidth("100%")
        this.setOverflow("hidden")
        this.setMinHeight("100%")
        this.setWebkitOverflowScrolling("regular")
        this.setMsOverflowStyle("none")
        this.setUserSelect("none")

        //this.setIsDebugging(true)
        this.setIsRegisteredForKeyboard(true)
        //this.styles().selected().setBorderLeft("1px solid rgba(0, 0, 0, 0.15)")
        //this.styles().unselected().setBorderLeft("1px solid rgba(0, 0, 0, 0.15)")
        this.applyStyles()
        //this.setIsRegisteredForClicks(true) // use tap gesture instead
        this.setAcceptsFirstResponder(true)

        this.setUserSelect("none")
        this.addGestureRecognizer(PinchGestureRecognizer.clone()) // for pinch open to add row
        this.addGestureRecognizer(TapGestureRecognizer.clone()) // for pinch open to add row

        this.setRowStyles(BMViewStyles.clone().setToWhiteOnBlack())
        //this.rowStyles().selected().setBackgroundColor("red")

        this.setIsRegisteredForBrowserDrop(true)

        return this
    }

    onFocus () {
        return super.onFocus()
    }

    setRowBackgroundColor (aColor) {
        this.rowStyles().unselected().setBackgroundColor(aColor)
        return this
    }

    setRowSelectionColor (aColor) {
        this.rowStyles().selected().setBackgroundColor(aColor)
        return this
    }

    applyStyles () {
        //this.debugLog(".applyStyles()")
        super.applyStyles()
        return this
    }
    
    title () {
        return this.node() ? this.node().title() : ""
    }

    browser () {
        return this.columnGroup().browser()
    }
    
    columnGroup () {
        return this.parentView().parentView()
    }

    // --- rows ---
    
    rows () {
        return this.subviews()
    }

    addRow (v) {
        return this.addSubview(v)
    }

    removeRow (v) {
        return this.removeSubview(v)
    }

    // selection
	
    didChangeIsSelected () {
        super.didChangeIsSelected()

        if (this.isSelected()) {
            const focusedView = WebBrowserWindow.shared().activeDomView()

            // TODO: need a better solution to this problem
            if (!focusedView || (focusedView && !this.hasFocusedDecendantView(focusedView))) {
                this.focus()    
            }
        } else {
            this.blur()
        }
		
        return this
    }

    /*
    darkenUnselectedRows () {
        const darkenOpacity = 0.5
        this.rows().forEach((row) => {
            if (row.isSelected()) {
                row.setOpacity(1)
            } else {
                row.setOpacity(darkenOpacity)
            }
        })
        return this
    }

    undarkenAllRows () {
        this.rows().forEach((row) => {
            row.setOpacity(1)
        })
    }
    */

    rowsWithNodes (nodeArray) {
        return nodeArray.map(node => this.rowWithNode(node))
    }

    rowWithNode (aNode) {
        return this.rows().detect(row => row.node() === aNode)
    }
    
    didClickRowWithNode (aNode) {
        const row = this.rowWithNode(aNode)
        if (!row) {
            throw new Error("column  missing row for node '" + aNode.title() + "'")
        }
        this.didClickRow(row)
        return this
    }
    
    unselectAllRowsExcept (selectedRow) {
        const rows = this.rows()

        // unselect all other rows
        rows.forEach((row) => {
            if (row !== selectedRow) {
                if (row.unselect) {
                    row.unselect()
                } else {
                    //console.warn("=WARNING= " + this.typeId() + ".unselectAllRowsExcept() row " + row.typeId() + " missing unselect method")
                }
            }
        })
        
        return this
    }
    
    onRequestSelectionOfRow (aRow) {
        this.didClickRow(aRow)
        return true
    }
    
    didClickRow (clickedRow) {
        clickedRow.focus()
        this.unselectAllRowsExcept(clickedRow)
        this.selectThisColumn()
        return true
    }

    indexOfRow (aRow) {
        // we might want this to be based on flex view order instead, 
        // so best to keep it abstract
        return this.indexOfSubview(aRow)
    }

    rowAtIndex (anIndex) {
        return this.subviews().at(anIndex)
    }

    requestShiftSelectRow (aRow) {
        let lastRow = this.lastSelectedRow()
        if (!lastRow) {
            lastRow = this.rows().first()
        }
        if (lastRow) {
            const r1 = this.indexOfRow(aRow)
            const r2 = this.indexOfRow(lastRow)
            assert(r1 !== -1 && r2 !== -1)
            const i1 = r1 < r2 ? r1 : r2
            const i2 = r1 < r2 ? r2 : r1 
            for (let i = i1; i <= i2; i++) {
                const row = this.rowAtIndex(i)
                if (!row.isSelected()) {
                    row.select()
                }
            }
        }
    }

    lastSelectedRow () {
        return this.selectedRows().maxItem(row => row.lastSelectionDate().getTime())
    }

    didSelectRow (aRow) {
        this.selectThisColumn()
    }

    didUnselectRow (aRow) {

    }

    selectThisColumn () {
        if (Type.isNull(this.browser())) {
            this.debugLog(" selectThisColumn WARNING: this.browser() === null" )
            // TODO: find out why this happens
            return this
        }
        this.browser().selectColumn(this)
        return this
    }
  
    // selection

    hasMultipleSelections () {
        return this.selectedRows().length > 0
    }

    // selected rows

    selectedRows () {
        return this.rows().filter(row => row.isSelected && row.isSelected())
    }

    selectedRow () {
        const sr = this.selectedRows()
        if (sr.length === 1) {
            return sr.first()
        }
        return null
    }

    // selected nodes

    selectedNodes () {
        return this.selectedRows().map(row => row.node())
    }

    selectedNode () {
        const r = this.selectedRow()
        return r ? r.node() : null
    }
    
    selectedRowIndex () { 
        // returns -1 if no rows selected
        return this.rows().indexOf(this.selectedRow())
    }

    // selecting rows
    
    setSelectedRowIndex (index) {
        const oldIndex = this.selectedRowIndex()
        //console.log("this.setSelectedRowIndex(" + index + ") oldIndex=", oldIndex)
        if (index !== oldIndex) {
            const rows = this.rows()
            if (index >= 0 && index < rows.length) {
                const row = rows[index]
                row.select()
                this.didClickRow(row)
            }
        }
        return this
    }
  
    indexOfRowWithNode (aNode) {
        return this.rows().detectIndex(row => row.node() === aNode)
    }

    selectAllRows () {
        this.rows().forEachRespondingPerform("select")
        return this
    }

    unselectAllRows () {
        this.rows().forEachRespondingPerform("unselect")
        return this
    }

    rowWithNode (aNode) {
        const row = this.rows().detect(row => row.node().nodeRowLink() === aNode)
        return row
    }
	
    selectRowWithNode (aNode) {
        //console.log(">>> column " + this.node().title() + " select row " + aNode.title())
        const selectedRow = this.rowWithNode(aNode)
		
        if (selectedRow) {
            selectedRow.setIsSelected(true)
			
            this.rows().forEach((aRow) => {
                if (aRow !== selectedRow) {
                    aRow.unselect()
                }
            })
        }

        return selectedRow
    }
    
    selectedRowTitle () {
        const row = this.selectedRow()
        if (row) { 
            return row.title().innerHTML() 
        }
        return null
    }

    // --- sync -----------------------------

    subviewProtoForSubnode (aSubnode) {
        let proto = aSubnode.nodeRowViewClass()
		
        if (!proto) {
            proto = BrowserTitledRow
        }
				
        return proto      
    }

    setNode (aNode) {
        if (this.node() !== aNode) {
            super.setNode(aNode)
            this.unselectAllRows() // move to didChangeNode
            //"shouldFocusSubnode"
        }
        return this
    }

    isInBrowser () {
        return this.browser().columns().contains(this)
    }

    shouldFocusAndExpandSubnode (aNote) { // focus & expand row
        if (!this.isInBrowser()) {
            return this
        }

	    const subnode = aNote.info()

        //console.log(this.debugTypeId() + " shouldFocusAndExpandSubnode " + subnode.debugTypeId())
	    let subview = this.subviewForNode(subnode)
	    
        if (!subview) {
            this.syncFromNodeNow()
	        subview = this.subviewForNode(subnode)
        } 

        if (subview) {
            this.selectRowWithNode(subnode)
            subview.scrollIntoView()
            subview.requestSelection()
            //this.selectThisColumn()
		    //subview.dynamicScrollIntoView()
        } else {
            console.warn("BrowserColumn for node " + this.node().typeId() + " has no matching subview for shouldSelectSubnode " + subnode.typeId())
	    }

	    return this 
    }

    shouldFocusSubnode (aNote) { //  focus but don't expand row
	    const subnode = aNote.info()

	    let subview = this.subviewForNode(subnode)
	    
        if (!subview) {
            this.syncFromNodeNow()
	        subview = this.subviewForNode(subnode)
        } 

        if (subview) {
            this.selectRowWithNode(subnode)
            subview.scrollIntoView()

            // just focus the row without expanding it
            if (this.previousColumn()) {
                this.previousColumn().selectThisColumn()
            }

            //this.selectThisColumn()
		    //subview.dynamicScrollIntoView()
        } else {
            console.warn("BrowserColumn for node " + this.node().typeId() + " has no matching subview for shouldFocusSubnode " + subnode.typeId())
            //console.log("row nodes = ", this.rows().map(row => row.node().typeId()) )
	    }

	    return this 
    }
	
    scrollToSubnode (aSubnode) {
	    //this.debugLog(".scrollToSubnode")
	    const subview = this.subviewForNode(aSubnode)
	    assert(subview)
	    this.columnGroup().scrollView().setScrollTop(subview.offsetTop())
	    return this 	    
    }
    
    scrollToBottom () {
        const last = this.rows().last()

        if (last) { 
            last.scrollIntoView()
        }

        return this
    }

    didChangeNode () {
        super.didChangeNode()

        if (this.node() && this.node().nodeRowsStartAtBottom()) {
            setTimeout(() => { this.scrollToBottom() }, 0)
            //this.row().last().scrollIntoView()
        }

        return this
    }
    
    /*
    scheduleSyncFromNode () {
        //assert(this.browser().columns().contains(this))

        //console.log(this.type() + " " + this.node().title() + " .scheduleSyncFromNode()")
        if (this.node() === null || !this.isInBrowser()) {
            console.warn("WARNING: skipping BrowserColumn.scheduleSyncFromNode")
            console.warn("  this.isInBrowser() = " , this.isInBrowser())
            console.warn("  this.node() = " , this.node().debugTypeId())
            return this
        }
        
 	    super.scheduleSyncFromNode()
	    return this
    }
    */
	
    syncFromNode () {
        if (!this.isInDocument()) {
            if (Type.isNull(this.node())) {
                console.log("WARNING - attempt to sync BrowserColumn not in browser and with null node")
            } else {
                let isCached = this.browser().hasCachedColumnGroup(this.columnGroup())
                console.log("attempt to sync " + this.debugTypeId() + " but it's not in the browser")
                if (!isCached) {
                    throw new Error("this shouldn't happen")
                }

            }
            return 
        }
        //console.log(this.type() + " " + (this.node() ? this.node().title() : "null") + " .syncFromNode()")


        if (this.hasPausedSync()) { // why is this needed?
            return this
        }

        if (this.browser() === null) {
            // must have been removed from parentView
            //console.warn("WARNING: skipping BrowserColumn.syncFromNode on node '" + this.node().typeId() + "' because this.browser() is null")
            //console.warn("this.node().title() = " , this.node().title())
            return
        }
        
        // remember the selection before sync
        let selectedIndex = this.selectedRowIndex()
        const lastSelectedNode = this.selectedNode()
        
        super.syncFromNode()
        
        if (this.node() === null) {
            this.setIsRegisteredForBrowserDrop(false)
            return this
        }
        
        //this.setIsRegisteredForBrowserDrop(this.node().acceptsFileDrop())

        if (selectedIndex === -1) {
            // seem to need this when deleting a row
            this.browser().clearColumnsGroupsAfter(this.columnGroup()) // TODO: fragile: careful that this doesn't cause a loop...
        } else {
            // select the row matching the last selected node

            let row = this.selectRowWithNode(lastSelectedNode)

            if (row) {
                // there's a row for the lastSelectedNode, so let's select it
                if (!row.isSelected()) {
                    //this.log("selecting row titled '" + row.title().innerHTML() + "'")
                    row.setIsSelected(true)
                    //this.didClickRow(row)
                    this.unselectAllRowsExcept(row)
                }
            } else {
                // we should have a more explicit way of selecting the next row
                // after a row delete as we don't always want it to default to selecting next row
                if (this.rows().length) {
                    // otherwise, select close to last selected index
                    const i = Math.min(selectedIndex, this.rows().length - 1)
                    row = this.rows().at(i)
                    //this.log("selecting row titled '" + row.title().innerHTML() + "'")
                    row.requestSelection()
                    /*
                    row.setIsSelected(true)
                    this.unselectAllRowsExcept(row)
                    */
                }
            }
        }
    }

    // --- keyboard controls, arrow navigation -----------------------------

    canNavigate () {
        return this.allowsCursorNavigation() 
        //return this.allowsCursorNavigation() && this.isActiveElement()
    }
	
    showSelected () {
        /*
        TODO: add check if visible
        if (this.selectedRow()) {
            this.selectedRow().scrollIntoView()
        }
        */
        return this	    
    }


    // --- controls --------------

    onMetaKeyDown (event) {
        console.log("new folder")
        event.stopPropagation()
        event.preventDefault();
    }

    onMeta_m_KeyDown (event) {
        console.log("new folder")
        event.stopPropagation()
        event.preventDefault()
    }

    onMeta_d_KeyDown (event) {
        console.log("duplicate selection down")
        this.duplicateSelectedRows()
        event.stopPropagation()
        event.preventDefault();
    }

    duplicateSelectedRows () {
        const newNodes = []

        this.selectedRows().forEach(row => {
            const i = this.indexOfSubview(row)
            const dupNode = row.node().duplicate()
            newNodes.push(dupNode)
            this.node().addSubnodeAt(dupNode, i+1)
        })
        this.unselectAllRows()
        this.syncFromNodeNow()

        // TODO: unselect current rows at browser level
        newNodes.forEach(newNode => {
            const newRow = this.rowWithNode(newNode)
            newRow.select()
        })

        return this
    }

    onMeta_d_KeyUp (event) {
        console.log("duplicate selection up")
        this.selectedRows().forEach()
        event.stopPropagation()
        event.preventDefault();
    }

    onShiftBackspaceKeyUp (event) {
        this.debugLog(this.type() + " for " + this.node().title() + " onShiftBackspaceKeyUp")
        if (this.selectedRow()) { 
            this.selectedRow().delete()
        }
        event.stopPropagation()
    }

    onShiftPlusKeyUp (event) {
        this.debugLog(this.type() + " for " + this.node().title() + " onShiftPlusKeyUp")
        this.addIfPossible()
        event.stopPropagation()
    }

    addIfPossible () {
        const node = this.node()

        if (node.canSelfAddSubnode()) {
            const newNode = node.add()
            if (newNode) {
                this.syncFromNode()
                const newSubview = this.subviewForNode(newNode)
                newSubview.requestSelection()
            }
        }
    }

    // duplicate

    onAlternate_d_KeyUp (event) {
        //this.debugLog(" onMetaLeft_d_KeyUp")
        this.duplicateSelectedRow()
        return false // stop propogation
    }

    // select all

    onMeta_a_KeyDown (event) {
        this.selectAllRows()
        event.stopPropagation()
        return false // stop propogation
    }

    // inspecting

    isInspecting () {
        // see if the row that selected this column is being inspected
        const prev = this.previousColumn() 
        if (prev) {
            const row = prev.selectedRow()
            if (row) {
                return row.isInspecting()
            }
        }
        return false
    }

    duplicateSelectedRow () {
        const node = this.node()
        const row = this.selectedRow()
        const canAdd = node.canSelfAddSubnode() 
        if (row && canAdd) {
            const canCopy = !Type.isNullOrUndefined(row.node().copy)
            if (canCopy) { 
                //this.debugLog(" duplicate selected row " + this.selectedRow().node().title())
                const subnode = row.node()
                const newSubnode = subnode.copy()
                const index = node.indexOfSubnode(subnode)
                node.addSubnodeAt(newSubnode, index)
                this.scheduleSyncFromNode()
            }
        }
    }

    onControl_c_KeyUp (event) {
        // copy?
    }

    onControl_p_KeyUp (event) {
        // paste?
    }
	
    onUpArrowKeyUp (event) {
        if (!this.canNavigate()) { 
            return 
        }
        this.selectPreviousRow()
        this.showSelected()
        return false
    }
	
    onDownArrowKeyUp (event) {
        if (!this.canNavigate()) { 
            return 
        }
        this.selectNextRow()
        this.showSelected()
        return false
    }

    moveLeft () {
        const pc = this.previousColumn()	
        if (pc) {
            if (this.selectedRow()) { 
                this.selectedRow().unselect() 
            }
			
            const newSelectedRow = pc.selectedRow()
            newSelectedRow.setShouldShowFlash(true).updateSubviews()
            pc.didClickRow(newSelectedRow)
        	this.selectPreviousColumn()
        }
        return this
    }

    moveRight () {
        if (this.nextColumn() && this.nextColumn().rows().length > 0) {
        	this.selectNextColumn()
        } else {
            this.selectNextColumn()
        }

        return this
    }
	
    onLeftArrowKeyUp (event) {
        if (!this.canNavigate()) { 
            return this
        }	

        this.moveLeft()
    }
	
    onRightArrowKeyUp (event) {
        if (!this.canNavigate()) { 
            return this
        }	

        this.moveRight()
    }

    onEscapeKeyDown (event) {
        if (!this.canNavigate()) { 
            return this
        }	

        this.moveLeft()
        //return true
    }
	
    // --- enter key begins row editing ---------------------------
	
    onEnterKeyUp (event) {        
        if (!this.canNavigate()) { 
            return this
        }
	
        const row = this.selectedRow()
        if (row) { 
		    row.onEnterKeyUp(event)
        }

        return false
    }

    // --- keyboard controls, add and delete actions -----------------------------

    /*
    deleteRow (aRow) {
        let sNode = aRow.node()
        if (sNode && sNode.canDelete()) { 
			sNode.performAction("delete") 
		}
        return this
    }

    deleteSelectedRows () {
        this.selectedRows().forEach(r => this.deleteRow(r))

        if (this.rows().length === 0) {
            this.selectPreviousColumn()
        }
    }
    */

    onShiftDeleteKeyUp (event) {
        if (!this.canNavigate()) { 
            return 
        }

        //this.deleteSelectedRows()
        return false
    }
	
    onPlusKeyUp (event) {
        if (!this.canNavigate()) { 
            return 
        }		

        const sNode = this.selectedNode()
        if (sNode && sNode.hasAction("add")) { 
            const newNode = sNode.performAction("add") 
            this.selectNextColumn()
            if (this.nextColumn()) {
                this.nextColumn().selectRowWithNode(newNode)
            }
        }
        return false		
    }
	
    // -----------------------------
    
    onTapComplete (aGesture) {
        //this.debugLog(".onTapComplete()")
        if (this.node()) {
            // add a subnode if tapping on empty area
            // make sure tap isn't on a row
            const p = aGesture.downPosition() // there may not be an up position on windows?
            //this.debugLog(".onTapComplete() ", aGesture.upEvent())
            if (p.event().target === this.element()) {
                this.addIfPossible()
            }
        }
        return this
    }

    // -----------------------------

    columnIndex () {
        return this.browser().columnGroups().indexOf(this.columnGroup())
    }

    // nextRow

    selectFirstRow () {
        this.setSelectedRowIndex(0)
        return this
    }

    firstRow () {
        if (this.rows().length > 0) {
            return this.rows()[0]
        }
        return null
    }

    nextRow () {
        const si = this.selectedRowIndex()
        if (si !== -1 && si < this.rows().length) {
            const nextRow = this.rows()[si +1]
            return nextRow
        }
        return null
    }

    selectNextRow () {
        const si = this.selectedRowIndex()
        if (si === -1) {
            this.setSelectedRowIndex(0)
        } else {
            this.setSelectedRowIndex(si + 1)
        }
        return this
    }
    
    selectPreviousRow () {
        const si = this.selectedRowIndex()
        if (si === -1) {
            this.setSelectedRowIndex(0)
        } else {
            this.setSelectedRowIndex(si - 1)
        }
        return this
    }

    // next column
    
    nextColumn () {
        const i = this.columnIndex()
        const nextColumn = this.browser().columns()[i+1]
        return nextColumn
    }

    focus () {
        super.focus()
		
	    if (this.selectedRowIndex() === -1) {
            const sr = this.rows().first()
            if (sr) {
                sr.setShouldShowFlash(true)
            }
            this.setSelectedRowIndex(0)
        }

        //this.debugLog(" focus")
        return this
    }
    
    selectNextColumn () {
        const nextColumn = this.nextColumn()
        if (nextColumn) {
            this.blur()
            //console.log("nextColumn.focus()")
            /*
            const sr = nextColumn.selectedRow()
            if (sr) {
                sr.setShouldShowFlash(true)
            }
            */
            nextColumn.focus()
        }
        return this
    }
    
    // previous column
	
    previousColumn () {
        if(!this.browser()) {
            return null
        }
        const i = this.columnIndex()
        const previousColumn = this.browser().columns()[i - 1]
        return previousColumn
    }

    selectPreviousColumn () {
        //this.log("selectPreviousColumn this.columnIndex() = " + this.columnIndex())
        const prevColumn = this.previousColumn()
        if (prevColumn) {
            this.blur()
            prevColumn.focus()
            this.browser().selectColumn(prevColumn)
        }
        return this
    }

    // paths
    
    /*
    browserPathArray () {
        let subviews = this.browser().columns().subviewsBefore(this)
        subviews.push(this)
        return subviews
    }
    
    browserPathString () {
        return this.browserPathArray().map(function (column) { 
            return column.title()  // + ":" + column.node().type()
        }).join("/")
    }
    */

    logName () {
        return this.browserPathString()
    }

    maxRowWidth () {
        if (this.rows().length === 0) {
            return 0
        }
        
        const maxWidth = this.rows().maxValue(row => row.desiredWidth())			
        return maxWidth	
    }

    // editing

    onDoubleClick (event) {
        //this.debugLog(".onDoubleClick()")
        return true
    }

    // reordering support

    /*
    absolutePositionRows () {
        const ys = []
        this.rows().forEach((row) => {
            const y = row.relativePos().y()
            ys.append(y)
        })

        let i = 0
        this.rows().forEach((row) => {
            const y = ys[i]
            i ++
            row.unhideDisplay()
            row.setPosition("absolute")
            row.setTopPx(y)
            row.setLeftPx(0)
            row.setRightPx(null)
            row.setBottomPx(null)
            row.setWidthPercentage(100)
            //console.log("i" + i + " : y" + y)
        })
        
        return this
    }
    */


    /*
    orderRows () {
        const orderedRows = this.rows().shallowCopy().sortPerform("topPx")

        this.rows().forEach((row) => {
            row.setPosition("absolute")
            row.unhideDisplay()
        })

        this.removeAllSubviews()
        this.addSubviews(orderedRows)
        return this
    }
    */

    // -- stacking rows ---

    stackRows () {
        // we don't need to order rows for 1st call of stackRows, 
        // but we do when calling stackRows while moving a drop view around,
        // so just always do it as top is null, and rows are already ordered the 1st time

        const orderedRows = this.rows().shallowCopy().sortPerform("topPx") 
        let y = 0
        const columnWidth =  this.computedWidth()
        
        orderedRows.forEach((row) => {
            let h = 0

            if (row.visibility() === "hidden" || row.display() === "none") {
                row.hideDisplay()
            } else {
                h = row.computedHeight() //row.clientHeight() 
                row.unhideDisplay()
                row.setPosition("absolute")
                row.setMinAndMaxWidth(columnWidth)
                row.setMinAndMaxHeight(h)                
            }

            //console.log("y:", y + " h:", h)
            row.setTopPx(y)
            row.setOrder(null)
            y += h
        })

        return this
    }

    unstackRows () {
        // should we calc a new subview ordering based on sorting by top values?
        const orderedRows = this.rows().shallowCopy().sortPerform("topPx")

        this.rows().forEach((row) => {
            row.unhideDisplay()
            row.setPosition("relative")

            row.setTopPx(null)
            row.setLeftPx(null)
            row.setRightPx(null)
            row.setBottomPx(null)

            row.setMinAndMaxWidth(null)
            row.setMinAndMaxHeight(null)                
        })

        this.removeAllSubviews()
        this.addSubviews(orderedRows)
        return this
    }

    // --------------

    canReorderRows () {
        return this.node().nodeRowLink().nodeCanReorderSubnodes()
        //return this.node().nodeCanReorderSubnodes()
    }

    didReorderRows () { 
        if (!this.node() || !this.isInBrowser()) {
            return this
        }
        // TODO: make a more scaleable API
        const subnodes = this.rows().map(row => row.node())
        this.node().nodeRowLink().nodeReorderSudnodesTo(subnodes)
        //this.node().nodeReorderSudnodesTo(subnodes)
        return this
    }

    // pinch

    rowContainingPoint (aPoint) {
        return this.rows().detect((row) => {
            return row.frameInDocument().containsPoint(aPoint)
        })
    }


    onPinchBegin (aGesture) {
        // TODO: move row specific code to BrowserRow

        //this.debugLog(".onPinchBegin()")

        // - calc insert index
        const p = aGesture.beginCenterPosition()
        const row = this.rowContainingPoint(p)
        if (!row) {
            // don't allow pinch if it's bellow all the rows
            // use a tap gesture to create a row there instead?
            return this
        }

        const insertIndex = this.rows().indexOf(row)

        //console.log("insertIndex: ", insertIndex)

        if (this.node().hasAction("add")) {
            // create new subnode at index
            const newSubnode = this.node().addAt(insertIndex)

            // reference it with _temporaryPinchSubnode so we
            // can delete it if pinch doesn't complete with enough height
            this._temporaryPinchSubnode = newSubnode

            // sync with node to add row view for it
            this.syncFromNodeNow()

            // find new row and prepare it
            const newRow = this.subviewForNode(newSubnode)
            newRow.setMinAndMaxHeight(0)
            newRow.contentView().setMinAndMaxHeight(64)
            newRow.setTransition("all 0.3s")
            newRow.contentView().setTransition("all 0s")
            newRow.setBackgroundColor("black")

            // set new row view height to zero and 
            const minHeight = BrowserRow.defaultHeight()
            const cv = newRow.contentView()
            cv.setBackgroundColor(this.columnGroup().backgroundColor())
            cv.setMinAndMaxHeight(minHeight)
            //newRow.scheduleSyncFromNode()
            //this._temporaryPinchSubnode.didUpdateNode()
        } else {
            //this.debugLog(".onPinchBegin() cancelling due to no add action")

            aGesture.cancel()
        }        
    }
    
    onPinchMove (aGesture) {
        if (this._temporaryPinchSubnode) {
            let s = Math.floor(aGesture.spreadY())
            if (s < 0) {
                s = 0
            }
            //this.debugLog(".onPinchMove() s = ", s)
            const minHeight = BrowserRow.defaultHeight()
            const newRow = this.subviewForNode(this._temporaryPinchSubnode)
            //newRow.setBackgroundColor("black")
            newRow.setMinAndMaxHeight(s)
            const t = Math.floor(s/2 - minHeight/2);
            newRow.contentView().setTopPx(t)

            const h = BrowserRow.defaultHeight()

            if (s < h) {
                const f = s/h;
                const rot = Math.floor((1 - f) * 90);
                newRow.setPerspective(1000)
                newRow.setTransformOrigin(0)
                //newRow.contentView().setTransformOriginPercentage(0)
                newRow.contentView().setTransform("rotateX(" + rot + "deg)")
                const z = -100 * f;
                //newRow.contentView().setTransform("translateZ(" + z + "dg)")
            } else {
                newRow.setPerspective(null)
                newRow.contentView().setTransform(null)                
            }
        } else {
            console.warn(this.typeId() + ".onPinchMove() missing this._temporaryPinchSubnode")
        }
        // do we need to restack views?
    }

    onPinchComplete (aGesture) {
        //this.debugLog(".onPinchCompleted()")
        // if pinch is tall enough, keep new row

        if (this._temporaryPinchSubnode) {
            const newRow = this.subviewForNode(this._temporaryPinchSubnode)
            const minHeight = BrowserRow.defaultHeight()
            if (newRow.clientHeight() < minHeight) {
                this.removeRow(newRow)
            } else {
                //newRow.contentView().setTransition("all 0.15s, height 0s")
                //newRow.setTransition("all 0.3s, height 0s")
                setTimeout(() => { 
                    newRow.contentView().setTopPx(0)
                    newRow.setMinAndMaxHeight(minHeight) 
                }, 0)
            }

            this._temporaryPinchSubnode = null
        }
    }

    onPinchCancelled (aGesture) {
        //this.debugLog(".onPinchCancelled()")
        if (this._temporaryPinchSubnode) {
            this.node().removeSubnode(this._temporaryPinchSubnode)
            this._temporaryPinchSubnode = null
        }
    }

    selectNextKeyView () {
        const nextRow = this.nextRow()
        if (nextRow) {
            this.selectNextRow()
            nextRow.becomeKeyView()
        } else {
            const firstRow = this.firstRow()
            if (firstRow) {
                this.selectFirstRow()
                firstRow.becomeKeyView()
            }
        }
        return this
    }

    // -- messages sent by DragView to the parent/owner of the view it's dragging ---

    onDragSourceBegin (dragView) {
        this.setHasPausedSync(true)

        // ---

        dragView.items().forEach(subview => {
            subview.hideForDrag()
        })

        // ---
        const subview = dragView.item()
        const index = this.indexOfSubview(subview)
        assert(index !== -1)

        this.rows().forEach(row => row.setTransition("all 0.3s"))

        this.newRowPlaceHolder(dragView)

        if (dragView.isMoveOp()) {
            subview.hideForDrag()
            this.moveSubviewToIndex(this.rowPlaceHolder(), index)
        }

        this.columnGroup().cache() // only needed for source column, since we might navigate while dragging


        this.stackRows()
        return this
    }

    onDragSourceCancelled (dragView) {
        dragView.items().forEach(subview => {
            subview.unhideForDrag()
        })
        this.removeRowPlaceHolder()
    }

    onDragSourceEnter (dragView) {
        this.onDragDestinationHover(dragView)
    }

    onDragSourceHover (dragView) {
        this.onDragDestinationHover(dragView)
    }

    onDragSourceExit (dragView) {
        this.onDragDestinationHover(dragView)
    }

    onDragSourceDropped (dragView) {
        const node = this.node()
        const movedNodes = dragView.items().map(item => item.node())

        this.unstackRows()
        const insertIndex = this.indexOfSubview(this.rowPlaceHolder())
        this.removeRowPlaceHolder()

        dragView.items().forEach(item => {
            item.unhideForDrag()
        })

        if (dragView.isMoveOp()) {
            node.moveSubnodesToIndex(movedNodes, insertIndex)
        } else if (dragView.isCopyOp()) {
            const dupMovedNodes = dragView.items().map(item => item.duplicate())
            node.moveSubnodesToIndex(dupMovedNodes, insertIndex)
        }

        //console.log("new order: " + this.node().subnodes().map(sn => sn.title()).join("-"))
        this.setHasPausedSync(false)
        this.syncFromNodeNow()
        this.rowsWithNodes(movedNodes).forEach(row => row.select())
    }

    onDragSourceEnd (dragView) {
        this.columnGroup().scheduleMethod("uncache")
        this.endDropMode()
    }

    // -- messages sent by DragView to the potential drop view, if not the source ---

    acceptsDropHover (dragView) {
        let node = this.node()
        if (node) {
            let dropNode = dragView.item().node()

            if (dropNode == this.node()) {
                return false
            }
            
            let acceptsNode = node.acceptsAddingSubnode(dropNode)
            let canReorder = this.canReorderRows()
            //console.log(node.title() + " acceptsNode " + dropNode.title() + " " + acceptsNode)
            //console.log("parentNode " + node.parentNode().title())
            let result = acceptsNode && canReorder
            return result
        }
        return false
    }

    newRowPlaceHolder (dragView) {
        this.debugLog("newRowPlaceHolder")
        if (!this.rowPlaceHolder()) {
            const ph = DomView.clone().setDivClassName("BrowserRowPlaceHolder")
            ph.setBackgroundColor("black")
            ph.setMinAndMaxWidth(this.computedWidth())
            ph.setMinAndMaxHeight(dragView.minHeight())
            ph.transitions().at("top").updateDuration(0)
            ph.transitions().at("left").updateDuration(0.3)
            //ph.setTransition("top 0s, left 0.3s, max-height 1s, min-height 1s")
            this.addSubview(ph)
            this.setRowPlaceHolder(ph)
        }
        return this.rowPlaceHolder()
    }

    // --- drag destination ---

    onDragDestinationEnter (dragView) {
        this.setHasPausedSync(true)

        // insert place holder view
        if (!this.rowPlaceHolder()) {
            this.newRowPlaceHolder(dragView)
            this.rowPlaceHolder().setMinAndMaxHeight(dragView.computedHeight())
            this.onDragDestinationHover(dragView)
        }
    }

    onDragDestinationHover (dragView) {
        // move place holder view
        const ph = this.rowPlaceHolder()
        if (ph) {
            const vp = this.viewPosForWindowPos(dragView.dropPoint())
            const y = vp.y() - dragView.computedHeight()/2
            ph.setTopPx(vp.y() - dragView.computedHeight()/2)
            //console.log("ph.top() = ", ph.top())
            this.stackRows() // need to use this so we can animate the row movements
        }
    }
    
    onDragDestinationExit (dragView) {
        this.endDropMode()
    }

    onDragDestinationEnd (aDragView) {
        this.endDropMode()
    }

    acceptsDropHoverComplete (aDragView) {
        return this.acceptsDropHover(aDragView);
    }

    dropCompleteDocumentFrame () {
        return this.rowPlaceHolder().frameInDocument()
    }

    onDragDestinationDropped (dragView) {
        this.unstackRows()

       const itemViews = dragView.items()
       const movedNodes = dragView.items().map(item => item.node())
       const insertIndex = this.indexOfSubview(this.rowPlaceHolder())
       this.removeRowPlaceHolder()

       if (dragView.isMoveOp()) {
            itemViews.reversed().forEach(itemView => {
                if(itemView.onDragRequestRemove && itemView.onDragRequestRemove()) {
                    this.node().addSubnodeAt(itemView.node(), insertIndex)
                }
            })
        } else if (dragView.isCopyOp()) {
            itemViews.reversed().forEach(itemView => {
                const dupNode = itemView.node().duplicate()
                this.node().addSubnodeAt(dupNode, insertIndex)
            })
        } else {
            throw new Error("unhandled drag operation")
        }

        this.setHasPausedSync(false)
        this.syncFromNodeNow()
        this.rowsWithNodes(movedNodes).forEach(row => row.select())
        //this.endDropMode() // we already unstacked the rows
    }

    removeRowPlaceHolder () {
        this.debugLog("removeRowPlaceHolder")

        const ph = this.rowPlaceHolder()
        if (ph) {
            //console.log("removeRowPlaceHolder")
            this.removeSubview(ph)
            this.setRowPlaceHolder(null)
        }
    }

    animateRemoveRowPlaceHolderAndThen (callback) {
        this.debugLog("animateRemoveRowPlaceHolder")

        const ph = this.rowPlaceHolder()
        if (ph) {
            ph.setMinAndMaxHeight(0)
            setTimeout(() => {
                this.removeRowPlaceHolder()
                if (callback) { callback() }
            }, 1*1000)
        } else {
            if (callback) { callback() }
        }
    }

    endDropMode () {
        this.debugLog("endDropMode")
        this.unstackRows()
        this.removeRowPlaceHolder()
        this.unstackRows()
        this.setHasPausedSync(false)
        this.didReorderRows()

        /*
        this.animateRemoveRowPlaceHolderAndThen(() => {
         this.debugLog("endDropMode")
            this.unstackRows()
            this.setHasPausedSync(false)
            this.didReorderRows()
        })
        */

        return this
    }

    /*
    rowIndexForViewportPoint (aPoint) {
        if (this.rows().length === 0) {
            return 0
        }

        const row = this.rows().detect((row) => {
            return row.frameInDocument().containsPoint(aPoint)
        })

        if (row) {
            return this.rows().indexOf(row)
        }

        return this.rows().length
    }
    */

    // Browser drop from desktop

    acceptsDrop () {
        return true
    }

    onBrowserDropChunk (dataChunk) {
        const node = this.node()

        if (node && node.onBrowserDropChunk) {
            node.onBrowserDropChunk(dataChunk)
        }
        this.scheduleSyncFromNode()
    }

    nodeDescription () {
        const node = this.node()
        if (node) {
            return node.debugTypeId()
        }
        return null
    }

    debugTypeId () {
       return super.debugTypeId() + this.debugTypeIdSpacer() + this.nodeDescription()
    }
    
}.initThisClass()

