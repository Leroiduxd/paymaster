// abi/executorAbi.js (CommonJS)
module.exports = [
    {
      inputs: [
        { internalType: "address", name: "trader", type: "address" },
        { internalType: "uint256", name: "tradeId", type: "uint256" },
        { internalType: "uint64", name: "amount6", type: "uint64" },
        { internalType: "uint256", name: "deadline", type: "uint256" },
        { internalType: "bytes", name: "signature", type: "bytes" }
      ],
      name: "executeAddMargin",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "address", name: "trader", type: "address" },
        { internalType: "uint256", name: "tradeId", type: "uint256" },
        { internalType: "uint256", name: "deadline", type: "uint256" },
        { internalType: "bytes", name: "signature", type: "bytes" }
      ],
      name: "executeCancelOrder",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "address", name: "trader", type: "address" },
        { internalType: "uint256", name: "tradeId", type: "uint256" },
        { internalType: "int32", name: "lotsToClose", type: "int32" },
        { internalType: "uint256", name: "deadline", type: "uint256" },
        { internalType: "bytes", name: "oracleProof", type: "bytes" },
        { internalType: "bytes", name: "signature", type: "bytes" }
      ],
      name: "executeCloseMarket",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "address", name: "trader", type: "address" },
        { internalType: "uint32", name: "assetId", type: "uint32" },
        { internalType: "bool", name: "isLong", type: "bool" },
        { internalType: "uint8", name: "leverage", type: "uint8" },
        { internalType: "int32", name: "lotSize", type: "int32" },
        { internalType: "uint48", name: "stopLoss", type: "uint48" },
        { internalType: "uint48", name: "takeProfit", type: "uint48" },
        { internalType: "uint256", name: "deadline", type: "uint256" },
        { internalType: "bytes", name: "oracleProof", type: "bytes" },
        { internalType: "bytes", name: "signature", type: "bytes" }
      ],
      name: "executeOpenMarket",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "address", name: "trader", type: "address" },
        { internalType: "uint32", name: "assetId", type: "uint32" },
        { internalType: "bool", name: "isLong", type: "bool" },
        { internalType: "bool", name: "isLimit", type: "bool" },
        { internalType: "uint8", name: "leverage", type: "uint8" },
        { internalType: "int32", name: "lotSize", type: "int32" },
        { internalType: "uint48", name: "targetPrice", type: "uint48" },
        { internalType: "uint48", name: "stopLoss", type: "uint48" },
        { internalType: "uint48", name: "takeProfit", type: "uint48" },
        { internalType: "uint256", name: "deadline", type: "uint256" },
        { internalType: "bytes", name: "signature", type: "bytes" }
      ],
      name: "executePlaceOrder",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "address", name: "trader", type: "address" },
        { internalType: "uint256", name: "tradeId", type: "uint256" },
        { internalType: "uint48", name: "newSL", type: "uint48" },
        { internalType: "uint48", name: "newTP", type: "uint48" },
        { internalType: "uint256", name: "deadline", type: "uint256" },
        { internalType: "bytes", name: "signature", type: "bytes" }
      ],
      name: "executeUpdateSLTP",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];