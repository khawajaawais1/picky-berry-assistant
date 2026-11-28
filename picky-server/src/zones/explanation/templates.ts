export interface ReasonTemplate {
  en: string;
  fi: string;
}

export const REASON_TEMPLATES: Readonly<Record<string, ReasonTemplate>> = {
  in_ripe_window: {
    en: 'Berries are in their ripening season here (about {window_start} to {window_end}).',
    fi: 'Marjat ovat kypsymisjaksollaan täällä (noin {window_start}–{window_end}).',
  },
  ripening_window: {
    en: 'Ripening starts soon: from {window_start}.',
    fi: 'Kypsyminen alkaa pian: {window_start} alkaen.',
  },
  before_window: {
    en: 'Too early: ripening starts around {window_start}.',
    fi: 'Liian aikaista: kypsyminen alkaa noin {window_start}.',
  },
  past_window: {
    en: 'The season ended around {window_end}; few berries are left.',
    fi: 'Sesonki päättyi noin {window_end}; marjoja on jäljellä vähän.',
  },
  off_season: {
    en: 'Out of season for this berry.',
    fi: 'Tämän marjan sesonki ei ole käynnissä.',
  },
  good_site: {
    en: 'The forest type here suits this berry well.',
    fi: 'Metsätyyppi sopii tälle marjalle hyvin.',
  },
  moderate_site: {
    en: 'The forest type here is fair for this berry.',
    fi: 'Metsätyyppi sopii tälle marjalle kohtalaisesti.',
  },
  poor_site: {
    en: 'The forest type here is poor for this berry.',
    fi: 'Metsätyyppi sopii tälle marjalle huonosti.',
  },
  no_reports_baseline: {
    en: 'No recent reports, so this is an estimate from the forest type and season.',
    fi: 'Tuoreita raportteja ei ole, joten arvio perustuu metsätyyppiin ja vuodenaikaan.',
  },
  recent_reports_high: {
    en: 'Recent reports from pickers are as good as or better than the estimate ({reports_used} reports).',
    fi: 'Poimijoiden tuoreet raportit ovat vähintään arvion tasolla ({reports_used} raporttia).',
  },
  recent_reports_low: {
    en: 'Recent reports from pickers are lower than the estimate ({reports_used} reports).',
    fi: 'Poimijoiden tuoreet raportit ovat arviota heikompia ({reports_used} raporttia).',
  },
  photo_confirms_species: {
    en: "A picker's photo confirms this berry grows here.",
    fi: 'Poimijan kuva vahvistaa, että marjaa kasvaa täällä.',
  },
  low_confidence_species: {
    en: 'Confidence is kept low: little data for this berry, or little forest here.',
    fi: 'Luotettavuus pidetään matalana: tästä marjasta on vähän tietoa tai alueella on vähän metsää.',
  },
};

export const ML_REASON_CODES = Object.keys(REASON_TEMPLATES);
