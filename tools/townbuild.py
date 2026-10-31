# Build data/towns.json for the harbour views from the raw present-day maps in data/towns_raw/.
# Each building, street and wharf gets the year it appears, so a town starts sparse and grows to today's size,
# and the period works (mills, wharves, elevators, stations) are added from the per-town settings below.
#   python3 tools/townbuild.py
import json, math, os, hashlib
import shapely
from shapely.geometry import shape, box, Point, LineString, Polygon, MultiPolygon, GeometryCollection
from shapely.ops import unary_union, nearest_points

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'data', 'towns_raw')
OUT = os.path.join(HERE, '..', 'data', 'towns.json')

# Per town, in local metres from the raw file's south-west corner (x east, y north):
#   crop: the harbour view's extent; view: the compass bearing the viewer looks along; core: where the town began
#   growth: share of today's buildings standing by each year; rail: [x, y, year] anchors that date the nearest track
#   works: period buildings and wharves; channel: the way in from open water; berths: where boats lie
#   wood: how much of the open ground was still wooded (1 on the Shield; farm country was mostly cleared fields)
TOWNS = {
    'parrysound': {
        'name': 'Parry Sound', 'crop': [1850, 950, 3650, 3080], 'view': 15, 'wood': 1, 'trestles': [[3515, 2880, 30]],
        'core': [[2810, 2050], [2760, 1700]],
        # a mill village of a couple of dozen houses in 1870; about 1,300 people by 1881, 2,900 by 1901 and 3,400 by 1911
        'growth': [[1857, 0], [1866, .005], [1870, .012], [1875, .045], [1880, .11], [1885, .17], [1890, .23], [1900, .38], [1910, .5], [1920, .57], [1930, .6], [1940, .64], [1950, .74], [1960, .84], [1990, 1]],
        'rail': [[2700, 1900, 1906], [3130, 1610, 1906], [2520, 2300, 1906], [3420, 2200, 1908], [3450, 2850, 1908], [3600, 2600, 1908]],
        'works': [
            {'k': 'wharf', 'name': 'Town wharf', 'line': [[2735, 1630], [2650, 1400]], 'w': 22, 'from': 1866},
            {'k': 'shed', 'name': 'Freight shed', 'at': [2706, 1540], 'size': [46, 13], 'ang': 70, 'h': 6, 'from': 1880},
            {'k': 'wharf', 'name': 'Mill wharf', 'line': [[2860, 1570], [2790, 1420]], 'w': 18, 'from': 1863, 'to': 1935},
            {'k': 'mill', 'name': 'Sawmill', 'at': [2915, 1600], 'size': [62, 22], 'ang': 30, 'h': 9, 'from': 1857, 'to': 1932},
            {'k': 'burner', 'at': [2965, 1560], 'from': 1875, 'to': 1932},
            {'k': 'yard', 'c': 'lumber', 'poly': [[2880, 1400], [3060, 1400], [3060, 1540], [2930, 1560], [2880, 1480]], 'from': 1863, 'to': 1935},
            {'k': 'pond', 'c': 'logs', 'poly': [[2830, 1640], [2900, 1700], [2870, 1760], [2800, 1700]], 'from': 1857, 'to': 1932},
            {'k': 'coal', 'at': [2620, 1600], 'from': 1885},
            {'k': 'icehouse', 'at': [2585, 1640]},
            {'k': 'crane', 'at': [2690, 1470]}, {'k': 'crane', 'at': [2830, 1480], 'to': 1935},
        ],
        'channel': [[1900, 1000], [2250, 1150], [2500, 1280], [2620, 1360]],
        'berths': [
            {'at': [2655, 1470], 'ang': 70, 'kind': 'tug'}, {'at': [2672, 1520], 'ang': 70, 'kind': 'tug'}, {'at': [2690, 1570], 'ang': 70, 'kind': 'tug'},
            {'at': [2705, 1430], 'ang': 250, 'kind': 'tug'}, {'at': [2740, 1520], 'ang': 250, 'kind': 'ship'},
            {'at': [2770, 1470], 'ang': 65, 'kind': 'ship'}, {'at': [2600, 1400], 'ang': 150, 'kind': 'tug'},
        ],
    },
    'collingwood': {
        'name': 'Collingwood', 'crop': [1250, 1050, 2900, 3080], 'view': 200, 'wood': .3,
        'core': [[2205, 1930], [2205, 1700]],
        # a town of about 2,800 people in 1871, 4,400 in 1881, 5,800 in 1901 and 7,100 in 1911
        'growth': [[1855, 0], [1860, .05], [1870, .16], [1880, .28], [1890, .36], [1900, .42], [1910, .5], [1920, .52], [1930, .54], [1940, .58], [1950, .65], [1970, .85], [2000, 1]],
        'rail': [[2360, 2120, 1855], [2700, 1700, 1855], [2100, 2550, 1855], [1500, 2000, 1872]],
        'reserve': [[1900, 2000, 2200, 2380, 1990], [1650, 2750, 1900, 2950, 1990]],
        'works': [
            {'k': 'wharf', 'name': 'Railway wharf', 'line': [[2180, 2440], [2005, 2650]], 'w': 14, 'from': 1855},
            {'k': 'wharf', 'name': 'Elevator wharf', 'line': [[1855, 2668], [1645, 2890]], 'w': 14, 'from': 1871},
            {'k': 'elevator', 'name': 'Grain elevator', 'at': [1790, 2812], 'size': [100, 30], 'ang': 42, 'h': 36, 'from': 1871},
            {'k': 'wharf', 'name': 'Town wharf', 'line': [[1965, 2362], [2150, 2362]], 'w': 14, 'from': 1858},
            {'k': 'shed', 'name': 'Freight shed', 'at': [2060, 2335], 'size': [44, 12], 'ang': 0, 'h': 6, 'from': 1860},
            {'k': 'shed', 'name': 'Shipyard', 'at': [2060, 2200], 'size': [70, 24], 'ang': 90, 'h': 14, 'from': 1883},
            {'k': 'wharf', 'name': 'Dry dock', 'line': [[2270, 2100], [2270, 2240]], 'w': 26, 'from': 1883},
            {'k': 'mill', 'name': 'Sawmill', 'at': [1740, 2250], 'size': [60, 22], 'ang': 20, 'h': 9, 'from': 1858, 'to': 1915},
            {'k': 'burner', 'at': [1690, 2200], 'from': 1870, 'to': 1915},
            {'k': 'yard', 'c': 'lumber', 'poly': [[1770, 2080], [1880, 2080], [1880, 2190], [1770, 2190]], 'from': 1858, 'to': 1920},
            {'k': 'pond', 'c': 'logs', 'poly': [[1700, 2345], [1810, 2335], [1820, 2410], [1700, 2420]], 'from': 1858, 'to': 1915},
            {'k': 'coal', 'at': [2330, 2230], 'from': 1870}, {'k': 'icehouse', 'at': [1820, 2270]},
            {'k': 'crane', 'at': [2100, 2370]}, {'k': 'crane', 'at': [1760, 2770]},
        ],
        'channel': [[1300, 3050], [1500, 2900], [1720, 2620], [1950, 2480]],
    },
    'owensound': {
        'name': 'Owen Sound', 'crop': [1250, 1850, 2450, 3700], 'view': 250, 'wood': 0.3,
        'core': [[1640, 1980], [1700, 2300]],
        # laid out as Sydenham in the 1840s; about 3,400 people in 1871, 4,400 in 1881, 7,500 in 1891, 8,800 in 1901 and 12,600 in 1911
        'growth': [[1841, 0], [1857, .06], [1870, .12], [1880, .2], [1890, .3], [1900, .42], [1910, .55], [1920, .58], [1930, .6], [1940, .64], [1950, .72], [1970, .88], [2000, 1]],
        'rail': [[1745, 2410, 1873], [2400, 3700, 1873], [1610, 2290, 1894], [1500, 3000, 1894]],
        'reserve': [[1750, 2400, 2150, 3200, 1960]],
        'works': [
            {'k': 'wharf', 'name': 'Railway wharf', 'line': [[1712, 2480], [1790, 2950]], 'w': 14, 'from': 1873},
            {'k': 'wharf', 'name': 'Town wharf', 'line': [[1636, 2380], [1612, 2760]], 'w': 12, 'from': 1857},
            {'k': 'elevator', 'name': 'CPR elevator', 'at': [1860, 2930], 'size': [60, 26], 'ang': 75, 'h': 34, 'from': 1884},
            {'k': 'shed', 'name': 'Freight shed', 'at': [1750, 2650], 'size': [50, 12], 'ang': 80, 'h': 6, 'from': 1873},
            {'k': 'shed', 'name': 'Shipyard', 'at': [1560, 2950], 'size': [44, 18], 'ang': 60, 'h': 11, 'from': 1870},
            {'k': 'yard', 'c': 'lumber', 'poly': [[1460, 2700], [1590, 2700], [1590, 2830], [1460, 2830]], 'from': 1860},
            {'k': 'coal', 'at': [1810, 2780], 'from': 1873}, {'k': 'icehouse', 'at': [1600, 2600]},
            {'k': 'crane', 'at': [1700, 2600]}, {'k': 'crane', 'at': [1640, 2550]},
        ],
        'channel': [[1950, 3700], [1780, 3400], [1720, 3150], [1700, 2950]],
    },
    'midland': {
        'name': 'Midland', 'crop': [800, 1000, 2400, 2300], 'view': 160, 'wood': 0.35,
        'core': [[1500, 1250]],
        # a new town from 1872, when the railway's terminus was laid out; about 3,200 people in 1901 and 4,700 in 1911
        'growth': [[1872, 0], [1880, .08], [1890, .2], [1900, .35], [1910, .5], [1920, .6], [1930, .62], [1940, .65], [1950, .72], [1970, .88], [2000, 1]],
        'rail': [[1300, 1250, 1879], [2100, 2050, 1879], [2600, 1700, 1879]],
        'reserve': [[1380, 1580, 1700, 1920, 1990]],
        'works': [
            {'k': 'wharf', 'name': 'Town dock', 'line': [[1430, 1487], [1250, 1487]], 'w': 18, 'from': 1872},
            {'k': 'wharf', 'name': 'Elevator wharf', 'line': [[1393, 1614], [1503, 1872]], 'w': 16, 'from': 1881},
            {'k': 'elevator', 'name': 'Grain elevator', 'at': [1560, 1780], 'size': [80, 28], 'ang': 67, 'h': 36, 'from': 1881},
            {'k': 'shed', 'name': 'Freight shed', 'at': [1340, 1520], 'size': [40, 12], 'ang': 0, 'h': 6, 'from': 1880},
            {'k': 'mill', 'name': 'Sawmill', 'at': [1050, 1380], 'size': [70, 24], 'ang': -20, 'h': 9, 'from': 1872, 'to': 1930},
            {'k': 'burner', 'at': [1110, 1345], 'from': 1875, 'to': 1930},
            {'k': 'yard', 'c': 'lumber', 'poly': [[980, 1290], [1180, 1300], [1180, 1360], [980, 1350]], 'from': 1872, 'to': 1932},
            {'k': 'pond', 'c': 'logs', 'poly': [[1060, 1470], [1180, 1470], [1200, 1560], [1070, 1590]], 'from': 1872, 'to': 1930},
            {'k': 'coal', 'at': [1450, 1590], 'from': 1880},
            {'k': 'crane', 'at': [1330, 1470]}, {'k': 'crane', 'at': [1440, 1700]},
        ],
        'channel': [[1550, 2300], [1420, 1950], [1340, 1700], [1330, 1560]],
    },
    'penetang': {
        'name': 'Penetanguishene', 'crop': [450, 100, 1900, 1500], 'view': 140, 'wood': 0.35,
        'core': [[1190, 600]],
        # a naval and military station from 1817 and a French-Canadian village; about 2,400 people in 1901 and 3,600 in 1911
        'growth': [[1817, 0], [1850, .05], [1870, .1], [1880, .16], [1890, .25], [1900, .35], [1910, .48], [1920, .5], [1930, .52], [1940, .56], [1950, .65], [1970, .85], [2000, 1]],
        'rail': [[946, 840, 1879], [600, 0, 1879]],
        'reserve': [[820, 480, 1050, 700, 1950]],
        'works': [
            {'k': 'wharf', 'name': 'Town wharf', 'line': [[900, 870], [690, 1005]], 'w': 16, 'from': 1871},
            {'k': 'shed', 'name': 'Freight shed', 'at': [880, 905], 'size': [30, 12], 'ang': 30, 'h': 6, 'from': 1880},
            {'k': 'mill', 'name': 'Sawmill', 'at': [880, 640], 'size': [60, 22], 'ang': 30, 'h': 9, 'from': 1875, 'to': 1930},
            {'k': 'burner', 'at': [930, 600], 'from': 1880, 'to': 1930},
            {'k': 'yard', 'c': 'lumber', 'poly': [[860, 500], [1000, 520], [990, 600], [870, 590]], 'from': 1875, 'to': 1932},
            {'k': 'pond', 'c': 'logs', 'poly': [[720, 620], [820, 600], [830, 700], [730, 720]], 'from': 1875, 'to': 1930},
            {'k': 'coal', 'at': [960, 900], 'from': 1880}, {'k': 'icehouse', 'at': [980, 960]},
            {'k': 'crane', 'at': [830, 910]},
        ],
        'channel': [[1000, 1500], [880, 1250], [820, 1050]],
    },
    'mcnicoll': {
        'name': 'Port McNicoll', 'crop': [1000, 0, 3100, 2000], 'view': 250, 'wood': 0.5,
        'core': [[1650, 900]],
        'growth': [[1910, 0], [1912, .1], [1915, .4], [1920, .6], [1930, .7], [1950, .8], [1970, .92], [2000, 1]],
        'rail': [[2600, 600, 1912], [2000, 0, 1912]],
        'reserve': [[2200, 0, 2900, 1500, 1990]],
        'works': [
            {'k': 'wharf', 'name': 'CPR docks', 'line': [[2420, 420], [2740, 1380]], 'w': 44, 'from': 1912},
            {'k': 'elevator', 'name': 'CPR elevator', 'at': [2620, 1180], 'size': [130, 28], 'ang': 70, 'h': 40, 'from': 1912},
            {'k': 'shed', 'name': 'Freight shed', 'at': [2520, 800], 'size': [120, 16], 'ang': 70, 'h': 7, 'from': 1912},
            {'k': 'coal', 'at': [2380, 520], 'from': 1912},
            {'k': 'crane', 'at': [2560, 900]}, {'k': 'crane', 'at': [2660, 1250]},
        ],
        'channel': [[2900, 2000], [2700, 1700], [2560, 1450]],
    },
    'gateway': {
        'name': 'Port Huron', 'crop': [1300, 1000, 2900, 2700], 'view': 245, 'wood': .25,
        'core': [[2100, 1800]],
        # settled in the 1830s; about 6,000 people in 1870 and 19,000 by 1900
        'growth': [[1835, 0], [1850, .07], [1860, .12], [1870, .18], [1880, .3], [1890, .45], [1900, .62], [1910, .7], [1920, .78], [1930, .82], [1950, .88], [1970, .95], [2000, 1]],
        'rail': [[1500, 2000, 1859], [2000, 1300, 1859], [2300, 2400, 1859], [2420, 1300, 1859]],
        'reserve': [[2350, 1450, 2550, 2000, 1950]],
        'works': [
            {'k': 'wharf', 'name': 'River wharf', 'line': [[2562, 1610], [2570, 1990]], 'w': 14, 'from': 1850},
            {'k': 'wharf', 'name': 'Black River docks', 'line': [[2290, 1662], [2110, 1730]], 'w': 10, 'from': 1850},
            {'k': 'wharf', 'name': 'Lumber docks', 'line': [[2230, 1622], [2460, 1436]], 'w': 10, 'from': 1855},
            {'k': 'shed', 'name': 'Freight shed', 'at': [2556, 1820], 'size': [44, 12], 'ang': 88, 'h': 6, 'from': 1860},
            {'k': 'yard', 'c': 'lumber', 'poly': [[2200, 1400], [2350, 1400], [2350, 1530], [2200, 1530]], 'from': 1850},
            {'k': 'coal', 'at': [2440, 1360], 'from': 1860},
            {'k': 'crane', 'at': [2556, 1700]},
        ],
        'channel': [[2900, 2700], [2750, 2200], [2700, 1800], [2620, 1640]],
    },
    'baycity': {
        'name': 'Bay City', 'crop': [1000, 1300, 2800, 3000], 'view': 110, 'wood': .25,
        'core': [[1350, 1850]],
        # some 800 people in 1860, then the lumber boom: about 7,000 in 1870 and over 20,000 by 1880
        'growth': [[1860, 0], [1865, .05], [1870, .2], [1880, .45], [1890, .75], [1900, .82], [1910, .85], [1920, .88], [1950, .92], [2000, 1]],
        'rail': [[1500, 2300, 1867], [2500, 3000, 1867]],
        'reserve': [[1350, 2200, 2500, 2770, 1950]],
        'works': [
            {'k': 'wharf', 'name': 'River wharf', 'line': [[1247, 2090], [1190, 1800]], 'w': 12, 'from': 1860},
            {'k': 'mill', 'name': 'Sawmill', 'at': [1540, 2380], 'size': [80, 26], 'ang': 30, 'h': 10, 'from': 1865, 'to': 1905},
            {'k': 'burner', 'at': [1600, 2340], 'from': 1865, 'to': 1905},
            {'k': 'yard', 'c': 'lumber', 'poly': [[1775, 2420], [1890, 2420], [1890, 2580], [1775, 2580]], 'from': 1865, 'to': 1910},
            {'k': 'pond', 'c': 'logs', 'poly': [[1300, 2400], [1430, 2420], [1450, 2520], [1320, 2540]], 'from': 1865, 'to': 1910},
            {'k': 'shed', 'name': 'Freight shed', 'at': [1228, 1950], 'size': [40, 12], 'ang': 80, 'h': 6, 'from': 1870},
            {'k': 'coal', 'at': [1360, 2230], 'from': 1870},
            {'k': 'crane', 'at': [1236, 1995]},
        ],
        'channel': [[2600, 3000], [2100, 2900], [1700, 2780], [1400, 2550], [1262, 2200]],
    },
    'depot': {
        # Gone today: the town is laid out by hand along the traces of its streets, its rail bed and its dock line.
        # J.R. Booth's Canada Atlantic terminal from 1896-97: two elevators, freight sheds, a coal dock, a roundhouse, about 110 houses,
        # three churches, a school, a hotel and a bank, and 1,600 people by 1926. The line through Algonquin Park was cut in 1933,
        # the elevators and sheds burned on 14 August 1945, the coal dock worked on until the late 1950s, and by 1963 only the
        # roundhouse, the Catholic church and one house were left.
        'name': 'Depot Harbour', 'crop': [1750, 1450, 3100, 2900], 'view': 15, 'wood': 1,
        'core': [[2500, 2200]], 'growth': [[1896, 0], [1926, 1]],
        'rail': [[2400, 2070, 1896], [2950, 2500, 1897], [3100, 2900, 1896]], 'rail_to': 1960, 'rail_roads': ['Old Track Road'],
        'road_years': {'Wawbawzee Road': 1950, 'Deemeemguk Road': 1897},
        'plan': {
            'streets': [
                {'pts': [[2325, 2095], [2409, 2130], [2429, 2147], [2437, 2151], [2489, 2167], [2522, 2181], [2572, 2208], [2589, 2220], [2621, 2245], [2664, 2288], [2687, 2321], [2722, 2384], [2746, 2408]], 'side': 1},
                {'pts': [[2304, 2146], [2380, 2177], [2417, 2202], [2498, 2231], [2556, 2264], [2622, 2323], [2677, 2415], [2707, 2447]], 'new': 1897},
                {'pts': [[2746, 2408], [2725, 2421], [2694, 2400], [2678, 2389], [2581, 2420], [2572, 2406], [2544, 2377], [2411, 2439], [2396, 2430], [2381, 2406], [2366, 2382], [2327, 2318], [2299, 2282], [2300, 2240], [2273, 2191], [2272, 2180], [2282, 2176], [2312, 2162], [2325, 2095]]},
                {'pts': [[2437, 2151], [2417, 2202], [2398, 2300], [2411, 2439]], 'new': 1897},
                {'pts': [[2572, 2208], [2556, 2264], [2544, 2377]], 'new': 1897},
                {'pts': [[2664, 2288], [2622, 2323], [2581, 2420]], 'new': 1898},
                {'pts': [[2746, 2408], [2779, 2379], [2797, 2350], [2801, 2313], [2818, 2281], [2842, 2262], [2863, 2245], [2893, 2217]], 'side': -1},
            ],
            'houses': 110, 'lot': 19,
            'built': [[1897, 1898, .55], [1899, 1905, .25], [1906, 1926, .2]],
            'left': [[1928, 1932, .1], [1933, 1938, .3], [1939, 1946, .25], [1947, 1955, .25], [1956, 1962, .09]],
            'special': [
                {'n': 'Roundhouse', 'k': 'i', 'h': 9, 'y': 1897, 'z': 1990, 'ring': [2918, 2215, 18, 50, -40, 60]},
                {'n': 'Station', 'k': 'c', 'h': 6, 'y': 1897, 'z': 1960, 'at': [2585, 2186], 'size': [28, 9], 'ang': 30},
                {'n': 'Hotel', 'k': 'c', 'h': 11, 'y': 1898, 'z': 1936, 'at': [2480, 2136], 'size': [30, 13], 'ang': 18},
                {'n': 'Bank', 'k': 'c', 'h': 8, 'y': 1898, 'z': 1940, 'at': [2410, 2105], 'size': [12, 9], 'ang': 23},
                {'k': 'c', 'h': 8, 'y': 1898, 'z': 1945, 'at': [2525, 2154], 'size': [14, 10], 'ang': 28},
                {'n': 'Catholic church', 'k': 'r', 'h': 10, 'y': 1898, 'z': 1975, 'at': [2530, 2262], 'size': [22, 11], 'ang': 30},
                {'n': 'Anglican church', 'k': 'r', 'h': 9, 'y': 1899, 'z': 1946, 'at': [2380, 2200], 'size': [18, 9], 'ang': 25},
                {'n': 'Methodist church', 'k': 'r', 'h': 9, 'y': 1900, 'z': 1950, 'at': [2640, 2372], 'size': [18, 9], 'ang': 55},
                {'n': 'School', 'k': 'e', 'h': 8, 'y': 1899, 'z': 1955, 'at': [2460, 2300], 'size': [20, 12], 'ang': 20},
            ],
        },
        'works': [
            {'k': 'wharf', 'name': 'Elevator dock', 'line': [[2183, 1990], [2522, 2103]], 'w': 22, 'from': 1897},
            {'k': 'elevator', 'name': 'Elevator', 'at': [2301, 2030], 'size': [90, 24], 'ang': 18.5, 'h': 40, 'from': 1898, 'to': 1946},
            {'k': 'elevator', 'name': 'Elevator', 'at': [2431, 2074], 'size': [90, 24], 'ang': 18.5, 'h': 40, 'from': 1898, 'to': 1946},
            {'k': 'wharf', 'name': 'Freight dock', 'line': [[1890, 2041], [2145, 1975]], 'w': 14, 'from': 1897},
            {'k': 'shed', 'name': 'Freight sheds', 'at': [2013, 2040], 'size': [150, 14], 'ang': -13.7, 'h': 8, 'from': 1898, 'to': 1946},
            {'k': 'wharf', 'name': 'Coal dock', 'line': [[2586, 2072], [2501, 1995]], 'w': 40, 'from': 1898},
            {'k': 'coal', 'at': [2605, 2105], 'from': 1898, 'dock': True},
            {'k': 'crane', 'at': [2545, 2030]}, {'k': 'crane', 'at': [2330, 2008], 'to': 1946},
        ],
        'channel': [[1760, 2880], [1790, 2400], [1835, 2100], [1900, 1880], [2150, 1860]],
    },
}

