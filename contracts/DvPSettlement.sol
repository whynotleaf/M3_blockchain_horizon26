// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ─────────────────────────────────────────────
// StockToken: ERC20 token representing one stock
// Each listed company deploys its own token
// ─────────────────────────────────────────────
contract StockToken is ERC20, Ownable {
    string public stockSymbol;
    uint256 public priceInWei;  // mock price

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _priceInWei
    ) ERC20(name, symbol) {
        stockSymbol = symbol;
        priceInWei  = _priceInWei;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 0; // 1 token = 1 share (no fractional shares)
    }

    function updatePrice(uint256 _newPrice) external onlyOwner {
        priceInWei = _newPrice;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

// ─────────────────────────────────────────────
// INRToken: Stablecoin representing Indian Rupee (1 INR = 1 token)
// Used for payment in DvP settlement
// ─────────────────────────────────────────────
contract INRToken is ERC20, Ownable {
    constructor() ERC20("Indian Rupee Token", "INR") {}

    function decimals() public pure override returns (uint8) {
        return 2; // paise precision
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

// ─────────────────────────────────────────────
// DvPSettlement: Atomic Delivery vs Payment
// Core settlement engine — heart of the system
// ─────────────────────────────────────────────
contract DvPSettlement is Ownable, ReentrancyGuard {

    INRToken public inrToken;

    // ── Settlement States ──
    enum SettlementStatus { PENDING, MATCHED, SETTLED, FAILED, FLAGGED }

    struct Trade {
        bytes32   tradeId;
        address   buyer;
        address   seller;
        address   stockToken;
        uint256   quantity;
        uint256   pricePerShare;    // in INR tokens (with decimals)
        uint256   totalAmount;      // quantity * pricePerShare
        uint256   timestamp;
        uint256   settledAt;
        SettlementStatus status;
        string    stockSymbol;
        bool      regulatorFlagged;
        string    flagReason;
    }

    mapping(bytes32 => Trade) public trades;
    bytes32[] public tradeIds;

    // Regulator addresses
    mapping(address => bool) public isRegulator;

    // ── Events ──
    event TradeInitiated(bytes32 indexed tradeId, address buyer, address seller, string symbol, uint256 qty, uint256 price);
    event TradeSettled(bytes32 indexed tradeId, uint256 settledAt, uint256 settlementTimeSeconds);
    event TradeFailed(bytes32 indexed tradeId, string reason);
    event TradeFlagged(bytes32 indexed tradeId, address regulator, string reason);
    event RegulatorAdded(address regulator);

    modifier onlyRegulator() {
        require(isRegulator[msg.sender] || msg.sender == owner(), "Not a regulator");
        _;
    }

    constructor(address _inrToken) {
        inrToken = INRToken(_inrToken);
        isRegulator[msg.sender] = true;
    }

    function addRegulator(address _reg) external onlyOwner {
        isRegulator[_reg] = true;
        emit RegulatorAdded(_reg);
    }

    // ── Initiate Trade (called by backend after order match) ──
    function initiateTrade(
        bytes32   _tradeId,
        address   _buyer,
        address   _seller,
        address   _stockToken,
        uint256   _quantity,
        uint256   _pricePerShare,
        string    memory _stockSymbol
    ) external onlyOwner returns (bytes32) {
        require(trades[_tradeId].timestamp == 0, "Trade already exists");

        uint256 total = _quantity * _pricePerShare;

        trades[_tradeId] = Trade({
            tradeId:         _tradeId,
            buyer:           _buyer,
            seller:          _seller,
            stockToken:      _stockToken,
            quantity:        _quantity,
            pricePerShare:   _pricePerShare,
            totalAmount:     total,
            timestamp:       block.timestamp,
            settledAt:       0,
            status:          SettlementStatus.PENDING,
            stockSymbol:     _stockSymbol,
            regulatorFlagged: false,
            flagReason:      ""
        });

        tradeIds.push(_tradeId);

        emit TradeInitiated(_tradeId, _buyer, _seller, _stockSymbol, _quantity, _pricePerShare);
        return _tradeId;
    }

    // ── ATOMIC DvP Settlement ──
    // This is the core function — transfers tokens and payment atomically
    function settleTrade(bytes32 _tradeId) external nonReentrant onlyOwner {
        Trade storage trade = trades[_tradeId];

        require(trade.timestamp != 0,                              "Trade not found");
        require(trade.status == SettlementStatus.PENDING ||
                trade.status == SettlementStatus.MATCHED,          "Invalid status");
        require(!trade.regulatorFlagged,                           "Trade is flagged");

        StockToken stock = StockToken(trade.stockToken);

        // ── Pre-checks (atomicity guarantee) ──
        uint256 buyerBalance  = inrToken.balanceOf(trade.buyer);
        uint256 sellerShares  = stock.balanceOf(trade.seller);
        uint256 buyerAllowance = inrToken.allowance(trade.buyer, address(this));
        uint256 sellerAllowance = stock.allowance(trade.seller, address(this));

        if (buyerBalance < trade.totalAmount) {
            trade.status = SettlementStatus.FAILED;
            emit TradeFailed(_tradeId, "Insufficient buyer funds");
            return;
        }
        if (sellerShares < trade.quantity) {
            trade.status = SettlementStatus.FAILED;
            emit TradeFailed(_tradeId, "Insufficient seller shares");
            return;
        }
        if (buyerAllowance < trade.totalAmount) {
            trade.status = SettlementStatus.FAILED;
            emit TradeFailed(_tradeId, "Buyer allowance not set");
            return;
        }
        if (sellerAllowance < trade.quantity) {
            trade.status = SettlementStatus.FAILED;
            emit TradeFailed(_tradeId, "Seller allowance not set");
            return;
        }

        // ── ATOMIC SWAP ──
        // Step 1: Transfer INR from buyer → seller
        bool paymentOk = inrToken.transferFrom(trade.buyer, trade.seller, trade.totalAmount);
        require(paymentOk, "Payment transfer failed");

        // Step 2: Transfer shares from seller → buyer
        bool deliveryOk = stock.transferFrom(trade.seller, trade.buyer, trade.quantity);
        require(deliveryOk, "Share delivery failed");
        // (If step 2 reverts, step 1 also reverts — full atomicity)

        // ── Mark Settled ──
        trade.status    = SettlementStatus.SETTLED;
        trade.settledAt = block.timestamp;

        uint256 settlementTime = block.timestamp - trade.timestamp;

        emit TradeSettled(_tradeId, block.timestamp, settlementTime);
    }

    // ── Regulator: Flag a trade ──
    function flagTrade(bytes32 _tradeId, string calldata _reason) external onlyRegulator {
        Trade storage trade = trades[_tradeId];
        require(trade.timestamp != 0, "Trade not found");

        trade.regulatorFlagged = true;
        trade.flagReason       = _reason;
        trade.status           = SettlementStatus.FLAGGED;

        emit TradeFlagged(_tradeId, msg.sender, _reason);
    }

    // ── View helpers ──
    function getTrade(bytes32 _tradeId) external view returns (Trade memory) {
        return trades[_tradeId];
    }

    function getAllTradeIds() external view returns (bytes32[] memory) {
        return tradeIds;
    }

    function getTradeCount() external view returns (uint256) {
        return tradeIds.length;
    }
}
