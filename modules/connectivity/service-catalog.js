export const CONNECTIVITY_CATALOG_VERSION='1.0.0';

const capability=(id,name,operations=[])=>({id,name,operations});

export const CONNECTIVITY_EXCLUSIONS=Object.freeze({
  phoneModels:true,
  handsetCatalog:true,
  manufacturerModelPages:true,
  copiedCarrierBranding:true,
  copiedCarrierMarketingCopy:true
});

export const CONNECTIVITY_CATALOG=Object.freeze({
  module:'ATLAS Communications & Connect',
  version:CONNECTIVITY_CATALOG_VERSION,
  strategy:'carrier-neutral native service layer',
  exclusions:CONNECTIVITY_EXCLUSIONS,
  personal:{
    wireless:[
      capability('mobile-plans','Mobile service plans',['compare_plans','manage_lines','change_plan','manage_data','manage_hotspot']),
      capability('prepaid','Prepaid mobile service',['activate','refill','autopay','manage_plan','check_balance']),
      capability('number-transfer','Number transfer',['check_eligibility','start_transfer','track_transfer']),
      capability('sim-esim','SIM and eSIM lifecycle',['activate','replace','transfer','suspend','resume']),
      capability('international','International connectivity',['roaming','international_pass','usage_controls'])
    ],
    internet:[
      capability('fiber','Fiber internet',['check_availability','order','activate','manage_plan']),
      capability('fixed-wireless','Fixed wireless internet',['check_availability','order','activate','manage_plan']),
      capability('home-wifi','Home Wi-Fi management',['rename_network','change_password','connected_devices','profiles','guest_network']),
      capability('network-health','Network health',['service_status','speed_test','gateway_status','wifi_quality','troubleshoot']),
      capability('parental-controls','Parental and household controls',['profiles','schedules','pause_access','content_controls'])
    ],
    voice:[
      capability('digital-voice','Digital and home voice',['activate','manage_features','voicemail','call_forwarding','troubleshoot'])
    ],
    account:[
      capability('profile-permissions','Profile and permissions',['view_profile','edit_profile','manage_permissions','security_settings']),
      capability('billing','Billing and payments',['view_bill','pay_bill','autopay','paperless_billing','payment_arrangement','billing_explanation']),
      capability('orders','Orders and appointments',['order_status','installation_status','repair_status','reschedule_appointment']),
      capability('service-lifecycle','Service lifecycle',['activate','suspend','resume','disconnect_request']),
      capability('support','Customer support',['self_service','virtual_assistant','chat','callback','support_ticket'])
    ]
  },
  business:{
    mobility:[
      capability('business-wireless','Business mobility',['manage_lines','plans','international','hotspot','mobility_management']),
      capability('enterprise-mobility','Enterprise mobility management',['policy_management','fleet_enrollment','security_controls'])
    ],
    internet:[
      capability('business-fiber','Business fiber',['availability','order','activate','manage']),
      capability('dedicated-internet','Dedicated internet',['quote','provision','monitor','support']),
      capability('business-fixed-wireless','Business fixed wireless',['availability','order','activate','backup_link']),
      capability('wireless-broadband','Wireless broadband',['provision','monitor','failover'])
    ],
    communications:[
      capability('business-voice','Business voice and VoIP',['numbers','routing','voicemail','call_queues','analytics']),
      capability('unified-communications','Unified communications',['calling','messaging','meetings','presence']),
      capability('contact-center','Omnichannel contact center',['voice','chat','messaging','routing','quality','analytics'])
    ],
    networking:[
      capability('ethernet','Managed Ethernet',['provision','monitor','capacity']),
      capability('sd-wan','Managed SD-WAN',['sites','policies','path_selection','monitoring']),
      capability('mpls-vpn','Private WAN and VPN',['sites','routes','qos','monitoring']),
      capability('network-functions','Virtual network functions',['deploy','configure','monitor']),
      capability('cloud-colocation','Cloud and colocation connectivity',['interconnect','bandwidth','monitor'])
    ],
    security:[
      capability('managed-security','Managed network security',['threat_monitoring','firewall','secure_access','policy','incident_support']),
      capability('fraud-protection','Fraud and abuse protection',['alerts','risk_controls','case_management'])
    ],
    iotFleet:[
      capability('iot-assets','IoT asset connectivity',['provision','track','monitor','protect']),
      capability('connected-fleet','Connected fleet and telematics',['vehicle_status','location','driver_events','maintenance_data'])
    ],
    continuity:[
      capability('network-backup','Backup connectivity',['failover','health_check','restore_primary']),
      capability('disaster-recovery','Network continuity',['continuity_plan','incident_mode','recovery_tracking'])
    ],
    industries:[
      capability('healthcare-connectivity','Healthcare connectivity',['clinical_networks','telehealth_connectivity','device_networks']),
      capability('hospitality-connectivity','Hospitality connectivity',['guest_wifi','property_network','operations_connectivity']),
      capability('financial-connectivity','Banking and payments connectivity',['branch_network','payments_network','secure_transport']),
      capability('retail-connectivity','Retail connectivity',['store_network','payments','loss_prevention_connectivity']),
      capability('manufacturing-connectivity','Manufacturing and supply chain',['factory_network','iot','asset_visibility']),
      capability('public-safety-connectivity','Public safety communications',['priority_connectivity','dispatch_connectivity','emergency_networks']),
      capability('global-connectivity','Global enterprise connectivity',['international_sites','global_network','roaming'])
    ]
  },
  support:{
    diagnostics:['connectivity_probe','captive_portal_detection','speed_test','gateway_health','wifi_quality','service_status'],
    serviceDesk:['account_help','billing_help','activation_setup','installation_support','repair_ticket','appointment_management','outage_status'],
    safety:['scam_awareness','account_security','privacy_controls','fraud_reporting']
  }
});

export function flattenConnectivityCapabilities(catalog=CONNECTIVITY_CATALOG){
  const rows=[];
  for(const segmentName of ['personal','business']){
    const segment=catalog[segmentName]||{};
    for(const [category,items] of Object.entries(segment)){
      for(const item of items||[]) rows.push({segment:segmentName,category,...item});
    }
  }
  return rows;
}

export function findConnectivityCapability(id,catalog=CONNECTIVITY_CATALOG){
  return flattenConnectivityCapabilities(catalog).find(item=>item.id===id)||null;
}
