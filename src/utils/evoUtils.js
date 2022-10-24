const evoUtils = {
    getOwner: async (contract, tokenId) => {
        let ownerOf = await contract.ownerOf(tokenId)
        return ownerOf
    }
}

export default evoUtils