const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("\n🚀 Deploying SettleChain Contracts...");
  console.log("Deployer:", deployerAddress);
  console.log("Network:", hre.network.name);

  const feeData = await ethers.provider.getFeeData();

  // helper for sending tx safely
  async function sendTx(txPromise, label) {
    const tx = await txPromise;
    console.log(`⏳ ${label} tx sent:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`✅ ${label} confirmed in block`, receipt.blockNumber);
    return receipt;
  }

  // ── 1. Deploy INR Token ──
  const INRToken = await ethers.getContractFactory("INRToken");

  const inrToken = await INRToken.deploy({
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  });

  await inrToken.waitForDeployment();
  const inrAddress = await inrToken.getAddress();

  console.log("✅ INR Token deployed:", inrAddress);
  console.log(`🔗 https://sepolia.etherscan.io/address/${inrAddress}`);

  // ── 2. Deploy Stock Tokens ──

  const StockToken = await ethers.getContractFactory("StockToken");

  const stocks = [
    { name: "Reliance Industries", symbol: "RELIANCE", supply: 10000, price: ethers.parseUnits("2850", 2) },
    { name: "Tata Consultancy", symbol: "TCS", supply: 10000, price: ethers.parseUnits("3950", 2) },
    { name: "HDFC Bank", symbol: "HDFCBANK", supply: 10000, price: ethers.parseUnits("1680", 2) },
    { name: "Infosys", symbol: "INFY", supply: 10000, price: ethers.parseUnits("1480", 2) },
    { name: "ICICI Bank", symbol: "ICICIBANK", supply: 10000, price: ethers.parseUnits("1180", 2) },
  ];

  const deployedStocks = {};

  for (const s of stocks) {

    const token = await StockToken.deploy(
      s.name,
      s.symbol,
      s.supply,
      s.price,
      {
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      }
    );

    await token.waitForDeployment();

    const addr = await token.getAddress();

    deployedStocks[s.symbol] = {
      address: addr,
      name: s.name
    };

    console.log(`✅ ${s.symbol} token deployed: ${addr}`);
  }

  // ── 3. Deploy DvP Settlement ──

  const DvP = await ethers.getContractFactory("DvPSettlement");

  const dvp = await DvP.deploy(inrAddress, {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  });

  await dvp.waitForDeployment();

  const dvpAddress = await dvp.getAddress();

  console.log("✅ DvP Settlement deployed:", dvpAddress);
  console.log(`🔗 https://sepolia.etherscan.io/address/${dvpAddress}`);

  // ── 4. Mint INR reserve ──

  const inrReserve = 5000000n * 100n;

  await sendTx(
    inrToken.mint(deployerAddress, inrReserve, {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
    }),
    "Mint INR Reserve"
  );

  console.log("💰 ₹50,00,000 INR minted to deployer");

  // ── 5. Add regulator ──

  const regulatorAddress =
    process.env.SEBI_MONITOR_ADDRESS || deployerAddress;

  await sendTx(
    dvp.addRegulator(regulatorAddress, {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
    }),
    "Add Regulator"
  );

  console.log("👮 Regulator added:", regulatorAddress);

  // ── 6. Save deployment info ──

  const deployment = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      INRToken: inrAddress,
      DvPSettlement: dvpAddress,
      stocks: deployedStocks
    }
  };

  const dbDir = path.join(__dirname, "../database");
  const frontendDir = path.join(__dirname, "../frontend/src/utils");

  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(frontendDir, { recursive: true });

  fs.writeFileSync(
    path.join(dbDir, "deployment.json"),
    JSON.stringify(deployment, null, 2)
  );

  fs.writeFileSync(
    path.join(frontendDir, "deployment.json"),
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n✅ Deployment info saved");
  console.log("📁 database/deployment.json");
  console.log("📁 frontend/src/utils/deployment.json");

  console.log("\n🎉 SettleChain deployment completed!\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});