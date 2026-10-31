# Tugboat Tycoon

A Railroad Tycoon–style game about towing and fishing tugs on Georgian Bay and the North Channel. It starts in 1870 and has no end date; dated history runs to the St. Lawrence Seaway in 1959. It runs in a web browser and is built for iPad touch (tap, drag, pinch).

Railways, and from the 1920s highways, carry what your boats land on to Toronto, Montreal and the States. Lake ships carry it on too: schooners first, then wooden steam barges towing schooner-barges, then steel freighters and canallers. Lumber goes mainly to Tonawanda; coal comes up the St. Clair River to Port Huron; grain comes down from the Lakehead to the bay's elevators. None of this competes with you; it shows where the cargo goes.

Two American ports are on the map, Port Huron and Bay City. Bay City ships salt, machinery and provisions (counted as supplies) and, from 1897 to 1950, coal from the Bay County mines; it buys Georgian Bay log rafts from 1880 to 1898, Ontario-sawn lumber after Ontario's 1898 rule, pulpwood from 1912, and fish. (Apart from the log rafts this is invented: no record was found of Bay City shipping to the bay.) Your boats are Canadian, so they can bring cargo to an American port and take cargo away, but can't run between the two: a route can't have them next to each other (the run from the last stop back to the first counts), cargo loaded at one doesn't pay at the other, and no contract runs between them. A tug taken over from an American firm drops a route that breaks this.

The railway ports (Parry Sound, Depot Harbour, Collingwood, Owen Sound, Midland, Penetanguishene, Port McNicoll, Port Huron and Bay City) each have a harbour view: an isometric model of the town drawn from today's street map and grown back to its size in the year you're playing, with the period wharves, mills, elevators and yards. Your boats and the lake ships come and go at the wharves, trains run on the tracks, and the lumber, logs, coal and supplies the port holds are piled where they would be. Depot Harbour is gone today, so it is laid out by hand along what is left of its streets, rail bed and dock line: J.R. Booth's grain port from 1897, emptying after the Algonquin line was cut in 1933, its elevators and sheds burned in 1945, and its railway closed in 1960. Open a harbour view from the port panel, from the "Harbour view" tag under the port, or by zooming in past the map's closest zoom. The smaller ports stay as they are on the map.

