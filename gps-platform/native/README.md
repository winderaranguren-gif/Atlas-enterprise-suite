# ATLAS GPS Native Runtime

The native bridge supplies background location, lock-screen navigation updates, screen-awake control and a safe handoff point for CarPlay and Android Auto.

## Generate native projects

```bash
npm install
npm run mobile:add:ios
npm run mobile:add:android
npm run mobile:sync
```

Then add the included native plugin source files to the generated iOS and Android targets and register the plugin according to the Capacitor project template.

## External approvals that remain mandatory

- Apple developer account, signing certificates, provisioning profiles and CarPlay navigation entitlement.
- Google Play developer account and approval for the Android for Cars navigation category.
- Background-location declarations, privacy manifests and store-review disclosures.
- Real-device road testing and distracted-driving safety review.

The repository cannot issue platform entitlements or approve the app on behalf of Apple or Google.

## JavaScript bridge contract

```js
await AtlasNavigation.startBackgroundNavigation({
  routeId: 'route-id',
  destinationName: 'Destination',
  locationIntervalMs: 1000
});

await AtlasNavigation.updateGuidance({
  instruction: 'Keep right',
  distanceMeters: 350,
  etaEpochMs: Date.now() + 900000
});

await AtlasNavigation.stopBackgroundNavigation();
await AtlasNavigation.purgeLocalNavigationData();
```

The native implementations must never upload raw location or camera data unless the user and enterprise policy have explicitly enabled it.
