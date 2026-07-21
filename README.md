# branch — GitHub Events as a 3D Glowing Tree

Your GitHub activity visualized as a living, glowing tree. Each repo is a branch. Each event (push, PR, issue, star, fork) is a glowing leaf.

**Visual Style:** Bold — Circuit (digital precision, dark blue-black background, dot grid, green/blue/red/gold/purple event type accents)

**Data Source:** GitHub Events API (parthchandak02 events)

**How it works:**
- The trunk represents time (oldest at bottom, newest at top)
- Each repo branches off with its own curved path (CatmullRomLine)
- Each event is a glowing leaf on its repo's branch
- Leaf size = number of commits pushed (for PushEvents)
- Leaf color encodes event type: green=push, blue=PR, gold=star, red=issue, purple=fork
- OrbitControls to navigate — orbit, zoom, pan
- Tap a leaf to reveal event details in the QuietZone
- Branches grow in with staggered ease-out animation on first load

**GitHub:** https://github.com/parthchandak02/branch

**Live:** https://branch.parthchandak.info

**Tech:** React Three Fiber + drei + Vite. Motion spring physics for QuietZone. Zustand for state. Hosted on Cloudflare Pages.