Your competition is a roster of real firms of the day (Mitchell & Boutell, Reid Wrecking, the Great Lakes Towing Co., Midland Towing & Wrecking, the lumber companies' rafting tugs, Purvis Bros., the Dominion Fish Co. and others), plus Bay Towing & Wrecking, which is made up for the game. Each runs its own boats on the map, and the company panel ranks their revenue against yours. There are two competitors in 1870 and one more every five years, never more than seven at once; a firm waits for a free place before it starts up. Each firm's fleet follows what it really had, and good seasons can add to it: when its boats each earn more than over the seasons before and it has the money, a firm may order another boat for the spring (at most one in three years, and never more than two beyond its real fleet). After a poor season, a firm that grew this way may sell one of those boats again. The papers report both, and the firm's page says how many boats it has added.

Contracts come from customers of the day (the lumber camps and merchants up the shore, the sawmills, the railways for their engines' coal, the fish buyers and, from 1901, the Dominion Fish Co.): so many loads a season from one port to another, or so many tons of fish landed at a port, at a fixed price above what the port pays even when it is short, for one to three seasons. Fall short and you pay a penalty on each missing load. Offers arrive each spring as letters and now and then during the season; a contract's page puts a tug on its run. The first game opens with an easy one on the tug's own run.

Contracts go to tender. The customer names the most it will pay a load; whoever goes for a contract, the other companies with the right boats working near the run can bid lower or drop out, a round at a time, and the lowest bid left when the others have dropped out wins. Bid for it (on a contract's page or in the spring letters) opens the tender: it says which companies could bid against you, shows what the market pays now, and lets you set your price a step at a time. Now and then a rival goes after a contract of its own (two or three times a season), and if you have boats for it a letter lets you bid against them or let them have it. A rival bids as long as the price stays above what the run is worth to it: about what the market pays, a little less from its home port, a little more when it already holds contracts; one in five is too busy to bid at all. An offer you let lapse goes to the other firms. A rival's contracts show on its page and on the ports' pages, and add to its revenue as its boats carry the loads. Bidding sends the price down about 8% on average and you win roughly three tenders in five, so contracts still pay but are worth fighting for.

The stock exchange (from the company panel) trades shares in your company, the towing firms that had shares on the market (Bay Towing, the Georgian Bay Lumber Co., the Great Lakes Towing Co.), the railways (Great Western, Northern, Grand Trunk, Canadian Pacific, Michigan Central) and the lake lines (the Beatty Line, the White Line, the Northern Navigation Co. and Canada Steamship Lines). Selling your own shares raises money without a loan, but a rival that gets more than half takes your company over and the game ends; the game warns you before you sell below half. Each listed towing firm has its own number of shares in issue, and only a small part of them is on the market; its owners hold the rest and sell a block (a tenth of the company) only for an offer they like, one offer a season. A firm doing well sells new shares to pay for boats, owners sell some in a bad year, and a rich firm buys a few back. With 20% of a towing firm you get a seat on its board and its tugs stop racing yours; with more than half you can buy out the rest and absorb it, boats and all. The family firms are bought by a private offer to the owners. Railway and lake-line shares follow what happened to those companies: mergers convert your shares, and Grand Trunk ordinary shares are found worthless in 1921.

Every purchase is recorded, so each holding shows what you paid for it (in all and per share), what it is worth now and the gain or loss, and its price chart has a dashed line at your price. A sale says how it did against what you paid. The exchange's Your shares in other companies section has a chart of all your holdings over time, each company's worth stacked in its own colour with what you had paid as a dashed line; touch the chart to read off any week. Holdings in a game saved before this came in say they were bought before records were kept.

Every boat and lake ship has plans: a side view on her page and on her card in the shipyard, which opens a full sheet (outboard profile, deck plan, midship section and title block, all to scale) that can be zoomed with a pinch, a double-tap, the wheel or the buttons, and dragged. They are drawn from each boat's dimensions; the houses, doors and fittings are typical of her type and era, not copied from one boat's plans.

The game can keep a play log for its owner (menu, Who's been playing): when each person played, for how long, and their game's year and worth. The published version has it turned off (the page doesn't declare the `db` and `user` capabilities), because it records only people signed in to Claude, and declaring it shows anyone not signed in a sign-in prompt; declare them again to turn it back on. It uses the page's shared store, which only the owner and people invited by email as Editors can write to, so it records only them, and only while the game is not also shared by a public link. Players are told on the title screen that their visits are shared. Opened any other way, the game runs as before and records nothing.

The game has sound, all made in the browser with the Web Audio API (nothing to download): water, wind, rain and thunder that follow the weather, foghorns in fog, gulls near the harbours, your boats' whistles as they leave and come in, the engine of the boat you have selected (a steam engine's exhaust beat at her real engine speed, a diesel's growl, a gasoline engine's putter), lake-ship and train whistles when you are near, a ship's bell when navigation opens and closes, and a clink when you are paid. The speaker button in the top bar turns it on and off; the menu has a volume for each layer. It starts on the first tap, as browsers require (on a touch screen that is when the finger lifts, which is the moment Safari on the iPad accepts; and, so that the iPad's silent setting doesn't mute it, the game tells Safari it plays sound and loops a silent clip in an ordinary media element while the sound is on, which makes Safari treat the sound like a video's). The menu's Sound check plays a beep from a media element and then a whistle from the game's own sound, and says what the browser reports, to tell apart a muted iPad from a browser holding the sound back, sleeps when the page is hidden, and remembers its settings on each device.

Menu, Share (and the buttons in the winter report and when the papers give you a new title) opens a page of sharing choices. It shows a newspaper-style picture card of your company with your flagship, and the short message that goes with it. Send the picture and message opens the device's share sheet (Messages, Mail, AirDrop) with both; Text message and Email start one with the message alone; Copy the message and Save the picture do what they say. Invite someone to play sends just the game's address, without your figures. `GAME_URL` in `src/game.html` is the link both carry.

A game is kept in the browser of the device it is played on. Menu, Another device, Send this game makes a small file of it (a few tens of kilobytes) and offers it to the share sheet (Mail, Messages, AirDrop) or saves it; Load a game from a file, on the other device, checks the file and, after asking, replaces the game there. Where the browser lets the page go full screen, the menu has Play full screen. Inside claude.ai's artifact view it usually can't, and the button is hidden.

With a mouse, hovering over a boat, in your fleet or any other list or on the map, draws her route: a towing tug's stops in order, numbered, a fish tug's run between her fish house and her grounds, an alligator's run down her river, and where she's bound now, with her name and a ring round her (in her company's colour for a rival's boat). Touch screens are unchanged.

On a first game a guided tour walks a new player through the map, their boats, routes, fishing, towns, time, the weather, the company panel, tows and the menu, one thing at a time with the rest of the screen dimmed. It can be taken again from the menu (How to play).

Menu, History (below How to play) opens The bay through the years: a timeline from 1870 to today of real events on Georgian Bay and the world that shaped it, from the Red River Expedition sailing from Collingwood and the loss of the Waubuno and the Asia, through the railways, the pine years, the Great Storm of 1913, the wars and the Depression, the sea lamprey and the Seaway, to the CPR's last passenger sailings, the Biosphere Reserve, record low and high water, and the Robinson-Huron Treaty settlement of 2023. It is a horizontal bar you swipe along, with dots coloured by kind (ships and wrecks, railways and roads, timber, fish and trade, wars and the world, water, fish and parks, First Nations and government), bands for the eras, and a dashed line at your game's date; tap a dot, or Earlier and Later, to read about it. Events your game hasn't reached yet are paler and say so. The events are `HISTORY` in `src/game.html`; dates were checked against public sources (Ontario Heritage Trust plaques, the Canadian Encyclopedia, Parks Canada, the Great Lakes Fishery Commission and others).

## Files

- `src/game.html` is the whole game: styles, the map renderer, the simulation and the UI.
- `src/plans.js` draws the boats' plan sheets as SVG. `build.py` inlines it into the game; `tools/plansheet.js` uses it to draw them as pictures.
- `data/map.json` is the coastline, lakes, rivers and the Canada–US border from Saginaw Bay to the Kawarthas and from London to Sudbury, cropped and simplified from Natural Earth (public domain). `tools/extract.py` rebuilds it.
- `data/routes.json` is the line each railway and highway segment follows over land. `tools/netroute.js` rebuilds it from the network in `src/game.html`; rerun it after changing `NET`, `RAILWAYS` or `HIGHWAYS`.
- `data/towns.json` is the harbour-view data for the railway ports: buildings, streets, railways, water and land use, each with the year it appears, and the period works. `tools/townbuild.py` builds it from `data/towns_raw/`, which `tools/towns.py` fetches from Overture Maps (its buildings and streets come from OpenStreetMap; © OpenStreetMap contributors, ODbL). The game shows that credit in the harbour view.
- `index.html` is the playable page. It is built from the files above; don't edit it by hand.
- `site/` is the standalone copy for hosting outside claude.ai, and `dist/tugboat-tycoon-site.zip` the same zipped, both built by `tools/site.py` from `index.html`. `assets/icon.svg` is its home-screen icon; `tools/icons.js` draws the PNGs.
- `tools/` has the build script and the headless test scripts.

## Graphics

Where the browser has WebGL2 on a graphics chip, the map is drawn in three layers (menu, Graphics: Enhanced; Classic draws it the old way). Underneath, a shader draws the water: trains of wave crests bent and broken by noise and running before the wind, one for each scale from swell to ripple and each shown only where it is a few pixels across; glints on the crests; the chart's pale shallows, fading out over a few kilometres from a distance-to-shore texture made at start-up; surf along the shore when zoomed in; whitecaps in a gale; and shore ice that creeps out in late November and December and breaks up in April. The map's own canvas is painted with its water left clear, over it. On top, a second WebGL canvas lays the light of the day over everything: dawn and dusk warm it, night darkens it to blue, and towns (brighter once electric light comes in the 1890s), lighthouses (flashing) and boats glow. Light is By the clock (the sun's height where you are, for the date in the game) or fixed at Day, Dusk or Night. Each boat and lake ship on screen is handed to the water shader too: under way she leaves a wake (the diverging waves feathering along a wedge 19.5 degrees either side of her track, transverse waves across it, the churn of her screw astern and a bow wave), and every hull lies on a soft shadow thrown to the south-east; at night she shows a white masthead light and red and green sidelights. The 2D wake lines are drawn only with the classic graphics. A device that falls behind gets the water at a lower resolution, then the classic map; a browser drawing WebGL in software keeps the classic map.

## The lake depths

`data/depth.png` holds the depth of Lake Huron (with Georgian Bay and the North Channel) and Lake Ontario in metres, two cells to the km, made by `tools/depth.py` from soundings read off a carved depth map of the Great Lakes (whose source is NOAA's charts): its depth labels and the shape of its layers at about forty points, georeferenced against the game's coastline lake by lake, joined by a smooth weighted average that shoals to nothing over the last few km to the shore. It is approximate, to a km or two. With the enhanced graphics the water is pale over the shallows and deep blue over the deeps, with ten-fathom lines when zoomed in; the classic map tints the deep water. Lake Erie, Lake St. Clair and the inland lakes have no soundings and are shaded by distance from shore. NOAA's own bathymetry grids (www.ngdc.noaa.gov, not reachable from the session that built this) would be finer and could replace it.

## The engine in the harbour views

The harbour views use the same layers. Every step from the map's km to a harbour's isometric picture is linear (the town's own metres, then its turned and foreshortened plane), so the shaders are handed one mapping from screen pixels to map km (`gfxMapping`, `hAffine`), on the map or in a harbour. In a harbour the picture is painted with its water left clear and its own shallows laid over the moving water underneath, where boats coming and going leave wakes and the harbour freezes over in winter; the light lies over the town, with lit windows and the boats' lights at night; and the shaded relief and contour lines are drawn onto the town's ground through the same mapping, in both the enhanced and classic graphics.

## The boats

Four boats join the towing tugs between the simple wooden tug and the steel ones, each with its own plan sheet:

- **Lumber hooker, with her barges (1873–1905, $13,000).** A wooden steamer that carries a deck load of lumber and tows old schooners cut down to barges, modelled on the W. L. Wetmore (Cleveland, 1871), which carried Parry Sound lumber with her barges Brunette and James C. King until all three were wrecked near Tobermory in 1901. She carries 8 loads, 12 of lumber, loses less speed laden, and runs cheaply, but carries logs only as cargo (no booms) and takes no tows or salvage. She pays best on long lumber runs such as French River to Collingwood. On the map her two barges follow her on a long line, loaded when she is.
- **Wooden wrecking tug (1874–1905, $9,500).** Steam pumps, a derrick, hawsers and a diver's outfit, modelled on the Erie Belle (Cleveland, 1862), whose boiler blew up off Kincardine in 1883 as she worked to free a stranded schooner. She can take on any salvage whatever her engine, and salvage pays a wrecking tug (this one or the steel wrecker of 1902) a quarter more.
- **Alligator warping tug (1889–1932, $2,800).** The West & Peachey steam warping tug of Simcoe, Ontario: a scow with side paddle wheels and a cable winch that winched log booms across lakes and hauled itself over the portages on runners. Bought at the shipyard, she is shipped by rail to a river above the bay (the Magnetawan, the French, the Spanish, the Moon, the Seguin, or the Sturgeon and Coldwater, where the port there still ships logs). There she brings a boom of about seven loads of logs down to the river's mouth about once a week, which your tugs can carry, and the lumbermen pay her about $70 a boom; less comes down as the pine runs out. She is out of reach of the gales, and can go by rail to another river for $150. On the map she sits a few km up her river where the map shows it, heading upstream with her boom astern and her cable run out ahead.
- **The compound refit (from 1880, $2,500).** A simple-engine wooden tug can have a compound engine and a coal-fired boiler put in, modelled on the Saucy Jim (1887) of Penetanguishene and her David Bell fore-and-aft compound. In the season she steams to the nearest shipyard and spends about two weeks there; ordered in the winter, it is done by spring. She comes out towing 4 instead of 3, at 9.5 knots, for less fuel, as a "Wooden tug, compound refit".

The rival firms use them too: the wrecking firms' salvage tugs are wooden wreckers until 1902 (and Bay Towing & Wrecking's fourth boat is one), Bay Towing runs a lumber hooker between Port Huron and Owen Sound from 1873 and the Georgian Bay Lumber Co. one from Waubaushene to Port Huron from 1882 to 1906, the lumber companies each put an alligator on their river (Georgian Bay Lumber on the Moon from 1889, Victoria Harbour Lumber on the Spanish, Beck on the French), adding logs at its mouth as yours do, and their old simple-engine tugs get compound refits in the 1880s. In the lists, every kind of boat has its own little side view: the small tugs by their stacks, the big ones by their two-storey houses, steel hulls by a line of rivets, wreckers by their derricks, the diesel by its square funnel, the hooker by her deck load, the alligator by her paddle wheel, and the fish tugs open or turtle-backed.

Each one's arrival is in the news that spring. In a season run alone on the same routes, the hooker matches the big rafting tug on short runs and beats it on long lumber runs, and the alligator pays for herself in about two seasons before counting the logs she brings down.

The boats are drawn from above, as on the plan sheets: each hull shaded across her beam by the light from the north-west, inside her heavy guards, with a rope fender at a tug's stem, towing arches and a bitt on her after deck, her deckhouse, pilot house and stack each throwing a shadow on deck, a yawl boat on a big tug's house, and planking when zoomed in close. Fish tugs have their whaleback houses and net doors. Boats are drawn up to two and a half times their base size as you zoom in. In the harbour views, where they are drawn to their real length and beam, each boat is modelled small (`hBoatDraw`): a hull with a fine bow, a round stern on tugs and fish tugs (a transom on ships and schooners), a sheer rising to the bow, a boot-top at the waterline, the guards and a rail cap; a planked deck; a tug's deckhouse with portholes, pilot house with windows, round stack in her company's colours (`hStack`), mast and light, rope fender, towing arches and bitt, and a yawl boat on a big tug; a fish tug's whaleback house; a schooner's bowsprit, shrouds, forestay and furled sails with the gaffs lowered, or her gaff sails and jib when under way; a laker's pilot house, hatches and engine house; a passenger steamer's decks and lifeboats. Every face is lit from the north-west, as on the map.

## The lie of the land

The country has real relief, from Mapzen's terrain tiles (open data on Amazon, from SRTM and other public sources) resampled onto the map by `tools/relief.py`: `data/relief.png` holds the heights, a byte a cell at two cells to the km, and `data/contours.txt` the contour lines, every 100 feet as on the old Canadian maps with every fifth an index contour, simplified and packed as varints. `build.py` inlines both. The map paints shaded relief lit from the north-west (soft-light, heights exaggerated four times) over the land, under the railways, towns and names, in both the enhanced and classic graphics; the index contours come in as you zoom in, then the rest. With the enhanced graphics, a low sun at dawn and dusk lights the slopes facing it warm and throws the far side into shadow. The old escarpment ticks are drawn only if the heights fail to load.

## Hosting: GitHub and Cloudflare Pages

The sources live in a GitHub repository; Cloudflare Pages builds and serves the standalone copy from it, and builds again on every push to `main`. Its settings: framework preset None, build command `python3 tools/build.py && python3 tools/site.py`, build output directory `site`. The built files (`index.html`, `site/`, `dist/`) are not kept in the repository. Added to an iPad's home screen, the site opens full screen like an app. The game is played at https://tugboat-tycoon.pages.dev; the earlier claude.ai artifact is no longer updated.

## The scoreboard

On the game's own site, each game reports in to `/api/board` (`functions/api/board.js`, a Cloudflare Pages Function) when play starts, when a new game is started or one is loaded, every five minutes while it is open, and when it is put away: the player's name (drawn at random, a settler's first name and surname, which they can change on the scoreboard), their company, its year, worth, standing and fleet, the device, and the minutes played. The board is one record in Workers KV, bound to the Pages project as `PLAYS`. Each game has its own id (`S.gameId`), and for each player the board keeps the game they are playing now and their best game: the most any of their companies has been worth, with its name, standing and the year it got there. Starting over never lowers it. Menu, Scoreboard (also on the title screen) ranks everyone by their best game and shows, under it, the game they are playing now (or "still playing it"), when they last played, how long they have played in all and how many games they have started; the player can change their name there. A player already on the board before best games were kept starts with the game shown then as their best. Anyone with the game's address can read it. Without the KV binding the function answers that the scoreboard isn't set up, and the game says so. A random id in the browser's storage tells players apart, so a player on two devices shows twice. A game can take itself off the board by posting its id with `remove: true`; only that game knows its id.

## The standalone copy

The game also runs outside claude.ai, from any static web host (GitHub Pages, Cloudflare Pages, Netlify): upload the contents of `site/`, or `dist/tugboat-tycoon-site.zip`. It is the same game with a web-app manifest, a home-screen icon and a service worker. On an iPad, Safari's Share, Add to Home Screen puts it on the home screen, and from there it opens full screen like an app, with no browser or claude.ai bars, and opens without a connection too (the service worker fetches the newest version whenever there is one). In Safari the title screen says how. Its share page sends its own address rather than the claude.ai link. A saved game belongs to the site it was played on, so moving between the claude.ai page and the standalone copy takes Menu, Another device, Send this game.

## Build

```
python3 tools/build.py      # src/game.html + src/plans.js + data/map.json + data/routes.json + data/towns.json -> index.html
python3 tools/site.py       # index.html -> site/ and dist/tugboat-tycoon-site.zip, the standalone copy
python3 tools/depth.py      # only after changing the soundings (data/depth.png)
python3 tools/relief.py     # only to fetch the heights again (data/relief.png, data/contours.txt; tiles cached in data/relief_raw/)
node tools/icons.js         # only after changing assets/icon.svg
node tools/netroute.js      # only after changing the railway or highway network
python3 tools/townbuild.py  # only after changing a town's settings; then run build.py again
python3 tools/towns.py [town ...]   # fetch today's map of the towns again (about 20 MB, a few minutes)
python3 tools/townsvg.py data/towns_raw/collingwood.json out.svg [x0,y0,x1,y1]   # a top-down map with a 100 m grid, for placing works
```

`towns.py` needs `pyarrow`, `shapely` and `requests`. It reads only the parts of Overture's files on Amazon S3 that cover each town.

## Tests (headless Chromium via Playwright)

Several of these play the game forward to a later year first, which takes 20–30 seconds.

```
node tools/smoke.js <outdir>            # loads the page, checks for errors, screenshots
node tools/touchflow.js <outdir>        # taps through a route, a purchase, a tow race, winter, a newspaper
node tools/layouts.js <outdir>          # iPad portrait, phone, dark mode
node tools/routes.js                    # what one tug earns on each sample route
node tools/growth.js <seed> cautious 12 # a bot plays 1870-1960 with up to 12 towing tugs
node tools/later.js <outdir> 1940       # jumps a game to a later year and screenshots it
node tools/camera.js                    # map movement: zoom limits, edges, double-tap, whole-map button
node tools/zoom.js <outdir> year=1912 0,0,1 45.35,-80.2,8   # screenshots of the map at chosen spots and zooms
node tools/netcheck.js                  # railway or highway segments that cross open water
node tools/perf.js                      # frame times at three zooms (headless rendering is slower than an iPad)
node tools/profile.js 44.5,-80.2,4      # which functions take the frame time at a spot and zoom
node tools/harbour.js <outdir> collingwood 1880,1925 [zoom]   # a town's harbour view in chosen years
node tools/tour.js <outdir>             # walks the first-play tour by touch at iPad, portrait and phone size
node tools/plans.js <outdir>            # the plans on a boat's page, a ship's page and in the shipyard; the viewer's zoom and drag
node tools/plansheet.js <outdir> [id]   # every plan sheet, and its side view, as a picture
```

The other test scripts mark the tour as seen before the page loads, so it doesn't sit over what they test.

## How the map is drawn

- The land, water and relief are painted once for the whole map (`renderBase`), with halved copies for zoomed-out views.
- When the map stops moving, the visible area is repainted sharp (`renderHI`). The railways, highways, towns and place names are then baked on top of it (`renderStill`). A map at rest costs one copy a frame plus the boats, trains, cranes, lights and weather.
- While the map moves, frames shift and scale that picture and paint only the strip it no longer covers.

## How the harbour views work

- Positions are in metres east and north of the town file's south-west corner. `hIso()` turns them into the isometric picture, looking along the town's `view` bearing; the map's camera, pinch and drag work unchanged on that picture.
- Every building gets a year. Those nearest where the town began come first, and the town fills out along the share-of-today's-buildings curve in its `growth` setting. Apartment blocks, very large buildings, tall buildings and the areas listed in `reserve` wait for later years. A street opens with the first house along it. Farm fields, woodlots and fencerows give way as the town spreads over them, and shade trees come up along the streets a dozen years after them.
- The still scene (ground, water, streets, railways, works, buildings, trees) is painted once for the whole town and again sharp for the view when it stops (`hStatic`). Each frame then adds only what moves: boats, trains, cranes, smoke, weather and the cargo piles (`hLive`).
- Boats berth along the wharf faces, from the outer end in, wherever there's water from stem to stern. When none is free they lie at anchor. They come and go along the town's `channel`.
- A town that is gone today (Depot Harbour) has a `plan` in its settings instead: its streets, its special buildings with the years they stood, and how many houses went up and came down in which years. Houses go on lots along the streets. Buildings and track can have a year they went (`z`), and the woods grow back a dozen years after.
- Streets, buildings and shores are today's; the wharves, mills, yards and elevators in each town's `works` are placed by hand from period accounts, so treat their positions as approximate.

## Where to tune things

In `tools/townbuild.py`, `TOWNS` holds each harbour town's settings: the crop, the viewing bearing, where the town began, its growth curve, how wooded the land around it stayed, the years its railways came (and went), the areas held back to later years, its period works and channel, and for a town that is gone, its `plan`.


The rest is in `src/game.html`:

- `CARGO`: freight rates per load per 100 km
- `MODELS`: boats (price, power, speed in knots, speed with a log raft, running cost, seaworthiness, the years yards built them) and `spec`, the engine and hull figures shown in the shipyard, each modelled on a real boat
- `RIVALS`: the competing companies, their years, fleets, routes, grounds, real boat names and dated events
- `SHIP_TYPES`, `shipsSpawn()`: the lake ships of each era, what they carry and where
- `KNOT`, `STEAM_HOURS`, `tugSpeed()`: how far a boat gets in a day
- `PLAYER_NAMES`, `RIVAL_NAMES`: default boat names
- `PORTS`: what each port ships and wants, railway dates
- `GROUNDS`, `QD`, `FISH_GROWTH`: fishing grounds and how fast they're fished out and recover
- `GALE_P`, `FOG_P`: weather by month
- `EVENTS`: dated historical events and their newspaper text
- `TITLES`: the ranks the papers give you as your company grows
- `NET`, `COMPANIES`, `RAILWAYS`, `HIGHWAYS`: the railway and highway network, who owned each line in which years, when lines opened and closed, and when roads opened
- `ELEVATORS`, `COAL_DOCKS`: the railways' grain elevators and coal docks, and the years they worked
- `TOWNS`, `LIGHTS`, `BEACHES`, `ESCARP`: inland towns, lighthouses and landscape features
- `truckShare()`, `addVehicle()`: when trucks take freight off the railways, and train, truck and steamer speeds
- `ZONES`, `tile()`: where the farmland, forest and Shield country lie, and how each is drawn
- `CORE`: the area the opening view frames
- `DAY_SEC`: real seconds per game day at each speed
- `LAID_COST`: what a laid-up boat costs a day, as a share of her running cost
- `TOUR`: the steps of the first-play tour, their wording and what each one points at
- `WHISTLES`, `sndTick()`: the whistle chords, and when each sound plays and how loud
- In `src/plans.js`: `BOATS` and `SHIPS` say which drawing each boat and ship type gets and its options (engine, boilers, derrick, gasoline or oil); `KINDS` sets each hull's freeboard and form; `DRESS` draws the houses, stacks, rigs, fittings and what lies inside
- `MAX_RIVALS`, `rivalCap()`: how many competitors there can be, by year
- `SHARES`, `MOOD`, `EXCH`: the stock exchange: shares per company, the market's mood by year (the 1870s depression, the panics, the 1920s and the crash), and the railways and lake lines with their fortunes, dividends and mergers; `listed` and `assets` on a `RIVALS` entry say whether a firm's shares trade and what it owned off the map
- `raiders()`, `askingPrice()`: how rivals buy up your shares, and what a family firm will sell for
- `OWNERS`, `ownersWill()`, `floatSeasonEnd()`: each listed firm's shares in issue and float, how likely its owners are to sell a block, and how the float changes each autumn
- `addCost()`, `dropCost()`, `recordHoldings()`, `holdingsHTML()`: what you paid for each holding (an average cost carried through sales and mergers), the weekly record of your holdings, and the chart of them
- `makeOffer()`, `contractCustomer()`, `contractCap()`: what contracts are offered, to whom, how big and at what price, and how many you can hold
- `newTender()`, `tenderRivals()`, `rivalsPass()`, `rivalTenderDay()`, `rivalOffer()`: tenders, who bids, how low they go, and the contracts rivals go after
