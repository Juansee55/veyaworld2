# Veya World roadmap

## Christmas plaza, seating and swimming
- [ ] Recreate the reference plaza with a central fountain, picnic tables, chairs and a festive market
- [ ] Dress the outdoor city for Christmas without changing base entrances or saved editor objects
- [ ] Allow sitting, standing and swimming, visible to other players
- [ ] Test map rules and verify signed-in gameplay in portrait and landscape

## Art editors and initial map loading
- [ ] Precise tileset edge crops and multi-tile painting preview
- [ ] Hat crop controls with live character preview
- [ ] Custom firearms and animated GIF swords with live size controls
- [ ] Preload current-map art and equipped layers before showing gameplay
- [ ] Verify editors, animation and startup in signed-in gameplay

## Acorn event and fixed fist shortcut
- [ ] Allow players to unequip firearms without deleting ownership or ammunition
- [ ] Add a third, immutable fist preset while preserving the first two assignments
- [ ] Add autumn trees, server-validated pushing and 27% bag drops
- [ ] Open bags atomically for 18 autumn hats or two functional firearms; enforce ownership
- [ ] Verify signed-in pushing, bag opening, rewards, presets and mobile views

## Weapon animation and reference HUD
- [x] Animate carried weapons, recoil and reload
- [x] Keep zoom following the player in both orientations
- [x] Apply 50/50 health and one real minute per owned base
- [x] Show Gralats on profiles and add two configurable inventory shortcuts
- [x] Verify current changes in signed-in gameplay and tests

## Gralats and firearms
- [ ] Persistent Gralats balance and administrator awards
- [ ] Add the three supplied guns, visible beside players, with shooting and reload
- [ ] Custom firearm uploads; enforce 1 damage and 12 rounds on the server
- [ ] Verify uploads, firing, reload, balance and permissions

## Social menu and mobile view
- [ ] Menu with news and admin-only publishing
- [ ] View other player profiles and edit own text status
- [ ] Correct landscape layout and two-finger zoom
- [ ] Verify publishing permissions, profiles and touch views

## Expanded world editing
- [ ] Customizable reference-inspired houses
- [ ] Remove application image size and dimension caps (storage platform maximum remains)
- [ ] Resize and drag placed objects across maps
- [ ] Admin-authorized player dragging with saved authoritative positions
- [ ] Verify editor changes and permissions

## World editor uploads
- [ ] Upload objects and horizontal 16×16 tilesets from files or gallery
- [ ] Paint custom tiles, create blank maps and build houses during play
- [ ] Verify saving, reloading and mobile layout as an administrator

## Admin CSV importer
- [ ] Add admin-only file selection, validation reports and import results
- [ ] Preserve player, gang, chat and user IDs with server-checked relationships
- [ ] Verify valid imports, validation failures, access denial and mobile layout

## Migration completion
- [x] Audit and fix broken asset pointers, initialization, save errors and missing editor entry
- [x] Verify signed-in gameplay, wardrobe uploads, gang create/delete, chat and portrait/landscape mobile rendering
- [x] Implement account recovery and password setup
- [ ] Verify email-link password setup and imported account access (blocked: user exports and user email interaction)
- [ ] Verify admin editor writes (blocked: no migrated admin identity/role)
- [ ] Import previous records and users (blocked: previous-project CSV/JSON exports not provided)
- [ ] Restore previous uploaded file bytes (blocked: previous-project file export not provided)

## Gang System 1.0
- [x] Adapt all 8 uploaded character sheets to the existing modular frame grid
- [x] Fix Phaser bundling regression and verify the existing playable world
- [x] Gangs: create, invite, accept/reject, kick, promote, transfer, leave, disband (max 30)
- [x] Alliances (max 6) + realtime
- [x] 8 unique bases (25 HP), exclusive ownership, Frontier region
- [x] Multi-room interiors with doors
- [x] Capture zone ticks (1 HP / 3 s, contested, repair)
- [x] Respawn rooms + protection + preferred base
- [x] Combat (server-validated range, walls, cooldown, friendly fire) + weapons
- [x] Inventory (weapons / equipment / items)
- [x] Global / Gang / Alliance chat with anti-spam + moderation
- [x] Daily + total gang hours rankings (hs)
- [ ] Two-player combat test (needs a second test account)

## Uploaded art integration
- [x] Apply uploaded atlas to world tiles without changing collisions
- [x] Add built-in animated hat and melee skins to characters and wardrobe
- [x] Persist player-owned body, head, hat and melee uploads with previews
- [x] Verify base reports/ticks, uploads and mobile rendering in the live game
