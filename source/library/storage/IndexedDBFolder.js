"use strict"

/* 

    IndexedDBFolder

*/

window.IndexedDBFolder = class IndexedDBFolder extends ProtoClass {
    initPrototype() {
        this.newSlot("path", "/")
        this.newSlot("pathSeparator", "/") // path should end with pathSeparator
        this.newSlot("db", null)
        this.newSlot("didRequestPersistence", false)
        this.newSlot("isGranted", false)
    }

    init() {
        super.init()
        //this.requestPersistenceIfNeeded()
        this.setIsDebugging(false)
    }

    hasIndexedDB() {
        return "indexedDB" in window;
    }

    requestPersistenceIfNeeded() {
        if (!IndexedDBFolder.didRequestPersistence()) {
            this.requestPersistence()
        }
        return this
    }

    requestPersistence() {
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then((granted) => {
                this.setIsGranted(granted)
                if (granted) {
                    alert("Storage will not be cleared except by explicit user action");
                } else {
                    alert("Storage may be cleared by the UA under storage pressure.");
                }
            })
        }

        IndexedDBFolder.setDidRequestPersistence(true)

        return this
    }

    storeName() {
        return this.path()
    }

    root() {
        if (!IndexedDBFolder._root) {
            IndexedDBFolder._root = IndexedDBFolder.clone()
            // IndexedDBFolder._root.rootShow()
        }
        return IndexedDBFolder._root
    }

    isOpen() {
        return (this.db() !== null)
    }

    asyncOpenIfNeeded(callback, errorCallback) {
        if (!this.isOpen()) {
            this.asyncOpen(callback, errorCallback)
        } else {
            callback()
        }
    }

    asyncOpen(successCallback, errorCallback) {

        if (!this.hasIndexedDB()) {
            errorCallback("IndexedDB unavailable on this client.")
            return
        }

        this.debugLog(() => { "asyncOpen '" + this.path() + "'" })

        const request = window.indexedDB.open(this.path(), 2);

        request.onsuccess = (event) => {
            this.onOpenSuccess(event, successCallback, errorCallback)
        }

        request.onupgradeneeded = (event) => {
            this.onOpenUpgradeNeeded(event, successCallback, errorCallback)
        }

        request.onerror = (event) => {
            this.onOpenError(event, successCallback, errorCallback)
        }


        return this
    }

    onOpenError (event, successCallback, errorCallback) {
        let message = event.message
        if (!message) {
            message = "Unable to open IndexedDB.<br>May not work on Brave Browser."
            this.debugLog(" open db error: ", event);
        }

        if (errorCallback) {
            errorCallback(message)
        }
    }

    onOpenUpgradeNeeded (event, successCallback, errorCallback) {
        this.debugLog(" onupgradeneeded - likely setting up local database for the first time")

        const db = event.target.result;

        db.onerror = function (event) {
            console.log("db error ", event)
        };

        this.setDb(db)

        const objectStore = db.createObjectStore(this.storeName(), { keyPath: "key" }, false);
        objectStore.createIndex("key", "key", { unique: true });
    }

    onOpenSuccess(event, successCallback, errorCallback) {
        this.setDb(event.target.result)
        if (successCallback) {
            successCallback()
        }
    }

    close() {
        if (this.isOpen()) {
            this.db().close()
            this.setIsOpen(false)
            this.setDb(null)
        }
        return this
    }

    // paths

    folderAt(pathComponent) {
        assert(!pathComponent.contains(this.pathSeparator()))
        const db = IndexedDBFolder.clone().setPath(this.path() + pathComponent + this.pathSeparator())
        return db
    }

    pathForKey(key) {
        //assert(!key.contains(this.pathSeparator()))
        return this.path() + key
    }

    // reading

    asyncHasKey (key, callback) {
        const objectStore = this.db().transaction(this.storeName(), "readonly").objectStore(this.storeName())
        //const keyRangeValue = IDBKeyRange.bound(key, key)
        //const request = objectStore.openCursor(keyRangeValue)
        const request = objectStore.openCursor(key)

        request.onsuccess = function(e) {
          var cursor = e.target.result
          if (cursor) { // key already exist
             callback(true)
          } else { // key not exist
            callback(false)
          }
        }

        /*
        request.onerror = (event) => {
            console.log("asyncAt('" + key + "') onerror", event.target.error)
            callback(undefined)
        }
        */
    }
    
    asyncAt (key, callback) {
        //console.log("asyncAt ", key)
        const objectStore = this.db().transaction(this.storeName(), "readonly").objectStore(this.storeName())
        const request = objectStore.get(key);

        const stack = "(stack recording disabled)" //new Error().stack
        
        request.onerror = (event) => {
            console.log("asyncAt('" + key + "') onerror", event.target.error)
            callback(undefined)
        }
        
        request.onsuccess = (event) => {
            // request.result is undefined if value not in DB
            try {
                if (!Type.isUndefined(request.result)) {
                    const entry = request.result
                    const value = JSON.parse(entry.value)
                    callback(value)
                } else {
                    callback(undefined)
                }
            } catch (e) {
                this.debugLog(" asyncAt('" +  key + "') caught stack ", stack)
            }
        }
        
        return this
    }
    

    asyncAllKeys(callback) {
        const keys = []
        const cursorRequest = this.db().transaction(this.storeName(), "readonly").objectStore(this.storeName()).openCursor()

        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor) {
                keys.push(cursor.value.key)
                cursor.continue()
            } else {
                callback(keys)
            }
        }

        cursorRequest.onerror = (event) => {
            this.debugLog(" asyncAsJson cursorRequest.onerror ", event)
            throw newError("error requesting cursor")
        }
    }

    asyncForeachKey(callback) {
        const cursorRequest = this.db().transaction(this.storeName(), "readonly").objectStore(this.storeName()).openCursor()

        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor) {
                const key = cursor.value.key
                callback(key)
                cursor.continue()
            }
        }

        cursorRequest.onerror = (event) => {
            this.debugLog(" asyncAsJson cursorRequest.onerror ", event)
            throw newError("error requesting cursor")
        }
    }


    asyncAsJson(callback) {
        //console.log("asyncAsJson start")
        const cursorRequest = this.db().transaction(this.storeName(), "readonly").objectStore(this.storeName()).openCursor()
        const dict = {}

        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;

            if (cursor) {
                dict[cursor.value.key] = JSON.parse(cursor.value.value)
                cursor.continue();
            } else {
                //this.debugLog(" asyncAsJson returning dict ", JSON.stringify(dict))
                callback(dict)
            }
        };

        cursorRequest.onerror = (event) => {
            this.debugLog(" asyncAsJson cursorRequest.onerror ", event)
            throw newError("error requesting cursor")
        }
    }

    show() {
        this.asyncAsJson((json) => {
            this.debugLog(" " + this.path() + " = " + JSON.stringify(json, null, 2))
        })
    }

    // removing

    asyncClear(callback, errorCallback) {
        const transaction = this.db().transaction([this.storeName()], "readwrite");

        transaction.onerror = function (event) {
            if (errorCallback) {
                console.log("db clear error")
                errorCallback(event)
            }
        };

        transaction.oncomplete = function (event) {
            console.log("db clear completed")
        }

        const objectStore = transaction.objectStore(this.storeName());
        const request = objectStore.clear();

        request.onsuccess = function (event) {
            if (callback) {
                console.log("db clear request success")
                callback(event)
            }
        };
    }

    asyncDelete() {
        const request = window.indexedDB.deleteDatabase(this.storeName())

        request.onerror = (event) => {
            this.debugLog("Error deleting '" + this.storeName() + "'");
        }

        request.onsuccess = (event) => {
            this.debugLog(" deleted successfully '" + this.storeName() + "'");
        }

        this.setDb(null)
        return this
    }

    // test

    test() {
        const folder = IndexedDBFolder.clone()
        folder.asyncOpen(() => {
            folder.atPut("test", "x")

            folder.asyncAsJson(function (dict) {
                console.log("db dict = ", dict)
            })

            folder.asyncAt("test", function (value) {
                console.log("read ", value)
            })
        })

    }

    newTx() {
        return window.IndexedDBTx.clone().setDbFolder(this)
    }
}.initThisClass()
