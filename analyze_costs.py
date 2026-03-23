import csv
import re

def parse_currency(value):
    if not value or value.strip() == '-' or value.strip() == '':
        return 0.0
    # Remove $, commas, quotes
    clean_val = re.sub(r'[^\d.]', '', value)
    return float(clean_val) if clean_val else 0.0

data_2025 = []
data_2026 = []

file_path = r'C:\Users\steph\.gemini\antigravity\scratch\concept-art-board\public\data\Character_Cost_Breakdowns.csv'

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    # Rarity: index 3
    # Art Cost Actual ($): index 29
    # Art Date Completed: index 33
    
    for row in reader:
        if len(row) < 34:
            continue
        
        rarity = row[3].strip()
        cost = parse_currency(row[29])
        date_str = row[33].strip()
        
        if not rarity or cost == 0 or not date_str:
            continue
            
        year = None
        if '25' in date_str:
            year = 2025
        elif '26' in date_str:
            year = 2026
            
        if year == 2025:
            data_2025.append({'rarity': rarity, 'cost': cost})
        elif year == 2026:
            data_2026.append({'rarity': rarity, 'cost': cost})

def process_year(data, year):
    rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']
    stats = {}
    for r in rarities:
        costs = [d['cost'] for d in data if d['rarity'] == r]
        count = len(costs)
        total = sum(costs)
        avg = total / count if count > 0 else 0
        stats[r] = {'count': count, 'total': total, 'avg': avg}
    return stats

stats_2025 = process_year(data_2025, 2025)
stats_2026 = process_year(data_2026, 2026)

print("Year 2025:")
for r, s in stats_2025.items():
    print(f"{r}: Count={s['count']}, Total={s['total']:.2f}, Avg={s['avg']:.2f}")

print("\nYear 2026:")
for r, s in stats_2026.items():
    print(f"{r}: Count={s['count']}, Total={s['total']:.2f}, Avg={s['avg']:.2f}")

# Calculate Quality Ratios
# (Average of Legendary+Epic) / (Average of Common+Uncommon)
# To handle cases where one rarity in a group might have 0 count, 
# we'll calculate the average of the group by (Total of both) / (Count of both).

def calc_ratio(stats):
    high_total = stats['Legendary']['total'] + stats['Epic']['total']
    high_count = stats['Legendary']['count'] + stats['Epic']['count']
    high_avg = high_total / high_count if high_count > 0 else 0
    
    low_total = stats['Common']['total'] + stats['Uncommon']['total']
    low_count = stats['Common']['count'] + stats['Uncommon']['count']
    low_avg = low_total / low_count if low_count > 0 else 0
    
    if low_avg == 0:
        return None
    return high_avg / low_avg

ratio_2025 = calc_ratio(stats_2025)
ratio_2026 = calc_ratio(stats_2026)

print(f"\nRatio 2025: {ratio_2025}")
print(f"Ratio 2026: {ratio_2026}")

if ratio_2025 and ratio_2026:
    change = ((ratio_2026 - ratio_2025) / ratio_2025) * 100
    print(f"Percentage Change: {change:.2f}%")
