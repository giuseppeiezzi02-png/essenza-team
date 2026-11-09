"use client";

import { useState } from "react";

export default function CopiaLinkInvito({
  percorso,
  titolo,
  etichetta,
}: {
  percorso: string;
  titolo: string;
  etichetta: string;
}) {
  const [copiato, setCopiato] = useState(false);

  async function copia() {
    const link = `${window.location.origin}${percorso}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: titolo, url: link });
        return;
      } catch {
        // annullato dall'utente: ripiega sulla copia
      }
    }
    await navigator.clipboard.writeText(link);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  }

  return (
    <button type="button" onClick={copia} className="btn-secondary mt-4">
      {copiato ? "Link copiato!" : etichetta}
    </button>
  );
}
