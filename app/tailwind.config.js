/**
 * Tailwind theme for NativeWind.
 *
 * These values MIRROR `src/constants/theme.ts`, which stays the single source of
 * truth for design values; `src/constants/__tests__/tailwind-theme.test.ts` fails if
 * the two ever drift apart, in either direction.
 *
 * `colors`, `spacing`, `borderRadius` and `fontSize` replace Tailwind's defaults on
 * purpose: the utility set is then exactly the token set, so a class that has no
 * token behind it simply does not exist. `extend` is used only where a token has no
 * Tailwind scale of its own.
 *
 * The design is the source of these numbers — see docs/design-source.md.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: {
      background: '#F5F7F8', // Mist
      surface: '#FFFFFF',
      surfaceMuted: '#E7EDE9', // app-side: the design uses tints, not neutral fills
      border: '#DDE5E5',
      ink: '#182B30', // token slot `text`; the design calls it Ink
      inkMuted: '#596C70', // token slot `textMuted`
      accent: '#414BA0', // Blueberry
      berryDeep: '#303A84',
      onAccent: '#FFFFFF',
      accentMuted: '#EAECFA',
      success: '#28654E', // Forest
      successMuted: '#E4F0E7',
      warning: '#855C25',
      warningMuted: '#F5EBD8',
      danger: '#B3261E', // app-side: the design defines no destructive colour yet
      // Frame 06's map (see theme.ts for why the annotations are darkened).
      mapBase: '#E6EEDD',
      mapWoodland: '#CCDDBE',
      mapWater: '#BFDCE0',
      mapTrail: '#FAFCF5',
      mapTrailLine: '#A6B399',
      mapZoneUnpicked: '#AFCDB7',
      mapZoneRecent: '#BECAC6',
      mapZoneRipening: '#DBD5A8',
      mapZoneRecentLine: '#55648F',
      mapNote: '#4A5B5E',
      mapLakeLabel: '#35596A',
      mapZoneRecentLabel: '#44506B',
      mapZoneRipeningLabel: '#6B4A1E',
      // The five yield-score bands of the real map (see theme.ts).
      mapScoreLowest: '#DDE5D8',
      mapScoreLowestLine: '#A9B8A2',
      mapScoreLow: '#C8DCBE',
      mapScoreLowLine: '#8FA985',
      mapScoreMid: '#A9CE9E',
      mapScoreMidLine: '#6E9562',
      mapScoreHigh: '#7CB47B',
      mapScoreHighLine: '#477C4C',
      mapScoreHighest: '#4E8F5B',
      mapScoreHighestLine: '#2C5F38',
    },
    spacing: {
      tight: '3px',
      xs: '4px',
      chartStack: '5px',
      setting: '6px',
      label: '7px',
      sm: '8px',
      cardGap: '10px',
      gap: '12px',
      field: '14px',
      md: '16px',
      section: '18px',
      cardInset: '20px',
      lg: '24px',
      chart: '28px',
      xl: '32px',
      xxl: '48px',
    },
    borderRadius: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      control: '10px',
      lg: '18px',
      pill: '999px',
    },
    fontSize: {
      headline: ['30px', { lineHeight: '42px', fontWeight: '400' }],
      title: ['28px', { lineHeight: '39px', fontWeight: '400' }],
      heroTitle: ['24px', { lineHeight: '34px', fontWeight: '400' }],
      subtitle: ['20px', { lineHeight: '28px', fontWeight: '400' }],
      brand: ['42px', { lineHeight: '51px', fontWeight: '700' }],
      body: ['16px', { lineHeight: '22px', fontWeight: '400' }],
      bodySmall: ['14px', { lineHeight: '20px', fontWeight: '400' }],
      cardTitle: ['15px', { lineHeight: '21px', fontWeight: '600' }],
      cardHeading: ['19px', { lineHeight: '27px', fontWeight: '400' }],
      sectionHeading: ['18px', { lineHeight: '25px', fontWeight: '400' }],
      rowTitle: ['17px', { lineHeight: '24px', fontWeight: '600' }],
      rowValue: ['14px', { lineHeight: '17px', fontWeight: '600' }],
      stat: ['27px', { lineHeight: '38px', fontWeight: '400' }],
      statusLabel: ['12px', { lineHeight: '17px', fontWeight: '600' }],
      timer: ['52px', { lineHeight: '63px', fontWeight: '600' }],
      rating: ['24px', { lineHeight: '29px', fontWeight: '400' }],
      ratingLabel: ['11px', { lineHeight: '13px', fontWeight: '500' }],
      metric: ['50px', { lineHeight: '61px', fontWeight: '400' }],
      input: ['15px', { lineHeight: '21px', fontWeight: '400' }],
      message: ['15px', { lineHeight: '21px', fontWeight: '400' }],
      messageMeta: ['11px', { lineHeight: '13px', fontWeight: '400' }],
      cardLead: ['16px', { lineHeight: '22px', fontWeight: '600' }],
      price: ['18px', { lineHeight: '22px', fontWeight: '400' }],
      priceLarge: ['23px', { lineHeight: '28px', fontWeight: '400' }],
      priceTotal: ['26px', { lineHeight: '31px', fontWeight: '400' }],
      listingHeading: ['26px', { lineHeight: '36px', fontWeight: '400' }],
      mapLabel: ['12px', { lineHeight: '15px', fontWeight: '500' }],
      mapAnnotation: ['10px', { lineHeight: '12px', fontWeight: '400' }],
      label: ['13px', { lineHeight: '16px', fontWeight: '600' }],
      metadata: ['12px', { lineHeight: '17px', fontWeight: '400' }],
      chip: ['10px', { lineHeight: '14px', fontWeight: '600' }],
      navLabel: ['12px', { lineHeight: '15px', fontWeight: '400' }],
      caption: ['13px', { lineHeight: '18px', fontWeight: '400' }],
      profileName: ['21px', { lineHeight: '29px', fontWeight: '400' }],
      profileInitials: ['23px', { lineHeight: '28px', fontWeight: '400' }],
    },
    extend: {
      height: {
        action: '54px',
        header: '64px',
        chip: '36px',
        touch: '44px',
        map: '300px',
        routeMap: '322px',
        visitMap: '210px',
      },
      // The same metrics as a floor rather than a cap, for a control whose content has to
      // be able to grow: at a large system text size the design's 64 px header cannot hold
      // its own eyebrow and title, and clipping them is not an option (ADR-019).
      minHeight: {
        action: '54px',
        header: '64px',
        chip: '36px',
        touch: '44px',
      },
    },
  },
  plugins: [],
};