R = lambda v: int(round(v))
def flat(coords): return [R(c) for p in coords for c in p]
def rnd(key):
    return int(hashlib.md5(str(key).encode()).hexdigest()[:8], 16) / 0xffffffff

def load(tid):
    d = json.load(open(os.path.join(RAW, tid + '.json')))
    s, w, n, e = d['bbox']; lat0 = (s + n) / 2
    KX = 111320 * math.cos(math.radians(lat0)); KY = 110540
    def to_local(g):
        return shapely.transform(g, lambda a: [[(x - w) * KX, (y - s) * KY] for x, y in a])
    return d, to_local, {'lat0': s, 'lon0': w, 'kx': KX, 'ky': KY}

def polys(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, (MultiPolygon, GeometryCollection)): return [p for x in g.geoms for p in polys(x)]
    return []
def lines(g):
    if g.is_empty: return []
    if isinstance(g, LineString): return [g]
    if hasattr(g, 'geoms'): return [l for x in g.geoms for l in lines(x)]
    return []

def rect(cx, cy, ang, L, W):
    c, s = math.cos(ang), math.sin(ang)
    return Polygon([(cx + c * L / 2 * u - s * W / 2 * v, cy + s * L / 2 * u + c * W / 2 * v) for u, v in ((1, 1), (-1, 1), (-1, -1), (1, -1))])

