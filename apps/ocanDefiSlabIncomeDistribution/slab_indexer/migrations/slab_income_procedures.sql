-- ==============================================================================
-- SLAB INCOME CALCULATION PROCEDURES
-- ==============================================================================
-- These procedures calculate slab income and slab override income
-- using the team structure and ROI data from the database.
--
-- Performance optimized with CTEs and recursive queries.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Helper: Get user's slab percentage for a specific day
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_slab_for_day(
    p_user_address TEXT,
    p_day_id INTEGER
) RETURNS TABLE (
    user_address TEXT,
    day_id INTEGER,
    slab_level INTEGER,
    slab_percentage DECIMAL(5,2)
) AS $$
BEGIN
    -- Try to fetch existing slab achievement for this user & day
    RETURN QUERY
    SELECT
        sa.user_address,
        sa.day_id,
        sa.slab_level,
        sa.slab_percentage
    FROM slab_achievements sa
    WHERE sa.user_address = LOWER(p_user_address)
      AND sa.day_id = p_day_id
    LIMIT 1;

    -- If no record found, return default (no slab)
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            LOWER(p_user_address)::TEXT,
            p_day_id::INTEGER,
            0::INTEGER,
            0.00::DECIMAL(5,2);
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;





-- ------------------------------------------------------------------------------
-- Helper: Calculate considerable ROI for a user (sum of all legs ROI * 36%)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_considerable_roi_for_day(
    p_user_address TEXT,
    p_day_id INTEGER,
    p_price_micro_usd BIGINT
) RETURNS TABLE (
    user_address TEXT,
    day_id INTEGER,
    total_legs_roi_micro_usd NUMERIC,
    considerable_roi_micro_usd NUMERIC,
    considerable_roi_usd DECIMAL(20,6)
) AS $$
BEGIN
    RETURN QUERY
    WITH legs_roi AS (
        SELECT * FROM calculate_legs_roi_for_day(p_user_address, p_day_id, p_price_micro_usd)
    )
    SELECT
        LOWER(p_user_address)::TEXT AS user_address,
        p_day_id::INTEGER       AS day_id,
        COALESCE(SUM(lr.leg_roi_micro_usd), 0)::NUMERIC AS total_legs_roi_micro_usd,
        COALESCE(SUM(lr.leg_roi_micro_usd), 0)::NUMERIC * 0.36 AS considerable_roi_micro_usd,
        (COALESCE(SUM(lr.leg_roi_micro_usd), 0)::NUMERIC * 0.36 / 1000000.0)::DECIMAL(20,6)
            AS considerable_roi_usd
    FROM legs_roi lr;
END;
$$ LANGUAGE plpgsql STABLE;


-- ------------------------------------------------------------------------------
-- Main: Calculate slab income for a user for a specific day
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_slab_income_for_day(
    p_user_address TEXT,
    p_day_id INTEGER,
    p_price_micro_usd BIGINT
) RETURNS TABLE (
    user_address TEXT,
    day_id INTEGER,
    user_slab_level INTEGER,
    user_slab_percentage DECIMAL(5,2),
    total_slab_income_micro_usd NUMERIC,
    total_slab_income_usd DECIMAL(20,6),
    total_slab_income_rama_wei NUMERIC,
    legs_count INTEGER,
    legs_detail JSONB
) AS $$
DECLARE
    v_user_slab_level      INTEGER;
    v_user_slab_percentage DECIMAL(5,2);
    v_total_income_micro_usd NUMERIC := 0;
    v_legs_detail          JSONB := '[]'::JSONB;
    v_legs_count           INTEGER := 0;
