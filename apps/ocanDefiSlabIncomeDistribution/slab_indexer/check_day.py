from datetime import datetime
import time

current_ts = int(time.time())
current_day_unix = current_ts // 86400

print(f"Current timestamp: {current_ts}")
print(f"Current date: {datetime.now()}")
print(f"Current day (Unix epoch): {current_day_unix}")
print(f"Your database day: 20407")
print(f"Difference: {20407 - current_day_unix} days")
print()

if 20407 > current_day_unix:
    print(f"WARNING: Day 20407 is {20407 - current_day_unix} days in the FUTURE")
    print(f"Use day {current_day_unix} for today")
    print(f"Or use day {current_day_unix - 1} for yesterday")
else:
    print("Day 20407 is valid (in the past)")
