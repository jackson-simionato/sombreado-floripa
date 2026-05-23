# Sombreado Floripa

This context describes the passenger-facing web app that helps onboard bus riders in Florianopolis choose where to sit with less direct sun exposure.

## Language

**Sombreado Floripa**:
The passenger-facing mobile web app for onboard sun-side guidance on Florianopolis buses.
_Avoid_: Scraper, backend service, bus stop planner

**Rider**:
A person using Sombreado Floripa while riding or boarding a bus.
_Avoid_: User, account, driver

**Onboard Flow**:
The primary rider journey for someone already on a bus who wants immediate sun-side guidance.
_Avoid_: Timetable planning, stop planning

**Sun-side Advice**:
The rider-facing instruction that says where to sit or which bus side is less exposed to direct sun.
_Avoid_: Temperature forecast, weather forecast, guaranteed shade

**Seat-side Recommendation**:
The positive action shown to a rider, such as sitting on the less exposed side of the bus.
_Avoid_: Raw exposure result, debug direction

**Bus Orientation Diagram**:
A simple visual that clarifies left and right from the rider's perspective inside the bus.
_Avoid_: Technical compass, map bearing

**Route Candidate**:
A nearby route direction the rider can select before requesting sun-side advice.
_Avoid_: Automatically confirmed route, timetable row

**Route Confirmation Map**:
A compact map used to help the rider confirm the selected route direction.
_Avoid_: Map-first navigation, route editor

**Playful Sunny Brand**:
The visual and voice direction for Sombreado Floripa: clean, warm, joyful, and trustworthy.
_Avoid_: Government form, transit control panel, childish mascot

**Geometric Estimate Notice**:
A concise explanation that advice is based on direct sun geometry and does not account for buildings, weather, curtains, or vehicle-specific shading.
_Avoid_: Legal disclaimer wall, hidden limitation

## Relationships

- **Sombreado Floripa** is designed for **Riders**.
- The first version of **Sombreado Floripa** prioritizes the **Onboard Flow**.
- The **Onboard Flow** starts with rider location, presents **Route Candidates**, and ends with **Sun-side Advice**.
- **Sun-side Advice** is presented as a **Seat-side Recommendation** when possible.
- A **Bus Orientation Diagram** helps explain the **Seat-side Recommendation** without relying only on text.
- A **Route Confirmation Map** helps a **Rider** confirm a selected **Route Candidate** before trusting advice.
- A **Geometric Estimate Notice** must stay visible enough to preserve trust without overwhelming the advice.
- The **Playful Sunny Brand** should make the app feel joyful while keeping the advice clear and practical.

## Example Dialogue

> **Dev:** "Should the home screen ask riders to search a timetable?"
> **Domain expert:** "No. The first version starts with the **Onboard Flow**: find where the rider is, help them choose the nearby bus route direction, then show **Sun-side Advice**."
>
> **Dev:** "Can we say the app finds guaranteed shade?"
> **Domain expert:** "No. It gives a **Seat-side Recommendation** from direct sun geometry, with a **Geometric Estimate Notice** explaining the limits."

## Flagged Ambiguities

- "Shade" in public copy means less direct sun exposure, not guaranteed physical shade.
- "Left" and "right" mean rider-facing bus sides, clarified by the **Bus Orientation Diagram**.
- "Map" means a compact **Route Confirmation Map**, not a map-led transit navigation app.
- "Frontend" means **Sombreado Floripa** only; scraper ingestion and advisory computation live in separate projects.
