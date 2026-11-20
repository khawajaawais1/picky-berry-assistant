export interface ReasonTemplate {
  en: string;
  fi: string;
}

export const REASON_TEMPLATES: Readonly<Record<string, ReasonTemplate>> = {
  ripe_by_gdd: {
    en: 'The season has been warm enough: berries are ripe here ({gdd_since_apr1} degree-days so far, ripe from {gdd_ripe}).',
    fi: 'Kausi on ollut riittävän lämmin: marjat ovat kypsiä ({gdd_since_apr1} lämpösummayksikköä, kypsyys alkaa {gdd_ripe}).',
  },
  ripening_by_gdd: {
    en: 'Berries are ripening ({gdd_since_apr1} of {gdd_ripe} degree-days needed).',
    fi: 'Marjat ovat kypsymässä ({gdd_since_apr1}/{gdd_ripe} tarvittavasta lämpösummasta).',
  },
  unripe_by_gdd: {
    en: 'Too early: berries are not ripe yet ({gdd_since_apr1} of {gdd_ripe} degree-days).',
    fi: 'Liian aikaista: marjat eivät ole vielä kypsiä ({gdd_since_apr1}/{gdd_ripe} lämpösummasta).',
  },
  past_by_gdd: {
    en: 'The season is past its peak here ({gdd_since_apr1} degree-days).',
    fi: 'Sesongin huippu on ohi täällä ({gdd_since_apr1} lämpösummayksikköä).',
  },
  off_season: {
    en: 'Out of season for this berry.',
    fi: 'Tämän marjan sesonki ei ole käynnissä.',
  },
  recent_reports_high: {
    en: '{reports_7d} pickers rated it {avg_rating_7d}★ this week.',
    fi: '{reports_7d} poimijaa arvioi paikan tällä viikolla keskiarvolla {avg_rating_7d}★.',
  },
  recent_reports_low: {
    en: 'Recent reports are weak: {reports_7d} pickers rated it {avg_rating_7d}★ this week.',
    fi: 'Tuoreet raportit ovat heikkoja: {reports_7d} poimijaa arvioi keskiarvolla {avg_rating_7d}★.',
  },
  no_reports_baseline: {
    en: 'No recent reports, so this score is an estimate from weather and habitat.',
    fi: 'Tuoreita raportteja ei ole, joten pisteet perustuvat säähän ja kasvupaikkaan.',
  },
  good_habitat: {
    en: 'Good habitat for this berry (habitat fit {suitability_pct}%).',
    fi: 'Hyvä kasvupaikka tälle marjalle (sopivuus {suitability_pct} %).',
  },
  moderate_habitat: {
    en: 'Fair habitat for this berry (habitat fit {suitability_pct}%).',
    fi: 'Kohtalainen kasvupaikka tälle marjalle (sopivuus {suitability_pct} %).',
  },
  poor_habitat: {
    en: 'Weak habitat for this berry (habitat fit {suitability_pct}%).',
    fi: 'Heikko kasvupaikka tälle marjalle (sopivuus {suitability_pct} %).',
  },
  ndvi_good: {
    en: 'Vegetation is greener than usual this year.',
    fi: 'Kasvillisuus on tänä vuonna tavallista vehreämpää.',
  },
  ndvi_poor: {
    en: 'Vegetation looks weaker than usual this year.',
    fi: 'Kasvillisuus näyttää tänä vuonna tavallista heikommalta.',
  },
  weather_stale: {
    en: 'Weather data is more than 7 days old, so confidence is lowered.',
    fi: 'Säätiedot ovat yli 7 päivää vanhoja, joten luotettavuutta on laskettu.',
  },
};
