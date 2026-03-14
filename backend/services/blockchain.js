// ─────────────────────────────────────────────
// Shared Blockchain Service
// Single source of truth for provider, wallet, and contract instances
// Used by both faucet and settlement
// ─────────────────────────────────────────────
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const deployment = require("../../database/deployment.json");

// Load ABIs from Hardhat artifacts
const INR_ABI    = require("../../artifacts/contracts/DvPSettlement.sol/INRToken.json").abi;
const DVP_ABI    = require("../../artifacts/contracts/DvPSettlement.sol/DvPSettlement.json").abi;
const STOCK_ABI  = require("../../artifacts/contracts/DvPSettlement.sol/StockToken.json").abi;

// Provider + deployer wallet
const provider       = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://ethereum-sepolia.publicnode.com");
const deployerWallet = process.env.DEPLOYER_PRIVATE_KEY
  ? new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)
  : null;

// For localhost: use the default Hardhat account #0
let signer = deployerWallet;
if (!signer) {
  // Fallback: will be set asynchronously
  signer = null;
}

// Contract instances (using deployer as signer for write operations)
function getDeployerSigner() {
  return signer;
}

async function initSigner() {
  if (!signer) {
    // On localhost, use the first Hardhat signer
    const signers = await provider.listAccounts();
    if (signers.length > 0) {
      // For Hardhat JSON-RPC, we need to use a JsonRpcSigner
      signer = await provider.getSigner(0);
    }
  }
  return signer;
}

function getInrToken() {
  const s = getDeployerSigner();
  return new ethers.Contract(deployment.contracts.INRToken, INR_ABI, s || provider);
}

function getDvpSettlement() {
  const s = getDeployerSigner();
  return new ethers.Contract(deployment.contracts.DvPSettlement, DVP_ABI, s || provider);
}

function getStockContract(symbol) {
  const addr = deployment.contracts.stocks[symbol]?.address;
  if (!addr) throw new Error(`Unknown stock: ${symbol}`);
  const s = getDeployerSigner();
  return new ethers.Contract(addr, STOCK_ABI, s || provider);
}

module.exports = {
  provider,
  deployerWallet,
  getDeployerSigner,
  initSigner,
  getInrToken,
  getDvpSettlement,
  getStockContract,
  deployment,
  INR_ABI,
  DVP_ABI,
  STOCK_ABI
};
