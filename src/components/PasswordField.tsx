"use client";

import { useState } from "react";
import Field from "./Field";

type Props = Omit<React.ComponentProps<typeof Field>, "type" | "trailing">;

export default function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-lg px-2 py-1 text-sm font-medium text-teal-700 hover:bg-teal-50"
          aria-label={visible ? "Nascondi password" : "Mostra password"}
        >
          {visible ? "Nascondi" : "Mostra"}
        </button>
      }
    />
  );
}
