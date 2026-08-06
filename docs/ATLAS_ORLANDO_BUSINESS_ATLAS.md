# ATLAS Orlando Business Atlas

## Purpose

This feature adds an organization-scoped directory of Orlando places and a separate CRM prospect layer. Public businesses are stored as `places` and `business_leads`; they are **not** automatically converted into active customers.

## Initial staging tranche

- 19 Orlando records.
- 16 records with verified public phone numbers.
- 15 records scored 85 or higher for the ATLAS futuristic presentation.
- Categories: attractions, theme parks, entertainment complexes, recreation, and retail.
- Existing Walgreens reference preserved at `12650 International Drive, Orlando, FL 32821`.

## Database files

1. Apply `supabase/migrations/202608050005_orlando_places_and_leads.sql` after the four existing ATLAS migrations.
2. Open `supabase/seeds/20260805_orlando_places_template.sql`.
3. Replace `00000000-0000-0000-0000-000000000000` with the UUID of the target ATLAS organization.
4. Run the seed in the Supabase SQL editor.
5. Review records marked `phone_pending` before any outreach.

## Futuristic place display

The `places` table includes:

- `futuristic_score` from 0 to 100.
- `futuristic_tags` for technology, lighting, immersion, simulation, interactive exhibits, and venue characteristics.
- `display_mode`, allowing ATLAS Local to switch between a standard directory and a futuristic visual presentation.
- `verification_status`, so incomplete contact information is never presented as verified.

Recommended search facets:

- Name, category, subcategory, address, and ZIP code.
- Minimum futuristic score.
- Verification status.
- Trolley stop.
- Lead priority and CRM status.

## Data-governance boundary

The initial tranche combines the first visible spread of the shared I-Drive scan, official I-Drive public directory pages, and the existing ATLAS Walgreens reference. The shared Acrobat link did not expose all 16 scanned pages for reliable page-by-page inspection. A direct PDF attachment is required before claiming full extraction of every advertisement and business in the booklet.

All phone numbers, addresses, operating hours, and websites should be reverified before outreach or publication. Future-client status is an internal prospect classification, not evidence of an existing commercial relationship.
