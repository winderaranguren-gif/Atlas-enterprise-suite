-- ATLAS Orlando I-Drive staging seed
-- Replace the UUID below with the target ATLAS organization ID before running.
-- This seed creates public-place records and CRM prospects; it does not create active customers.

do $$
declare
  v_org_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  if not exists (select 1 from public.organizations where id = v_org_id) then
    raise exception 'Replace v_org_id with an existing ATLAS organization UUID before running this seed.';
  end if;

  insert into public.places (
    org_id, atlas_code, name, slug, category, subcategory,
    address_line1, address_line2, city, state, postal_code,
    phone_primary, phone_secondary, website, trolley_stops,
    source_document_page, source_name, source_url, verification_status,
    futuristic_score, futuristic_tags, display_mode, status
  )
  values
    (v_org_id, 'ORL-IDR-0001', 'Ripley''s Believe It or Not!', 'ripley-s-believe-it-or-not', 'Attraction', 'Oddity Museum', '8201 International Dr.', null, 'Orlando', 'FL', '32819', '407-345-0501', null, 'https://www.ripleys.com/orlando', array['12 North','Green 08 South']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/ripleys-believe-it-or-not.html', 'verified', 78, array['interactive exhibits','unusual artifacts','immersive galleries']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0002', 'Ripley''s MIRROR MAZE', 'ripley-s-mirror-maze', 'Attraction', 'Immersive Mirror Maze', '8189 International Drive', null, 'Orlando', 'FL', '32819', '407-345-0501', null, 'https://www.ripleys.com', array['12 North','Green 08 South']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/ripleys-mirror-maze.html', 'verified', 91, array['LED lights','infinity mirrors','immersive navigation']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0003', 'Ripley''s Crazy Golf', 'ripley-s-crazy-golf', 'Attraction', 'Glow-in-the-Dark Mini Golf', '8441 International Dr.', 'Suite 200', 'Orlando', 'FL', '32819', '407-692-9790', null, 'https://www.ripleys.com', array['14 North','Green 08 South']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/ripleys-crazy-golf.html', 'verified', 93, array['glow lighting','360-degree loops','interactive golf']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0004', 'ICON Park', 'icon-park', 'Entertainment Complex', 'Open-Air Entertainment District', '8375 International Drive', null, 'Orlando', 'FL', '32819', '407-601-7907', null, 'https://iconparkorlando.com', array['14 North','Green 08 South']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-shopping/icon-park.html', 'verified', 90, array['observation wheel','mixed reality district','night lighting']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0005', 'Sandbox VR', 'sandbox-vr', 'Attraction', 'Full-Body Virtual Reality', '9101 International Drive', 'Space 108', 'Orlando', 'FL', '32819', null, null, 'https://sandboxvr.com', array['18 North','Green 11 North']::text[], null, 'I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/sandbox-vr.html', 'phone_pending', 100, array['full-body VR','holodeck-style','multiplayer immersion']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0006', 'iFLY Orlando', 'ifly-orlando', 'Recreation', 'Indoor Skydiving', '8969 International Drive', null, 'Orlando', 'FL', '32819', '407-337-4359', '800-SKYFUN1', 'https://www.iflyworld.com/orlando', array['18 North','Green 11 South']::text[], null, 'I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-recreation/ifly-orlando.html', 'verified', 96, array['vertical wind tunnel','flight simulation','observation deck']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0007', 'Dezerland Park', 'dezerland-park', 'Entertainment Complex', 'Indoor Entertainment & Auto Museum', '5250 International Drive', null, 'Orlando', 'FL', '32819', '321-754-1700', null, 'https://dezerlandpark.com', array['02 North']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/dezerland-park.html', 'verified', 88, array['go-karts','auto museum','arcade technology','black-light combat']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0008', 'Museum of Illusions Orlando', 'museum-of-illusions-orlando', 'Attraction', 'Interactive Illusion Museum', '8441 International Drive', 'Suite 250', 'Orlando', 'FL', '32819', '386-256-1001', '833-541-0992', 'https://moiorlando.com', array['14 North','Green 08 South']::text[], null, 'I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/museum-of-illusions.html', 'verified', 95, array['holograms','optical illusions','interactive science']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0009', 'SeaWorld Orlando', 'seaworld-orlando', 'Theme Park', 'Marine Life & Thrill Park', '7007 SeaWorld Dr.', null, 'Orlando', 'FL', '32821', '407-351-3600', null, 'https://seaworld.com/orlando', array['24 South','24 North']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/seaworld-orlando.html', 'verified', 86, array['immersive rides','marine exhibits','large venue']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0010', 'Aquatica SeaWorld''s Waterpark', 'aquatica-seaworld-s-waterpark', 'Theme Park', 'Water Park', '5800 Water Play Way', null, 'Orlando', 'FL', '32821', '407-351-3600', null, 'https://aquatica.com/orlando', array['25 North','25 South']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/aquatica-seaworlds-waterpark.html', 'verified', 84, array['water attractions','immersive aquatic design','large venue']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0011', 'Discovery Cove', 'discovery-cove', 'Attraction', 'All-Inclusive Day Resort', '6000 Discovery Cove Way', null, 'Orlando', 'FL', '32821', '407-513-4600', null, 'https://discoverycove.com/orlando', '{}'::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/discovery-cove.html', 'verified', 83, array['immersive habitat','animal encounters','resort experience']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0012', 'Universal''s Volcano Bay', 'universal-s-volcano-bay', 'Theme Park', 'Water Theme Park', '6000 Universal Blvd.', null, 'Orlando', 'FL', '32819', '407-363-8000', null, 'https://www.universalorlando.com', '{}'::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/universals-volcano-bay.html', 'verified', 94, array['wearable queue technology','immersive theming','water park']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0013', 'Universal''s Islands of Adventure', 'universal-s-islands-of-adventure', 'Theme Park', 'Immersive Adventure Park', '6000 Universal Blvd.', null, 'Orlando', 'FL', '32819', '407-363-8000', null, 'https://www.universalorlando.com', '{}'::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/universals-islands-of-adventure.html', 'verified', 92, array['cutting-edge rides','interactive shows','immersive worlds']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0014', 'Universal Studios Florida', 'universal-studios-florida', 'Theme Park', 'Film & Television Theme Park', '6000 Universal Blvd.', null, 'Orlando', 'FL', '32819', '407-363-8000', null, 'https://www.universalorlando.com', '{}'::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/universal-studios-florida.html', 'verified', 90, array['multidimensional rides','film technology','immersive sets']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0015', 'Universal Epic Universe', 'universal-epic-universe', 'Theme Park', 'Immersive Multi-World Theme Park', '1001 Epic Blvd', null, 'Orlando', 'FL', '32819', null, null, 'https://www.universalorlando.com', '{}'::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/universal-epic-universe.html', 'phone_pending', 100, array['immersive worlds','celestial design','next-generation theme park']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0016', 'SEA LIFE Orlando Aquarium at ICON Park', 'sea-life-orlando-aquarium-at-icon-park', 'Attraction', 'Interactive Aquarium', '8449 International Drive', null, 'Orlando', 'FL', '32819', '855-450-0680', null, 'https://www.visitsealife.com/orlando', array['14 North','Green 08 South']::text[], null, 'I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-attractions/sea-life-orlando-aquarium-at-icon-park.html', 'verified', 91, array['360-degree ocean tunnel','interactive aquarium','immersive lighting']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0017', 'Pointe Orlando', 'pointe-orlando', 'Entertainment Complex', 'Dining & Entertainment Complex', '9101 International Dr.', 'Suite 1120', 'Orlando', 'FL', '32819', '407-264-9950', null, 'https://pointeorlando.com', array['18 North','Green 11 South']::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-shopping/pointe-orlando.html', 'verified', 87, array['outdoor entertainment','nightlife district','multi-tenant complex']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0018', 'Universal CityWalk', 'universal-citywalk', 'Entertainment Complex', 'Dining, Shopping & Nightlife District', '6000 Universal Blvd.', null, 'Orlando', 'FL', '32819', '407-363-8000', null, 'https://www.universalorlando.com', '{}'::text[], 1, 'I-Drive Official Guide / I-Drive District directory', 'https://www.internationaldriveorlando.com/things-to-do/orlando-nightlife/universal-citywalk.html', 'verified', 89, array['night lighting','entertainment district','digital cinema']::text[], 'futuristic', 'staging'),
    (v_org_id, 'ORL-IDR-0019', 'Walgreens - International Drive', 'walgreens-international-drive', 'Retail', 'Pharmacy & Convenience', '12650 International Drive', null, 'Orlando', 'FL', '32821', null, null, null, '{}'::text[], null, 'Existing ATLAS Orlando reference', null, 'phone_pending', 62, array['smart retail candidate','urban services','visitor essentials']::text[], 'standard', 'staging')
  on conflict (org_id, atlas_code) do update set
    name = excluded.name,
    slug = excluded.slug,
    category = excluded.category,
    subcategory = excluded.subcategory,
    address_line1 = excluded.address_line1,
    address_line2 = excluded.address_line2,
    city = excluded.city,
    state = excluded.state,
    postal_code = excluded.postal_code,
    phone_primary = excluded.phone_primary,
    phone_secondary = excluded.phone_secondary,
    website = excluded.website,
    trolley_stops = excluded.trolley_stops,
    source_document_page = excluded.source_document_page,
    source_name = excluded.source_name,
    source_url = excluded.source_url,
    verification_status = excluded.verification_status,
    futuristic_score = excluded.futuristic_score,
    futuristic_tags = excluded.futuristic_tags,
    display_mode = excluded.display_mode,
    updated_at = now();

  insert into public.business_leads (org_id, place_id, lead_status, priority, notes)
  select
    v_org_id,
    p.id,
    case
      when p.verification_status = 'verified' then 'new'
      else 'research'
    end,
    case
      when p.category in ('Theme Park','Entertainment Complex') or p.futuristic_score >= 93 then 'high'
      else 'medium'
    end,
    'Imported from ATLAS Orlando I-Drive staging dataset. Reverify public contact details before outreach.'
  from public.places p
  where p.org_id = v_org_id
    and p.atlas_code like 'ORL-IDR-%'
  on conflict (org_id, place_id) do update set
    lead_status = excluded.lead_status,
    priority = excluded.priority,
    notes = excluded.notes,
    updated_at = now();
end
$$;
