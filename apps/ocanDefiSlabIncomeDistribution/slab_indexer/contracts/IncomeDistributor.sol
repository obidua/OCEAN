// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUserRegistry.sol";
import "./libraries/OceanErrors.sol";
import "./interfaces/ISafeWallet.sol";

interface CappingIncomeManager {
    function tryNoteIncomeUSD6(
        address user,
        uint256 pid,
        uint256 amountUSD6,
        bytes32 kind
    ) external returns (bool accepted, uint256 credited);
}

contract IncomeDistributor is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    ICoreConfig public cfg;
    // IERC20 public RAMA;
    IUserRegistry public users;

    // ICapPayoutRouter public capRouter;

    // === Per-user claimable RAMA (kept for backward compatibility) ===
    mapping(address => uint256) public directIncome; // RAMA wei claimable

    // === Per-entry detailed ledger ===
    struct DirectIncomeRec {
        address receiver; // who earns this income (same as map key)
        address receivedFrom; // who triggered/caused it (e.g., direct)
        uint256 amountUsd; // 1e18 WAD USD
        uint256 amountRama; // RAMA wei
        uint256 portfolioId; // portfolio that generated the event (if any)
        uint64 timestamp; // block.timestamp at record
        uint32 dayId; // uint32(block.timestamp / 1 days)
    }

    // receiver => list of records
    mapping(address => DirectIncomeRec[]) private _incomeRecs;

    // fast totals per receiver
    mapping(address => uint256) public totalDirectUsd; // lifetime USD (1e18)
    mapping(address => uint256) public totalDirectRama; // lifetime RAMA (wei)

    // --- Events ---
    event DirectIncomeRecorded(
        address indexed receiver,
        address indexed from,
        uint256 indexed portfolioId,
        uint256 amountUsd,
        uint256 amountRama,
        uint32 dayId,
        uint64 timestamp
    );

    // uint256 directIncomePercent
    uint256 public directIncomePercent;

    CappingIncomeManager public capmanager;

    // --- Init / Upgrade ---
    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
        // capRouter = ICapPayoutRouter(_capRouter);
        capmanager = CappingIncomeManager(cfg.cappingIncomeManager());
        // RAMA = IERC20(cfg.rama());
        users = IUserRegistry(cfg.userRegistry());
        directIncomePercent = 500; // 5% default
    }

    function setCapRouter(address a) external onlyOwner {
        capmanager = CappingIncomeManager(a);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // --- Auth guard ---
    modifier onlyAuthorized() {
        address s = msg.sender;
        require(
            s == owner() ||
                s == cfg.adminControl() ||
                s == cfg.portfolioManager() ||
                s == cfg.incomeDistributor() /* optional extra publisher */,
            OceanErrors.NotAuthorized
        );
        _;
    }

    function getContracts()
        external
        view
        returns (address admin, address pm, address ic)
    {
        admin = cfg.adminControl();
        pm = cfg.portfolioManager();
        ic = cfg.incomeDistributor();
        // res = [ cfg.adminControl() ,cfg.portfolioManager(),cfg.incomeDistributor()];
    }

    // =============================================================================
    //    WRITE API
    // =================================================================================

    /// @notice Record a direct-income event for `receiver`.
    /// @param receiver  earner address
    /// @param receivedFrom  the ref/downline that triggered the income
    /// @param amountUsd  USD WAD (1e18)
    /// @param amountRama RAMA wei
    /// @param portfolioId related portfolio, 0 if N/A
    function recordDirectIncome(
        address receiver,
        address receivedFrom,
        uint256 amountRama,
        uint256 amountUsd,
        uint256 portfolioId
    ) external onlyAuthorized {
        require(receiver != address(0), "RECEIVER_0");
        require(amountUsd > 0 || amountRama > 0, "AMOUNT_0");
        // require(!users.isTempDeactive(receiver), "AMOUN");

        if (IUserRegistry(cfg.userRegistry()).isTempDeactive(receiver)) {
            return;
        }

        uint64 ts = uint64(block.timestamp);
        uint32 day = uint32(block.timestamp / 1 days);

        uint256 PERUSDRAMA = (amountRama * 1e6) / amountUsd;

        // calculate direct income based on percent
        // uint256 directIncomeAmountRama = (amountRama * directIncomePercent) /
        //     10000;
        uint256 directIncomeAmountUsd = (amountUsd * directIncomePercent) /
            10000; // WAD (1e18)

        // Convert to USD6 for capping manager
        uint256 directIncomeAmountUSD6 = directIncomeAmountUsd;

        bool accepted = true;
        uint256 credited = 0;
        if (address(capmanager) != address(0)) {
            (accepted, credited) = capmanager.tryNoteIncomeUSD6(
                receiver,
                portfolioId,
                directIncomeAmountUSD6,
                bytes32("DIRECT")
            );
        }

        if (!accepted) return;
        if (!(credited > 0)) return;

        // totalCreditdUSD

        uint256 directIncomeCreditedRAMA = (PERUSDRAMA * credited) / 1e6;
        // uint256 directIncomeCredited=(PERUSDRAMA * credited) / 1e6
        _incomeRecs[receiver].push(
            DirectIncomeRec({
                receiver: receiver,
                receivedFrom: receivedFrom,
                amountUsd: credited,
                amountRama: directIncomeCreditedRAMA,
                portfolioId: portfolioId,
                timestamp: ts,
                dayId: day
            })
        );

        // update fast totals and claimable bucket (RAMA)
        totalDirectUsd[receiver] += credited;
        totalDirectRama[receiver] += directIncomeCreditedRAMA;
        directIncome[receiver] += directIncomeCreditedRAMA;

        ISafeWallet(cfg.safeWallet()).creditGeneral(
            receiver,
            ISafeWallet.TxKind.DirectIncome,
            credited, // if computed from oracle; else 0
            directIncomeCreditedRAMA, // RAMA wei commission
            bytes32(portfolioId) // memo: pid encoded in 32 byte's
        );

        emit DirectIncomeRecorded(
            receiver,
            receivedFrom,
            portfolioId,
            credited,
            directIncomeCreditedRAMA,
            day,
            ts
        );
    }

    // (Optional) If you later add a claim/transfer flow, you'll reduce directIncome[receiver]
    // and transfer RAMA (or credit SafeWallet). Not requested here, so omitted.

    // =================================================================================
    //                                   READ API
    // =================================================================================

    /// @notice Count of detailed direct income records for a user.
    function getDirectIncomeCount(
        address user
    ) external view returns (uint256) {
        return _incomeRecs[user].length;
    }

    /// @notice Get one record by index.
    function getDirectIncomeByIndex(
        address user,
        uint256 index
    ) external view returns (DirectIncomeRec memory rec) {
        require(index < _incomeRecs[user].length, "OOB");
        return _incomeRecs[user][index];
    }

    /// @notice Paginated slice of records [offset, offset+limit).
    function getDirectIncomeSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (DirectIncomeRec[] memory out) {
        DirectIncomeRec[] storage arr = _incomeRecs[user];
        uint256 n = arr.length;
        if (offset >= n) return new DirectIncomeRec[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;

        out = new DirectIncomeRec[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = arr[i];
        }
    }

    /// @notice Quick summary: (entries, lifetimeUsd, lifetimeRama, claimableRama).
    function getDirectIncomeSummary(
        address user
    )
        external
        view
        returns (
            uint256 entries,
            uint256 lifetimeUsd,
            uint256 lifetimeRama,
            uint256 claimableRama
        )
    {
        entries = _incomeRecs[user].length;
        lifetimeUsd = totalDirectUsd[user];
        lifetimeRama = totalDirectRama[user];
        claimableRama = directIncome[user];
    }

    /// @notice Legacy helper: batch read current claimable amounts for many users.
    function getDirectIncome(
        address[] calldata addrs
    ) external view returns (uint256[] memory) {
        uint256 len = addrs.length;
        uint256[] memory res = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            res[i] = directIncome[addrs[i]];
        }
        return res;
    }

    /// @notice Compute totals filtered by time window (inclusive).
    function getDirectIncomeTotalsInRange(
        address user,
        uint64 fromTs,
        uint64 toTs
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count) {
        DirectIncomeRec[] storage arr = _incomeRecs[user];
        for (uint256 i = 0; i < arr.length; i++) {
            DirectIncomeRec storage r = arr[i];
            if (r.timestamp >= fromTs && r.timestamp <= toTs) {
                usdSum += r.amountUsd;
                ramaSum += r.amountRama;
                count++;
            }
        }
    }

    /// @notice Compute totals for a given portfolioId.
    function getDirectIncomeTotalsByPortfolio(
        address user,
        uint256 portfolioId
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count) {
        DirectIncomeRec[] storage arr = _incomeRecs[user];
        for (uint256 i = 0; i < arr.length; i++) {
            DirectIncomeRec storage r = arr[i];
            if (r.portfolioId == portfolioId) {
                usdSum += r.amountUsd;
                ramaSum += r.amountRama;
                count++;
            }
        }
    }
}