BEGIN
    -- Get user's slab for this day
    SELECT slab_level, slab_percentage
    INTO v_user_slab_level, v_user_slab_percentage
    FROM get_user_slab_for_day(p_user_address, p_day_id);

    -- No slab → zero income
    IF v_user_slab_level = 0 OR v_user_slab_percentage = 0 THEN
        RETURN QUERY
        SELECT
            LOWER(p_user_address)::TEXT,
            p_day_id::INTEGER,
            v_user_slab_level::INTEGER,
            v_user_slab_percentage::DECIMAL(5,2),
            0::NUMERIC,
            0.00::DECIMAL(20,6),
            0::NUMERIC,
            0::INTEGER,
            '[]'::JSONB;
        RETURN;
    END IF;

    WITH user_directs AS (
        SELECT * FROM get_directs(p_user_address)
    ),
    leg_calculations AS (
        SELECT
            ud.address AS direct_address,
            ud.user_id AS direct_user_id,

            -- aggregated leg income and members JSON
            COALESCE(
                SUM(
                    CASE
                        WHEN COALESCE(ms.slab_percentage, 0.00) < v_user_slab_percentage THEN
                            COALESCE(cr.considerable_roi_micro_usd, 0)::NUMERIC
                            * (v_user_slab_percentage - COALESCE(ms.slab_percentage, 0.00)) / 100.0
                        ELSE 0
                    END
                ),
                0
            ) AS leg_total_income_micro_usd,

            COALESCE(
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'member_address', lt.address,
                        'member_user_id', lt.user_id,
                        'depth', lt.depth,
                        'member_slab_level', COALESCE(ms.slab_level, 0),
                        'member_slab_percentage', COALESCE(ms.slab_percentage, 0.00),
                        'member_considerable_roi_micro_usd', COALESCE(cr.considerable_roi_micro_usd, 0),
                        'differential_percentage',
                            CASE
                                WHEN COALESCE(ms.slab_percentage, 0.00) < v_user_slab_percentage
                                THEN (v_user_slab_percentage - COALESCE(ms.slab_percentage, 0.00)) / 100.0
                                ELSE 0.00
                            END,
                        'income_from_member_micro_usd',
                            CASE
                                WHEN COALESCE(ms.slab_percentage, 0.00) < v_user_slab_percentage
                                THEN
                                    COALESCE(cr.considerable_roi_micro_usd, 0)::NUMERIC *
                                    (v_user_slab_percentage - COALESCE(ms.slab_percentage, 0.00)) / 100.0
                                ELSE 0
                            END
                    )
                ),
                '[]'::JSONB
            ) AS members_data

        FROM user_directs ud
        LEFT JOIN LATERAL get_leg_team(p_user_address, ud.address) lt ON TRUE
        LEFT JOIN LATERAL get_user_slab_for_day(lt.address, p_day_id) ms ON TRUE
        LEFT JOIN LATERAL calculate_considerable_roi_for_day(lt.address, p_day_id, p_price_micro_usd) cr ON TRUE
        WHERE lt.address IS NOT NULL
          AND lt.address <> ud.address   -- exclude the direct itself
        GROUP BY ud.address, ud.user_id
    ),
    leg_with_cap AS (
        SELECT
            lc.direct_address,
            lc.direct_user_id,
            lc.leg_total_income_micro_usd,
            lc.members_data,
            SUM(lc.leg_total_income_micro_usd) OVER () AS total_all_legs_income_micro_usd,
            LEAST(
                lc.leg_total_income_micro_usd,
                SUM(lc.leg_total_income_micro_usd) OVER () * 0.60
            ) AS leg_capped_income_micro_usd
        FROM leg_calculations lc
    )
    -- Build final legs_detail JSON
    SELECT
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'direct_address', lwc.direct_address,
                    'direct_user_id', lwc.direct_user_id,
                    'leg_total_income_micro_usd', lwc.leg_total_income_micro_usd,
                    'leg_capped_income_micro_usd', lwc.leg_capped_income_micro_usd,
                    'leg_capped_income_usd', lwc.leg_capped_income_micro_usd / 1000000.0,
                    'cap_applied', (lwc.leg_total_income_micro_usd > lwc.leg_capped_income_micro_usd),
                    'members', lwc.members_data
                )
            ),
            '[]'::JSONB
        )
    INTO v_legs_detail
    FROM leg_with_cap lwc;

    -- Total capped income (micro USD) from JSON
    SELECT COALESCE(
        SUM((leg->>'leg_capped_income_micro_usd')::NUMERIC), 0
    )
    INTO v_total_income_micro_usd
    FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_legs_detail, '[]'::JSONB)) AS leg;

    -- Legs count
    SELECT JSONB_ARRAY_LENGTH(COALESCE(v_legs_detail, '[]'::JSONB))
    INTO v_legs_count;

    -- Return final result
    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT,
        p_day_id::INTEGER,
        v_user_slab_level::INTEGER,
        v_user_slab_percentage::DECIMAL(5,2),
        v_total_income_micro_usd::NUMERIC,
        (v_total_income_micro_usd / 1000000.0)::DECIMAL(20,6),
        -- microUSD → RAMA wei: micro * 1e18 / price_micro
        (v_total_income_micro_usd * 1e18::NUMERIC / NULLIF(p_price_micro_usd, 0))::NUMERIC,
        v_legs_count::INTEGER,
        COALESCE(v_legs_detail, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE;







-- ------------------------------------------------------------------------------
-- Main: Calculate slab override income for achievers
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_slab_override_income_for_day(
    p_user_address TEXT,
    p_day_id INTEGER,
    p_price_micro_usd BIGINT
) RETURNS TABLE (
    user_address TEXT,
    day_id INTEGER,
    user_slab_level INTEGER,
    total_override_income_micro_usd NUMERIC,
    total_override_income_usd DECIMAL(20,6),
    total_override_income_rama_wei NUMERIC,
    achievers_count INTEGER,
    achievers_detail JSONB
) AS $$
DECLARE
    v_user_slab_level        INTEGER;
    v_user_slab_percentage   DECIMAL(5,2);
    v_total_override_micro_usd NUMERIC := 0;
    v_achievers_detail       JSONB := '[]'::JSONB;
    v_achievers_count        INTEGER := 0;
BEGIN
    -- Get user's slab for this day
    SELECT slab_level, slab_percentage
    INTO v_user_slab_level, v_user_slab_percentage
    FROM get_user_slab_for_day(p_user_address, p_day_id);

    -- If user has no slab, return zero income
    IF v_user_slab_level = 0 THEN
        RETURN QUERY
        SELECT
            LOWER(p_user_address)::TEXT,
            p_day_id::INTEGER,
            0::INTEGER,
            0::NUMERIC,
            0.00::DECIMAL(20,6),
            0::NUMERIC,
            0::INTEGER,
            '[]'::JSONB;
        RETURN;
    END IF;

    WITH team_members AS (
        SELECT * FROM get_team_tree(p_user_address)
    ),
    achievers AS (
        SELECT
            tm.address AS achiever_address,
            tm.user_id AS achiever_user_id,
            tm.depth,
            tm.path,
            COALESCE(ach_slab.slab_level, 0)  AS achiever_slab_level,
            COALESCE(ach_slab.slab_percentage, 0.00) AS achiever_slab_percentage,
            (
                SELECT total_slab_income_micro_usd
                FROM calculate_slab_income_for_day(tm.address, p_day_id, p_price_micro_usd)
            ) AS achiever_slab_income_micro_usd,
            tm.referrer_address AS direct_upline,
            (
                SELECT u.referrer_address
                FROM users u
                WHERE u.user_address = tm.referrer_address
            ) AS second_upline
        FROM team_members tm
        LEFT JOIN LATERAL get_user_slab_for_day(tm.address, p_day_id) ach_slab ON TRUE
        WHERE COALESCE(ach_slab.slab_level, 0) >= v_user_slab_level
          AND COALESCE(ach_slab.slab_level, 0) > 0
          AND tm.address <> LOWER(p_user_address)
    ),
    override_distribution AS (
        SELECT
            a.achiever_address,
            a.achiever_user_id,
            a.achiever_slab_level,
            a.achiever_slab_percentage,
            COALESCE(a.achiever_slab_income_micro_usd, 0)::NUMERIC AS achiever_slab_income_micro_usd,
            a.depth,
            CASE
                WHEN a.direct_upline = LOWER(p_user_address) THEN 0.10
                WHEN a.second_upline = LOWER(p_user_address) THEN 0.05
                WHEN a.path LIKE '%' || LOWER(p_user_address) || '%' THEN 0.05
                ELSE 0.00
            END AS override_percentage,
            (
                COALESCE(a.achiever_slab_income_micro_usd, 0)::NUMERIC *
                CASE
                    WHEN a.direct_upline = LOWER(p_user_address) THEN 0.10
                    WHEN a.second_upline = LOWER(p_user_address) THEN 0.05
                    WHEN a.path LIKE '%' || LOWER(p_user_address) || '%' THEN 0.05
                    ELSE 0.00
                END
            ) AS override_income_micro_usd
        FROM achievers a
        WHERE a.direct_upline = LOWER(p_user_address)
           OR a.second_upline = LOWER(p_user_address)
           OR a.path LIKE '%' || LOWER(p_user_address) || '%'
    )
    -- Build JSON
    SELECT
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'achiever_address', od.achiever_address,
                    'achiever_user_id', od.achiever_user_id,
                    'achiever_slab_level', od.achiever_slab_level,
                    'achiever_slab_percentage', od.achiever_slab_percentage,
                    'achiever_slab_income_micro_usd', od.achiever_slab_income_micro_usd,
                    'achiever_slab_income_usd', od.achiever_slab_income_micro_usd / 1000000.0,
                    'override_percentage', od.override_percentage,
                    'override_income_micro_usd', od.override_income_micro_usd,
                    'override_income_usd', od.override_income_micro_usd / 1000000.0
                )
            ),
            '[]'::JSONB
        )
    INTO v_achievers_detail
    FROM override_distribution od;

    -- Sum override income
    SELECT COALESCE(
        SUM((ach->>'override_income_micro_usd')::NUMERIC), 0
    )
    INTO v_total_override_micro_usd
    FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_achievers_detail, '[]'::JSONB)) AS ach;

    -- Count achievers
    SELECT JSONB_ARRAY_LENGTH(COALESCE(v_achievers_detail, '[]'::JSONB))
    INTO v_achievers_count;

    -- Return
    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT,
        p_day_id::INTEGER,
        v_user_slab_level::INTEGER,
        v_total_override_micro_usd::NUMERIC,
        (v_total_override_micro_usd / 1000000.0)::DECIMAL(20,6),
        (v_total_override_micro_usd * 1e18::NUMERIC / NULLIF(p_price_micro_usd, 0))::NUMERIC,
        v_achievers_count::INTEGER,
        COALESCE(v_achievers_detail, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE;






-- ------------------------------------------------------------------------------
-- Combined: Get both slab income and override income in one call
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_combined_slab_income_for_day(
    p_user_address TEXT,
    p_day_id INTEGER,
    p_price_micro_usd BIGINT
) RETURNS TABLE (
    user_address TEXT,
    day_id INTEGER,
    user_slab_level INTEGER,
    user_slab_percentage DECIMAL(5,2),
    -- Slab income
    slab_income_micro_usd NUMERIC,
    slab_income_usd DECIMAL(20,6),
    slab_income_rama_wei NUMERIC,
    legs_count INTEGER,
    -- Override income
    override_income_micro_usd NUMERIC,
    override_income_usd DECIMAL(20,6),
    override_income_rama_wei NUMERIC,
    achievers_count INTEGER,
    -- Total
    total_income_micro_usd NUMERIC,
    total_income_usd DECIMAL(20,6),
    total_income_rama_wei NUMERIC,
    -- Details
    slab_details JSONB,
    override_details JSONB
) AS $$
DECLARE
    v_slab_data     RECORD;
    v_override_data RECORD;
BEGIN
    -- Get slab income
    SELECT * INTO v_slab_data
    FROM calculate_slab_income_for_day(p_user_address, p_day_id, p_price_micro_usd);

    -- Get override income
    SELECT * INTO v_override_data
    FROM calculate_slab_override_income_for_day(p_user_address, p_day_id, p_price_micro_usd);

    RETURN QUERY
    SELECT
        LOWER(p_user_address)::TEXT,
        p_day_id::INTEGER,
        v_slab_data.user_slab_level::INTEGER,
        v_slab_data.user_slab_percentage::DECIMAL(5,2),

        -- Slab
        v_slab_data.total_slab_income_micro_usd::NUMERIC,
        v_slab_data.total_slab_income_usd::DECIMAL(20,6),
        v_slab_data.total_slab_income_rama_wei::NUMERIC,
        v_slab_data.legs_count::INTEGER,

        -- Override
        v_override_data.total_override_income_micro_usd::NUMERIC,
        v_override_data.total_override_income_usd::DECIMAL(20,6),
        v_override_data.total_override_income_rama_wei::NUMERIC,
        v_override_data.achievers_count::INTEGER,

        -- Total
        (v_slab_data.total_slab_income_micro_usd
         + v_override_data.total_override_income_micro_usd)::NUMERIC,
        (v_slab_data.total_slab_income_usd
         + v_override_data.total_override_income_usd)::DECIMAL(20,6),
        (v_slab_data.total_slab_income_rama_wei
         + v_override_data.total_override_income_rama_wei)::NUMERIC,

        -- Details
        v_slab_data.legs_detail::JSONB,
        v_override_data.achievers_detail::JSONB;
END;
$$ LANGUAGE plpgsql STABLE;
