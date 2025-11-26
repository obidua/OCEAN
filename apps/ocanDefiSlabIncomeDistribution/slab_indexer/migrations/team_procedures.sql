-- ============================================================================
-- Team Tree Database Functions for PostgreSQL
-- ============================================================================
-- These functions use recursive CTEs for fast hierarchical queries

-- ============================================================================
-- Function 1: Get complete team tree with all downlines
-- ============================================================================
CREATE OR REPLACE FUNCTION get_team_tree(p_user_address TEXT)
RETURNS TABLE (
    address TEXT,
    user_id BIGINT,
    referrer_address TEXT,
    tier INTEGER,
    total_directs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    depth INTEGER,
    path TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE team_tree AS (
        -- Base case: direct referrals of the user
        SELECT
            u.user_address::TEXT AS address,
            u.user_id,
            u.referrer_address::TEXT AS referrer_address,
            u.tier,
            u.total_directs,
            u.created_at,
            1 as depth,
            u.user_address::TEXT as path
        FROM users u
        WHERE u.referrer_address = LOWER(p_user_address)

        UNION ALL

        -- Recursive case: get downlines of downlines
        SELECT
            u.user_address::TEXT AS address,
            u.user_id,
            u.referrer_address::TEXT AS referrer_address,
            u.tier,
            u.total_directs,
            u.created_at,
            tt.depth + 1,
            tt.path || ' -> ' || u.user_address::TEXT
        FROM users u
        INNER JOIN team_tree tt ON u.referrer_address = tt.address
        WHERE tt.depth < 100  -- Prevent infinite loops, adjust as needed
    )
    SELECT * FROM team_tree
    ORDER BY depth, address;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 2: Get team count for a user (total downlines)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_team_count(p_user_address TEXT)
RETURNS INTEGER AS $$
DECLARE
    team_count INTEGER;
BEGIN
    WITH RECURSIVE team_tree AS (
        SELECT user_address
        FROM users
        WHERE referrer_address = LOWER(p_user_address)

        UNION ALL

        SELECT u.user_address
        FROM users u
        INNER JOIN team_tree tt ON u.referrer_address = tt.user_address
    )
    SELECT COUNT(*) INTO team_count FROM team_tree;

    RETURN team_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 3: Get max depth of team tree
-- ============================================================================
CREATE OR REPLACE FUNCTION get_team_max_depth(p_user_address TEXT)
RETURNS INTEGER AS $$
DECLARE
    max_depth INTEGER;
BEGIN
    WITH RECURSIVE team_tree AS (
        SELECT
            user_address,
            1 as depth
        FROM users
        WHERE referrer_address = LOWER(p_user_address)

        UNION ALL

        SELECT
            u.user_address,
            tt.depth + 1
        FROM users u
        INNER JOIN team_tree tt ON u.referrer_address = tt.user_address
        WHERE tt.depth < 100
    )
    SELECT COALESCE(MAX(depth), 0) INTO max_depth FROM team_tree;

    RETURN max_depth;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 4: Get leg-wise breakdown (each direct's team stats)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_legs_breakdown(p_user_address TEXT)
RETURNS TABLE (
    direct_address TEXT,
    direct_user_id BIGINT,
    direct_created_at TIMESTAMP WITH TIME ZONE,
    leg_count INTEGER,
    leg_depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.user_address::TEXT as direct_address,
        d.user_id as direct_user_id,
        d.created_at as direct_created_at,
        get_team_count(d.user_address) + 1 as leg_count,  -- +1 to include the direct themselves
        get_team_max_depth(d.user_address) + 1 as leg_depth  -- +1 because direct is depth 1
    FROM users d
    WHERE d.referrer_address = LOWER(p_user_address)
    ORDER BY d.created_at;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 5: Get complete team summary (all stats in one call)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_team_summary(p_user_address TEXT)
RETURNS TABLE (
    user_address TEXT,
    user_id BIGINT,
    total_team_count INTEGER,
    max_depth INTEGER,
    directs_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT as user_address,
        u.user_id,
        get_team_count(p_user_address) as total_team_count,
        get_team_max_depth(p_user_address) as max_depth,
        (SELECT COUNT(*)::INTEGER FROM users WHERE referrer_address = LOWER(p_user_address)) as directs_count
    FROM users u
    WHERE u.user_address = LOWER(p_user_address);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 6: Get team by leg (filter by specific direct)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_leg_team(p_user_address TEXT, p_direct_address TEXT)
RETURNS TABLE (
    address TEXT,
    user_id BIGINT,
    referrer_address TEXT,
    tier INTEGER,
    total_directs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE team_tree AS (
        -- Start with the direct
        SELECT
            u.user_address::TEXT AS address,
            u.user_id,
            u.referrer_address::TEXT AS referrer_address,
            u.tier,
            u.total_directs,
            u.created_at,
            1 as depth
        FROM users u
        WHERE u.user_address = LOWER(p_direct_address)
          AND u.referrer_address = LOWER(p_user_address)

        UNION ALL

        -- Get all downlines of this direct
        SELECT
            u.user_address::TEXT AS address,
            u.user_id,
            u.referrer_address::TEXT AS referrer_address,
            u.tier,
            u.total_directs,
            u.created_at,
            tt.depth + 1
        FROM users u
        INNER JOIN team_tree tt ON u.referrer_address = tt.address
        WHERE tt.depth < 100
    )
    SELECT * FROM team_tree
    ORDER BY depth, address;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 7: Get directs only (no recursion)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_directs(p_user_address TEXT)
RETURNS TABLE (
    address TEXT,
    user_id BIGINT,
    tier INTEGER,
    total_directs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_address::TEXT,
        u.user_id,
        u.tier,
        u.total_directs,
        u.created_at
    FROM users u
    WHERE u.referrer_address = LOWER(p_user_address)
    ORDER BY u.created_at;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 8: Get leg-wise portfolio volume breakdown
-- ============================================================================
CREATE OR REPLACE FUNCTION get_legs_portfolio_volume(p_user_address TEXT)
RETURNS TABLE (
    direct_address TEXT,
    direct_user_id BIGINT,
    direct_created_at TIMESTAMP WITH TIME ZONE,
    leg_portfolio_count BIGINT,
    leg_total_volume_micro_usd BIGINT,
    leg_total_volume_usd NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.user_address::TEXT as direct_address,
        d.user_id as direct_user_id,
        d.created_at as direct_created_at,
        COALESCE(COUNT(p.pid), 0) as leg_portfolio_count,
        COALESCE(SUM(p.principal_usd), 0)::BIGINT as leg_total_volume_micro_usd,
        COALESCE(SUM(p.principal_usd) / 1000000.0, 0.0) as leg_total_volume_usd
    FROM users d
    LEFT JOIN LATERAL (
        -- Get all team members in this leg (direct + downlines)
        SELECT * FROM get_leg_team(p_user_address, d.user_address)
    ) leg_members ON true
    LEFT JOIN portfolios p ON p.owner_address = leg_members.address
    WHERE d.referrer_address = LOWER(p_user_address)
    GROUP BY d.user_address, d.user_id, d.created_at
    ORDER BY d.created_at;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Function 9: Get total portfolio volume across all team
-- ============================================================================
CREATE OR REPLACE FUNCTION get_team_total_portfolio_volume(p_user_address TEXT)
RETURNS TABLE (
    user_address TEXT,
    total_team_count INTEGER,
    total_portfolio_count BIGINT,
    total_volume_micro_usd BIGINT,
    total_volume_usd NUMERIC,
    directs_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT as user_address,
        get_team_count(p_user_address) as total_team_count,
        COALESCE(COUNT(p.pid), 0) as total_portfolio_count,
        COALESCE(SUM(p.principal_usd), 0)::BIGINT as total_volume_micro_usd,
        COALESCE(SUM(p.principal_usd) / 1000000.0, 0.0) as total_volume_usd,
        (SELECT COUNT(*)::INTEGER FROM users WHERE referrer_address = LOWER(p_user_address)) as directs_count
    FROM (
        SELECT * FROM get_team_tree(p_user_address)
    ) team_members
    LEFT JOIN portfolios p ON p.owner_address = team_members.address;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- ROI CALCULATION PROCEDURES (Based on ROIDistributor.sol logic)
-- ============================================================================
-- These procedures replicate the on-chain ROI calculation logic for off-chain use
-- ROI Rates (WAD format, 1e18):
--   Tier 0 Normal: 0.33% = 330000000000000000 (33e16)
--   Tier 1 Normal: 0.40% = 400000000000000000 (40e16)
--   Tier 0 Booster: 0.66% = 660000000000000000 (66e16)
--   Tier 1 Booster: 0.80% = 800000000000000000 (80e16)
-- All USD values are in micro USD (1e6)
-- ============================================================================


-- ============================================================================
-- Function 10: Calculate ROI for a single user for a specific day
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_roi_for_day(
    p_user_address TEXT,
    p_day_id INTEGER,
    p_price_micro_usd BIGINT  -- Price in micro USD (1e6)
) RETURNS TABLE (
    user_address TEXT,
    day_id INTEGER,
    total_portfolios INTEGER,
    total_roi_micro_usd BIGINT,
    total_roi_usd NUMERIC,
    total_roi_rama_wei BIGINT,
    price_used_micro_usd BIGINT
) AS $$
DECLARE
    v_epoch_seconds INTEGER := 86400; -- 1 day in seconds
    v_period_start_ts BIGINT;
    v_period_end_ts BIGINT;
    v_rate_tier0_normal BIGINT := 3300000000000000; -- 0.33% in WAD (33e14)
    v_rate_tier1_normal BIGINT := 4000000000000000; -- 0.40% in WAD (40e14)
    v_rate_tier0_booster BIGINT := 6600000000000000; -- 0.66% in WAD (66e14)
    v_rate_tier1_booster BIGINT := 8000000000000000; -- 0.80% in WAD (80e14)
BEGIN
    -- Calculate period boundaries (day_id represents UTC day)
    v_period_start_ts := p_day_id * 86400;
    v_period_end_ts := v_period_start_ts + 86400 - 1;

    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT as user_address,
        p_day_id as day_id,
        COUNT(p.pid)::INTEGER as total_portfolios,
        COALESCE(SUM(
            CASE
                -- Portfolio must exist before period starts
                WHEN p.created_at >= TO_TIMESTAMP(v_period_start_ts) THEN 0
                -- Must not be closed before period
                WHEN p.is_closed AND p.closed_at IS NOT NULL
                    AND p.closed_at < TO_TIMESTAMP(v_period_start_ts) THEN 0
                -- Must not be capped before period
                WHEN p.is_capped AND p.capped_at IS NOT NULL
                    AND p.capped_at < TO_TIMESTAMP(v_period_start_ts) THEN 0
                -- Calculate ROI based on tier and booster
                ELSE
                    LEAST(
                        -- ROI calculation: (principal * rate) / 1e18 (cast to NUMERIC to avoid overflow)
                        (p.principal_usd::NUMERIC *
                            CASE
                                WHEN p.booster AND p.tier = 1 THEN v_rate_tier1_booster
                                WHEN p.booster AND p.tier = 0 THEN v_rate_tier0_booster
                                WHEN NOT p.booster AND p.tier = 1 THEN v_rate_tier1_normal
                                ELSE v_rate_tier0_normal
                            END::NUMERIC
                        / 1000000000000000000)::BIGINT,
                        -- Remaining cap: (principal * cap_percent / 100) - usd_paid_so_far
                        GREATEST(0, (p.principal_usd * p.cap_percent / 100) - COALESCE(p.usd_paid_so_far, 0))
                    )
            END
        ), 0)::BIGINT as total_roi_micro_usd,
        COALESCE(SUM(
            CASE
                WHEN p.created_at >= TO_TIMESTAMP(v_period_start_ts) THEN 0
                WHEN p.is_closed AND p.closed_at IS NOT NULL
                    AND p.closed_at < TO_TIMESTAMP(v_period_start_ts) THEN 0
                WHEN p.is_capped AND p.capped_at IS NOT NULL
                    AND p.capped_at < TO_TIMESTAMP(v_period_start_ts) THEN 0
                ELSE
                    LEAST(
                        (p.principal_usd::NUMERIC *
                            CASE
                                WHEN p.booster AND p.tier = 1 THEN v_rate_tier1_booster
                                WHEN p.booster AND p.tier = 0 THEN v_rate_tier0_booster
                                WHEN NOT p.booster AND p.tier = 1 THEN v_rate_tier1_normal
                                ELSE v_rate_tier0_normal
                            END::NUMERIC
                        / 1000000000000000000)::BIGINT,
                        GREATEST(0, (p.principal_usd * p.cap_percent / 100) - COALESCE(p.usd_paid_so_far, 0))
                    ) / 1000000.0
            END
        ), 0.0) as total_roi_usd,
        COALESCE(SUM(
            CASE
                WHEN p.created_at >= TO_TIMESTAMP(v_period_start_ts) THEN 0
                WHEN p.is_closed AND p.closed_at IS NOT NULL
                    AND p.closed_at < TO_TIMESTAMP(v_period_start_ts) THEN 0
                WHEN p.is_capped AND p.capped_at IS NOT NULL
                    AND p.capped_at < TO_TIMESTAMP(v_period_start_ts) THEN 0
                ELSE
                    -- Convert to RAMA wei: (roi_micro_usd * 1e18) / price_micro_usd (cast to avoid overflow)
                    (LEAST(
                        (p.principal_usd::NUMERIC *
                            CASE
                                WHEN p.booster AND p.tier = 1 THEN v_rate_tier1_booster
                                WHEN p.booster AND p.tier = 0 THEN v_rate_tier0_booster
                                WHEN NOT p.booster AND p.tier = 1 THEN v_rate_tier1_normal
                                ELSE v_rate_tier0_normal
                            END::NUMERIC
                        / 1000000000000000000)::BIGINT,
                        GREATEST(0, (p.principal_usd * p.cap_percent / 100) - COALESCE(p.usd_paid_so_far, 0))
                    )::NUMERIC * 1000000000000000000 / NULLIF(p_price_micro_usd, 0)
            END
        ), 0)::BIGINT as total_roi_rama_wei,
        p_price_micro_usd as price_used_micro_usd
    FROM portfolios p
    WHERE p.owner_address = LOWER(p_user_address);
END;
$$ LANGUAGE plpgsql;




-- ============================================================================
-- Function 11: Calculate ROI for entire team of a user for a specific day
-- ============================================================================
-- Refactored to reuse calculate_user_roi_for_day for consistency and maintainability
CREATE OR REPLACE FUNCTION public.calculate_team_roi_for_day(
    p_user_address text,
    p_day_id integer,
    p_price_micro_usd bigint
)
RETURNS TABLE(
    user_address text,
    day_id integer,
    team_size integer,
    total_portfolios integer,
    total_roi_micro_usd numeric,
    total_roi_usd numeric,
    total_roi_rama_wei numeric,
    price_used_micro_usd bigint
)
LANGUAGE plpgsql
AS $BODY$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT AS user_address,
        p_day_id AS day_id,

        COUNT(*)::INTEGER AS team_size,

        SUM(roi.total_portfolios)::INTEGER AS total_portfolios,

        -- 🔥 FIXED: return NUMERIC (never cast to BIGINT)
        SUM(roi.total_roi_micro_usd) AS total_roi_micro_usd,

        SUM(roi.total_roi_usd) AS total_roi_usd,

        -- 🔥 FIXED: return NUMERIC (never cast to BIGINT)
        SUM(roi.total_roi_rama_wei) AS total_roi_rama_wei,

        p_price_micro_usd AS price_used_micro_usd

    FROM (
        SELECT * FROM get_team_tree(p_user_address)
    ) team_member

    LEFT JOIN LATERAL (
        SELECT * FROM calculate_user_roi_for_day(
            team_member.address,
            p_day_id,
            p_price_micro_usd
        )
    ) roi ON true;
END;
$BODY$;


-- ============================================================================
-- Function 12: Calculate ROI for each leg (leg-wise breakdown) for a specific day
-- ============================================================================
-- Refactored to reuse calculate_user_roi_for_day for consistency and maintainability
-- FUNCTION: public.calculate_legs_roi_for_day(text, integer, bigint)

-- DROP FUNCTION IF EXISTS public.calculate_legs_roi_for_day(text, integer, bigint);

CREATE OR REPLACE FUNCTION public.calculate_legs_roi_for_day(
	p_user_address text,
	p_day_id integer,
	p_price_micro_usd bigint)
    RETURNS TABLE(direct_address text, direct_user_id bigint, day_id integer, leg_team_size integer, leg_portfolios integer, leg_roi_micro_usd numeric, leg_roi_usd numeric, leg_roi_rama_wei numeric, price_used_micro_usd bigint) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT
        d.user_address::TEXT,                    -- 🔥 FIXED
        d.user_id,
        p_day_id,
        COUNT(leg_member.address)::INTEGER AS leg_team_size,
        SUM(roi.total_portfolios)::INTEGER AS leg_portfolios,
        SUM(roi.total_roi_micro_usd) AS leg_roi_micro_usd,
        SUM(roi.total_roi_usd) AS leg_roi_usd,
        SUM(roi.total_roi_rama_wei) AS leg_roi_rama_wei,
        p_price_micro_usd
    FROM users d
    LEFT JOIN LATERAL (
        SELECT * FROM get_leg_team(p_user_address, d.user_address)
    ) leg_member ON TRUE
    LEFT JOIN LATERAL (
        SELECT * FROM calculate_user_roi_for_day(leg_member.address, p_day_id, p_price_micro_usd)
    ) roi ON TRUE
    WHERE d.referrer_address = LOWER(p_user_address)
    GROUP BY d.user_address, d.user_id, d.created_at
    ORDER BY d.created_at;
END;
$BODY$;

ALTER FUNCTION public.calculate_legs_roi_for_day(text, integer, bigint)
    OWNER TO oceandefiuser;



-- ============================================================================
-- Function 13: Get individual ROI details for each leg member
-- ============================================================================
-- Refactored to reuse calculate_user_roi_for_day for consistency and maintainability
CREATE OR REPLACE FUNCTION get_leg_roi_details_for_day(
    p_user_address TEXT,
    p_direct_address TEXT,
    p_day_id INTEGER,
    p_price_micro_usd BIGINT
)
RETURNS TABLE (
    member_address TEXT,
    member_user_id BIGINT,
    depth INTEGER,
    portfolio_count INTEGER,
    total_roi_micro_usd NUMERIC,
    total_roi_usd NUMERIC,
    total_roi_rama_wei NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        leg_member.address::TEXT AS member_address,   -- ensure TEXT match
        leg_member.user_id AS member_user_id,
        leg_member.depth,

        roi.total_portfolios AS portfolio_count,

        -- ROI SAFE NUMERIC (no biginteger cast)
        roi.total_roi_micro_usd AS total_roi_micro_usd,
        roi.total_roi_usd AS total_roi_usd,
        roi.total_roi_rama_wei AS total_roi_rama_wei

    FROM (
        SELECT * FROM get_leg_team(p_user_address, p_direct_address)
    ) leg_member

    LEFT JOIN LATERAL (
        SELECT * FROM calculate_user_roi_for_day(
            leg_member.address,
            p_day_id,
            p_price_micro_usd
        )
    ) roi ON TRUE

    ORDER BY leg_member.depth, leg_member.address;
END;
$$ LANGUAGE plpgsql;
