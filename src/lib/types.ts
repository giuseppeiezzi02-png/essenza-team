export type RuoloUtente = "admin" | "consulente";

export type Profilo = {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  ruolo: RuoloUtente;
  codice_consulente: string;
  link_vetrina_doterra: string | null;
  url_calendario_zoom: string | null;
  upline_id: string | null;
  abilitato_colloqui: boolean;
  accesso_formazione_avanzata: boolean;
  created_at: string;
  updated_at: string;
};

export type CampagnaAds = {
  consulente_id: string;
  budget_totale_cents: number;
  stato: "inattivo" | "attivo";
  lead_ricevuti: number;
  ultimo_lead_at: string | null;
};

export type PagamentoAds = {
  id: string;
  importo_cents: number;
  provider: "simulato" | "stripe";
  created_at: string;
};

export type Lead = {
  id: string;
  nome: string;
  email: string;
  telefono: string | null;
  messaggio: string | null;
  created_at: string;
};

export type Notifica = {
  id: string;
  titolo: string;
  messaggio: string;
  letta: boolean;
  created_at: string;
};
