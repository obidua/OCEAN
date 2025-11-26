// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library OceanErrors {
    string constant NotOwner = "NOT_OWNER";
    string constant NotAuthorized = "NOT_AUTH";
    string constant ZeroAddress = "ZERO_ADDR";
    string constant NotRegistered = "NOT_REGISTERED";
    string constant AlreadyRegistered = "ALREADY_REGISTERED";
    string constant InvalidReferrer = "INVALID_REFERRER";
    string constant MinStake50USD = "MIN_STAKE_50_USD";
    string constant Insufficient = "INSUFFICIENT";
    string constant Frozen = "FROZEN";
    string constant CapReached = "CAP_REACHED";
    string constant ClaimCooldown = "CLAIM_COOLDOWN";
    string constant BoosterNotEligible = "BOOSTER_NE";
    string constant ContractAddForbidden = "CONTRACT_ADDR_FORBIDDEN";
    string constant SelfReferralNotAllowed = "SELF_REFERRAL";
    string constant MinLevelRequired = "LEVEL_MIN_1";
    string constant MinDepthRequired = "DEPTH_MIN_1";
    string constant DirectLegRequired = "NOT_DIRECT_LEG";
    string constant InvalidLimit = "LIMIT_0";
    string constant ToBeActivatedUserAlreadyRegistered =
        "ToBeActivatedUserAlreadyRegistered";
    string constant IdOverflow = "ID_OVERFLOW";
}
