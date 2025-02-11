"use strict"

/*
    App 
    
    A shared instance that represents the application. For your application, 
    create a subclass called App and implement a custom setup method.

    Handles starting up persistence system.

*/

window.App = class App extends BMStorableNode {
    
    static loadAndRunShared () {
        const name = this.name
        this.defaultStore().setName(name)

        /*
        const successCallback = () => {
            this.defaultStore().rootOrIfAbsentFromClosure(() => BMStorableNode.clone())
            const app = this.defaultStore().rootObject().subnodeWithTitleIfAbsentInsertProto(name, this)
            this.setShared(app)
            app.run()
        }

        const errorCallback = (errorMessage) => {
            window.ResourceLoaderPanel.shared().setError(errorMessage)
            return this
        }

        this.defaultStore().asyncOpen(successCallback, errorCallback) 
        */

        this.defaultStore().asyncOpen(() => { this.onLoadSuccess() }, (e) => { this.onLoadError(e) }) 
    }

    static onLoadSuccess () {
        const name = this.name
        this.defaultStore().rootOrIfAbsentFromClosure(() => BMStorableNode.clone())
        const app = this.defaultStore().rootObject().subnodeWithTitleIfAbsentInsertProto(name, this)
        this.setShared(app)
        app.run()
    }

    static onLoadError (errorMessage) {
        window.ResourceLoaderPanel.shared().setError(errorMessage)
    }

    initPrototype () {
        this.newSlot("name", "App")
        this.newSlot("version", [0, 0])
        //this.newSlot("nodeStoreDidOpenObs", null)
    }

    init () {
        super.init()

        //Documentation.shared().show()
        //console.log(ProtoClass.subclassesDescription())

        //this.setNodeStoreDidOpenObs(window.BMNotificationCenter.shared().newObservation())
        //this.nodeStoreDidOpenObs().setName("nodeStoreDidOpen").setObserver(this).setTarget(this.defaultStore())
        this.setIsDebugging(true)
    }

    title () {
        return this.name()
    }
    
    // run and setup sequence in order of which methods are called
    // 1. setup NodeStore

    isBrowserCompatible () {
        // subclasses can override to do their own checks
        return true
    }

    run () {
        if (!this.isBrowserCompatible()) {
            window.ResourceLoaderPanel.shared().setError("Sorry, this app only works on<br>Chrome, FireFox, and Brave browsers.")
            return this
        }

        /*
        this.nodeStoreDidOpenObs().watch()
        this.defaultStore().setName(this.name())

        const errorCallback = (errorMessage) => {
            window.ResourceLoaderPanel.shared().setError(errorMessage)
            return this
        }
        this.defaultStore().asyncOpen(null, errorCallback) 
       this.nodeStoreDidOpen()
        */

       this.setup()

    }

    /*
    showBrowserCompatibilityPanel () {
        console.log("showing panel")
        const panel = window.PanelView.clone()
        this.documentBodyView().addSubview(panel)
        panel.setTitle("Sorry, this app only works on<br>Chrome, FireFox, and Brave browsers.")
        panel.orderFront()
        panel.setZIndex(100)
        console.log("showed panel")
    }
    */

    // 2. setup 

    /*
    nodeStoreDidOpen (aNote) {
        console.log("App nodeStoreDidOpen <<<<<<<<<<<<<<<<<<")
        this.nodeStoreDidOpenObs().stopWatching()
        this.defaultStore().rootOrIfAbsentFromClosure(() => BMStorableNode.clone())
        this.setup()
    }
    */

    setup () {
        return this        
    }

    appDidInit () {
        this.showVersion()

        this.postNoteNamed("appDidInit")

        if (this.runTests) {
		    this.runTests()
        }

        //Documentation.shared().show()
        //this.registerServiceWorker() // not working yet
        window.ResourceLoaderPanel.shared().stop() 
    }
	
    documentBodyView () {
        //return DomView.documentBodyView()
        return WebBrowserWindow.shared().documentBody()
    }

    mainWindow () {
        return Window
    }

    setName (aString) {
        this._name = aString
        this.setTitle(aString)
        WebBrowserWindow.shared().setTitle(aString)
        return this
    }
    
    // --- version ---

    versionsString () {
        return this.version().join(".")
    }

    showVersion () {
        console.log("Application '" + this.name() + "' version " + this.versionsString())
    }

    // --- server worker ---

    /*
    registerServiceWorker () {
        // doesn't work
        // "srsourcec/ServiceWorker.js"
        // "/source/ServiceWorker.js"
        // "../ServiceWorker.js"
        const path = "ServiceWorker.js"
        console.log("registering service worker '" + path + "'")
        const promise = navigator.serviceWorker.register(path); //{ scope: ""../"}

        promise.then(function (registration) {
            console.log("Service worker successfully registered on scope", registration.scope);
        }).catch(function (error) {
            console.log("Service worker failed to register:\n",
                "  typeof(error): ", typeof(error), "\n", 
                "  message:", error.message, "\n",
                "  fileName:", error.fileName, "\n",
                "  lineNumber:", error.lineNumber,  "\n",
                "  stack:", error.stack,  "\n"
                //"  JSON.stringify(error):", JSON.stringify(error),  "\n",
                //"  toString:", error.toString()
            );
        });
    }
    */

    setupTheme () {
        const doc = DocumentBody.shared()
        doc.setColor("#f4f4ec")
        doc.setBackgroundColor("rgb(25, 25, 25)")

        this.setupNormalTheme()
        //this.setupVectorTheme()
    }

    setupNormalTheme () {
        const doc = DocumentBody.shared()
        doc.setBackgroundColor("#191919")
        //doc.setFontFamily("Sans-Serif")
        //doc.setFontFamily("Electrolize-Regular")
        doc.setFontFamily("Helvetica")
        //doc.setFontWeight("bold")
        //doc.setFontFamily("Helvetica Neue")
        //doc.setFontFamily("San Francisco Display")
        //doc.setFontFamily("PublicSans Light")
        //doc.setFontFamily("OpenSans Regular")
        doc.setFontSizeAndLineHeight("15px")
        doc.setLetterSpacing("0.05em")
        //doc.setTextTransform("uppercase")
   }

}.initThisClass()
