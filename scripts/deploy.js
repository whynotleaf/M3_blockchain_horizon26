const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, retail1, retail2, institutional1, regulator] = await ethers.getSigners();

  console.log("\n🚀 Deploying Real-Time Settlement System...");
  console.log("Deployer:", deployer.address);

  // ── 1. Deploy INR Token ──
  const INRToken = await ethers.getContractFactory("INRToken");
  const inrToken = await INRToken.deploy();
  await inrToken.waitForDeployment();
  console.log("✅ INR Token deployed:", await inrToken.getAddress());

  // ── 2. Deploy Stock Tokens ──
  const StockToken = await ethers.getContractFactory("StockToken");

  const stocks = [
    { name: "Reliance Industries",    symbol: "RELIANCE", supply: 10000, price: ethers.parseUnits("2850", 2) },
    { name: "Tata Consultancy",       symbol: "TCS",      supply: 10000, price: ethers.parseUnits("3950", 2) },
    { name: "HDFC Bank",              symbol: "HDFCBANK", supply: 10000, price: ethers.parseUnits("1680", 2) },
    { name: "Infosys",                symbol: "INFY",     supply: 10000, price: ethers.parseUnits("1480", 2) },
    { name: "ICICI Bank",             symbol: "ICICIBANK",supply: 10000, price: ethers.parseUnits("1180", 2) },
  ];

  const deployedStocks = {};
  for (const s of stocks) {
    const token = await StockToken.deploy(s.name, s.symbol, s.supply, s.price);
    await token.waitForDeployment();
    const addr = await token.getAddress();
    deployedStocks[s.symbol] = { address: addr, price: s.price.toString(), name: s.name };
    console.log(`✅ ${s.symbol} token deployed: ${addr}`);
  }

  // ── 3. Deploy DvP Settlement ──
  const DvP = await ethers.getContractFactory("DvPSettlement");
  const dvp = await DvP.deploy(await inrToken.getAddress());
  await dvp.waitForDeployment();
  console.log("✅ DvP Settlement deployed:", await dvp.getAddress());

  // ── 4. Seed test users with INR and shares ──
  const users = [
    { address: retail1.address,       name: "Arjun Sharma",    role: "retail" },
    { address: retail2.address,       name: "Priya Patel",     role: "retail" },
    { address: institutional1.address,name: "ICICI Securities",role: "institutional" },
  ];

  console.log("\n📦 Seeding test users...");
  const inrAmount = ethers.parseUnits("500000", 2); // ₹5,00,000 each

  for (const user of users) {
    await inrToken.mint(user.address, inrAmount);
    console.log(`  Minted ₹5,00,000 INR → ${user.name}`);
  }

  // Give shares to sellers
  const relianceToken = await ethers.getContractAt("StockToken", deployedStocks["RELIANCE"].address);
  const tcsToken      = await ethers.getContractAt("StockToken", deployedStocks["TCS"].address);

  await relianceToken.transfer(retail2.address,        500);
  await tcsToken.transfer(institutional1.address,      300);
  console.log("  Transferred 500 RELIANCE → Priya Patel");
  console.log("  Transferred 300 TCS → ICICI Securities");

  // ── 5. Add regulator ──
  await dvp.addRegulator(regulator.address);
  console.log("\n👮 Regulator added:", regulator.address);

  // ── 6. Save deployment info ──
  const deployment = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    contracts: {
      INRToken:     await inrToken.getAddress(),
      DvPSettlement: await dvp.getAddress(),
      stocks:       deployedStocks
    },
    accounts: {
      deployer:      deployer.address,
      retail1:       { address: retail1.address,       name: "Arjun Sharma",     role: "retail",        privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
      retail2:       { address: retail2.address,       name: "Priya Patel",      role: "retail",        privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" },
      institutional1:{ address: institutional1.address,name: "ICICI Securities", role: "institutional", privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" },
      regulator:     { address: regulator.address,     name: "SEBI Monitor",     role: "regulator",     privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b" }
    }
  };

  const outDir = path.join(__dirname, "../database");
  fs.writeFileSync(path.join(outDir, "deployment.json"), JSON.stringify(deployment, null, 2));

  // Also write to frontend
  const frontendDir = path.join(__dirname, "../frontend/src/utils");
  fs.writeFileSync(path.join(frontendDir, "deployment.json"), JSON.stringify(deployment, null, 2));

  console.log("\n✅ Deployment info saved to database/deployment.json");
  console.log("\n────────────────────────────────────────");
  console.log("🎉 System ready! Run the backend then frontend.");
  console.log("────────────────────────────────────────\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
