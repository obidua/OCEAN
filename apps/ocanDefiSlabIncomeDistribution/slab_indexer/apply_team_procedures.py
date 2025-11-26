"""
Apply team database procedures to PostgreSQL
Run this once to create the optimized database functions
"""
import asyncio
from app.core.db import engine
from sqlalchemy import text


async def apply_procedures():
    """
    Read and execute the team procedures SQL file
    """
    print("Reading SQL procedures file...")

    with open("migrations/team_procedures.sql", "r") as f:
        sql_content = f.read()

    print("Connecting to database...")

    async with engine.begin() as conn:
        # Split by function delimiter and execute
        print("Creating database procedures...")

        # Execute the entire SQL file
        await conn.execute(text(sql_content))

        print("✓ Team procedures created successfully!")
        print("\nCreated functions:")
        print("  - get_team_tree(user_address)")
        print("  - get_team_count(user_address)")
        print("  - get_team_max_depth(user_address)")
        print("  - get_legs_breakdown(user_address)")
        print("  - get_team_summary(user_address)")
        print("  - get_leg_team(user_address, direct_address)")
        print("  - get_directs(user_address)")
        print("\nCreated indexes:")
        print("  - idx_users_referrer_address")
        print("  - idx_users_user_address")
        print("  - idx_users_created_at")

    print("\n✓ All done! Database procedures are ready to use.")


if __name__ == "__main__":
    asyncio.run(apply_procedures())
