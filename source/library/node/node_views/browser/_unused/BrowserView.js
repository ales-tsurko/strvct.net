"use strict"

/*
    
    BrowserView

    A Miller Column browser. It's subviews are BrowserColumnGroups.
    Each BrowserColumnGroup has a ColumnHeader, ScrollView, and ColumnFooter.
    Within a BrowserColumnGroup's ScrollView is a BrowserColumn whose subviews are BrowserRows.
    
*/

window.BrowserView = class BrowserView extends HeaderFooterView {
    
    initPrototype () {
        this.newSlot("columns", null)
        this.newSlot("isSingleColumn", false)
        this.newSlot("groupsView", null)
        this.newSlot("defaultHeader", null)
        this.newSlot("defaultColumnStyles", null)
        this.newSlot("defaultRowStyles", null)
        this.newSlot("watchForNodeUpdates", false)

        // dict of nodes, with node.typeId() as key, and BrowserColumnGroup as value
        this.newSlot("columnGroupCache", null)
        //this.newSlot("selectedColumnGroup", null)
    }


    init () {
        super.init()
        this.setDisplay("flex")
        this.setPosition("relative")
        /*
        this.setPosition("absolute")
        this.setTopPx(0)
        this.setLeftPx(0)
        */
        this.setWidth("100%")
        this.setHeight("100%")

        this.setFlexDirection("column")
        this.setFlexWrap("nowrap")
        this.setOverflow("hidden")

        this.setHeaderClass(BrowserHeader)
        this.setMiddleClass(DomView)
        this.setupHeaderMiddleFooterViews()

        //this.headerView().setBorder("1px dashed yellow")

        const mv = this.middleView()
        mv.setPosition("relative")
        mv.setDisplay("flex")
        mv.setFlexDirection("row")
        //mv.setBorder("1px dashed blue")       
        mv.setWidth("100%")
        mv.setHeight("100%")

        this.setupDefaultStyles()
        this.setColumnGroupCache({})

        this.setIsRegisteredForDocumentResize(true)

        // default header is a absolute positioned top bar to ensure that the 
        // column group bars appear to be continued all the way across the BrowserView
        const dh = DomView.clone().setDivClassName("BrowserDefaultHeader")
        this.setDefaultHeader(dh)
        this.middleView().addSubview(dh)

        this.setBackgroundColor(this.bgColorForIndex(Math.round(this.bgColors().length / 2)))
        this.setColumnGroupCount(1)

        this.addGestureRecognizer(LeftEdgePanGestureRecognizer.clone()) 
        this.addGestureRecognizer(RightEdgePanGestureRecognizer.clone()) 

        return this
    }

    contentView () {
        return this.middleView()
    }

    bgColors () {
        //return this.bgColorsCool()
        //return this.bgColorsWarm()
        return this.bgColorsGray()
        //return this.bgColorsWhite()
    }

    bgColorsWhite () {
        return [
            [255, 255, 255],
        ]
    }

    bgColorsGray () {
        return [
            //[64/255, 64/255, 64/255],
            [60 / 255, 60 / 255, 60 / 255],
            [48 / 255, 48 / 255, 48 / 255],
            [32 / 255, 32 / 255, 32 / 255],
            [26 / 255, 26 / 255, 26 / 255],
            [16 / 255, 16 / 255, 16 / 255],
            //[0 / 255, 0 / 255, 0 / 255],
        ] //.reversed()

        /*
        [
  [
    0.23529411764705882,
    0.23529411764705882,
    0.23529411764705882
  ],
  [
    0.18823529411764706,
    0.18823529411764706,
    0.18823529411764706
  ],
  [
    0.12549019607843137,
    0.12549019607843137,
    0.12549019607843137
  ],
  [
    0.10196078431372549,
    0.10196078431372549,
    0.10196078431372549
  ],
  [
    0.06274509803921569,
    0.06274509803921569,
    0.06274509803921569
  ]
  */
    }

    bgColorsWarm () {
        return [
            //[0.412, 0.110, 0.067], // header color
            //[0.867, 0.235, 0.145],
            [0.871, 0.278, 0.145],
            //[0.875, 0.325, 0.153],
            [0.875, 0.325, 0.153],
            //[0.882, 0.412, 0.161],
            [0.886, 0.459, 0.165],
            //[0.890, 0.502, 0.169],
            [0.898, 0.545, 0.176],
            //[0.902, 0.592, 0.184],
            [0.906, 0.635, 0.192],
            //[0.914, 0.682, 0.196]
        ]
    }

    bgColorsCool () {
        return [
            [0.118, 0.506, 0.965],
            //[0.118, 0.525, 0.965],
            [0.122, 0.545, 0.969],
            //[0.118, 0.569, 0.969],
            [0.122, 0.584, 0.976],
            //[0.122, 0.608, 0.976],
            [0.122, 0.627, 0.980],
            //[0.122, 0.651, 0.980],
            [0.125, 0.675, 0.984],
            //[0.125, 0.694, 0.984],
            [0.129, 0.718, 0.988],
            //[0.129, 0.741, 0.988]
        ]
    }


    // columnGroupCache

    hasCachedColumnGroup(cg) {
        return Object.values(this.columnGroupCache()).contains(cg)
    }

    getCachedColumnGroupForNode (node) {
        const k = node.typeId()
        const cg = this.columnGroupCache()[k]
        return cg
    }

    cacheColumnGroup (cg) {
        assert(cg.type() === "BrowserColumnGroup")
        const k = cg.node().typeId()
        this.columnGroupCache().atPut(k, cg)
        return this
    }

    uncacheColumnGroup (cg) {
        if (!cg.node()) {
            console.log("should this happen?")
            return this
        }
        assert(cg.type() === "BrowserColumnGroup")
        const k = cg.node().typeId()
        this.columnGroupCache().removeAt(k)
        if (!cg.isInBrowser()) {
            cg.setNode(null)
        }
        //console.log("uncacheColumnGroup ", cg.node().title())
        //this.scheduleSyncFromNode() // needed?
        return this
    }

    // edge pan

    onRightEdgePanBegin (aGesture) {
        // TODO: animate this until complete
        //console.log("onRightEdgePanBegin")
        //if(this.isSingleColumn()) {
        const column = this.selectedColumn()
        if (column) {
            column.moveRight()
        }
        //}
        aGesture.cancel()
    }


    // left screen edge pan

    canMoveLeft () {
        return this.activeColumnGroups().length > 1
    }

    onLeftEdgePanBegin (aGesture) {
        console.log("onScreenLeftEdgePanBegin")
        console.log("  this.activeColumnGroups().length = ", this.activeColumnGroups().length)

        if (this.canMoveLeft()) {
            this.previous()
        }
        aGesture.cancel()
    }

    // -------------------

    setupDefaultStyles () {
        this.setDefaultColumnStyles(BMViewStyles.clone())
        this.defaultColumnStyles().unselected().setBackgroundColor("white")
        this.defaultColumnStyles().selected().setBackgroundColor("white")

        this.setDefaultRowStyles(BMViewStyles.clone())
        this.defaultRowStyles().unselected().setColor("#aaa")
        this.defaultRowStyles().selected().setColor("white")
        return this
    }

    updateBackground () {
        const n = this.activeColumnGroups().length
        this.setBackgroundColor(this.bgColorForIndex(n + 1))
    }

    // --- resizing ---------------------------------

    onDocumentResize (event) {
        //this.debugLog(" onDocumentResize")
        this.fitColumns()
        if (this._selectedColumnGroup) {
            this.selectColumn(this._selectedColumnGroup.column())
        }
        return this
    }

    forceSingleColumnIfNarrow () {
        //const size = DocumentBody.zoomAdjustedSize()
        //const w = WebBrowserScreen.shared().orientedWidth()
        //const h = WebBrowserScreen.shared().orientedHeight()
        //console.log("WebBrowserScreen size = " + w + "x" + h)

        const size = WebBrowserScreen.shared().lesserOrientedSize()
        const w = size.width
        const h = size.height
        let r = 1

        if (w < 900 && WebBrowserWindow.shared().isOnMobile()) {
            //console.log("w = " , w)
            //console.log("((900 - w)/100) = ", ((900 - w)/100))
            r = 1 + ((900 - w) / 100) * 0.3
        }

        if (r > 3) {
            r = 3
        }
        //console.log("r = " + r)

        //console.log("lesserOrientedSize: " + w + "x" + h + " setZoomRatio(" + r + ")") 
        //DocumentBody.setZoomRatio(r) // turning this off to see if it fixes mobile tiny fonts

        const isSingle = ((w < h) && (w < 800)) || (w < 400)
        //console.log("isSingle = ", isSingle)
        this.setIsSingleColumn(isSingle) 

        // for debugging window resizing
        //WebBrowserWindow.shared().setTitle(size.width + " x " + size.height + " " + (isSingle ? "single" : "multi"))

        return this
    }

    // --- columns -------------------------------

    columnGroups () {
        return  this.middleView().subviews().select(sv => sv.isKindOf(BrowserColumnGroup) ) // TODO: is this still neeeded?
    }

    addColumnGroup (v) {
        return this.middleView().addSubview(v)
    }

    removeColumnGroup (cg) {
        //console.log(this.type() + " removeColumnGroup " + cg.typeId())
        if (!cg.isCached()) {
            cg.prepareToRetire()
        }
        if ( this.middleView().hasSubview(cg)) {
            this.middleView().removeSubview(cg)
        }
        return this
    }

    columns () {
        return this.columnGroups().map(cg => cg.column())
    }

    // --- column background colors ----------------------------

    bgColorForIndex (i) {
        let colors = this.bgColors()
        const rcolors = this.bgColors().reversed()
        rcolors.removeFirst()
        colors = colors.shallowCopy().appendItems(rcolors)

        const rgb = colors[i % colors.length]

        const s = "rgb(" + rgb.map((v) => { return Math.round(v * 255) }).join(", ") + ")"
        //console.log("bgColorForIndex = '" + s + "'")
        return s
    }

    setupColumnGroupColors () {
        let i = 0

        this.columnGroups().forEach((cg) => {
            if (cg.column().type() === "BrowserColumn") { // TODO: don't depend on type
                let bgColor = this.bgColorForIndex(i)

                /*
                if (cg.node()) {
                    let color = cg.node().nodeColumnBackgroundColor()
                    if (color) {
                        //console.log("found  nodeColumnBackgroundColor " + color + " for ", cg.node().typeId() + " " + cg.node().title())
                        bgColor = color
                    } else {
                        //console.log("no nodeColumnBackgroundColor for ", cg.node().typeId() + " " + cg.node().title())
                    }
                }
                */

                //cg.styles().selected().setBackgroundColor(bgColor)
                //cg.styles().unselected().setBackgroundColor(bgColor)
                //this.defaultColumnStyles().selected().applyToView(cg)
                cg.setBackgroundColor(bgColor)
                cg.column().setRowBackgroundColor(bgColor)
                cg.column().setRowSelectionColor(this.bgColorForIndex(i + 1))
            }
            i ++
        })

        return this
    }

    activeColumnGroups () {
        return this.columnGroups().select(cg => cg.node() !== null)
    }

    newBrowserColumnGroup () {
        const cg = BrowserColumnGroup.clone().setBrowser(this).colapse()
        //cg._cloneStack = new Error().stack
        return cg
    }

    setColumnGroupCount (count) {
        //this.log("setColumnGroupCount " + count)
        if (count === 0) {
            Error.showCurrentStack()
        }

        if (this.columnGroups().length === count) { // redundant?
            return this
        }

        /*
		// collapse excess columns
        for (let i = count; i < this.columnGroups().length - 1; i ++) {
            this.columnGroups().at(i).collpase()
        }
        */

        // remove any excess columns
        while (this.columnGroups().length > count) {
            this.removeColumnGroup(this.columnGroups().last())
        }

        //this.clearColumnsGroupsAfterIndex(count -1) // <<<<<<<<<<<< test

        // add columns as needed
        while (this.columnGroups().length < count) {
            const newCg = this.newBrowserColumnGroup()
            this.addColumnGroup(newCg)
        }

        //this.updateColumnPositions()
        this.setupColumnGroupColors()
        //this.log("this.columnGroups().length = " + this.columnGroups().length)
        //assert(this.columnGroups().length  === count)
        return this
    }

    /*
    useNewColumnGroupToReplaceColumnGroupAtIndex (index) {
        const cgs = this.columnGroups()
        const oldCg = cgs[index]
        const newCg = this.newBrowserColumnGroup()
        this.replaceSubviewWith(oldCg, newCg)
        return newCg
    }
    */

    clearColumnsGroupsAfterIndex (index) {
        const cgs = this.columnGroups()
        for (let i = index + 1; i < cgs.length; i++) {
            const cg = cgs.at(i)
            //this.useNewColumnGroupToReplaceColumnGroupAtIndex(i)
            if (!Type.isNull(cg.node())) {
                //console.log("BrowserView clearing column group ", i)
                const theCg = this.setColumnGroupAtIndexToNode(i, null)
                //theCg.syncFromNodeNow() // causes loop as the last column will clear columns after it?
            }
        }

        return this
    }

    clearColumnsGroupsAfter (selectedCg) {
        const cgs = this.columnGroups()
        const index = cgs.indexOf(selectedCg)
        if(index === -1) {
            console.warn(this.type() + " WARNING attempt to clearColumnsGroupsAfter " + selectedCg.debugTypeId() + " not in browser")
            this.show()
            return
        }
        
        this.clearColumnsGroupsAfterIndex(index)
    }

    // --- get selected column ---------------------------------------

    selectedColumnGroup () {
        // TODO: there's a reason for doing this *and* keeping _selectedColumnGroup,
        // but I don't recall what it is - take a look and document
        return this.columnGroups().detect(cg => cg.isSelected())
    }

    selectedColumn () {
        const cg = this.selectedColumnGroup()
        if (cg) {
            return cg.column()
        }
        return null
    }

    // --- select column ---------------------------------------

    selectFirstColumn () {
        this.selectColumn(this.columns().first())
        return this
    }

    updateSelectedColumnTo (selectedColumn) {
        const selectedColumnGroup = selectedColumn.columnGroup()
        this.columnGroups().forEach(cg => cg.setIsSelected(cg === selectedColumnGroup))
        this.syncToHashPath()
        return this
    }

    previous () {
        this.popLastActiveColumn()
        return this
    }

    popLastActiveColumn () {
        //console.log("popLastActiveColumn this.activeColumnGroups().length = ", this.activeColumnGroups().length)
        let n = this.activeColumnGroups().length - 1
        if (n < 0) { 
            n = 0
        }
        this.setColumnGroupCount(n) // TODO: collapse cg instead?
        this.fitColumns()
        this.syncToHashPath()
        return this
    }

    setColumnGroupAtIndexToNode (cgIndex, cgNode) {
        if (cgIndex === 0 && cgNode === null) {
            console.log("setColumnGroupAtIndexToNode to null?")
        }

        //console.log(this.type() + " setColumnGroupAtIndexToNode(" + cgIndex + ", " + (cgNode ? cgNode.title() : "null") + ")" )
        // if the existing columnGroup is for the same node, use it
        const oldCg = this.columnGroups()[cgIndex]

        if (oldCg) {
            if (oldCg.node() === cgNode) {
                return oldCg
            }

            if (cgNode === null) {
                oldCg.prepareToRetire()
                return null
            } else {
                // cgNode !== null

                if (oldCg.node() === null) {
                    oldCg.setNode(cgNode)
                    return oldCg
                }

                // otherwise, see if there's a cached column for this node
                const cachedCg = this.getCachedColumnGroupForNode(cgNode)
                if (cachedCg /*&& oldCg !== cachedCg*/) {
                    this.replaceColumnGroup(oldCg, cachedCg)
                    return cachedCg
                }  
                
                const newCg = this.newBrowserColumnGroup()
                this.replaceColumnGroup(oldCg, newCg)
                newCg.setNode(cgNode)
                return newCg
            }
        } else {
            const newCg = this.newBrowserColumnGroup()
            newCg.setNode(cgNode)
            this.addColumnGroup(newCg)
            return newCg
        }
    }

    replaceColumnGroup (oldCg, newCg) {
        this.middleView().replaceSubviewWith(oldCg, newCg)
        newCg.copySetupFrom(oldCg)

        // If we won't use it again (if it's not in cache), 
        // retire old columnGroup so it stops watching any nodes, etc
        if (!oldCg.isCached()) {
            oldCg.setNode(null)
            oldCg.prepareToRetire()
        }

        return this
    }

    selectColumn (selectedColumn) {

        /*
        if (this.selectedColumn() === selectedColumn) {
            return this
        }
        */

        const selectedColumnGroup = selectedColumn.columnGroup()
        this._selectedColumnGroup = selectedColumnGroup

        const index = this.columnGroups().indexOf(selectedColumn.columnGroup())

        //this.debugLog(" selectColumn " + selectedColumn.node().type() + " index " + index)

        if (this.isSingleColumn()) {
            this.setColumnGroupCount(index + 2)
        } else {
            this.setColumnGroupCount(index + 3)
        }

        //console.log("selectColumn index: " + index + " cg " + this.columnGroups().length)

        let nextCg = this.columnGroups().itemAfter(selectedColumnGroup)

        if (nextCg) {
            const selectedRow = selectedColumnGroup.column().selectedRow()

            selectedColumnGroup.matchNodeMinWidth() // testing

            if (selectedRow) {
                const nextNode = selectedRow.nodeRowLink() // returns receiver by default
                //console.log("selectedRow title:  ", selectedRow.node().title())

                if (nextNode) {
                    //console.log("nextNode:  ", nextNode.title())
                    
                    if (nextCg.node() !== nextNode) { // need a way to use columnGroupCache
                        nextCg = this.setColumnGroupAtIndexToNode(nextCg.index(), nextNode)
                        nextCg.setNode(nextNode)
                    } 
                                        
                    this.clearColumnsGroupsAfter(nextCg)
                    
                } else {
                    this.clearColumnsGroupsAfter(selectedColumnGroup)
                }
            } else {
                this.clearColumnsGroupsAfter(selectedColumnGroup)
            }
        }

        this.setupColumnGroupColors()
        this.fitColumns()
        this.updateSelectedColumnTo(selectedColumn)

        return this
    }

    didClickRow (row) {
        console.log("Browser didClickRow ", row)
        // columns intercept this, so we don't get this message anymore
        return true
    }

    syncFromNode () {
        //this.log("syncFromNode")
        this.setColumnGroupAtIndexToNode(0, this.node())
        const columnGroups = this.columnGroups()

        //console.log(this.type() + ".syncFromNode()")

        columnGroups.forEach((cg) => {
            cg.syncFromNodeNow()
        })

        this.setupColumnGroupColors()
        this.fitColumns()
        this.setupHeaders()
        return this
    }

    setupHeaders () {
        if (this.shouldShowColumnHeaders()) {
            this.defaultHeader().unhideDisplay()
        } else {
            this.defaultHeader().hideDisplay()
        }
        return this
    }

    clipToColumnGroup (cg) {
        const index = this.columnGroups().indexOf(cg)
        this.setColumnGroupCount(index + 1)
        return this
    }

    // --- width --------------------------

    widthOfColumnGroups () {
        return this.columnGroups().sum(cg => cg.minWidthPx())
    }

    // --- collapsing column groups -----

    lastActiveColumnGroup () {
        return this.columnGroups().reversed().detect(cg => cg.column().node() !== null)
    }

    // --- fitting columns in browser ---------------------------------------------

    /*
    forceSingleColumnIfNodeFillsWindow () {
        const scg = this.selectedColumnGroup()
        if (scg) {
            const node = scg.node()
            if (node && lastActiveCg.nodeFillsRemainingWidth()) {
                this.setIsSingleColumn(true)
                return this
            }
        }
        return this
    }
    */

    fitColumns () {
        //this.debugLog(".fitColumns()")
        this.forceSingleColumnIfNarrow()
       // this.forceSingleColumnIfNodeFillsWindow()

        const lastActiveCg = this.lastActiveColumnGroup()

        //console.log("this.isSingleColumn(): ", this.isSingleColumn())
        const fillsWindow = lastActiveCg && lastActiveCg.node().nodeFillsWindow()
        if (lastActiveCg) {
            //console.log("lastActiveCg title: " + lastActiveCg.node().title() + " fillsWindow: " + fillsWindow)
        }
        if (lastActiveCg && (this.isSingleColumn() || fillsWindow)) {
            this.fitForSingleColumn()
        } else {
            this.fitForMultiColumn()
        }

        this.setupHeaders() // TODO: not about fitting, move this to a better location?

        return this
    }

    updateBackArrow () {
        this.columnGroups().forEach(cg => cg.updateBackArrow())
        return this
    }

    makeLastActiveColumnFillRemainingSpace () {
        // TODO: merge with this code in multi column fit
        const lastActiveCg = this.lastActiveColumnGroup()
        const fillWidth = (this.browserWidth() - this.left()) - this.widthOfUncollapsedColumnsSansLastActive()

        if (lastActiveCg) {
            lastActiveCg.setFlexGrow(1)
            lastActiveCg.setFlexShrink(1)
            lastActiveCg.setFlexBasis(fillWidth)
            lastActiveCg.setMinAndMaxWidth(fillWidth)
        }
        return this
    }

    fitForSingleColumn () {
        const lastActiveCg = this.lastActiveColumnGroup()

        this.columnGroups().forEach((cg) => {
            if (cg !== lastActiveCg) {
                cg.setFlexGrow(0)
                cg.setIsCollapsed(true)
                cg.setMinAndMaxWidth(0)
            }
        })

        lastActiveCg.setIsCollapsed(false)
        this.makeLastActiveColumnFillRemainingSpace()
        this.updateBackArrow()
        //console.log("fitForSingleColumn")
        this.setShouldShowTitles(true)
        //console.log("lastActiveCg.node().title() = ", lastActiveCg.node().title(), " width ", lastActiveCg.minWidthPx(), " ", lastActiveCg.maxWidthPx())

        return this
    }

    uncollapsedColumns () {
        return this.activeColumnGroups().select(cg => !cg.isCollapsed())
    }

    widthOfUncollapsedColumns () {
        const sum = this.uncollapsedColumns().sum(cg => cg.targetWidth())

        /*
        console.log("---")
        this.uncollapsedColumns().forEach((cg) => {
            if (cg.node()) {
                console.log("    " + cg.node().title() + " width " + cg.targetWidth())
            }
        })
        console.log("    widthOfUncollapsedColumns: " + sum)
        console.log("---")
        */

        return sum
    }

    widthOfUncollapsedColumnsSansLastActive () {
        const lastActiveCg = this.lastActiveColumnGroup()
        const cgs = this.uncollapsedColumns()
        cgs.remove(lastActiveCg)
        return cgs.sum(cg => cg.targetWidth())
    }

    setShouldShowTitles (aBool) {
        this.columnGroups().forEach(cg => cg.headerView().setShouldShowTitle(aBool) )
        return this
    }

    columnDescription () {
        let d = this.columnGroups().map((cg) => {
            if (cg.isCollapsed()) { return "" }
            let s = cg.name()
            if (cg.node() === null) { s += " [null node] " }
            //s += " " + (cg.isCollapsed() ? "collapsed" : "uncollapsed")
            s += " " + this.pxNumberToString(cg.targetWidth())
            return s
        }).join(" / ")

        d += " [" + this.widthOfUncollapsedColumns() + " of " + this.browserWidth() + "]"
        return d
    }


    fitForMultiColumn () {
        this.updateBackground()
        this.uncollapseAllColumns()
        //this.uncollapsedColumns().forEach(column => column.fitToTargetWidth())
        this.collapseLeftColumnsUntilRightColumnsFit()
        this.expandLastColumnIfNeeded()
        this.updateBackArrow()
        this.setShouldShowTitles(false) // only show titles in single column mode
        //console.log(this.columnDescription())

        this.uncollapsedColumns().forEach(column => column.fitToTargetWidth())
        return this
    }

    uncollapseAllColumns () {
        this.columnGroups().forEach((cg) => {
            cg.setIsCollapsed(false)
            //console.log(cg.name() + " targetWidth: " + cg.targetWidth())
        })
        return this
    }

    collapseLeftColumnsUntilRightColumnsFit () {
        const columnGroups = this.columnGroups()

        const lastActiveCg = this.lastActiveColumnGroup()
        const browserWidth = this.browserWidth()

        // collapse columns from left to right until they all fit
        for (let i = 0; i < columnGroups.length; i ++) {
            const cg = columnGroups[i]
            const usedWidth = this.widthOfUncollapsedColumns()
            let shouldCollapse = (usedWidth > browserWidth) && (cg !== lastActiveCg)
            shouldCollapse = shouldCollapse || (cg.node() === null)
            //console.log(cg.name() + " shouldCollapse:" + shouldCollapse + " usedWidth: " + usedWidth + " browserWidth:" + this.browserWidth())
            cg.setIsCollapsed(shouldCollapse)
            if (!shouldCollapse) {
                break;
            }
        }

        return this
    }

    expandLastColumnIfNeeded () {
        const lastActiveCg = this.lastActiveColumnGroup()

        if (lastActiveCg) {
            let fillWidth = (this.browserWidth() - this.left()) - this.widthOfUncollapsedColumnsSansLastActive()
            if (lastActiveCg.targetWidth() * 2 < fillWidth && lastActiveCg.targetWidth() < 500) {
                fillWidth = lastActiveCg.targetWidth()
            }
            
            //console.log("fillWidth = ", fillWidth)
            lastActiveCg.setFlexGrow(1)
            lastActiveCg.setFlexShrink(1)
            lastActiveCg.setFlexBasis(fillWidth)
            lastActiveCg.setMinAndMaxWidth(fillWidth)
        }
    }

    // -----------------------------------------------

    browserWidth () {
        return this.clientWidth()
    }

    windowWidth () {
        return App.shared().mainWindow().width()
    }

    // --- column headers -------------------------

    shouldShowColumnHeaders () {
        return this.columnGroups().detect(cg => cg.headerView().isUsed()) !== null
    }

    // --- node paths -----------------------------

    selectNode (aNode) {
        //console.log("selectNode " + aNode.nodePath())
        if (!aNode) {
            console.warn(this.type() + " selectNode called with null argument")
            Error.showCurrentStack()
            return this
        }
        this.selectNodePath(aNode.nodePath())
        return this
    }

    selectNodePath (nodePathArray) {
        //this.debugLog(".selectNodePath(" + nodePathArray.map((node) => { return node.title() }).join("/")  + ")")
        //this.debugLog(".selectNodePath() current path: " + this.nodePathString())
        this.setColumnGroupCount(1)

        let column = this.columns().first()

        if (nodePathArray.first() === column.node()) {
            //console.log("selectNodePath removeFirst column " + column.node().title())
            nodePathArray.removeFirst()
        }

        //this.debugLog(".selectNodePath() selecting path " + nodePathArray.map((node) => { return node.title() }).join("/") )

        nodePathArray.forEach((node) => {
            //console.log("clicking node " + (node ? node.title() : null))
            if (node) {
                column.selectRowWithNode(node)

                //column.didClickRowWithNode(node)

                //column.selectNextColumn()
                this.selectColumn(column)
                column = column.nextColumn()
            }
        })

    }

    nodeStringPath () {
    }

    nodePathArray () {
        return this.activeColumnGroups().map(cg => cg.node())
    }

    lastNode () {
        const cg = this.lastActiveColumnGroup()
        if (cg) {
            return cg.node()
        }
        return null
    }

    nodePath () {
        const lastNode = this.lastNode();
        if (lastNode) {
            return lastNode.nodePath();
        }
        
        return [];
    }

    nodePathString () {
        const lastNode = this.lastNode();
        if (lastNode) {
            return lastNode.nodePathString(); //.map((node) => { return node.title() }).join("/")
        }
        return ""
    }

    setNodePathComponents (nodePath) {
        this.setWatchForNodeUpdates(true);

        const nodePathArray = this.node().nodePathArrayForPathComponents(nodePath.slice(1))
        this.selectNodePath(nodePathArray)

        /*
        const lastNode = this.node().nodeAtSubpath(nodePath.slice(1));
        if (lastNode) {
            this.selectNode(lastNode);
        }
        */
        return this;
    }

    setNodePathString (pathString) {
        return this.setNodePathComponents(pathString.split("/"));
    }

    // --- hash paths ------------------------------------- 

    performHashCommandIfPresent () {
        const hash = WebBrowserWindow.shared().urlHash()
        //const commandString = hash.after(";")
        const command = HashCommand.clone().parseCommandString(hash)
        const node = this.lastNode()
        command.setTarget(node).send()
        return this
    }

    syncFromHashPath () {
        const hash = WebBrowserWindow.shared().urlHash()
        //console.log(this.type() + ".syncFromHashPath() --- [" + hash + "]")
        let j = ""

        if (hash === "") {
            this.setNodePathComponents([""])
            return this
        }
        //console.log("hash = " + typeof(hash) + " " + hash)
        try {
            j = JSON.parse(hash)
        } catch(e) {
            console.warn("can't parse json in URL hash")
            return this
        }

        if (j) {
            const nodePath = j.path
            this.setNodePathComponents(nodePath)

            const method = j.method
            if (method) {
                let args = j.args ? j.args : []
                let target = this.lastNode()
                if (target) {
                    target.doHashCommand()
                }
            }
        }
        //console.log("hash: " + hash + "")
        /*
        let nodePathString = hash.before(";")
        this.setNodePathString(hash)
        this.performHashCommandIfPresent()
        */
        
        return this
    }

    syncToHashPath () {
        const hash = JSON.stringify({ path: this.nodePathArray().map(n => n.title()) });
        WebBrowserWindow.shared().setUrlHash(hash)
        return this
    }

    didUpdateNode () {
        if (this.watchForNodeUpdates()) {
            this.syncToHashPath();
        }
    }

    show () {
        console.log(this.type() + ":")
        const lines = this.columnGroups().map((cg => {
            return "    " + cg.debugTypeId() 
        }))
        console.log(lines.join("\n"))
    }

    debugTypeId () {
        const nodeName = this.node() ? this.node().debugTypeId() : "null"
        return this.typeId() + " for " +  nodeName
    }
    
}.initThisClass()
