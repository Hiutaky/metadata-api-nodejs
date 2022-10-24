import { ethers } from "ethers"
import BaseInstance from "./BaseInstance.js"
import CockPitAdapter from "./CockPitAdapter.js"

class ActiveInstance {
    constructor({
        apiKey,
        baseURI,
        RPC,
        type,
        slug,
        eventsCallbacks = {}
    }) {
        this.contract = false
        this.eventsCallbacks = eventsCallbacks
        this.RPC = RPC
        if( type && slug)
            this.config = {
                type: type,
                slug: slug
            }
        this.loading = true
        if( baseURI && apiKey )
            this.mountAdapter(apiKey, baseURI)
        this.init()
    }
    
    init() {
        this.provider = new ethers.providers.JsonRpcProvider(this.RPC)
        this.loading = false
    }

    beforeStart (callback) {
        this.beforeStartCallback = callback
    }

    mountAdapter (apiKey, baseURI) {
        this.apiAdapter = new CockPitAdapter({
            apiKey: apiKey,
            baseURI: baseURI
        })
    }


    mountContract (address, abi) {
        this.contract = new ethers.Contract(
            address,
            abi,
            this.provider ? this.provider : new ethers.providers.JsonRpcProvider(this.RPC)
        )
        this.initInstance()
    }

    initInstance () {
        this.instance = new BaseInstance({
            contract: this.contract,
            eventsCallbacks: this.eventsCallbacks
        })
        this.start = async () => {
            console.log(`Running BeforeStart Callback`)
            this.beforeStartCallback &&
                await this.beforeStartCallback()
            await this.instance.start() 
        }
        this.addEventCallback = (args) => this.instance.addEventCallback(args)
    }
}

export default ActiveInstance