def orient(p):
    """Centre, length, width and heading of a footprint's best-fitting rectangle."""
    rr = p.minimum_rotated_rectangle
    rc = list(rr.exterior.coords)[:4]
    e1 = math.dist(rc[0], rc[1]); e2 = math.dist(rc[1], rc[2])
    ang = math.atan2(rc[1][1] - rc[0][1], rc[1][0] - rc[0][0]) if e1 >= e2 else math.atan2(rc[2][1] - rc[1][1], rc[2][0] - rc[1][0])
    return [R(rr.centroid.x), R(rr.centroid.y), R(max(e1, e2)), R(min(e1, e2)), round(ang, 3)]

def pick_years(spans, n, key):
    """Spread n years over [from, to, share] spans; whatever the shares leave over gets None."""
    out = []
    for a, b, f in spans:
        for i in range(int(round(f * n))): out.append(a + int(rnd(key + str(len(out))) * (b - a + 1)))
    out += [None] * (n - len(out))
    return out[:n]

def lay_out(tid, cfg, wet, clip, avoid):
    """A town that is gone today: its special buildings where the settings put them, and houses on lots along its streets."""
    plan = cfg['plan']; blds = []
    streets = [LineString(st['pts']) for st in plan['streets']]
    taken = [avoid, wet.buffer(4)] + [l.buffer(6) for l in streets]
    for sp in plan['special']:
        if 'ring' in sp:
            cx, cy, r1, r2, a0, a1 = sp['ring']
            arc = lambda r, s: [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in (range(a0, a1 + 1, 10) if s > 0 else range(a1, a0 - 1, -10))]
            p = Polygon(arc(r2, 1) + arc(r1, -1))
        else:
            p = rect(*sp['at'], math.radians(sp.get('ang', 0)), *sp['size'])
        blds.append({'p': flat(p.exterior.coords[:-1]), 'k': sp['k'], 'h': sp['h'], 'y': sp['y'], 'z': sp.get('z'), 'o': orient(p), 'n': sp.get('n')})
        taken.append(p.buffer(3))
    block = unary_union(taken)
    lots = []
    for st, line in zip(plan['streets'], streets):
        for side in (1, -1):
            if st.get('side', side) != side: continue
            t = 8
            while t < line.length - 8:
                a, b = line.interpolate(t), line.interpolate(t + 1)
                ux, uy = b.x - a.x, b.y - a.y; n = math.hypot(ux, uy) or 1; ux, uy = ux / n, uy / n
                key = f'{tid}{len(lots)}{t}{side}'
                L, W = 8 + rnd(key + 'l') * 3, 7 + rnd(key + 'w') * 2
                p = rect(a.x - uy * side * 14, a.y + ux * side * 14, math.atan2(uy, ux), L, W)
                if clip.contains(p) and not p.intersects(block) and not any(p.distance(q) < 3 for q in lots): lots.append(p)
                t += plan['lot']
    lots.sort(key=lambda p: rnd(f'{tid}lot{p.centroid.x:.0f},{p.centroid.y:.0f}'))
    lots = lots[:plan['houses']]
    ys, zs = pick_years(plan['built'], len(lots), tid + 'b'), pick_years(plan['left'], len(lots), tid + 'z')
    for i, p in enumerate(lots):
        blds.append({'p': flat(p.exterior.coords[:-1]), 'k': 'h', 'h': round(6.5 + rnd(f'{tid}h{i}') * 1.5, 1), 'y': ys[i] or plan['built'][-1][1], 'z': zs[i] or 1975, 'o': orient(p)})
    print(f'  {tid}: {len(lots)} house lots laid out')
    return blds

