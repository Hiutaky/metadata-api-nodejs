import { getJsonWalletAddress } from "@ethersproject/json-wallets";
import {utils, ethers, BigNumber} from "ethers"
import EvoSkullArtifacts from "./src/abi/ERC721evo.json";
import PetArtifacts from "./src/abi/EvoPet.json";
import CockPitAdapter from "./src/core/CockPitAdapter.js"
import { CNS } from '@cnsdomains/core'
import fetch from "node-fetch"


const evoColl = new ActiveInstance({
    apiKey: API_KEY,
    baseURI: BASE_URI,
    RPC,
    type: "collections",
    slug: "evoskull",
});

evoColl.mountContract(
    "0xbf4E430cD0ce8b93d4760958fe4ae66cDaCDB6c6",
    EvoSkullArtifacts.abi
)
//first callback fired on start
evoColl.beforeStart(
    async () => {
        //update supply
        let config = {
            type: "singletons",
            slug: "evoskull" 
        }
        let adapter = new CockPitAdapter({
            apiKey: API_KEY,
            baseURI: BASE_URI,
        })
        let supply = (await evoColl.contract.totalSupply()).toString()
        await adapter.save({
            ...config,
            payload: {
                "data": {
                    "totalSupply": supply
                }
            }
        })
        console.log(
            `Total Supply updated to ${supply}.`
        )
    }
)
evoColl.addEventCallback(
    {
        Transfer: () => `seconda`,
        EvoLevelUp: async (args) => {
            
        },
    }
)

const getOwner = async (contract, tokenId) => {
    let ownerOf = await contract.ownerOf(tokenId)
    return ownerOf
}

const getToken = async (contract, tokenId) => {
    let keys = []
    let rawToken = await contract.getToken(tokenId)
    let token = rawToken.currentToken
    Object.keys(token).forEach((e, key) => {
        if( parseInt(e) <= 17 ) return
        keys.push(e)
    })
    let cleanEvo = []
    for(let i = 0; i < keys.length; i++){
        let k = keys[i]
        cleanEvo[k] =  token[k] instanceof BigNumber ? token[k].toString() : token[k]
    }
    return cleanEvo
}
const getPet = async (contract, tokenId) => {
    let keys = []
    let rawToken = await contract.getToken(tokenId)
    let token = rawToken.currentToken
    Object.keys(token).forEach((e, key) => {
        if( parseInt(e) <= 15 ) return
        keys.push(e)
    })
    let cleanEvo = []
    for(let i = 0; i < keys.length; i++){
        let k = keys[i]
        cleanEvo[k] =  token[k] instanceof BigNumber ? token[k].toString() : token[k]
    }
    return cleanEvo
}
//evoColl.start()


const petColl = new ActiveInstance({
    apiKey: API_KEY,
    baseURI: BASE_URI,
    RPC,
    type: "collections",
    slug: "seasonalpet"
})

petColl.mountContract(
    "0xB77959DC7a12F7549ACC084Af01259Fc48813c89",
    PetArtifacts.abi
)


petColl.beforeStart( () => { })

petColl.addEventCallback({
    EvoLevelUp: async (args) => {
        let { apiAdapter, config, contract, provider } = petColl
        const cns = new CNS("0x19", provider)
        let supply = (await contract.totalSupply()).toString()

        console.log( supply)
        let token = await getPet(contract, 290)
        console.log(token)
        let timer = 5
        for( let i = 1; i <= supply; i++) {
            setTimeout( async () => {
                let tokenId = i// args.a.toString()
                let entryId = await apiAdapter.get({
                    ...config,
                    payload: {
                        "filter": {
                            "tokenId": tokenId
                        }
                    }
                })
                let token = await getPet(contract,tokenId)
                let ownerOf = await getOwner(contract, tokenId)
                let cnsDomain = await cns.getName(ownerOf)
                let payload = token
                if( entryId.entries[0]  ){ //tokenExist in API
                    payload = {
                        ...payload,
                        "_id": entryId.entries[0]._id
                    }
                }else{//get tokenId and metadata
                    let metadata = await fetch(`https://croskull.mypinata.cloud/ipfs/QmdsfQtarHc8BMkfHqyfX7gnoxHHeXeeLjMxY7qFHEZ3WP/${i}.json`)
                    metadata = (await metadata.json())
                    payload = { 
                        ...payload,
                        "tokenId": i,
                        "metadata": metadata,
                    }
                }
                payload = {
                    ...payload,
                    "cns": cnsDomain ? cnsDomain : false,
                    "owner": ownerOf
                }
                await apiAdapter.save({
                    ...config,
                    payload: {
                        "data": payload
                    }
                })
                console.log( `Pet : ${i} updated` )
            } , `${ timer }00`)
            timer++
        }
    }
})
petColl.start()
