"use strict"

/*
    DomView

    Base view class. Wraps a dom element.

    TODO: add dict[propertyName] -> validValueSet and check css values when set
*/

window.DomView = class DomView extends ProtoClass {
    
    initPrototype () {
        this.newSlot("divClassName", "")
        this.newSlot("elementType", "div")
        this.newSlot("element", null)

        // parent view and subviews

        this.newSlot("parentView", null)
        this.newSlot("subviews", null)

        // target / action

        this.newSlot("target", null)
        this.newSlot("action", null)
        this.newSlot("showsHaloWhenEditable", false)
        this.newSlot("tabCount", 0)
        this.newSlot("validColor", null)
        this.newSlot("invalidColor", null)

        // key views

        this.newSlot("interceptsTab", true)
        this.newSlot("nextKeyView", null)
        this.newSlot("canMakeKey", true)
        this.newSlot("unfocusOnEnterKey", false)

        // event handling

        this.newSlot("isRegisteredForVisibility", false)
        this.newSlot("intersectionObserver", null)
        this.newSlot("acceptsFirstResponder", false)
        this.newSlot("gestureRecognizers", null)
        this.newSlot("eventListenersDict", null)
        //this.newSlot("activeTimeoutIdSet", null)
        this.newSlot("defaultTapGesture", null)
        this.newSlot("defaultDoubleTapGesture", null)
        this.newSlot("defaultPanGesture", null)

        // extras
    
        this.newSlot("hiddenDisplayValue", undefined)
        this.newSlot("hiddenMinHeight", undefined)
        this.newSlot("hiddenMaxHeight", undefined)
        this.newSlot("hiddenTransitionValue", undefined)
    }

    init () {
        super.init()
        this.setSubviews([])
        this.setupElement()
        this.setEventListenersDict({})
        return this
    }

    // retiring

    prepareToRetire () {
        super.prepareToRetire()
        
        this.blur()
        this.removeAllGestureRecognizers()
        this.removeAllListeners()
        this.cancelAllTimeouts()

        this.setIsRegisteredForVisibility(false) // this one isn't a listener
        
        const e = this.element()
        if (e) {
            e._domView = null
        }

        this.retireSubviewTree()
        if (this.parentView()) {
            this.removeFromParentView()
        }
        
        return this
    }

    removeAllListeners () {
        this.eventListenersDict().ownForEachKV( (k, v) => { v.setIsListening(false) } )
        this.setEventListenersDict({})
        return this
    }

    retireSubviewTree () {
        this.subviews().forEach(sv => {
            sv.prepareToRetire()
            sv.retireSubviewTree()
        })
        //this.removeAllSubviews()
    }

    /*
        timeouts 
        
        Sometimes we can't use the SyncScheduler as we have to make sure 
        something happens *after* the current event loop ends (and control is returned to the browser),
        but scheduler runs while still in (but at the end of) the current event.
        Also, we sometimes need timeout delays.

    */

    activeTimeoutIdSet () {
        if (Type.isNullOrUndefined(this._activeTimeoutIdSet)) {
            Object.defineSlot(this, "_activeTimeoutIdSet", new Set())
        }
        return this._activeTimeoutIdSet
    }

    addTimeout (aFunc, msDelay) {
        const tids = this.activeTimeoutIdSet()
        const tidInfo = {}
        const tid = setTimeout(() => { 
            tids.delete(tidInfo.tid) 
            aFunc() 
        }, msDelay)
        tidInfo.tid = tid
        this.activeTimeoutIdSet().add(tid)
        return tid
    }

    cancelTimeoutId (tid) {
        const tids = this.activeTimeoutIdSet()
        tids.delete(tid)
        clearTimeout(tid)
        return this
    }

    cancelAllTimeouts () {
        const tids = this.activeTimeoutIdSet()
        tids.forEach(tid => clearTimeout(tid))
        tids.clear()
        return this
    }

    // gestures

    gestureRecognizers () {
        if (this._gestureRecognizers == null) {
            this._gestureRecognizers = []
        }
        return this._gestureRecognizers
    }

    // element

    setDivId (aString) {
        this.element().id = aString
        return this
    }

    setElement (e) {
        this._element = e
        this.addTimeout(() => { this.setIsRegisteredForFocus(true); }, 0)
        e._domView = this // try to avoid depending on this as much as possible - keep refs to divViews, not elements
        return this
    }

    createElement () {
        const e = document.createElement(this.elementType())
        return e
    }

    setupElement () {
        const e = this.createElement()
        this.setElement(e)
        this.setDivId(this.typeId())
        this.setupDivClassName()
        return this
    }

    escapedElementId () {
        const id = this.element().id
        const escapedId = id.replace(/[^a-z|\d]/gi, '\\$&');
        return escapedId
    }

/*
    setupDivClassNameOld () {
        const ancestorNames = this.thisClass().ancestorClassesIncludingSelf().map(obj => obj.type())
        const divName = ancestorNames.join(" ").strip()
        this.setDivClassName(divName)
        return this
    }

    insertDivClassName (aName) {
        const names = this.divClassName().split(" ")
        names.removeOccurancesOf(aName) // avoid duplicates
        names.atInsert(0, aName)
        this.setDivClassNames(names)
        return this
    }

    removeDivClassName (aName) {
        const names = this.divClassName().split(" ")
        names.removeOccurancesOf(aName)
        this.setDivClassNames(names)
        return this
    }
*/


    setupDivClassName () {
        const e = this.element()
        const ancestorNames = this.thisClass().ancestorClassesIncludingSelf().map(obj => obj.type())
        ancestorNames.forEach(name => e.classList.add(name))
        return this
    }

    insertDivClassName (aName) {
        const e = this.element()
        e.classList.add(aName)
        return this
    }

    removeDivClassName (aName) {
        const e = this.element()
        e.classList.remove(aName)
        return this
    }

    setDivClassNames (names) {
        this.setDivClassName(names.join(" "))
        return this
    }

    /*    
    applyCSS (ruleName) {
        if (ruleName == null) { 
            ruleName = this.divClassName()
        }
        CSS.ruleAt(ruleName).applyToElement(this.element())
        return this
    }
    */

    stylesheetWithClassName (className) {
        for (let i = 0; i < document.styleSheets.length; i++) {
            const stylesheet = document.styleSheets[i]

            if ("cssRules" in stylesheet) {
                try {
                    const rules = stylesheet.cssRules
                    for (let j = 0; j < rules.length; j++) {
                        const rule = rules[j]
                        const ruleClassName = rule.selectorText.split(" ")[0]
                        console.log("rule.selectorText: ", rule.selectorText)
                        if (ruleClassName === className) {
                            return stylesheet
                        }
                    }
                } catch (e) {
                    //console.log("couldn't add CSS rule: " + rule + "")
                }
            }
        }
        return null
    }

    setCssDict (aDict) {
        Reflect.ownKeys(aDict).forEach((k) => {
            const v = aDict[k]
            this.setCssAttribute(k, v)
        })
        return this
    }

    setCssAttribute (key, newValue, didChangeCallbackFunc) {
        assert(Type.isString(key))

        const style = this.cssStyle()
        const doesSanityCheck = false
        const oldValue = style[key]

        if (String(oldValue) !== String(newValue)) {
            if (newValue == null) {
                //console.log("deleting css key ", key)
                //delete style[key]
                style.removeProperty(key)
                //console.log(this.cssStyle()[key])
            } else {
                style[key] = newValue

                if (doesSanityCheck) {
                    // sanity check the result
                    // but ignore these keys as they have equivalent functional values 
                    // that can have different string values
                    const ignoredKeys = { 
                        "background-position": true,  
                        "transition": true, 
                        "color": true , 
                        "background-color": true,
                        "box-shadow": true,
                        "border-bottom": true,
                        "transform-origin": true,
                        "outline": true,
                        "border": true,
                        "border-color": true
                    }

                    const resultValue = style[key]
                    if (!(key in ignoredKeys) && resultValue != newValue) {
                        let msg = "DomView: style['" + key + "'] not set to expected value\n";
                        msg += "     set: <" + typeof(newValue) + "> '" + newValue + "'\n";
                        msg += "     got: <" + typeof(resultValue) + "> '" + resultValue + "'\n";
                        console.warn(msg)
                        //throw new Error(msg) 
                    }
                }
            }

            if (didChangeCallbackFunc) {
                didChangeCallbackFunc()
            }
        }

        return this
    }

    getCssAttribute (key, errorCheck) {
        if (errorCheck) {
            throw new Error("getCssAttribute called with 2 arguments")
        }
        return this.cssStyle()[key]
    }

    // css px attributes

    setPxCssAttribute (name, value, didChangeCallbackFunc) {
        this.setCssAttribute(name, this.pxNumberToString(value), didChangeCallbackFunc)
        return this
    }

    getPxCssAttribute (name, errorCheck) {
        const s = this.getCssAttribute(name, errorCheck)
        if (s.length) {
            return this.pxStringToNumber(s)
        }
        return 0
    }

    // computed style

    getComputedCssAttribute (name, errorCheck) {
        return window.getComputedStyle(this.element()).getPropertyValue(name)
    }

    getComputedPxCssAttribute (name, errorCheck) {
        const s = this.getComputedCssAttribute(name, errorCheck)
        if (s.length) {
            return this.pxStringToNumber(s)
        }
        return 0
    }

    // --- css properties ---

    setPosition (s) {
        this.setCssAttribute("position", s)
        return this
    }

    position () {
        return this.getCssAttribute("position")
    }

    // pointer events

    setPointerEvents (s) {
        assert([null, 
            "auto", "none", "visiblePainted", 
            "visibleFill", "visibleStroke", "visible", 
            "painted", "fill", "stroke", "all", 
            "inherit", "initial", "unset"].contains(v))
        return this.setCssAttribute("pointer-events", s)
    }

    pointerEvents () {
        return this.getCssAttribute("pointer-events")
    }

    // transform

    setTextTransform (v) {
        assert([null, "none", "capitalize", "uppercase", "lowercase", "initial", "inherit"].contains(v))
        this.setCssAttribute("text-transform", v)
        return this
    }

    textTransform () {
        return this.getCssAttribute("text-transform")
    }

    // word wrap

    setWordWrap(v) {
        assert([null, "normal", "break-word", "initial", "inherit"].contains(v))
        this.setCssAttribute("word-wrap", v)
        return this
    }

    wordWrap () {
        return this.getCssAttribute("word-wrap")
    }

    // zoom

    setZoom (s) {
        this.setCssAttribute("zoom", s)
        return this
    }

    zoom () {
        return this.getCssAttribute("zoom")
    }

    zoomRatio () {
        return Number(this.zoom().before("%")) / 100
    }

    setZoomRatio (r) {
        //console.log("setZoomRatio: ", r)
        this.setZoomPercentage(r * 100)
        return this
    }

    setZoomPercentage (aNumber) {
        assert(Type.isNumber(aNumber))
        this.setCssAttribute("zoom", aNumber + "%")
        return this
    }

    // font family

    setFontFamily (s) {
        assert(Type.isString(s) || Type.isNull(s))
        this.setCssAttribute("font-family", s)
        return this
    }

    fontFamily () {
        return this.getCssAttribute("font-family")
    }

    // font weight

    fontWeightValidatorFunction (v) {
       return (v) => { Type.isNumber(v) || [null, "normal", "bold", "bolder", "lighter", "initial", "inherit"].contains(v) }
    }

    setFontWeight (v) {
        //assert(this.fontWeightValidatorFunction()(v))
        this.setCssAttribute("font-weight", v)
        return this
    }

    fontWeight () {
        return this.getCssAttribute("font-weight")
    }

    // font size

    setFontSizeAndLineHeight (s) {
        this.setFontSize(s)
        this.setLineHeight(s)
        return this
    }

    setFontSize (s) {
        this.setCssAttribute("font-size", s)
        return this
    }

    fontSize () {
        return this.getCssAttribute("font-size")
    }

    computedFontSize () {
        return this.getComputedCssAttribute("font-size")
    }

    // px font size

    setPxFontSize (s) {
        this.setPxCssAttribute("font-size", s)
        return this
    }

    pxFontSize () {
        return this.getPxCssAttribute("font-size")
    }

    computedPxFontSize () {
        return this.getComputedPxCssAttribute("font-size")
    }

    // text-shadow

    setTextShadow (s) {
        this.setCssAttribute("text-shadow", s)
        return this
    }

    textShadow () {
        return this.getCssAttribute("text-shadow")
    }

    // ---

    // letter spacing

    setLetterSpacing (s) {
        this.setCssAttribute("letter-spacing", s)
        return this
    }

    letterSpacing () {
        return this.getCssAttribute("letter-spacing")
    }

    computedLetterSpacing () {
        return this.getComputedCssAttribute("letter-spacing")
    }

    // margin

    setMarginString (s) {
        this.setCssAttribute("margin", s)
        return this
    }

    // margin

    setMargin (s) {
        this.setCssAttribute("margin", s)

        this.setMarginTop(null)
        this.setMarginBottom(null)
        this.setMarginLeft(null)
        this.setMarginRight(null)

        return this
    }

    margin () {
        return this.getCssAttribute("margin")
    }

    // margin px

    setMarginPx (s) {
        this.setPxCssAttribute("margin", s)

        this.setMarginTop(null)
        this.setMarginBottom(null)
        this.setMarginLeft(null)
        this.setMarginRight(null)

        return this
    }

    marginPx () {
        return this.getPxCssAttribute("margin")
    }

    // margin top

    setMarginTop (m) {
        if (Type.isNumber(m)) {
            this.setPxCssAttribute("margin-top", m)
        } else {
            this.setCssAttribute("margin-top", m)
        }
        return this
    }

    // margin bottom

    setMarginBottom (m) {
        if (Type.isNumber(m)) {
            this.setPxCssAttribute("margin-bottom", m)
        } else {
            this.setCssAttribute("margin-bottom", m)
        }
        return this
    }

    // margin left

    setMarginLeft (m) {
        if (Type.isNumber(m)) {
            this.setPxCssAttribute("margin-left", m)
        } else {
            this.setCssAttribute("margin-left", m)
        }
        return this
    }

    // margin right

    setMarginRight (m) {
        this.setCssAttribute("margin-right", m)
        return this
    }

    marginRight () {
        return this.getCssAttribute("margin-right")
    }

    // margin right px

    setMarginRightPx (m) {
        this.setPxCssAttribute("margin-right", m)
        return this
    }

    marginRightPx () {
        return this.getPxCssAttribute("margin-right")
    }

    // padding

    setPadding (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setPaddingTop(null)
        this.setPaddingBottom(null)
        this.setPaddingLeft(null)
        this.setPaddingRight(null)
        this.setCssAttribute("padding", v)
        return this
    }
    
    padding () {
        return this.getCssAttribute("padding")
    }

    // top

    setPaddingTop (v) {
        assert(Type.isString(v) || Type.isNull(v))
        this.setCssAttribute("padding-top", v)
        return this
    }

    paddingTop () {
        return this.getCssAttribute("padding-top")
    }
    // bottom

    setPaddingBottom (v) {
        assert(Type.isString(v) || Type.isNull(v))
        this.setCssAttribute("padding-bottom", v)
        return this
    }

    paddingBottom () {
        return this.getCssAttribute("padding-bottom")
    }

    // left

    setPaddingLeft (v) {
        assert(Type.isString(v) || Type.isNull(v))
        this.setCssAttribute("padding-left", v)
        return this
    }

    paddingLeft () {
        return this.getCssAttribute("padding-left")
    }

    // right
    
    setPaddingRight (v) {
        assert(Type.isString(v) || Type.isNull(v))
        this.setCssAttribute("padding-right", v)
        return this
    }

    paddingRight () {
        return this.getCssAttribute("padding-right")
    }

    // padding px

    setPaddingPx (aNumber) {
        this.setPxCssAttribute("padding", aNumber)
        return this
    }

    paddingPx () {
        return this.getPxCssAttribute("padding")
    }

    // padding right px

    setPaddingRightPx (aNumber) {
        this.setPxCssAttribute("padding-right", aNumber)
        return this
    }

    paddingRightPx () {
        return this.getPxCssAttribute("padding-right")
    }

    // padding left px

    setPaddingLeftPx (aNumber) {
        this.setPxCssAttribute("padding-left", aNumber)
        return this
    }

    paddingLeftPx () {
        return this.getPxCssAttribute("padding-left")
    }

    // padding top px

    setPaddingTopPx (aNumber) {
        this.setPxCssAttribute("padding-top", aNumber)
        return this
    }

    paddingTopPx () {
        return this.getPxCssAttribute("padding-top")
    }

    // padding bottom px

    setPaddingBottomPx (aNumber) {
        this.setPxCssAttribute("padding-bottom", aNumber)
        return this
    }

    paddingBottomPx () {
        return this.getPxCssAttribute("padding-bottom")
    }

    // background color

    setBackgroundColor (v) {
        this.setCssAttribute("background-color", v)
        return this
    }

    backgroundColor () {
        return this.getCssAttribute("background-color")
    }

    computedBackgroundColor () {
        return this.getComputedCssAttribute("background-color")
    }

    // background image

    setBackgroundImage (v) {
        this.setCssAttribute("background-image", v)
        return this
    }

    backgroundImage () {
        return this.getCssAttribute("background-image")
    }

    setBackgroundImageUrlPath (path) {
        this.setBackgroundImage("url(\"" + path + "\")")
        return this
    }

    // background size

    setBackgroundSizeWH (x, y) {
        this.setCssAttribute("background-size", x + "px " + y + "px")
        return this
    }

    setBackgroundSize (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setCssAttribute("background-size", v)
        return this
    }

    makeBackgroundCover () {
        this.setBackgroundSize("cover")
        return this
    }

    makeBackgroundContain () {
        this.setBackgroundSize("contain")
        return this
    }

    // background repeat

    makeBackgroundNoRepeat () {
        this.setBackgroundRepeat("no-repeat")
        return this
    }

    setBackgroundRepeat (s) {
        assert(Type.isString(s))
        this.setCssAttribute("background-repeat", s)
        return this
    }

    backgroundRepeat () {
        return this.getCssAttribute("background-repeat")
    }

    // background position

    makeBackgroundCentered () {
        this.setBackgroundPosition("center")
        return this
    }

    setBackgroundPosition (s) {
        this.setCssAttribute("background-position", s)
        return this
    }

    backgroundPosition () {
        return this.getCssAttribute("background-position")
    }

    // icons - TODO: find a better place for this

    pathForIconName (aName) {
        const pathSeparator = "/"
        return ["resources", "icons", aName + ".svg"].join(pathSeparator)
    }

    // transition

    setTransition (s) {
        this.setCssAttribute("transition", s)

        if (this._transitions) {
            this.transitions().syncFromDomView()
        }

        return this
    }

    transition () {
        return this.getCssAttribute("transition")
    }

    // helper for hide/unhide transition

    isTransitionHidden () {
        return !Type.isNullOrUndefined(this.hiddenTransitionValue())
    }

    hideTransition () {
        if (!this.isTransitionHidden()) {
            this.setHiddenTransitionValue(this.transition())
            this.setTransition("all 0s")
            this.subviews().forEach(sv => sv.hideTransition())
        }
        return this
    }

    unhideTransition () {
        if (this.isTransitionHidden()) {
            this.setTransition(this.hiddenTransitionValue())
            this.setHiddenTransitionValue(null)
            this.subviews().forEach(sv => sv.unhideTransition())
        } else {
            this.setTransition(null)
        }
        return this
    }

    // hide/unhide transition

    /*
    hideTransition () {
        if (!Type.isNull(this.transition())) {
            this.setHiddenTransitionValue(this.transition())
            this.setTransition(null)
            this.subviews().forEach(sv => sv.hideTransition())
        }
        return this
    }

    unhideTransition () {
        if (Type.isNull(this.transition())) {
            if (this.hiddenTransitionValue()) {
                this.setTransition(this.hiddenTransitionValue())
                this.setHiddenTransitionValue(null)
                this.subviews().forEach(sv => sv.unhideTransition())
            }
        }
        return this
    }
    */

    // transitions

    transitions () {
        if (this._transitions == null) {
            this._transitions = DomTransitions.clone().setDomView(this).syncFromDomView()
        }
        return this._transitions
    }

    // transforms

    setTransform (s) {
        this.setCssAttribute("transform", s)
        return this
    }

    setTransformOrigin (s) {
        //transform-origin: x-axis y-axis z-axis|initial|inherit;
        //const percentageString = this.percentageNumberToString(aNumber)
        this.setCssAttribute("transform-origin", s)
        return this
    }

    /*
    TODO: add setter/getters for:

        perspective-origin: x-axis y-axis|initial|inherit;
        transform-style: flat|preserve-3d|initial|inherit;
        backface-visibility: hidden | visible;

    */

    // perspective

    setPerspective (n) {
        this.setPxCssAttribute("perspective", n)
        return this
    }

    // opacity

    opacityValidatorFunction () {
        return (v) => { return Type.isNumber(v) || [null, "auto", "inherit", "initial", "unset"].contains(v) }
    }

    setOpacity (v) {
        //assert(this.opacityValidatorFunction()(v))
        this.setCssAttribute("opacity", v)
        return this
    }

    opacity () {
        return this.getCssAttribute("opacity")
    }

    // z index 

    setZIndex (v) {
        this.setCssAttribute("z-index", v)
        return this
    }

    zIndex () {
        return this.getCssAttribute("z-index")
    }

    // cursor 

    setCursor (s) {
        this.setCssAttribute("cursor", s)
        return this
    }

    cursor () {
        return this.getCssAttribute("cursor")
    }

    makeCursorDefault () {
        this.setCursor("default")
        return this
    }

    makeCursorPointer () {
        this.setCursor("pointer")
        return this
    }

    makeCursorText () {
        this.setCursor("text")
        return this
    }

    makeCursorGrab () {
        this.setCursor("grab")
        return this
    }

    makeCursorGrabbing () {
        this.setCursor("grabbing")
        return this
    }

    makeCursorColResize () {
        this.setCursor("col-resize")
        return this
    }

    makeCursorRowResize () {
        this.setCursor("row-resize")
        return this
    }

    // --- focus and blur ---

    hasParentViewAncestor (aView) {
        const pv = this.parentView()
        
        if (!pv) {
            return false
        }

        if (pv === aView) {
            return true
        }

        return pv.hasParentViewAncestor(aView)
    }

    hasSubviewDescendant (aView) {
        if (aView == this) {
            return true
        }
        return this.subviews().detect(sv => sv.hasSubviewDescendant(aView))
    }

    hasFocusedDecendantView () {
        const focusedView = WebBrowserWindow.shared().activeDomView()
        if (focusedView) {
            return this.hasSubviewDescendant(focusedView)
        }
        return false
    }

    focus () {
        if (!this.isActiveElement()) {
            //console.log(this.typeId() + " focus <<<<<<<<<<<<<<<<<<")
            /*
            const focusedView = WebBrowserWindow.shared().activeDomView()

            // TODO: need a better solution to this problem
            if (focusedView && !this.hasFocusedDecendantView()) {
                
                if (focusedView && focusedView.type() === "TextField") {
                    console.log("  -- taking focus from " + focusedView.typeId())
                }
                
                //this.debugLog(".focus() " + document.activeElement._domView)
                this.addTimeout(() => { this.element().focus() }, 0)
            }
            */
            //this.addTimeout(() => { this.element().focus() }, 0)

            this.element().focus()
        }
        return this
    }

    focusAfterDelay (seconds) {
        this.addTimeout(() => {
            this.element().focus()
        }, seconds * 1000)
        return this
    }

    hasFocus () {
        return this.isActiveElement()
    }

    blur () { 
        // i.e. unfocus
        this.element().blur()
        return this
    }

    // top

    setTop (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setCssAttribute("top", v)
        return this
    }

    top () {
        return this.getCssAttribute("top")
    }

    // top px

    setTopPx (v) {
        assert(Type.isNull(v) || Type.isNumber(v))
        this.setPxCssAttribute("top", v)
        return this
    }

    topPx () {
        return this.getPxCssAttribute("top")
    }

    // left

    setLeft (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setCssAttribute("left", v)
        return this
    }

    left () {
        return this.getCssAttribute("left")
    }

    // left px

    setLeftPx (v) {
        assert(Type.isNull(v) || Type.isNumber(v))
        this.setPxCssAttribute("left", v)
        return this
    }

    leftPx () {
        return this.getPxCssAttribute("left")
    }

    // right

    setRight (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setCssAttribute("right", v)
        return this
    }


    right () {
        return this.getCssAttribute("right")
    }

    // right px

    setRightPx (v) {
        assert(Type.isNull(v) || Type.isNumber(v))
        this.setPxCssAttribute("right", v)
        return this
    }

    rightPx () {
        return this.getPxCssAttribute("right")
    }

    // bottom

    setBottom (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setCssAttribute("bottom", v)
        return this
    }

    bottom () {
        return this.getCssAttribute("bottom")
    }

    // bottom px

    setBottomPx (v) {
        assert(Type.isNull(v) || Type.isNumber(v))
        this.setPxCssAttribute("bottom", v)
        return this
    }

    bottomPx () {
        return this.getPxCssAttribute("bottom")
    }

    // float

    setFloat (v) {
        assert([null, "left", "right", "none", "inline-start", "inline-end", "start", "end", "initial", "inherit"].contains(v))
        this.setCssAttribute("float", v)
        return this
    }

    float () {
        return this.getCssAttribute("float")
    }

    // box shadow

    setBoxShadow (s) {
        //this.debugLog(".setBoxShadow(" + s + ")")
        this.setCssAttribute("box-shadow", s)
        return this
    }

    boxShadow () {
        return this.getCssAttribute("box-shadow")
    }

    // sizing

    setBoxSizing (s) {
        //this.setBoxSizing("border-box") content-box
        return this.setCssAttribute("box-sizing", s)
    }

    boxSizing () {
        return this.getCssAttribute("box-sizing")
    }


    // border 

    setBorder (s) {
        this.setCssAttribute("border", s)
        return this
    }

    border () {
        return this.getCssAttribute("border")
    }

    // border style

    setBorderStyle (s) {
        this.setCssAttribute("border-style", s)
        return this
    }

    borderStyle () {
        return this.getCssAttribute("border-style")
    }

    // border color

    setBorderColor (s) {
        this.setCssAttribute("border-color", s)
        return this
    }

    borderColor () {
        return this.getCssAttribute("border-color")
    }

    // border top

    setBorderTop (s) {
        this.setCssAttribute("border-top", s)
        return this
    }

    borderTop () {
        return this.getCssAttribute("border-top")
    }

    // border bottom

    setBorderBottom (s) {
        this.setCssAttribute("border-bottom", s)
        return this
    }

    borderBottom () {
        return this.getCssAttribute("border-bottom")
    }

    // border left

    setBorderLeft (s) {
        //this.debugLog(" border-left set '", s, "'")
        this.setCssAttribute("border-left", s)
        return this
    }

    borderLeft () {
        return this.getCssAttribute("border-left")
    }

    // border right

    setBorderRight (s) {
        this.setCssAttribute("border-right", s)
        return this
    }

    borderRight () {
        return this.getCssAttribute("border-right")
    }

    borderRightPx () {
        return this.getPxCssAttribute("border-right")
    }

    // border radius

    setBorderRadius (v) {
        assert(Type.isNull(v) || Type.isString(v))
        this.setCssAttribute("border-radius", v)
        return this
    }

    borderRadius () {
        return this.getCssAttribute("border-radius")
    }

    // border radius

    setBorderRadiusPx (v) {
        assert(Type.isNull(v) || Type.isNumber(v))
        this.setPxCssAttribute("border-radius", v)
        return this
    }

    borderRadiusPx () {
        return this.getPxCssAttribute("border-radius")
    }

    // outline

    setOutline (s) {
        assert(Type.isString(s) || Type.isNull(s))
        this.setCssAttribute("outline", s)
        return this
    }

    outline () {
        return this.getCssAttribute("outline")
    }

    // px line height

    setPxLineHeight (aNumber) {
        this.setPxCssAttribute("line-height", aNumber)
        assert(this.lineHeight() === aNumber)
        return this
    }

    pxLineHeight () {
        return this.getPxCssAttribute("line-height")
    }

    // line height

    setLineHeight (aString) {
        assert(Type.isString(aString) || Type.isNull(aString))
        this.setCssAttribute("line-height", aString)
        return this
    }

    lineHeight () {
        return this.getCssAttribute("line-height")
    }

    // alignment

    setTextAlign (v) {
        assert([null, "left", "right", "center", "justify", "justify-all", "start", "end", "match-parent", "initial", "inherit", "unset"].contains(v))
        this.setCssAttribute("text-align", v)
        return this
    }

    textAlign () {
        return this.getCssAttribute("text-align")
    }

    // clear

    setClear (v) {
        assert([null, "none", "left", "right", "both", "initial", "inherit"].contains(v))
        this.setCssAttribute("clear", v)
        return this
    }

    clear () {
        return this.getCssAttribute("clear")
    }

    // flex 

    setFlex (v) {
        assert(Type.isString(v) || Type.isNull(v))
        this.setCssAttribute("flex", v)
        return this
    }

    flex () {
        return this.getCssAttribute("flex")
    }

    // flex wrap

    setFlexWrap (v) {
        assert(["nowrap", "wrap", "wrap-reverse", "initial", "inherit"].contains(v))
        this.setCssAttribute("flex-wrap", v)
        return this
    }

    flex () {
        return this.getCssAttribute("flex-wrap")
    }

    // flex order

    setOrder (v) {
        assert(Type.isNull(v) || Type.isNumber(v) || ["initial", "inherit"].contains(v))
        this.setCssAttribute("order", v)
        return this
    }

    order () {
        return this.getCssAttribute("order")
    }

    // flex align-items (flex-start, center, flex-end) - NOTE: alignment depends on direct of flex!

    setAlignItems (v) {
        assert([null, "flex-start", "center", "flex-end"].contains(v))
        this.setCssAttribute("align-items", v)
        return this
    }

    alignItems () {
        return this.getCssAttribute("align-items")
    }

    // flex justify-content (flex-start, center, flex-end) - NOTE: alignment depends on direct of flex!
    
    setJustifyContent (v) {
        assert([null, "flex-start", "center", "flex-end"].contains(v))
        this.setCssAttribute("justify-content", v)
        return this
    }

    justifyContent () {
        return this.getCssAttribute("justify-content")
    }

    // flex direction - (row, column)

    setFlexDirection (v) {
        this.setCssAttribute("flex-direction", v)
        return this
    }

    flexDirection () {
        return this.getCssAttribute("flex-direction")
    }

    // flex grow

    setFlexGrow (v) {
        this.setCssAttribute("flex-grow", v)
        return this
    }

    flexGrow () {
        return this.getCssAttribute("flex-grow")
    }

    // flex shrink

    setFlexShrink (v) {
        this.setCssAttribute("flex-shrink", v)
        return this
    }

    flexShrink () {
        return this.getCssAttribute("flex-shrink")
    }

    // flex basis

    setFlexBasis (v) {
        if (Type.isNumber(v)) {
            v = this.pxNumberToString(v)
        }
        this.setCssAttribute("flex-basis", v)
        return this
    }

    flexBasis () {
        return this.getCssAttribute("flex-basis")
    }

    // color

    setColor (v) {
        this.setCssAttribute("color", v)
        return this
    }

    color () {
        return this.getCssAttribute("color")
    }

    // filters

    setFilter (s) {
        this.setCssAttribute("filter", s)
        return this
    }

    filter () {
        return this.getCssAttribute("filter")
    }

    // visibility

    setIsVisible (aBool) {
        const v = aBool ? "visible" : "hidden"
        this.setCssAttribute("visibility", v)
        return this
    }

    isVisible () {
        return this.getCssAttribute("visibility") !== "hidden";
    }

    // display

    setDisplay (s) {
        //assert(s in { "none", ...} );
        this.setCssAttribute("display", s)
        return this
    }

    display () {
        return this.getCssAttribute("display")
    }

    // hide height

    hideHeight () {
		if (Type.isUndefined(this.hiddenMinHeight())) {
            this.setHiddenMinHeight(this.minHeight())
            this.setHiddenMaxHeight(this.maxHeight())
            this.setMinAndMaxHeight("0em")
        }
		return this
	}
	
	unhideHeight() {
		if (!Type.isUndefined(this.hiddenMinHeight())) {
			this.setMinHeight(this.hiddenMaxHeight())
			this.setHiddenMinHeight(undefined)

			this.setMaxHeight(this.hiddenMaxHeight())
			this.setHiddenMaxHeight(undefined)
		}
		
		return this
	}

    // helper for hide/show display

    setDisplayIsHidden (aBool) {
        if (aBool) {
            this.hideDisplay()
        } else {
            this.unhideDisplay()
        }
        return this
    }

    isDisplayHidden () {
        return this.display() === "none"
    }

    hideDisplay () {
        if (this.display() !== "none") {
            this.setHiddenDisplayValue(this.display())
            this.setDisplay("none")
        }
        return this
    }

    unhideDisplay () {
        if (this.display() === "none") {
            if (this._hiddenDisplayValue) {
                this.setDisplay(this.hiddenDisplayValue())
                this.setHiddenDisplayValue(null)
            } else {
                this.setDisplay(null)
                // we don't now what value to set display to, so we have to raise an exception
                //throw new Error(this.type() + " attempt to unhide display value that was not hidden")
            }
        }
        return this
    }

    // visibility

    setVisibility (s) {
        this.setCssAttribute("visibility", s)
        return this
    }

    visibility () {
        return this.getCssAttribute("visibility")
    }

    // white space

    setWhiteSpace (s) {
        this.setCssAttribute("white-space", s)
        return this
    }

    whiteSpace () {
        return this.getCssAttribute("white-space")
    }


    // word-break

    setWordBreak (s) {
        assert(Type.isString(s))
        this.setCssAttribute("word-break", s)
        return this
    }

    wordBreak () {
        return this.getCssAttribute("word-break")
    }

    // webkit specific

    setWebkitOverflowScrolling (s) {
        assert(Type.isString(s))
        this.setCssAttribute("-webkit-overflow-scrolling", s)
        assert(this.webkitOverflowScrolling() === s)
        return this
    }

    webkitOverflowScrolling () {
        return this.getCssAttribute("-webkit-overflow-scrolling")
    }

    // ms specific 

    setMsOverflowStyle (s) {
        /* -ms-overflow-style: none; removes scrollbars on IE 10+  */
        assert(Type.isString(s))
        this.setCssAttribute("-ms-overflow-style", s)
        assert(this.msOverflowStyle() === s)
        return this
    }

    msOverflowStyle () {
        return this.getCssAttribute("-ms-overflow-style")
    }


    // overflow

    setOverflow (s) {
        assert(Type.isString(s))
        this.setCssAttribute("overflow", s)
        return this
    }

    overflow () {
        return this.getCssAttribute("overflow")
    }

    // overflow wrap

    setOverflowWrap (s) {
        assert(Type.isString(s))
        this.setCssAttribute("overflow-wrap", s)
        return this
    }

    overflowWrap () {
        return this.getCssAttribute("overflow-wrap")
    }

    // overflow x

    setOverflowX (s) {
        assert(Type.isString(s))
        this.setCssAttribute("overflow-x", s)
        return this
    }

    overflowX () {
        return this.getCssAttribute("overflow-x")
    }

    // overflow y

    setOverflowY (s) {
        assert(Type.isString(s))
        this.setCssAttribute("overflow-y", s)
        return this
    }

    overflowY () {
        return this.getCssAttribute("overflow-y")
    }



    /*	

    // text over flow

    // Overflow behavior at line end
    // Right end if ltr, left end if rtl 
    text-overflow: clip;
    text-overflow: ellipsis;
    text-overflow: "…";
    text-overflow: fade;
    text-overflow: fade(10px);
    text-overflow: fade(5%);

    // Overflow behavior at left end | at right end
    // Directionality has no influence 
    text-overflow: clip ellipsis;
    text-overflow: "…" "…";
    text-overflow: fade clip;
    text-overflow: fade(10px) fade(10px);
    text-overflow: fade(5%) fade(5%);

    // Global values 
    text-overflow: inherit;
    text-overflow: initial;
    text-overflow: unset;
    */

    setTextOverflow (s) {
        this.setCssAttribute("text-overflow", s)
        return this
    }

    textOverflow () {
        return this.getCssAttribute("text-overflow")
    }

    // user select

    userSelectKeys () {
        return [
            "-moz-user-select",
            "-khtml-user-select",
            "-webkit-user-select",
            "-o-user-select"
        ]
    }

    userSelect () {
        const style = this.cssStyle()
        let result = this.userSelectKeys().detect(key => style[key])
        result = result || style.userSelect
        return result
    }

    turnOffUserSelect () {
        this.setUserSelect("none");
        return this
    }

    turnOnUserSelect () {
        this.setUserSelect("text")
        return this
    }

    // user selection 

    setUserSelect (aString) {
        const style = this.cssStyle()
        //console.log("'" + aString + "' this.userSelect() = '" + this.userSelect() + "' === ", this.userSelect() == aString)
        if (this.userSelect() !== aString) {
            style.userSelect = aString
            this.userSelectKeys().forEach(key => style[key] = aString)
        }
        return this
    }

    // spell check

    setSpellCheck (aBool) {
        this.element().setAttribute("spellcheck", aBool);
        return this
    }

    // tool tip

    setToolTip (aName) {
        if (aName) {
            this.element().setAttribute("title", aName);
        } else {
            this.element().removeAttribute("title");
        }
        return this
    }

    // width and height

    computedWidth () {
        const w = this.getComputedPxCssAttribute("width")
        return w
    }

    computedHeight () {
        const h = this.getComputedPxCssAttribute("height")
        return h
    }

    // desired size

    desiredWidth () {
        return this.calcCssWidth()
    }

    desiredHeight () {
        return this.calcCssHeight()
    }

    // calculated CSS size (outside of parent view)

    calcCssWidth () {
        return DomTextTapeMeasure.shared().sizeOfCSSClassWithText(this.divClassName(), this.innerHTML()).width;
    }

    calcCssHeight () {
        return DomTextTapeMeasure.shared().sizeOfCSSClassWithText(this.element(), this.innerHTML()).height;
    }

    // calculated size (within parent view)

    calcWidth () {
        return DomTextTapeMeasure.shared().sizeOfElementWithText(this.element(), this.innerHTML()).width;
    }

    calcHeight () {
        return DomTextTapeMeasure.shared().sizeOfElementWithText(this.element(), this.innerHTML()).height;
    }

    // width

    setWidthString (v) {
        assert(Type.isString(v) || Type.isNull(v))
        this.setCssAttribute("width", v, () => { this.didChangeWidth() })
        return this
    }

    setWidth (s) {
        this.setWidthString(s)
        return this
    }

    setWidthPercentage (aNumber) {
        const newValue = this.percentageNumberToString(aNumber)
        this.setCssAttribute("width", newValue, () => { this.didChangeWidth() })
        return this
    }

    /*
    hideScrollbar () {
        // need to do JS equivalent of: .class::-webkit-scrollbar { display: none; }
	    // this.setCssAttribute("-webkit-scrollbar", { display: "none" }) // doesn't work
	    return this
    }
    */

    // clientX - includes padding but not scrollbar, border, or margin

    clientWidth () {
        return this.element().clientWidth
    }

    clientHeight () {
        return this.element().clientHeight
    }

    // offsetX - includes borders, padding, scrollbar 

    offsetWidth () {
        return this.element().offsetWidth
    }

    offsetHeight () {
        return this.element().offsetHeight
    }

    // width px

    minWidthPx () {
        const s = this.getCssAttribute("min-width")
        // TODO: support em to px translation 
        return this.pxStringToNumber(s)
    }

    maxWidthPx () {
        const w = this.getCssAttribute("max-width")
        if (w === "") {
            return null
        }
        return this.pxStringToNumber(w)
    }

    // height px

    minHeightPx () {
        const s = this.getCssAttribute("min-height")
        // TODO: support em to px translation 
        return this.pxStringToNumber(s)
    }

    maxHeightPx () {
        const s = this.getCssAttribute("max-height")
        if (s === "") {
            return null
        }
        return this.pxStringToNumber(s)
    }

    // -----------

    cssStyle () {
        return this.element().style
    }

    setMinWidth (v) {
        if (Type.isNumber(v)) {
            v = this.pxNumberToString(v)
        }
        this.setCssAttribute("min-width", v, () => { this.didChangeWidth() })
        return this
    }

    didChangeWidth () {
    }

    didChangeHeight () {
    }

    // --- lock/unlock size ---

    /*
    lockSize () {
        const h = this.computedHeight() 
        const w = this.computedWidth()
        this.setMinAndMaxWidth(w)
        this.setMinAndMaxHeight(h)
        return this
    }

    unlockSize () {
        this.setMinAndMaxWidth(null)
        this.setMinAndMaxHeight(null)
        return this
    }
    */

    // ----

    displayIsFlex () {
        // TODO: choose a better name for this method?
        return (this.display() === "flex" || this.hiddenDisplayValue() === "flex")
    }

    // fixed width

    /*
    setFixedWidthPx (v) {
        assert(Type.isNumber(v))
        if (this.displayIsFlex()) {
            this.setFlexGrow(0)
            this.setFlexShrink(0)
            this.setFlexBasis(v + "px")
        } else {
            this.setMinAndMaxWidth(v)
        }
        return this
    }

    fixedWidthPx () {
        if (this.displayIsFlex()) {
            const w = this.getPxCssAttribute("flex-basis")
            assert(Type.isNumber(w))
            return w
        } else {
            const w1 = this.getPxCssAttribute("min-width")
            const w2 = this.getPxCssAttribute("max-width")
            assert(Type.isNumber(w1) && w1 === w2)
            return w1
        }
    }
    */

    // fixed height
    /*
    setFixedHeightPx (v) {
        assert(Type.isNumber(v))
        if (this.displayIsFlex()) {
            this.setFlexGrow(0)
            this.setFlexShrink(0)
            this.setFlexBasis(v + "px")
        } else {
            this.setMinAndMaxWidth(v)
        }
        return this
    }

    fixedHeightPx () {
        if (this.displayIsFlex()) {
            const w = this.getPxCssAttribute("flex-basis")
            assert(Type.isNumber(w))
            return w
        } else {
            const w1 = this.getPxCssAttribute("min-width")
            const w2 = this.getPxCssAttribute("max-width")
            assert(Type.isNumber(w1) && w1 === w2)
            return w1
        }
    }
    */

    // ----

    setMinAndMaxSize (aSize) {
        this.setMinAndMaxWidth(aSize.x())
        this.setMinAndMaxHeight(aSize.y())
        return this
    }

    setMaxWidth (v) {
        if (Type.isNumber(v)) {
            v = this.pxNumberToString(v)
        }
        this.setCssAttribute("max-width", v, () => { this.didChangeWidth() })
        return this
    }

    setMinAndMaxWidth (v) {
        if (Type.isNumber(v)) {
            v = this.pxNumberToString(v)
        }
        this.setCssAttribute("max-width", v, () => { this.didChangeWidth() })
        this.setCssAttribute("min-width", v, () => { this.didChangeWidth() })
        return this
    }

    setMinAndMaxHeight (v) {
        if (Type.isNumber(v)) {
            v = this.pxNumberToString(v)
        }
        this.setCssAttribute("min-height", v, () => { this.didChangeHeight() })
        this.setCssAttribute("max-height", v, () => { this.didChangeHeight() })
        return this
    }

    setMinAndMaxWidthAndHeight (v) {
        this.setMinAndMaxWidth(v)
        this.setMinAndMaxHeight(v)
        return this
    }


    percentageNumberToString (aNumber) {
        assert(Type.isNumber(aNumber) && (aNumber >= 0) && (aNumber <= 100))
        return aNumber + "%"
    }

    pxNumberToString (aNumber) {
        if (Type.isNull(aNumber)) {
            return null
        }

        if (Type.isString(aNumber)) {
            if (aNumber.beginsWith("calc") || aNumber.endsWith("px")) {
                return aNumber
            }
        }

        assert(Type.isNumber(aNumber))
        return aNumber + "px"
    }

    pxStringToNumber (s) {
        assert(Type.isString(s))
        
        if (s === "") {
            return 0
        }
        
        if (s === "auto") {
            return 0
        }

        if (s.contains("%")) {
            return 0
        }

        assert(s.endsWith("px"))
        return Number(s.replace("px", ""))
    }

    setMinAndMaxHeightPercentage (aNumber) {
        const newValue = this.percentageNumberToString(aNumber)
        this.setCssAttribute("min-height", newValue, () => { this.didChangeHeight() })
        this.setCssAttribute("max-height", newValue, () => { this.didChangeHeight() })
        return this
    }

    setHeightPercentage (aNumber) {
        const newValue = this.percentageNumberToString(aNumber)
        this.setHeightString(newValue)
        return this
    }

    setMinWidthPx (aNumber) {
        this.setMinWidth(this.pxNumberToString(aNumber))
        return this
    }

    setMinHeightPx (aNumber) {
        this.setMinHeight(this.pxNumberToString(aNumber))
        return this
    }

    setMaxHeightPx (aNumber) {
        this.setMaxHeight(this.pxNumberToString(aNumber))
        return this
    }

    maxHeight () {
        return this.getCssAttribute("max-height")
    }

    minHeight () {
        return this.getCssAttribute("min-height")
    }

    maxWidth () {
        return this.getCssAttribute("max-width")
    }

    minWidth () {
        return this.getCssAttribute("min-width")
    }

    setMinHeight (newValue) {
        assert(Type.isString(newValue) || Type.isNull(newValue))
        // <length> | <percentage> | auto | max-content | min-content | fit-content | fill-available
        this.setCssAttribute("min-height", newValue, () => { this.didChangeHeight() })
        return this
    }

    setMaxHeight (newValue) {
        assert(Type.isString(newValue) || Type.isNull(newValue))
        // <length> | <percentage> | none | max-content | min-content | fit-content | fill-available
        this.setCssAttribute("max-height", newValue, () => { this.didChangeHeight() })
        return this
    }

    setWidthPx (aNumber) {
        this.setWidthString(this.pxNumberToString(aNumber))
        return this
    }

    setHeightPx (aNumber) {
        this.setHeightString(this.pxNumberToString(aNumber))
        return this
    }

    setHeight (s) {
        // height: auto|length|initial|inherit;

        if (Type.isNumber(s)) {
            return this.setHeightPx(s)
        }
        this.setHeightString(s)
        return this
    }

    setWidthToAuto () {
        this.setWidthString("auto")
        return this
    }

    setHeightToAuto () {
        this.setHeightString("auto")
        return this
    }

    setHeightString (s) {
        assert(Type.isString(s) || Type.isNull(s))
        this.setCssAttribute("height", s, () => { this.didChangeHeight() })
        return this
    }

    height () {
        return this.getCssAttribute("height")
    }

    // --- div class name ---

    setDivClassName (aName) {
        if (this._divClassName !== aName) {
            this._divClassName = aName
            if (this.element()) {
                this.element().setAttribute("class", aName);
            }
        }
        return this
    }

    divClassName () {
        if (this.element()) {
            const className = this.element().getAttribute("class");
            this._divClassName = className
            return className
        }
        return this._divClassName
    }

    // --- parentView ---

    setParentView (aView) {
        if (this._parentView !== aView) {
            this._parentView = aView
            this.didChangeParentView()
        }
        return this
    }

    hasParentView () {
        return Type.isNullOrUndefined(this.parentView()) === false
    }

    didChangeParentView () {
        return this
    }

    // view chains

    parentViewChain () {
        // returned list in order of very top parent first
        const chain = []
        let p = this.parentView()
        while (p) {
            chain.push(p)
            p = p.parentView()
        }
        return chain.reversed()
    }

    parentViewsOfClass (aClass) {
        return this.parentViewChain().filter(v => v.thisClass().isSubclassOf(aClass))
    }

    // --- subviews ---


    subviewCount () {
        return this.subviews().length
    }

    hasSubview (aSubview) {
        return this.subviews().contains(aSubview)
    }

    addSubviewIfAbsent (aSubview) {
        if (!this.hasSubview(aSubview)) {
            this.addSubview(aSubview)
        }
        return this
    }

    addSubview (aSubview) {
        assert(!Type.isNullOrUndefined(aSubview)) 
        assert(!Type.isNullOrUndefined(aSubview.element())) 

        if (this.hasSubview(aSubview)) {
            throw new Error(this.type() + ".addSubview(" + aSubview.type() + ") attempt to add duplicate subview ")
        }

        assert(Type.isNullOrUndefined(aSubview.parentView()))
        /*
        if (aSubview.parentView()) {
            aSubview.removeFromParent()
        }
        */

        this.willAddSubview(aSubview)
        this.subviews().append(aSubview)

        this.element().appendChild(aSubview.element());
        aSubview.setParentView(this)
        this.didChangeSubviewList()
        return aSubview
    }

    addSubviews (someSubviews) {
        someSubviews.forEach(sv => this.addSubview(sv))
        return this
    }

    swapSubviews (sv1, sv2) {
        assert(sv1 !== sv2)
        assert(this.hasSubview(sv1))
        assert(this.hasSubview(sv2))
        
        const i1 = this.indexOfSubview(sv1)
        const i2 = this.indexOfSubview(sv2)

        this.removeSubview(sv1)
        this.removeSubview(sv2)

        if (i1 < i2) {
            this.atInsertSubview(i1, sv2) // i1 is smaller, so do it first
            this.atInsertSubview(i2, sv1)
        } else {
            this.atInsertSubview(i2, sv1) // i2 is smaller, so do it first          
            this.atInsertSubview(i1, sv2)
        }

        assert(this.indexOfSubview(sv1) === i2)
        assert(this.indexOfSubview(sv2) === i1)

        return this
    }

    orderSubviewFront (aSubview) {
        if (this.subviews().last() !== aSubview) {
            this.removeSubview(aSubview)
            this.addSubview(aSubview)
        }
        return this
    }

    orderFront () {
        const pv = this.parentView()
        if (pv) {
            pv.orderSubviewFront(this)
        }
        return this
    }

    orderSubviewBack (aSubview) {
        this.removeSubview(aSubview)
        this.atInsertSubview(0, aSubview)
        return this
    }

    orderBack () {
        const pv = this.parentView()
        if (pv) {
            pv.orderSubviewBack(this)
        }
        return this
    }

    replaceSubviewWith (oldSubview, newSubview) {
        assert(this.hasSubview(oldSubview))
        assert(!this.hasSubview(newSubview))
        
        const index = this.indexOfSubview(oldSubview)
        this.removeSubview(oldSubview)
        this.atInsertSubview(index, newSubview)

        assert(this.indexOfSubview(newSubview) === index)
        assert(this.hasSubview(newSubview))
        assert(!this.hasSubview(oldSubview))
        return this
    }

    atInsertSubview (anIndex, aSubview) {
        this.subviews().atInsert(anIndex, aSubview)
        assert(this.subviews()[anIndex] === aSubview)

        DomElement_atInsertElement(this.element(), anIndex, aSubview.element())
        assert(this.element().childNodes[anIndex] === aSubview.element())

        aSubview.setParentView(this) // TODO: unify with addSubview
        this.didChangeSubviewList() // TODO:  unify with addSubview
        return aSubview
    }

    moveSubviewToIndex (aSubview, i) {
        assert(i < this.subviews().length)
        assert(this.subviews().contains(aSubview))

        if (this.subviews()[i] !== aSubview) {
            this.removeSubview(aSubview)
            this.atInsertSubview(i, aSubview)
        }
        return this
    }

    updateSubviewsToOrder (orderedSubviews) {
        assert(this.subviews() !== orderedSubviews)
        assert(this.subviews().length === orderedSubviews.length)

        for (let i = 0; i < this.subviews().length; i ++) {
            const v2 = orderedSubviews[i]
            this.moveSubviewToIndex(v2, i)
        }
        
        return this
    }

    // --- subview utilities ---

    sumOfSubviewHeights () {
        return this.subviews().sum(subview => subview.clientHeight())
    }

    performOnSubviewsExcept (methodName, exceptedSubview) {
        this.subviews().forEach(subview => {
            if (subview !== exceptedSubview) {
                subview[methodName].apply(subview)
            }
        })

        return this
    }

    // --- animations ---

    animateToDocumentFrame (destinationFrame, seconds, completionCallback) {
        this.setTransition("all " + seconds + "s")
        assert(this.position() === "absolute")
        this.addTimeout(() => {
            this.setTopPx(destinationFrame.origin().y())
            this.setLeftPx(destinationFrame.origin().x())
            this.setMinAndMaxWidth(destinationFrame.size().width())
            this.setMinAndMaxHeight(destinationFrame.size().height())
        }, 0)

        this.addTimeout(() => {
            completionCallback()
        }, seconds * 1000)
        return this
    }

    animateToDocumentPoint (destinationPoint, seconds, completionCallback) {
        this.setTransition("all " + seconds + "s")
        assert(this.position() === "absolute")
        this.addTimeout(() => {
            this.setTopPx(destinationPoint.y())
            this.setLeftPx(destinationPoint.x())
        }, 0)

        this.addTimeout(() => {
            completionCallback()
        }, seconds * 1000)
        return this
    }

    hideAndFadeIn () {
        this.setOpacity(0)
        this.setTransition("all 0.5s")
        this.addTimeout(() => {
            this.setOpacity(1)
        }, 0)
    }

    fadeInToDisplayInlineBlock () {
        this.transitions().at("opacity").updateDuration("0.3s")
        this.setDisplay("inline-block")
        this.setOpacity(0)
        this.addTimeout(() => {
            this.setOpacity(1)
        }, 0)
        return this
    }

    fadeOutToDisplayNone () {
        this.transitions().at("opacity").updateDuration("0.3s")
        this.setOpacity(0)
        this.addTimeout(() => {
            this.setDisplay("none")
        }, 200)
        return this
    }

    // --- fade + height animations ----

    fadeInHeightToDisplayBlock () {
        this.setMinHeight("100%")
        this.setMaxHeight("100%")
        const targetHeight = this.calcHeight()

        this.setOverflow("hidden")
        this.transitions().at("opacity").updateDuration("0.3s")
        this.transitions().at("min-height").updateDuration("0.2s")
        this.transitions().at("max-height").updateDuration("0.2s")

        this.setDisplay("block")
        this.setOpacity(0)
        this.setMinAndMaxHeight(0)

        this.addTimeout(() => {
            this.setOpacity(1)
            this.setMinAndMaxHeight(targetHeight)
        }, 0)
        return this
    }

    fadeOutHeightToDisplayNone () {
        this.setOverflow("hidden")
        this.transitions().at("opacity").updateDuration("0.2s")
        this.transitions().at("min-height").updateDuration("0.3s")
        this.transitions().at("max-height").updateDuration("0.3s")

        this.addTimeout(() => {
            this.setOpacity(0)
            this.setMinAndMaxHeight(0)
        }, 1)

        /*
        this.addTimeout(() => {
            this.setDisplay("none")
        }, 300)
        */
        return this
    }

    // -----------------------

    removeFromParentView () {
        this.parentView().removeSubview(this)
        return this
    }

    removeAfterFadeDelay (delayInSeconds) {
        // call removeSubview for a direct actions
        // use justRemoteSubview for internal changes

        this.setTransition("all " + delayInSeconds + "s")

        this.addTimeout(() => {
            this.setOpacity(0)
        }, 0)

        this.addTimeout(() => {
            this.parentView().removeSubview(this)
        }, delayInSeconds * 1000)

        return this
    }

    willRemove () {
    }

    didChangeSubviewList () {
    }

    hasSubview (aSubview) {
        return this.subviews().indexOf(aSubview) !== -1;
    }

    hasChildElement (anElement) {
        const children = this.element().childNodes
        for (let i = 0; i < children.length; i++) {
            const child = children[i]
            if (anElement === child) {
                return true
            }
        }
        return false
    }

    willAddSubview (aSubview) {
        // for subclasses to over-ride
    }

    willRemoveSubview (aSubview) {
        // for subclasses to over-ride
    }

    removeSubviewIfPresent (aSubview) {
        if (this.hasSubview(aSubview)) {
            this.removeSubview(aSubview)
        }
        return this
    }

    removeSubview (aSubview) {
        //console.warn("WARNING: " + this.type() + " removeSubview " + aSubview.type())

        if (!this.hasSubview(aSubview)) {
            console.warn(this.type() + " removeSubview " + aSubview.typeId() + " failed - no child found among: ", this.subviews().map(view => view.typeId()))
            Error.showCurrentStack()
            return aSubview
        }

        this.willRemoveSubview(aSubview)
        aSubview.willRemove()

        this.subviews().remove(aSubview)

        // sanity check 

        const e = aSubview.element()
        if (this.hasChildElement(e)) {
            this.element().removeChild(e);

            if (this.hasChildElement(e)) {
                console.warn("WARNING: " + this.type() + " removeSubview " + aSubview.type() + " failed - still has element after remove")
                Error.showCurrentStack()
            }
        } else {
            //console.warn("WARNING: " + this.type() + " removeSubview " + aSubview.type() + " parent element is missing this child element")
        }
 

        aSubview.setParentView(null)
        this.didChangeSubviewList()
        return aSubview
    }

    removeAllSubviews () {
        //const sv = this.subviews().shallowCopy()
        //sv.forEach(subview => this.removeSubview(subview))
        while(this.subviews().length) {
            this.removeSubview(this.subviews().last())
        }
        assert(this.subviews().length === 0)
        return this
    }

    indexOfSubview (aSubview) {
        return this.subviews().indexOf(aSubview)
    }

    subviewAfter (aSubview) {
        const index = this.indexOfSubview(aSubview)
        const nextIndex = index + 1
        if (nextIndex < this.subviews().length) {
            return this.subviews()[nextIndex]
        }
        return null
    }

    sendAllViewDecendants (methodName, argList) {
        this.subviews().forEach((v) => {
            v[methodName].apply(v, argList)
            v.sendAllViewDecendants(methodName, argList)
        })
        return this
    }

    // --- active element ---

    isActiveElement () {
        return document.activeElement === this.element()
    }

    isActiveElementAndEditable () {
        return this.isActiveElement() && this.contentEditable()
    }

    isFocused () {
        return this.isActiveElement()
    }

    // --- inner html ---

    setInnerHTML (v) {
        const oldValue = this.element().innerHTML

        if (v === null) {
            v = ""
        }

        v = "" + v

        if (v === oldValue) {
            return this
        }

        const isFocused = this.isActiveElementAndEditable()

        if (isFocused) {
            this.blur()
            const savedSelection = this.saveSelection()
            this.element().innerHTML = v
            savedSelection.collapse()
            this.restoreSelection(savedSelection)
            this.focus()
        } else {
            this.element().innerHTML = v
        }

        return this
    }

    innerHTML () {
        return this.element().innerHTML
    }

    setString (v) {
        return this.setInnerHTML(v)
    }

    string () {
        return this.innerHTML()
    }

    loremIpsum (maxWordCount) {
        this.setInnerHTML("".loremIpsum(10, 40))
        return this
    }

    // --- updates ---

    tellParentViews (msg, aView) {
        const f = this[msg]
        if (f) {
            const r = f.apply(this, [aView]) 
            if (r === true) {
                return // stop propogation on first view returning non-false
            }
        }

        const p = this.parentView()
        if (p) {
            p.tellParentViews(msg, aView)
        }
    }

    askParentViews (msg, aView) {
        const f = this[msg]
        if (f) {
            const r = f.call(this, aView)
            return r
        }

        const p = this.parentView()
        if (p) {
            return p.getParentViewMethod(msg, aView)
        }

        return undefined
    }

    firstParentViewWithAncestorClass (aClass) {
        const p = this.parentView()
        if (p) {
            if (p.isSubclassOf(aClass)) {
                return p
            }
            return p.firstParentViewWithAncestorClass(aClass)
        }
        return undefined
    }

    // --- events --------------------------------------------------------------------

    // --- event listeners ---

    listenerNamed (className) {
        const dict = this.eventListenersDict()
        if (!dict[className]) {
            assert(className in window)
            const proto = window[className]
            dict[className] = proto.clone().setListenTarget(this.element()).setDelegate(this)
        }
        return dict[className]
    }

    clipboardListener () {
        return this.listenerNamed("ClipboardListener")
    }

    documentListener () {
        return this.listenerNamed("DocumentListener") // listen target will be the window
    }

    browserDragListener () {
        return this.listenerNamed("DragListener")
    }

    dropListener () {
        return this.listenerNamed("DropListener")
    }

    focusListener () {
        return this.listenerNamed("FocusListener")
    }

    mouseListener () {
        return this.listenerNamed("MouseListener")
    }

    keyboardListener () {
        return this.listenerNamed("KeyboardListener")
    }

    touchListener () {
        return this.listenerNamed("TouchListener")
    }

    // ---


    // --- window resize events ---

    isRegisteredForDocumentResize () {
        return this.documentListener().isListening()
    }

    setIsRegisteredForDocumentResize (aBool) {
        this.documentListener().setIsListening(aBool)
        return this
    }

    onDocumentResize (event) {
        return true
    }

    // --- onClick event, target & action ---

    isRegisteredForClicks () {
        return this.mouseListener().isListening()
    }

    setIsRegisteredForClicks (aBool) {
        this.mouseListener().setIsListening(aBool)

        if (aBool) {
            this.makeCursorPointer()
        } else {
            this.makeCursorDefault()
        }

        return this
    }

    hasTargetAndAction () {
        return (this.target() !== null) && (this.action() !== null)
    }

    setTarget (anObject) {
        this._target = anObject
        this.setIsRegisteredForClicks(this.hasTargetAndAction())
        return this
    }

    setAction (anActionString) {
        this._action = anActionString
        this.setIsRegisteredForClicks(this.hasTargetAndAction())
        return this
    }

    onClick (event) {
        this.debugLog(".onClick()")
        this.sendActionToTarget()
        event.stopPropagation()
        return false
    }

    sendActionToTarget () {
        if (!this.action()) {
            return null
        }

        const t = this.target()
        if (!t) {
            throw new Error("no target for action " + this.action())
        }

        const method = t[this.action()]
        if (!method) {
            throw new Error("no target for action " + this.action())
        }

        return method.apply(t, [this])
    }

    onDoubleClick (event) {
        return true
    }

    // -- browser dropping ---

    isRegisteredForBrowserDrop () {
        return this.dropListener().isListening()
    }

    setIsRegisteredForBrowserDrop (aBool) {
        this.dropListener().setIsListening(aBool)
        return this
    }

    acceptsDrop () {
        return true
    }

    // ---------------------

    onBrowserDragEnter (event) {
        // triggered on drop target
        //console.log("onBrowserDragEnter acceptsDrop: ", this.acceptsDrop());
        event.preventDefault() // needed?

        if (this.acceptsDrop(event)) {
            this.onBrowserDragOverAccept(event)
            return true
        }

        return false;
    }

    onBrowserDragOver (event) {
        // triggered on drop target
        //console.log("onBrowserDragOver acceptsDrop: ", this.acceptsDrop(event), " event:", event);

        event.preventDefault()

        if (this.acceptsDrop(event)) {
            event.dataTransfer.dropEffect = "copy";
            event.dataTransfer.effectAllowed = "copy";
            this.onBrowserDragOverAccept(event)
            return true
        }

        return false;
    }

    onBrowserDragOverAccept (event) {
        //console.log("onBrowserDragOverAccept ");
        this.dragHighlight()
    }

    onBrowserDragLeave (event) {
        // triggered on drop target
        //console.log("onBrowserDragLeave ", this.acceptsDrop(event));
        this.dragUnhighlight()
        return this.acceptsDrop(event);
    }

    dragHighlight () {

    }

    dragUnhighlight () {

    }

    onBrowserDrop (event) {
        if (this.acceptsDrop(event)) {
            //const file = event.dataTransfer.files[0];
            //console.log('onDrop ' + file.path);
            this.onBrowserDataTransfer(event.dataTransfer)
            this.dragUnhighlight()
            event.preventDefault();
            event.stopPropagation()
            return true;
        }
        event.preventDefault();
        return false
    }

    dropMethodForMimeType (mimeType) {
        let s = mimeType.replaceAll("/", " ")
        s = s.replaceAll("-", " ")
        s = s.capitalizeWords()
        s = s.replaceAll(" ", "")
        return "onBrowserDrop" + s
    }

    onBrowserDataTransfer (dataTransfer) {
        // TODO: we need a way to avoid handling the same item twice...

        if (dataTransfer.files.length) {
            for (let i = 0; i < dataTransfer.files.length; i++) {
                const file = dataTransfer.files[i]
                this.onBrowserDropFile(file)
            }
        } else if (dataTransfer.items) {
            let data = dataTransfer.items

            let dataTransferItems = []
            for (let i = 0; i < data.length; i++) {
                dataTransferItems.push(data[i])
            }

            dataTransferItems = dataTransferItems.reversed()

            for (let i = 0; i < dataTransferItems.length; i++) {
                const dataTransferItem = dataTransferItems[i]
                const mimeType = dataTransferItem.type

                // Example MIME types: 
                // text/plain, text/html, text/uri-list

                if (mimeType) {
                    dataTransferItem.getAsString((s) => {
                        const chunk = BMDataUrl.clone()
                        chunk.setMimeType(mimeType)
                        chunk.setDecodedData(s)
                        console.log("mimeType:", mimeType)
                        console.log("    data:", s)
                        this.onBrowserDropChunk(chunk)
                    })
                }
                break; // only send the first MIME type for now
            }
        }
    }

    onBrowserDropFile (file) {
        const mimeType = file.type
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target.result
            this.onBrowserDropMimeTypeAndRawData(mimeType, data)
        }
        reader.readAsDataURL(file);
    }

    onBrowserDropMimeTypeAndRawData (mimeType, dataUrl) {
        const dd = BMDataUrl.clone().setDataUrlString(dataUrl)
        this.onBrowserDropChunk(dd)
    }

    onBrowserDropChunk (dataChunk) {
        // if the view has a method for the mime type of the file
        // e.g. onBrowserDropImageJpeg
        // then we call it. If the view wants to handle all types,
        // it can override this method.

        const methodName = this.dropMethodForMimeType(dataChunk.mimeType())
        const method = this[methodName]
        console.log("onBrowserDropFile => ", methodName)

        if (method) {
            method.apply(this, [dataChunk])
        }
    }

    // browser dragging

    setDraggable (aBool) {
        assert(Type.isBoolean(aBool))
        this.element().setAttribute("draggable", aBool)
        return this
    }

    draggable () {
        return this.element().getAttribute("draggable")
    }

    isRegisteredForBrowserDrag () {
        return this.browserDragListener().isListening()
    }

    setIsRegisteredForBrowserDrag (aBool) {
        this.browserDragListener().setIsListening(aBool)
        this.setDraggable(aBool)
        return this
    }

    onBrowserDragStart (event) {
        return false;
    }

    onBrowserDragEnd (event) {
        // triggered in element being dragged
        this.dragUnhighlight();
        //console.log("onDragEnd");
    }

    // --- editing - abstracted from content editable for use in non text views ---

    setIsEditable (aBool) {
        // subclasses can override for non text editing behaviors e.g. a checkbox, toggle switch, etc
        this.setContentEditable(aBool)
        return this
    }

    isEditable () {
        return this.isContentEditable()
    }

    // --- content editing ---

    setContentEditable (aBool) {
        //console.log(this.divClassName() + " setContentEditable(" + aBool + ")")
        if (aBool) {
            this.makeCursorText()
            //this.element().ondblclick = (event) => { this.selectAll();	}
        } else {
            this.element().ondblclick = null
        }

        this.element().contentEditable = aBool ? "true" : "false"

        /*
        if (this.showsHaloWhenEditable()) {
            this.setBoxShadow(aBool ? "0px 0px 5px #ddd" : "none")
        }
        */

        //this.element().style.hideFocus = true
        this.element().style.outline = "none"

        this.setIsRegisteredForKeyboard(aBool)

        if (aBool) {
            this.turnOnUserSelect()
        }

        this.setIsRegisteredForClipboard(aBool)

        return this
    }

    isContentEditable () { // there's a separate method for contentEditable() that just accesses element attribute
        //const v = window.getComputedStyle(this.element(), null).getPropertyValue("contentEditable");
        const s = this.element().contentEditable
        if (s === "inherit" && this.parentView()) {
            return this.parentView().isContentEditable()
        }
        const aBool = (s === "true" || s === true)
        return aBool
    }

    contentEditable () {
        return this.element().contentEditable === "true"
    }

    // touch events

    setTouchAction (s) {
        this.setCssAttribute("-ms-touch-action", s) // needed?
        this.setCssAttribute("touch-action", s)
        return this
    }

    isRegisteredForTouch () {
        return this.touchListener().isListening()
    }

    setIsRegisteredForTouch (aBool) {
        this.touchListener().setIsListening(aBool)

        if (aBool) {
            this.setTouchAction("none") // testing
        }

        return this
    }

    onTouchStart (event) {
        //this.onPointsStart(points)
    }

    onTouchMove (event) {
        //this.onPointsMove(points)
    }

    onTouchCancel (event) {
        //this.onPointsCancel(points)
    }

    onTouchEnd (event) {
        //this.onPointsEnd(points)
    }

    /// GestureRecognizers

    hasGestureType (typeName) {
        return this.gesturesOfType(typeName).length > 0
    }

    hasGestureRecognizer (gr) {
        return this.gestureRecognizers().contains(gr)
    }

    addGestureRecognizerIfAbsent (gr) {
        if (!this.hasGestureRecognizer(gr)) {
            this.addGestureRecognizer(gr)
        }
        return this
    }

    addGestureRecognizer (gr) {
        assert(!this.hasGestureRecognizer(gr))
        this.gestureRecognizers().append(gr)
        gr.setViewTarget(this)
        gr.start()
        return gr
    }

    removeGestureRecognizer (gr) {
        if (this.gestureRecognizers()) {
            gr.stop()
            gr.setViewTarget(null)
            this.gestureRecognizers().remove(gr)
        }
        return this
    }

    gesturesOfType (typeName) {
        return this.gestureRecognizers().select(gr => gr.type() == typeName)
    }

    removeGestureRecognizersOfType (typeName) {
        if (this.gestureRecognizers()) {
            this.gestureRecognizers().select(gr => gr.type() == typeName).forEach(gr => this.removeGestureRecognizer(gr))
        }
        return this
    }

    removeAllGestureRecognizers () {
        this.gestureRecognizers().forEach(gr => this.removeGestureRecognizer(gr))
        return this
    }

    // default tap gesture

    addDefaultTapGesture () {
        if (!this.defaultTapGesture()) {
            this.setDefaultTapGesture( this.addGestureRecognizer(TapGestureRecognizer.clone()) )
        }
        return this.defaultTapGesture()
    }

    removeDefaultTapGesture () {
        if (this.defaultTapGesture()) {
            this.removeGestureRecognizer(this.defaultTapGesture())
            this.setDefaultTapGesture(null)
        }
        return this
    }

    // double tap gesture

    newDoubleTapGestureRecognizer () { // private
        const tg = TapGestureRecognizer.clone()
        tg.setNumberOfTapsRequired(2)
        tg.setNumberOfFingersRequired(1)
        tg.setGestureName("DoubleTap")
        //tg.setCompleteMessage("onDoubleTapComplete")
        //tg.setIsDebugging(true)
        return tg
    }

    addDefaultDoubleTapGesture () { 
        if (!this.defaultDoubleTapGesture()) {
            const gr = this.newDoubleTapGestureRecognizer()
            this.setDefaultDoubleTapGesture(gr)
            this.addGestureRecognizer(gr)
        }
        return this.defaultDoubleTapGesture()
    }

    removeDefaultDoubleTapGesture () { 
        if (this.defaultDoubleTapGesture()) {
            this.removeGestureRecognizer(this.defaultDoubleTapGesture())
            this.setDefaultDoubleTapGesture(null)
        }
        return this
    }

    // default pan gesture

    addDefaultPanGesture () {
        if (!this._defaultPanGesture) {
            this._defaultPanGesture = this.addGestureRecognizer(PanGestureRecognizer.clone()) 
        }
        return this._defaultPanGesture
    }

    defaultPanGesture () {
        return this._defaultPanGesture
    }

    removeDefaultPanGesture () {
        if (this._defaultPanGesture) {
            this.removeGestureRecognizer(this._defaultPanGesture)
            this._defaultPanGesture = null
        }
        return this
    }

    // orient testing

    /*
    onOrientBegin (aGesture) {
        this.debugLog(".onOrientBegin()")
        aGesture.show()
    }

    onOrientMove (aGesture) {
        this.debugLog(".onOrientMove()")
        aGesture.show()
    }

    onOrientComplete (aGesture) {
        this.debugLog(".onOrientComplete()")
        aGesture.show()
    }
    */

    cancelAllGesturesExcept (aGesture) {
        this.gestureRecognizers().forEach((gr) => {
            //if (gr.type() !== aGesture.type()) {
            if (gr !== aGesture) {
                gr.cancel()
            }
        })
        return this
    }

    // --- mouse events ---

    isRegisteredForMouse () {
        return this.mouseListener().isListening()
    }

    setIsRegisteredForMouse (aBool, useCapture) {
        this.mouseListener().setUseCapture(useCapture).setIsListening(aBool) //.setIsDebugging(true)
        return this
    }

    onMouseMove (event) {
        return true
    }

    onMouseOver (event) {
        return true
    }

    onMouseLeave (event) {
        return true
    }

    onMouseOver (event) {
        return true
    }

    onMouseDown (event) {
        const methodName = Mouse.shared().downMethodNameForEvent(event)
        if (methodName !== "onMouseDown") {
            this.debugLog(".onMouseDown calling: ", methodName)
            this.invokeMethodNameForEvent(methodName, event)
        }
        return true
    }

    onMouseUp (event) {
        const methodName = Mouse.shared().upMethodNameForEvent(event)
        if (methodName !== "onMouseUp") {
            this.debugLog(".onMouseUp calling: ", methodName)
            this.invokeMethodNameForEvent(methodName, event)
        }
        return true
    }

    // --- keyboard events ---

    isRegisteredForKeyboard () {
        return this.keyboardListener().isListening()
    }

    setIsRegisteredForKeyboard (aBool, useCapture) {
        this.keyboardListener().setUseCapture(useCapture).setIsListening(aBool)

        const e = this.element()
        if (aBool) {
            DomView._tabCount++
            e.tabIndex = DomView._tabCount // need this in order for focus to work on BrowserColumn?
            //this.setCssAttribute("outline", "none"); // needed?
        } else {
            delete e.tabindex
        }

        return this
    }

    /*
    onEnterKeyDown (event) {
        this.debugLog(" onEnterKeyDown")
        if (this.unfocusOnEnterKey() && this.isFocused()) {
            this.debugLog(" releasing focus")
            // this.releaseFocus() // TODO: implement something to pass focus up view chain to whoever wants it
            //this.element().parentElement.focus()
            if (this.parentView()) {
                this.parentView().focus()
            }
        }
        return this
    }
    */

    onKeyDown (event) {
        //BMKeyboard.shared().showEvent(event)

        let methodName = BMKeyboard.shared().downMethodNameForEvent(event)

        //console.log("event.repeat = ", event.repeat)
        //console.log(" onKeyDown ", methodName)
        
        if (!event.repeat) {
            return this.invokeMethodNameForEvent(methodName, event)
        } else {
            //const upMethodName = BMKeyboard.shared().upMethodNameForEvent(event)
            //this.invokeMethodNameForEvent(upMethodName, event)
            //this.forceRedisplay()
        }
        

        return true
    }

    forceRedisplay() {
        // NOTE: not sure this works
        const p = this.parentView()
        if (p) {
            const d = p.display()
            p.setDisplay("none")
            p.setDisplay(d)  
        }
        return this
    }

    invokeMethodNameForEvent (methodName, event) {
        //this.debugLog(".invokeMethodNameForEvent('" + methodName + "')")
        if (this[methodName]) {
            const stopProp = this[methodName].apply(this, [event])
            //event.preventDefault()
            if (stopProp === false) {
                //event.preventDefault()
                event.stopPropagation()
                return false
            }
        }

        return true
    }

    onKeyPress (event) {
        // console.log("onKeyPress")
        return true
    }

    onKeyUp (event) {
        let shouldPropogate = true
        //this.debugLog(" onKeyUp ", event._id)

        const methodName = BMKeyboard.shared().upMethodNameForEvent(event)
        //console.log("methodName: ", methodName)
        this.invokeMethodNameForEvent(methodName, event)

        this.didEdit()
        return shouldPropogate
    }

    didEdit () {
        this.debugLog(" didEdit")
        this.tellParentViews("onDidEdit", this)
        return this
    }

    onEnterKeyUp (event) {
        return true
    }

    // --- tabs and next key view ----

    onTabKeyDown (event) {
        // need to implement this on key down to prevent browser from handling tab?
        //this.debugLog(" onTabKeyDown ", event._id)

        if(this.selectNextKeyView()) {
            //event.stopImmediatePropagation() // prevent other listeners from getting this event
            //console.log("stopImmediatePropagation ")
        }
        return false
    }

    onTabKeyUp (event) {
        //this.debugLog(" onTabKeyUp ", event._id)
        return false
    }

    becomeKeyView () { 
        // use this method instead of focus() in order to give the receiver 
        // a chance to give focus to one of it's decendant views
        this.focus()
        return this
    }

    selectNextKeyView () {
        // returns true if something is selected, false otherwise

        //this.debugLog(" selectNextKeyView")
        const nkv = this.nextKeyView()
        if (nkv) {
            nkv.becomeKeyView()
            return true
        } else {
            const p = this.parentView()
            if (p) {
                return p.selectNextKeyView()
            }
        }
        return false
    }

    // --- error checking ---

    isValid () {
        return true
    }

    // --- focus and blur event handling ---

    isRegisteredForFocus () {
        return this.focusListener().isListening()
    }

    setIsRegisteredForFocus (aBool) {
        this.focusListener().setIsListening(aBool)
        return this
    }

    willAcceptFirstResponder () {
        //this.debugLog(".willAcceptFirstResponder()")
        return this
    }

    didReleaseFirstResponder () {
        // called on blur event from browser?
        return this
    }

    // firstResponder

    isFirstResponder () {
        return document.activeElement === this.element()
    }

    willBecomeFirstResponder () {
        // called if becomeFirstResponder accepts
    }

    becomeFirstResponder () {
        if (this.acceptsFirstResponder()) {
            this.willBecomeFirstResponder()
            this.focus()
        } else if (this.parentView()) {
            this.parentView().becomeFirstResponder()
        }
        return this
    }

    releaseFirstResponder () {
        // walk up parent view chain and focus on the first view to 
        // answer true for the acceptsFirstResponder message
        //this.debugLog(".releaseFirstResponder()")

        if (this.isFocused()) { 
            this.blur()
        }

        this.tellParentViews("decendantReleasedFocus", this)
        /*
        if (this.parentView()) {
            this.parentView().becomeFirstResponder()
        }
        */
        return this
    }

    // --------------------------------------------------------

    onFocusIn (event) {
        return true
    }

    onFocusOut (event) {
        return true
    }

    onFocus (event) {
        //console.log(this.typeId() + " onFocus")
        this.willAcceptFirstResponder();
        // subclasses can override 
        //this.debugLog(" onFocus")
        return true
    }

    onBlur (event) {
        //console.log(this.typeId() + " onBlur")
        this.didReleaseFirstResponder();
        // subclasses can override 
        //this.debugLog(" onBlur")
        return true
    }

    innerText () {
        const e = this.element()
        return e.textContent || e.innerText || "";
    }

    // --- set caret ----

    insertTextAtCursor(text) {
        const savedSelection = this.saveSelection()

        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode( document.createTextNode(text) );
            }
        } else if (document.selection && document.selection.createRange) {
            document.selection.createRange().text = text;
        }
        savedSelection.collapse()
        this.restoreSelection(savedSelection)

        return this
    }

    saveSelection() {
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                return sel.getRangeAt(0);
            }
        } else if (document.selection && document.selection.createRange) {
            return document.selection.createRange();
        }
        return null;
    }
    
    restoreSelection(range) {
        if (range) {
            if (window.getSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.selection && range.select) {
                range.select();
            }
        }
    }

    // --- set caret ----


    moveCaretToEnd () {
        const contentEditableElement = this.element()
        let range, selection;

        if (document.createRange) {
            //Firefox, Chrome, Opera, Safari, IE 9+
            range = document.createRange(); //Create a range (a range is a like the selection but invisible)
            range.selectNodeContents(contentEditableElement); //Select the entire contents of the element with the range
            range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
            selection = window.getSelection(); //get the selection object (allows you to change selection)
            selection.removeAllRanges(); //remove any selections already made
            selection.addRange(range); //make the range you have just created the visible selection
        }
        else if (document.selection) {
            //IE 8 and lower
            range = document.body.createTextRange(); //Create a range (a range is a like the selection but invisible)
            range.moveToElementText(contentEditableElement); //Select the entire contents of the element with the range
            range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
            range.select();//Select the range (make it the visible selection
        }
        return this
    }

    // --- text selection ------------------

    selectAll () {
        if (document.selection) {
            const range = document.body.createTextRange();
            range.moveToElementText(this.element());
            range.select();
        } else if (window.getSelection) {
            const selection = window.getSelection(); 
            const range = document.createRange();
            range.selectNodeContents(this.element());
            selection.removeAllRanges();
            selection.addRange(range);  
        }
    }

    // --- paste from clipboard ---

    onPaste (e) {
        // prevent pasting text by default after event
        e.preventDefault();

        const clipboardData = e.clipboardData;
        const rDataHTML = clipboardData.getData("text/html");
        const rDataPText = clipboardData.getData("text/plain");

        const htmlToPlainTextFunc = function (html) {
            const tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        }

        if (rDataHTML && rDataHTML.trim().length !== 0) {
            this.replaceSelectedText(htmlToPlainTextFunc(rDataHTML))
            return false; // prevent returning text in clipboard
        }

        if (rDataPText && rDataPText.trim().length !== 0) {
            this.replaceSelectedText(htmlToPlainTextFunc(rDataPText))
            return false; // prevent returning text in clipboard
        }
        return true
    }

    // ------------

    isRegisteredForClipboard () {
        return this.clipboardListener().isListening()
    }

    setIsRegisteredForClipboard (aBool) {
        this.clipboardListener().setIsListening(aBool)
        return this
    }

    replaceSelectedText (replacementText) {
        let range;
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(replacementText));
            }

            console.log("inserted node")
        } else if (document.selection && document.selection.createRange) {
            range = document.selection.createRange();
            range.text = replacementText;
            console.log("set range.text")
        }

        if (range) {
            // now move the selection to just the end of the range
            range.setStart(range.endContainer, range.endOffset);
        }

        return this
    }

    // untested

    getCaretPosition() {
        const editableDiv = this.element()
        let caretPos = 0
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount) {
                const range = sel.getRangeAt(0);
                if (range.commonAncestorContainer.parentNode == editableDiv) {
                    caretPos = range.endOffset;
                }
            }
        } else if (document.selection && document.selection.createRange) {
            const range = document.selection.createRange();
            if (range.parentElement() == editableDiv) {
                const tempEl = document.createElement("span");
                editableDiv.insertBefore(tempEl, editableDiv.firstChild);
                const tempRange = range.duplicate();
                tempRange.moveToElementText(tempEl);
                tempRange.setEndPoint("EndToEnd", range);
                caretPos = tempRange.text.length;
            }
        }
        return caretPos;
    }

    setCaretPosition (caretPos) {
        const elem = this.element();

        if(elem != null) {
            if(elem.createTextRange) {
                const range = elem.createTextRange();
                range.move("character", caretPos);
                range.select();
            }
            else {
                if(elem.selectionStart) {
                    elem.focus();
                    elem.setSelectionRange(caretPos, caretPos);
                } else {
                    elem.focus();
                }
            }
        }
    }

    // ---------------

    clearSelection () {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
        return this
    }

    setContentAfterOrBeforeString (aString, afterOrBefore) {
        const uniqueClassName = "UniqueClass_" + this.puuid()
        const e = this.element()
        if (e.className.indexOf(uniqueClassName) === -1) {
            const newRuleKey = "DomView" + uniqueClassName + ":" + afterOrBefore
            const newRuleValue = "content: \"" + aString + "\;"
            //console.log("newRule '" + newRuleKey + "', '" + newRuleValue + "'")
            document.styleSheets[0].addRule(newRuleKey, newRuleValue);
            e.className += " " + uniqueClassName
        }
        return this
    }

    setContentAfterString (aString) {
        this.setContentAfterOrBeforeString(aString, "after")
        return this
    }

    setContentBeforeString (aString) {
        this.setContentAfterOrBeforeString(aString, "before")
        return this
    }

    // scroll top

    setScrollTop (v) {
        this.element().scrollTop = v
        return this
    }

    scrollTop () {
        return this.element().scrollTop
    }

    // scroll width & scroll height

    scrollWidth () {
        return this.element().scrollWidth // a read-only value
    }

    scrollHeight () {
        return this.element().scrollHeight // a read-only value
    }

    // offset width & offset height

    offsetLeft () {
        return this.element().offsetLeft // a read-only value
    }

    offsetTop () {
        return this.element().offsetTop // a read-only value
    }

    // scroll actions

    scrollToTop () {
        this.setScrollTop(0)
        return this
    }

    scrollToBottom () {
        const focusedElement = document.activeElement
        const needsRefocus = focusedElement !== this.element()
        // console.log("]]]]]]]]]]]] " + this.typeId() + ".scrollToTop() needsRefocus = ", needsRefocus)

        this.setScrollTop(this.scrollHeight())

        if (needsRefocus) {
            focusedElement.focus()
        }
        //e.animate({ scrollTop: offset }, 500); // TODO: why doesn't this work?
        return this
    }

    scrollSubviewToTop (aSubview) {
        console.log("]]]]]]]]]]]] " + this.typeId() + ".scrollSubviewToTop()")
        assert(this.hasSubview(aSubview))
        //this.setScrollTop(aSubview.offsetTop())
        //this.setScrollTopSmooth(aSubview.offsetTop())
        //this.setScrollTop(aSubview.offsetTop() + aSubview.scrollHeight())
        this.animateValue(
            () => { return aSubview.offsetTop() },
            () => { return this.scrollTop() },
            (v) => { this.setScrollTop(v) },
            200)
        return this
    }

    animateValue (targetFunc, valueFunc, setterFunc, duration) { // duration in milliseconds         
        console.log("]]]]]]]]]]]] " + this.typeId() + ".animateValue()")
        if (duration == null) {
            duration = 200
        }
        //duration = 1500
        const startTime = Date.now();

        const step = () => {
            const dt = (Date.now() - startTime)
            let r = dt / duration
            r = Math.sin(r * Math.PI / 2)
            r = r * r * r

            const currentValue = valueFunc()
            const currentTargetValue = targetFunc()

            //console.log("time: ", dt, " /", duration, " r:", r, " top:", currentValue, "/", currentTargetValue)

            if (dt > duration) {
                setterFunc(currentTargetValue)
            } else {
                const newValue = currentValue + (currentTargetValue - currentValue) * r
                setterFunc(newValue)
                window.requestAnimationFrame(step);
            }
        }

        window.requestAnimationFrame(step);

        return this
    }

    setScrollTopSmooth (newScrollTop, scrollDuration) {
        this.animateValue(() => { return newScrollTop }, () => { return this.scrollTop() }, (v) => { this.setScrollTop(v) }, scrollDuration)
        return this
    }

    dynamicScrollIntoView () {
        this.parentView().scrollSubviewToTop(this)
        return this
    }

    scrollIntoView () {
        const focusedView = WebBrowserWindow.shared().activeDomView()
        //console.log("]]]]]]]]]]]] " + this.typeId() + ".scrollIntoView() needsRefocus = ", focusedView !== this)

        if (focusedView && focusedView !== this) {
            //console.log("scrollIntoView - registerForVisibility")
            // this hack is needed to return focus that scrollIntoView grabs from other elements
            // need to do this before element().scrollIntoView appearently
            this.registerForVisibility()
            this._endScrollIntoViewFunc = () => {
                //console.log("_endScrollIntoViewFunc - returning focus")
                //focusedView.focus()
                // need delay to allow scroll to finish - hack - TODO: check for full visibility
                focusedView.focusAfterDelay(0.2)
            }
        }
        this.addTimeout(() => {
            this.element().scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth", })
        }, 0)



        /*
        if (focusedView !== this) {
            focusedView.focusAfterDelay(0.5) // TODO: get this value from transition property
        }
        */
        return this
    }

    boundingClientRect () {
        return this.element().getBoundingClientRect()
    }

    viewportX () {
        return this.boundingClientRect().x
    }

    viewportY () {
        return this.boundingClientRect().y
    }

    containsViewportPoint () {
        throw new Error("unimplemented")
    }

    isScrolledIntoView () {
        const r = this.boundingClientRect()
        const isVisible = (r.top >= 0) && (r.bottom <= window.innerHeight);
        return isVisible;
    }

    // helpers

    /*
    mouseUpPos () { 
        return this.viewPosForWindowPos(Mouse.shared().upPos())
    }

    mouseCurrentPos () { 
        return this.viewPosForWindowPos(Mouse.shared().currentPos())
    }
    */

    mouseDownPos () {
        return this.viewPosForWindowPos(Mouse.shared().downPos())
    }

    // view position helpers ----

    setRelativePos (p) {
        // why not a 2d transform?
        this.setLeftPx(p.x())
        this.setTopPx(p.y())
        return this
    }

    containsPoint (aPoint) {
        // point must be in document coordinates
        return this.frameInDocument().containsPoint(aPoint)
    }

    // viewport coordinates helpers

    frameInViewport () {
        const origin = this.positionInViewport()
        const size = this.sizeInViewport()
        const frame = Rectangle.clone().setOrigin(origin).setSize(size)
        return frame
    }

    positionInViewport () {
        const box = this.element().getBoundingClientRect();
        return Point.clone().set(Math.round(box.left), Math.round(box.top));
    }

    sizeInViewport () {
        const box = this.element().getBoundingClientRect();
        return Point.clone().set(Math.round(box.width), Math.round(box.height));
    }

    // document coordinates helpers

    // --- document positioning ---

    setFrameInDocument (aRect) {
        this.setPosition("absolute")
        this.setLeftPx(aRect.origin().x())
        this.setTopPx(aRect.origin().y())
        this.setMinAndMaxSize(aRect.size())
        return this
    }

    frameInDocument () {
        const origin = this.positionInDocument()
        const size = this.size()
        const frame = Rectangle.clone().setOrigin(origin).setSize(size)
        return frame
    }

    // -------------------
    // fixed - assumes position is absolute and width and height are fixed via min-width === max-width, etc
    // -------------------

    // fixed position

    hasFixedX () {
        return !Type.isNullOrUndefined(this.leftPx() ) 
    }

    hasFixedY () {
        return !Type.isNullOrUndefined(this.topPx() ) 
    }

    hasFixedPosition () {
        return this.position() === "absolute" && this.hasFixedX() && this.hasFixedY()
    }

    // fixed size

    hasFixedSize () {
        return this.hasFixedWidth() && this.hasFixedHeight()
    }

    hasFixedWidth () {
        const v1 = this.minWidthPx()
        const v2 = this.maxWidthPx()
        return !Type.isNullOrUndefined(v1) && v1 === v2
    }

    hasFixedHeight () {
        const v1 = this.minHeightPx()
        const v2 = this.maxHeightPx()
        return !Type.isNullOrUndefined(v1) && v1 === v2
    }

    decrementFixedWidth () {
        assert(this.hasFixedWidth())
        this.setMinAndMaxWidth(Math.max(0, this.minWidthPx()-1))
        return this
    }

    decrementFixedHeight () {
        assert(this.hasFixedHeight())
        this.setMinAndMaxHeight(Math.max(0, this.minHeightPx()-1))
        return this
    }

    // fixed frame

    hasFixedFrame () {
        return this.hasFixedPosition() && this.hasFixedSize()
    }

    fixedFrame () {
        assert(this.hasFixedFrame())
        const origin = Point.clone().set(Math.round(this.leftPx()), Math.round(this.topPx()))
        const size   = Point.clone().set(Math.round(this.minWidthPx()), Math.round(this.minHeightPx()))
        const frame  = Rectangle.clone().setOrigin(origin).setSize(size)
        return frame
    }

    //--------------

    estimatedWidthPx () {
        const v1 = this.minWidthPx()
        const v2 = this.maxWidthPx()
        if (!Type.isNullOrUndefined(v1) && v1 === v2) {
            return v1
        }
        return this.clientWidth()
    }

    estimatedHeightPx () {
        const v1 = this.minHeightPx()
        const v2 = this.maxHeightPx()
        if (!Type.isNullOrUndefined(v1) && v1 === v2) {
            return v1
        }
        return this.clientHeight()
    }

    // ------------------------


    positionInDocument () {
        const box = this.element().getBoundingClientRect();

        // return Point.clone().set(Math.round(box.left), Math.round(box.top));

        const body = document.body;
        const docEl = document.documentElement;

        const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
        const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

        const clientTop = docEl.clientTop || body.clientTop || 0;
        const clientLeft = docEl.clientLeft || body.clientLeft || 0;

        const top = box.top + scrollTop - clientTop;
        const left = box.left + scrollLeft - clientLeft;

        const p = Point.clone().set(Math.round(left), Math.round(top));
        return p
    }

    size () {
        return EventPoint.clone().set(this.clientWidth(), this.clientHeight());
    }

    // ---------------------

    setFrameInParent (aRect) {
        this.setPosition("absolute")
        this.setLeftPx(aRect.origin().x())
        this.setTopPx(aRect.origin().y())
        this.setMinAndMaxSize(aRect.size())
        return this
    }

    frameInParentView () {
        const origin = this.relativePos()
        const size = this.size()
        const frame = Rectangle.clone().setOrigin(origin).setSize(size)
        return frame
    }

    // ---

    relativePos () {
        const pv = this.parentView()
        if (pv) {
            return this.positionInDocument().subtract(pv.positionInDocument())
            //return pv.positionInDocument().subtract(this.positionInDocument())
        }
        return this.positionInDocument()
    }

    setRelativePos (p) {
        //this.setPosition("absolute")
        this.setLeftPx(p.x())
        this.setTopPx(p.y())
        return this
    }

    // ---

    viewPosForWindowPos (pos) {
        return pos.subtract(this.positionInDocument())
    }

    // --------------

    makeAbsolutePositionAndSize () {
        const f = this.frameInParentView()
        this.setFrameInParent(f)
        return this 
    }

    makeRelativePositionAndSize () {
        // TODO: check if it's flex and set flex basis in flex direction instead?
        this.setPosition("relative")

        this.setTopPx(null)
        this.setLeftPx(null)
        this.setRightPx(null)
        this.setBottomPx(null)

        this.setMinAndMaxWidth(null)
        this.setMinAndMaxHeight(null)  
        return this 
    }

    // --------------

    cancelVerticallyAlignAbsolute () {
        this.setPosition("relative")
    }

    verticallyAlignAbsoluteNow () {
        const pv = this.parentView()
        if (pv) {
            this.setPosition("absolute")
            const parentHeight = pv.computedHeight() //pv.calcHeight() // computedHeight?
            const height = this.computedHeight()
            this.setTopPx((parentHeight / 2) - (height / 2))
        } else {
            throw new Error("missing parentView")
        }
        return this
    }

    horizontallyAlignAbsoluteNow () {
        const pv = this.parentView()
        if (pv) {
            this.setPosition("absolute")
            this.addTimeout(() => {
                this.setRightPx(pv.clientWidth() / 2 - this.clientWidth() / 2)
            }, 0)
        }
        return this
    }

    setVerticalAlign (s) {
        this.setCssAttribute("vertical-align", s)
        return this
    }

    // visibility event

    onVisibility () {
        //this.debugLog(".onVisibility()")
        this.unregisterForVisibility()
        return true
    }

    setIsRegisteredForVisibility (aBool) {
        if (aBool !== this.isRegisteredForVisibility()) {
            if (aBool) {
                this.registerForVisibility()
            } else {
                this.unregisterForVisibility()
            }
        }
        return this
    }

    unregisterForVisibility () {
        const obs = this.intersectionObserver()
        if (obs) {
            obs.disconnect()
            this.setIntersectionObserver(null);
            this._isRegisteredForVisibility = false
        }
        return this
    }

    registerForVisibility () {
        if (this.isRegisteredForVisibility()) {
            return this
        }

        let root = document.body

        if (this.parentView()) {
            root = this.parentView().parentView().element() // hack for scroll view - TODO: make more general
            //root = this.parentView().element()
        }

        const intersectionObserverOptions = {
            root: root, // watch for visibility in the viewport 
            rootMargin: "0px",
            threshold: 1.0
        }

        const obs = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    //console.log("onVisibility!")
                    if (this._endScrollIntoViewFunc) {
                        this._endScrollIntoViewFunc()
                        // hack around lack of end of scrollIntoView event 
                        // needed to return focus that scrollIntoView grabs from other elements
                    }

                    this.onVisibility()
                }
            })
        }, intersectionObserverOptions)

        this.setIntersectionObserver(obs);
        obs.observe(this.element());

        this._isRegisteredForVisibility = true
        return this
    }

    // centering

    fillParentView () {
        this.setWidthPercentage(100)
        this.setHeightPercentage(100)
        return this
    }

    centerInParentView () {
        this.setMinAndMaxWidth(null)
        this.setMinAndMaxHeight(null)
        //this.setWidth("100%")
        //this.setHeight("100%")
        this.setOverflow("auto")
        this.setMarginString("auto")
        this.setPosition("absolute")
        this.setTopPx(0).setLeftPx(0).setRightPx(0).setBottomPx(0)
    }

    /*
    verticallyCenterFromTopNow () {
        if (this.parentView() === null) {
            console.warn("verticallyCenterFromTopNow called on view with no superview")
            return this
        }

        this.setPosition("absolute")
        this.setDisplay("inline-block")

        // timeout used to make sure div is placed and laid out first
        // TODO: consider ordering issue
        this.addTimeout(() => { 
            let sh = this.parentView().clientHeight()
            let h = this.clientHeight()
            this.setTopPx(sh/2 - h/2)
        }, 1)

        return this
    }

    horiontallyCenterFromLeftNow () {
        if (this.parentView() === null) {
            console.warn("horiontallyCenterFromLeftNow called on view with no superview")
            return this
        }

        this.setPosition("absolute")
        this.setDisplay("inline-block")

        // timeout used to make sure div is placed and laid out first
        // TODO: consider ordering issue
        this.addTimeout(() => { 
            let sw = this.parentView().clientWidth()
            let w = this.clientWidth()
            this.setTopPx(sw/2 - w/2)
        }, 1)

        return this
    }
    */

    static documentBodyView () {
        return DocumentBody.shared()
    }

    rootView () {
        const pv = this.parentView()
        if (pv) {
            return pv.rootView()
        }
        return this
    }

    isInDocument () {
        return this.rootView() === DocumentBody.shared()
    }

    disablePointerEventsUntilTimeout (ms) {
        this.setPointerEvents("none")
        this.debugLog(" disabling pointer events")

        this.addTimeout(() => {
            this.debugLog(" enabling pointer events")
            this.setPointerEvents("inherit")
        }, ms)

        return this
    }

    containerize () {
        // create a subview of same size as parent and put all other subviews in it
        const container = DomView.clone()
        container.setMinAndMaxHeight(this.clientHeight())
        container.setMinAndMaxWidth(this.clientWidth())
        this.moveAllSubviewsToView(container)
        this.addSubview(container)
        return container
    }

    uncontainerize () {
        assert(this.subviewCount() === 1)
        const container = this.subviews().first()
        this.removeSubview(container)
        container.moveAllSubviewsToView(this)
        return this
    }

    moveAllSubviewsToView (aView) {
        this.subviews().shallowCopy().forEach((sv) => {
            this.remove(sv)
            aView.addSubview(sv)
        })
        return this
    }

    // auto fit 
    // need to be careful about interactions as some of these change 
    // display and position attributes
    // NOTE: when we ask parent to fit child, should we make sure child position attribute allows this?

    hasAbsolutePositionChild () {
        const match = this.subviews().detect(sv => sv.position() === "absolute")
        return !Type.isNullOrUndefined(match)
    }

    // auto fit width

    autoFitParentWidth () {
        this.setDisplay("block")
        this.setWidth("-webkit-fill-available")
        //this.setHeight("fill-available")
        return this
    }

    autoFitChildWidth () {
        //assert(!this.hasAbsolutePositionChild()) // won't be able to autofit!
        this.setDisplay("inline-block")
        this.setWidth("auto")
        this.setOverflow("auto")
        return this
    }

    // auto fit height

    autoFitParentHeight () {
        this.setPosition("absolute")
        //this.setHeightPercentage(100)
        this.setHeight("-webkit-fill-available")
        //this.setHeight("fill-available")
        return this
    }

    autoFitChildHeight () {
        //assert(!this.hasAbsolutePositionChild()) // won't be able to autofit!
        this.setPosition("relative") // or static? but can't be absolute
        this.setHeight("fit-content")
        return this
    }

    // organizing

    moveToAbsoluteDocumentBody () {
        const f = this.frameInDocument()
        this.setFrameInDocument(f)
        this.removeFromParentView()
        DocumentBody.shared().addSubview(this)
        return this
    }

    // organizing

    absoluteOrganizeSubviewsVertically () {
        let top = 0
        this.subviews().shallowCopy().forEach((sv) => {
            const h = sv.clientHeight()
            sv.setLeftPx(0)
            sv.setTopPx(top)
            top += h
        })
    }

    absoluteOrganizeSubviewsHorizontally () {
        let left = 0
        this.subviews().shallowCopy().forEach((sv) => {
            const w = sv.clientWidth()
            sv.setLeftPx(left)
            sv.setTopPx(0)
            left += x
        })
    }

    // html duplicates

    htmlDuplicateView () {
        const v = DomView.clone()
        v.setFrameInParent(this.frameInParentView())
        v.setInnerHTML(this.innerHTML())
        return v
    }

    htmlDuplicateViewAndSubviews (selectedSubviews) {
        selectedSubviews.forEach(sv => asset(sv.parentView() === this))

        const v = DomView.clone()
        v.setFrameInParent(this.frameInParentView())
        selectedSubviews.forEach(sv => v.addSubview(sv.htmlDuplicateView()))
        return v
    }

    htmlDuplicateViewWithSubviews () {
        const v = DomView.clone()
        v.setFrameInParent(this.frameInParentView())
        this.subviews().forEach(sv => v.addSubview(sv.htmlDuplicateView()))
        return v
    }

    // fitting

    fitSubviews () {
        const f = this.frameFittingSubviewsInParent()
        this.setFrameInParent(f)
        return this
    }

    frameFittingSubviewsInParent () {
        let u = null

        this.subviews().forEach(sv => {
            const f = sv.frameInParent()
            if (u === null) {
                u = f
            } else {
                u = u.unionWith(f)
            }
        })

        return u
    }

    fixedFrameFittingSubviews() {
        let u = null

        this.subviews().forEach(sv => {
            const f = sv.fixedFrame()
            if (u === null) {
                u = f
            } else {
                u = u.unionWith(f)
            }
        })

        return u
    }

    convertFrameToDocument (aRect) {
        const p = this.positionInDocument()
        const newOrigin = aRect.origin().add(p)
        return aRect.copy().setOrigin(newOrigin)
    }

    // ----

    resyncAllViews () {
        this.subviews().forEach(sv => sv.resyncAllViews())
        return this
    }

}.initThisClass()
