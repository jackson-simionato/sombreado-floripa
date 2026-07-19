# Sombreado Floripa

This context describes the passenger-facing web app that helps onboard bus riders in Florianopolis choose where to sit with less direct sun exposure.

## Language

**Sombreado Floripa**:
The passenger-facing mobile web app for onboard sun-side guidance on Florianopolis buses.
_Avoid_: Scraper, backend service, bus stop planner

**Rider**:
A person using Sombreado Floripa while riding, boarding, or previewing a bus route.
_Avoid_: User, account, driver

**Onboard Flow**:
The primary rider journey for someone already on a bus who wants immediate sun-side guidance.
_Avoid_: Timetable planning, stop planning

**Sun-side Advice**:
The rider-facing instruction that says where to sit or which bus side is less exposed to direct sun.
_Avoid_: Temperature forecast, weather forecast, guaranteed shade

**Seat-area Recommendation**:
The positive action shown to a rider, such as sitting on the left, right, front, or back area of the bus, or a neutral result when no area meaningfully improves direct sun exposure.
_Avoid_: Raw exposure result, debug direction, guaranteed shade

**Bus Orientation Diagram**:
A soft schematic top-down cabin visual that clarifies left, right, front, and back from the rider's perspective inside the bus while keeping the seat-area recommendation more prominent than the direct-sun explanation. It suggests city-bus seating through simplified bench blocks or seat cues, and anchors left/right with an embedded front or driver cue rather than an external technical arrow.
_Avoid_: Technical compass, map bearing, abstract brand mark, transit operations diagram, assigned-seat map, standalone direction arrow

**Bus-side Split Motif**:
The signature visual idea derived from the left and right sides of a bus cabin, used to make sun-side advice feel recognizable and trustworthy.
_Avoid_: Generic seating map, four-zone heatmap, standalone logo mark

**Route Candidate**:
A nearby route the rider can select before choosing direction and requesting sun-side advice.
_Avoid_: Automatically confirmed route direction, timetable row

**Direction Choice**:
The rider-facing step where a selected route is narrowed to a direction using destination or neighborhood labels.
_Avoid_: Debug headsign, raw shape id, automatic direction confirmation

**Route Direction Kind**:
An optional `ida` or `volta` cue attached to a Direction Choice when the source route contains an unambiguous pair.
_Avoid_: Frontend name parsing, inferred complementary direction, replacement direction name

**Route Confirmation Map**:
A compact map used to help the rider confirm the selected route direction.
_Avoid_: Map-first navigation, route editor

**Route Preview**:
A clearly labeled preview of sun-side advice when the rider is not currently onboard or near the selected route, using an estimated point on or near the route.
_Avoid_: Live onboard advice, trip planner, guaranteed recommendation

**Playful Sunny Brand**:
The visual and voice direction for Sombreado Floripa: clean, warm, joyful, and trustworthy.
_Avoid_: Government form, transit control panel, childish mascot

**Geometric Estimate Notice**:
A concise explanation that advice is based on direct sun geometry and does not account for buildings, weather, curtains, or vehicle-specific shading.
_Avoid_: Legal disclaimer wall, hidden limitation

## Relationships

- **Sombreado Floripa** is designed for **Riders**.
- The first version of **Sombreado Floripa** prioritizes the **Onboard Flow**.
- The **Onboard Flow** starts with rider location or manual route search, presents **Route Candidates**, asks for a **Direction Choice**, and ends with **Sun-side Advice**.
- A **Direction Choice** may show a **Route Direction Kind** as supporting context.
- A missing **Route Direction Kind** does not prevent a **Rider** from selecting the **Direction Choice**.
- **Sun-side Advice** is presented as a **Seat-area Recommendation** when possible.
- A **Route Preview** can show exploratory **Sun-side Advice** with a clear warning when live onboard context is not available.
- A **Bus Orientation Diagram** helps explain the **Seat-area Recommendation** without relying only on text.
- The **Bus-side Split Motif** gives the **Bus Orientation Diagram** its primary left/right identity, while front/back recommendations remain secondary states.
- A **Route Confirmation Map** helps a **Rider** confirm a selected **Route Candidate** before trusting advice.
- A **Geometric Estimate Notice** must stay visible enough to preserve trust without overwhelming the advice.
- The **Playful Sunny Brand** should make the app feel joyful while keeping the advice clear and practical.

## Example Dialogue

> **Dev:** "Should the home screen ask riders to search a timetable?"
> **Domain expert:** "No. The first version starts with the **Onboard Flow**: find where the rider is, help them choose the nearby route and direction, then show **Sun-side Advice**."
>
> **Dev:** "Can we say the app finds guaranteed shade?"
> **Domain expert:** "No. It gives a **Seat-area Recommendation** from direct sun geometry, with a **Geometric Estimate Notice** explaining the limits."

## Flagged Ambiguities

- "Shade" in public copy means less direct sun exposure, not guaranteed physical shade.
- "Left", "right", "front", and "back" mean rider-facing bus areas, clarified by the **Bus Orientation Diagram**.
- "Map" means a compact **Route Confirmation Map**, not a map-led transit navigation app.
- "Frontend" means **Sombreado Floripa** only; scraper ingestion and advisory computation live in separate projects.
