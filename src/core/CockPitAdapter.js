import axios from "axios"
import { json } from "express"

class CockPitAdapter {
    constructor({
        apiKey,
        baseURI
    }){
        if( ! apiKey || ! baseURI ) return

        this.apiKey = apiKey
        this.baseURI = `${baseURI}/api`
    }

    async get({
        type, // collections || singletons
        slug,
        payload = false
    }) {
        try {
            let req = false;
            if( payload ){
                req = await axios.post(
                    `${this.baseURI}/${type}/get/${slug}`,
                    payload
                )
            }else{
                req = await axios.get(
                    `${this.baseURI}/${type}/get/${slug}`
                )
            }
            return req.data
        } catch(error) {
            console.error(error)
        }
    }

    async save({
        type, // collections || singletons
        slug,
        payload //payload to save
    }) {
        if( ! payload ) return false
        try {
            let savingRequest = 
                await axios.post(
                    `${this.baseURI}/${type}/save/${slug}?token=${this.apiKey}`,
                    payload
                )
                return savingRequest.data
            return 
        } catch(error) {
            console.error( error )
            return false;
        }
    }
}

export default CockPitAdapter