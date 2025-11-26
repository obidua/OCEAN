// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISafeWallet
/// @notice Interface for the on-chain SafeWallet ledger and fund manager
/// @dev Implemented by SafeWalletUpgradeable
interface ISafeWallet {
    /* ------------------------------------------------------------ *
     *                          ENUMS & STRUCTS
     * ------------------------------------------------------------ */

    /// @notice Type of transaction recorded in ledger
    enum TxKind {
        ROI, // ROI credited
        Growth, // growth credit
        Royalty, // royalty income
        Slab, // slab income
        Reward, // one-time reward
        DirectIncome, // direct income / commission
        ManualCredit, // admin/manual adjustment
        StakeSpend, // internal debit (staking funds)
        PortfolioCreate, // portfolio created from SafeWallet
        PortfolioTopUp, // portfolio top-up from SafeWallet
        ExternalWithdraw // user withdrew to external wallet
    }

    /// @notice Detailed ledger record for any credit/debit
    struct LedgerEntry {
        uint8 kind; // TxKind (as uint8)
        bool isCredit; // true=credit, false=debit
        uint256 usdAmount; // 1e18 WAD USD (0 if N/A)
        uint256 ramaAmount; // RAMA wei
        uint32 dayId; // ROI day ID if applicable
        uint64 timestamp; // block.timestamp
        address related; // linked address (referrer, PM, recipient, etc.)
        uint256 pid; // portfolio ID if applicable
        bytes32 memo; // optional tag
    }

    /// @notice Withdrawal record
    struct Withdrawals {
        address withdrawanBy;
        uint256 amountInRAMA;
        uint256 amountInUSD;
        uint256 platformFeeInUSd;
        uint256 platformFeeInRAMA;
        uint256 netTransferredAmountRAMA;
        uint256 netTransferredAmountUSD;
        uint256 withdrawanAt;
    }

    /* ------------------------------------------------------------ *
     *                          CORE VIEWS
     * ------------------------------------------------------------ */

    function ramaBalance(address user) external view returns (uint256);

    function roiUsdPaid(address user) external view returns (uint256);

    function dayUsdTotal(uint32 dayId) external view returns (uint256);

    function dayRamaTotal(uint32 dayId) external view returns (uint256);

    function totalCreditsUSD(address user) external view returns (uint256);

    function totalCreditsRAMA(address user) external view returns (uint256);

    function totalDebitsUSD(address user) external view returns (uint256);

    function totalDebitsRAMA(address user) external view returns (uint256);

    /* ------------------------------------------------------------ *
     *                        LEDGER READS
     * ------------------------------------------------------------ */

    /// @notice Returns the number of ledger entries for a user
    function getLedgerCount(address user) external view returns (uint256);

    /// @notice Returns a paginated slice of a user’s ledger
    function getLedgerSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory out);

    /* ------------------------------------------------------------ *
     *                       CREDIT FUNCTIONS
     * ------------------------------------------------------------ */

    /// @notice Credit daily ROI for a user
    function creditROIUSD(
        address user,
        uint256 usdAmount,
        uint256 ramaAmount,
        uint32 dayId
    ) external;

    /// @notice Batch ROI credit (multiple days)
    function creditROIUSDBatch(
        address user,
        uint32[] calldata dayIds,
        uint256[] calldata usdAmounts,
        uint256[] calldata ramaAmounts
    ) external;

    /// @notice Credit growth earnings
    function creditGrowth(address user, uint256 ramaAmount) external;

    /// @notice General-purpose credit (royalty, slab, reward, etc.)
    function creditGeneral(
        address user,
        TxKind kind,
        uint256 usdAmount,
        uint256 ramaAmount,
        bytes32 memo
    ) external;

    /* ------------------------------------------------------------ *
     *                       DEBIT / ACTIONS
     * ------------------------------------------------------------ */

    /// @notice Spend SafeWallet balance to create a portfolio for msg.sender
    function createPortfolioFromSafe(
        uint256 ramaAmount,
        address referrer
    ) external returns (uint256 pid);

    /// @notice Create a portfolio for another user using msg.sender’s funds
    function createPortfolioFor(
        address beneficiary,
        uint256 ramaAmount,
        address referrer
    ) external returns (uint256 pid);

    /// @notice Top-up existing portfolio from SafeWallet funds
    function topUpPortfolioFromSafe(uint256 pid, uint256 ramaAmount) external;

    /// @notice Withdraw balance to user’s external wallet
    function claimToExternal(uint256 amount, address to) external;

    function getUserRoiForDay(
        address user,
        uint32 dayId
    ) external view returns (uint256 usdSum, uint256 ramaSum);

    function getTotalsByKind(
        address user,
        uint8 kind,
        bool isCredit
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count);

    function getTransactionsByKind(
        address user,
        uint8 kind,
        bool isCredit,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory slice, uint256 totalMatched);

    function getWithdrawalHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (Withdrawals[] memory out);

    /* ------------------------------------------------------------ *
     *                     ADMIN / CONFIG
     * ------------------------------------------------------------ */

    /// @notice Set the ROIDistributor contract address (authorized sender)
    function setRoiDistributor(address a) external;

    /// @notice Returns current ROIDistributor address
    function _roiDistributor() external view returns (address);
}