def growth_year(cfg, f):
    pts = cfg['growth']
    for (y0, a), (y1, b) in zip(pts, pts[1:]):
        if f <= b: return int(y0 + (y1 - y0) * (f - a) / max(1e-9, b - a))
    return pts[-1][0]

KIND = {'residential': 'h', 'commercial': 'c', 'industrial': 'i', 'religious': 'r', 'civic': 'v', 'education': 'e', 'medical': 'm',
        'agricultural': 'o', 'outbuilding': 's', 'service': 'o', 'entertainment': 'c', 'transportation': 'i', 'military': 'v'}
ROAD = {'motorway': 'X', 'trunk': 'M', 'primary': 'M', 'secondary': 'M', 'tertiary': 'M', 'residential': 'R', 'unclassified': 'R',
        'living_street': 'R', 'unknown': 'R', 'service': 'S'}

def build(tid, cfg):
    d, L, frame = load(tid)
    x0, y0, x1, y1 = cfg['crop']; clip = box(x0, y0, x1, y1)
    out = {'id': tid, 'name': cfg['name'], 'crop': cfg['crop'], 'view': cfg['view'], **{k: round(v, 6) for k, v in frame.items()}}
    # water: everything wet, merged, simplified
    wet = unary_union([L(shape(x['geom'])) for x in d['water'] if x['geom']['type'] in ('Polygon', 'MultiPolygon') and x.get('subtype') not in ('physical', 'human_made') and x.get('class') not in ('wastewater', 'swimming_pool')]).intersection(clip)
    wet = wet.simplify(1.5)
    out['water'] = [[flat(p.exterior.coords)] + [flat(h.coords) for h in p.interiors] for p in polys(wet) if p.area > 150]
    out['streams'] = [flat(l.simplify(2).coords) for x in d['water'] if x['geom']['type'] in ('LineString', 'MultiLineString') for l in lines(L(shape(x['geom'])).intersection(clip)) if l.length > 40]
    # land use worth showing
    lu = []
    for x in d['land_use']:
        st, cl = x.get('subtype'), x.get('class')
        code = 'g' if st in ('park', 'recreation', 'managed', 'protected') or cl in ('grass', 'park', 'garden') else 'c' if st == 'cemetery' else 'i' if cl in ('industrial', 'brownfield') else 'r' if st == 'transportation' else None
        if not code: continue
        for p in polys(L(shape(x['geom'])).intersection(clip).simplify(3)):
            if p.area > 400: lu.append({'c': code, 'p': flat(p.exterior.coords), 'g': p})
    # buildings, dated by how far they stand from where the town began
    cores = [Point(*c) for c in cfg['core']]
    works_polys = []
    for w in cfg['works']:
        if w.get('poly'): works_polys.append(Polygon(w['poly']).buffer(4))
        elif w.get('line'): works_polys.append(LineString(w['line']).buffer(w['w'] / 2 + 3))
        elif w.get('size'):
            a = math.radians(w.get('ang', 0)); sl, sw = w['size']
            works_polys.append(Polygon([(w['at'][0] + math.cos(a) * sl / 2 * u - math.sin(a) * sw / 2 * v, w['at'][1] + math.sin(a) * sl / 2 * u + math.cos(a) * sw / 2 * v) for u, v in ((1, 1), (-1, 1), (-1, -1), (1, -1))]).buffer(4))
    mains = [L(shape(x['geom'])) for x in d['segment'] if x['subtype'] == 'road' and ROAD.get(x['class']) == 'M']
    main_u = unary_union(mains) if mains else None
    shore = wet.boundary if not wet.is_empty else None
    blds = []
    rail_now = [L(shape(x['geom'])) for x in d['segment'] if x['subtype'] == 'rail' or x.get('name') in cfg.get('rail_roads', [])]
    if cfg.get('plan'): blds = lay_out(tid, cfg, wet, clip, unary_union(works_polys + [l.buffer(8) for l in rail_now]))
    for i, x in enumerate([] if cfg.get('plan') else d['building']):
        g = L(shape(x['geom']))
        for p in polys(g):
            if p.area < 18 or not clip.contains(p.centroid): continue
            p = p.simplify(.6)
            c = p.centroid
            st, cl = x.get('subtype'), x.get('class')
            k = 'a' if cl == 'apartments' else 'g' if cl in ('garage', 'carport', 'shed') else KIND.get(st, 'h' if p.area < 260 else 'o')
            if k == 'g' or (k == 's' and p.area < 40): continue
            dist = min(c.distance(q) for q in cores)
            score = dist * (.7 + .6 * rnd(tid + str(i)))
            if main_u is not None and c.distance(main_u) < 30: score *= .75
            if k in ('r', 'v', 'e'): score *= .6
            mn = 0
            if k == 'a' or (p.area > 1400 and k not in ('i', 'r')) or (k == 'c' and p.area > 900 and dist > 500): mn = 1952
            for rx0, ry0, rx1, ry1, ry in cfg.get('reserve', []):
                if rx0 <= c.x <= rx1 and ry0 <= c.y <= ry1: mn = max(mn, ry)
            if any(wp.contains(c) for wp in works_polys): continue
            fl = x.get('num_floors'); h = x.get('height')
            if not h: h = {'h': 7, 'c': 9, 'i': 8, 'r': 11, 'v': 9, 'e': 9, 'm': 10, 'a': 13, 's': 4, 'o': 6}[k] + (rnd('h' + tid + str(i)) - .5) * 2
            if fl: h = max(h, fl * 3.2)
            # anything taller than a church roof or a mill is from the age of steel frames and elevators
            if k != 'r' and h > 22: mn = max(mn, 1928 if h < 36 else 1960)
            rr = p.minimum_rotated_rectangle
            rc = list(rr.exterior.coords)[:4]
            e1 = math.dist(rc[0], rc[1]); e2 = math.dist(rc[1], rc[2])
            ang = math.atan2(rc[1][1] - rc[0][1], rc[1][0] - rc[0][0]) if e1 >= e2 else math.atan2(rc[2][1] - rc[1][1], rc[2][0] - rc[1][0])
            blds.append({'p': flat(p.exterior.coords[:-1]), 'k': k, 'h': round(h, 1), 's': score, 'mn': mn,
                         'o': [R(rr.centroid.x), R(rr.centroid.y), R(max(e1, e2)), R(min(e1, e2)), round(ang, 3)], 'n': x.get('name') if k in ('r', 'v', 'e') else None})
    if not cfg.get('plan'):
        blds.sort(key=lambda b: b['s'])
        N = len(blds)
        for r, b in enumerate(blds):
            b['y'] = max(growth_year(cfg, (r + .5) / N), b.pop('mn')); b.pop('s')
    blds = [{k: v for k, v in b.items() if v is not None} for b in blds]
    out['bldg'] = blds
    # industrial ground shows once its first building stands, a rail yard once its railway comes
    for l in lu:
        g = l.pop('g')
        if l['c'] == 'i':
            ys = [b['y'] for b in blds if g.contains(Point(b['o'][0], b['o'][1]))]
            l['y'] = min(ys) if ys else 1950
        elif l['c'] == 'r':
            c = g.centroid; l['y'] = min(cfg['rail'], key=lambda a: Point(a[0], a[1]).distance(c))[2]
    out['landuse'] = lu
    # streets: a street is laid out once there is a house along it
    def near_year(geom, radius):
        ys = [b['y'] for b in blds if abs(b['o'][0] - geom.centroid.x) < geom.length / 2 + radius + 50 and Point(b['o'][0], b['o'][1]).distance(geom) < radius]
        return min(ys) if ys else None
    start = cfg['growth'][0][0]
    roads, rails = [], []
    def parts(x):
        """The segment split into its plain stretches and its bridge spans."""
        g = L(shape(x['geom'])).intersection(clip)
        if not x.get('bridges'): return [(l, 0) for l in lines(g)]
        span = unary_union([L(shape(b)).buffer(1.5) for b in x['bridges']])
        return [(l, 0) for l in lines(g.difference(span))] + [(l, 1) for l in lines(g.intersection(span))]
    def bridge_h(l, rail):
        if not rail: return 4
        for ax, ay, h in cfg.get('trestles', []):
            if l.distance(Point(ax, ay)) < 120: return h
        return 6 if rail else 4
    for x in d['segment']:
        for l, bridge in parts(x):
            if l.length < 8: continue
            if bridge: bridge = bridge_h(l, x['subtype'] == 'rail')
            if x['subtype'] == 'rail' or x.get('name') in cfg.get('rail_roads', []):
                c = l.centroid; anc = min(cfg['rail'], key=lambda a: Point(a[0], a[1]).distance(c))
                rails.append({'pts': flat(l.simplify(1.5).coords), 'y': anc[2], 'b': bridge, 'z': cfg.get('rail_to')})
                continue
            code = ROAD.get(x['class'])
            if not code or (code == 'S' and l.length < 60 and not cfg.get('plan')): continue
            ny = near_year(l, 40)
            yr = 1965 if code == 'X' else (min(ny, start + 8) if ny and code == 'M' else ny if ny else 1950)
            if code == 'S' and not cfg.get('plan'): yr = max(yr, 1935)
            if x.get('name') in cfg.get('road_years', {}): yr = cfg['road_years'][x['name']]
            roads.append({'pts': flat(l.simplify(1.5).coords), 'c': code, 'y': yr, 'b': bridge, 'n': x.get('name')})
    for st in cfg.get('plan', {}).get('streets', []):
        if st.get('new'): roads.append({'pts': flat(st['pts']), 'c': 'R', 'y': st['new'], 'b': 0})
    out['roads'] = [{k: v for k, v in r.items() if v is not None} for r in roads]
    out['rail'] = [{k: v for k, v in r.items() if v is not None} for r in rails]
    # today's piers are mostly marinas: they come late, unless the works list has them
    piers = []
    for x in d['infrastructure']:
        if x.get('subtype') != 'pier': continue
        for l in lines(L(shape(x['geom'])).intersection(clip)):
            if l.length > 15: piers.append({'pts': flat(l.simplify(1).coords), 'y': 1955})
        for p in polys(L(shape(x['geom'])).intersection(clip)):
            if p.area > 30: piers.append({'p': flat(p.exterior.coords[:-1]), 'y': 1955})
    out['piers'] = piers
    for k in ('works', 'channel'): out[k] = cfg[k]
    out['wood'] = cfg.get('wood', 1)
    if cfg.get('plan'): out['plan'] = 1
    return out

def main():
    towns = {}
    for tid, cfg in TOWNS.items():
        if not os.path.exists(os.path.join(RAW, tid + '.json')): print('no raw data for', tid); continue
        t = build(tid, cfg); towns[tid] = t
        print(f"{tid}: {len(t['bldg'])} buildings, {len(t['roads'])} roads, {len(t['rail'])} rail, {len(t['water'])} water, {len(t['piers'])} piers, {len(json.dumps(t)) // 1024} KB")
    json.dump(towns, open(OUT, 'w'), separators=(',', ':'))
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')

if __name__ == '__main__':
    main()
