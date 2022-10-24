//manage ethers contract's events and related callbacks
class BaseInstance {
    constructor ({
        contract = false, //provider to be used
        eventsCallbacks = {},//events to subscribe on init
    }) {
        if( ! contract || ! eventsCallbacks )
            return false

        this.started = false
        
        this.contract = contract
        
        //this.eventsCallbacks = eventsCallbacks
        this.pausedEvents = eventsCallbacks   
    }

    //register one o multiple callbacks
    addEventCallback( eventCallback ) {
        Object.keys(eventCallback).map(async (name, i) => {
            let callback = eventCallback[name]
            if( this.started ) {
                this.addEventListner( name, callback )
            } else {
                this.pausedEvents = {
                    ...this.pausedEvents,
                    [name]: callback
                }
            }
        })
    }

    addEventListner( eventName, callback ) {
        console.log(`* ${eventName} Listner Started`)
        this.contract.on( eventName, async (a,b,c,d,e,f) => {
            try{
                await callback({
                    a,b,c,d,e,f
                })
            } catch (e) {
                console.error(e)
            }
        })
        this.eventsCallbacks = {
            ...this.eventsCallbacks,
            [eventName]: callback
        }
    }

    /**
     * [
     *     'Transfer': callback() {},
     * ]
     */

    async start () {
        if( this.started ) return
        this.loadEventsCallbacks()
        this.started = true
    }


    loadEventsCallbacks() {
        if( ! this.pausedEvents ) throw new Error(`No Events to Listen`)
        Object.keys(this.pausedEvents).map(async (name, i) => {
            let callback = this.pausedEvents[name]
            this.addEventListner(name, callback)
        })
    }
}

export default BaseInstance