"use strict"

/*

    ColumnGroupFooter

*/

window.ColumnGroupFooter = class ColumnGroupFooter extends NodeView {
    
    initPrototype () {
        this.newSlot("leftActionsView", null)
        this.newSlot("textView", null)
        this.newSlot("rightActionsView", null)
    }

    init () {
        super.init()
        this.setPosition("absolute")
        this.setBottomPx(0)
        this.setLeftPx(0)
        this.setMinHeight("40px")
        this.setMaxHeight("40px")
        this.setHeight("auto")
        this.setWidth("100%")
        this.setZIndex(3)
        this.setBackgroundColor("#dbdbdb")
        this.setTextAlign("center")
        this.setBorderTop("1px solid rgba(0,0,0,.05)")
        this.setOverflow("hidden")

        this.setLeftActionsView(DomView.clone().setDivClassName("ColumnGroupFooterLeftActionsView"))
		
        const textView = TextField.clone().setDivClassName("ColumnGroupFooterTextView") //.setUserSelect("none")
        this.setTextView(textView)
	    this.textView().setIsEditable(true).setDoesClearOnReturn(true).setDoesHoldFocusOnReturn(true)
						
        this.setRightActionsView(DomView.clone().setDivClassName("ColumnGroupFooterRightActionsView"))
		
        this.setZIndex(2)
        return this
    }
    
    columnGroup () {
        return this.parentView()
    }
	
    browser () {
        return this.columnGroup().browser()
    }

    setNode (aNode) {
        if (aNode === this._node) {
            //return
        }
        
        super.setNode(aNode)
        this.updateTextView()
    }

    didInput (aView) {
        this.setInput(aView.innerHTML())
        return this
    }
    
    setInput (s) {
        //console.trace(this.typeId() + ".setInput('" + s + "')")
        
        const n = this.node()
        if (n) {
            const m = n.nodeInputFieldMethod()
            if (m) {
                n[m].apply(n, [s])
            }
        }
        
        // TODO: hack - need a better way to ensure this happens after node does syncToView
        // maybe, scrollToBottomOnAdd?
        /*
        setTimeout(() => {
            this.columnGroup().scrollView().scrollToBottom()
        }, 10) 
        */
        
        return this
    }
    
    updateTextView () {
        //console.log("this.shouldShowTextView() = ", this.shouldShowTextView())
        if (this.shouldShowTextView()) {
            if (!this.hasSubview(this.textView())) {
		        this.addSubview(this.textView())
	        }
        } else {
            if (this.hasSubview(this.textView())) {
		        this.removeSubview(this.textView())
	        }
        }
        return this
    }
    
    shouldShowTextView () {
        return this.node() && (this.node().nodeInputFieldMethod() !== null)
    }
    
    syncFromNode () {
        const node = this.node()
        this.removeAllSubviews()
        
        if (node) {
            this.updateTextView()
        } 
        return this
    }
    
}.initThisClass()


