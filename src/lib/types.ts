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
