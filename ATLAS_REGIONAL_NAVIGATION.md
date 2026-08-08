# ATLAS Regional Navigation

ATLAS remains one product and one global core. Regional and country experiences are resolved as context layers instead of copied applications.

## Resolution hierarchy

`ATLAS Global Core -> Region -> Country -> Organization -> User`

The regional runtime is exposed as `window.ATLASRegionalNavigation` and persists the active regional context under `atlas-regional-context-v1`.

## Initial regions

- ATLAS Global
- ATLAS North America
- ATLAS Central America
- ATLAS Caribbean
- ATLAS South America
- ATLAS Europe
- ATLAS Africa
- ATLAS Asia
- ATLAS Oceania
- ATLAS Antarctica / Research

Each region currently inherits the complete global module catalog. Future regulatory, language, currency, public-sector, tax, payments, data-residency, and design differences should be implemented as regional or country overrides in the registry, not by cloning ATLAS.

## Runtime API

- `ATLASRegionalNavigation.getContext()`
- `ATLASRegionalNavigation.setRegion(region)`
- `ATLASRegionalNavigation.setCountry(country)`
- `ATLASRegionalNavigation.setContext(context)`
- `ATLASRegionalNavigation.registerRegion(key, definition)`

Changing region or country dispatches `atlas:region-changed` so modules can adapt dynamically without hard-coded duplicate navigation trees.
