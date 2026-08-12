export const ITEM_TONES = ["sage", "blue", "rose", "amber", "plum"] as const;

export type ItemTone = (typeof ITEM_TONES)[number];

export function stableIndex(seed: string, length: number) {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError("The list must contain at least one item.");
  }

  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}

export function stableVariant<const T>(seed: string, variants: readonly T[]): T {
  return variants[stableIndex(seed, variants.length)];
}

export function stableToneClass(seed: string) {
  return `item-tone-${stableVariant(seed, ITEM_TONES)}`;
}

export const SUCCESS_COPY = {
  rowAdded: [
    "Registro añadido. La tabla ya tiene otra cosa que explicar.",
    "Añadido. El ranking acaba de ponerse nervioso.",
    "Consta en acta. Negarlo ya llega tarde.",
    "Registro dentro. Todo muy objetivo, por supuesto.",
    "Hecho. Otra fila para discutir con datos."
  ],
  rowUpdated: [
    "Cambios guardados. La versión anterior queda convenientemente olvidada.",
    "Registro corregido. Aquí no ha pasado nada.",
    "Actualizado. La realidad vuelve a encajar.",
    "Cambios dentro. Que nadie cite la captura anterior.",
    "Listo. La fila tiene ahora una coartada mejor."
  ],
  rowDeleted: [
    "Registro eliminado. Oficialmente nunca ocurrió.",
    "Fila fuera. El historial prefiere no comentar.",
    "Eliminado. Una prueba menos en circulación.",
    "Registro retirado. Sigamos con naturalidad.",
    "Hecho. Ese asunto ha dejado de constar."
  ],
  tableSettings: [
    "Ajustes guardados. La tabla mantiene la compostura.",
    "Cambios aplicados. El expediente vuelve a estar presentable.",
    "Tabla actualizada. Nadie tiene por qué saber cuánto costó.",
    "Guardado. La letra pequeña ya está bajo control.",
    "Todo al día. La burocracia puede retirarse."
  ],
  tableClosed: [
    "Tabla cerrada. Los puntos ya no aceptan sobornos.",
    "Caso cerrado. El ranking ha dictado sentencia.",
    "Se acabó. Las reclamaciones van directas al archivo.",
    "Resultado definitivo. Ahora toca fingir deportividad.",
    "Tabla cerrada y cuentas hechas. Que empiece la versión de cada uno."
  ],
  profileUpdated: [
    "Perfil actualizado. La identidad oficial queda aprobada.",
    "Cambios guardados. Sigues siendo tú, pero mejor documentado.",
    "Perfil al día. La administración respira tranquila.",
    "Listo. Tu versión pública ya está presentable.",
    "Guardado. El expediente personal queda en orden."
  ],
  appearanceSaved: [
    "Apariencia guardada. Ahora sí parece intencionado.",
    "Tema aplicado. El buen gusto queda registrado.",
    "Colores guardados. La interfaz deja de improvisar.",
    "Listo. La app ya viste como le has dicho.",
    "Aspecto actualizado. Pequeño cambio, autoridad inmediata."
  ],
  inviteRenewed: [
    "Código renovado. El anterior ya no abre ninguna puerta.",
    "Código nuevo. El viejo puede jubilarse sin ceremonia.",
    "Acceso renovado. La frontera vuelve a estar bajo control.",
    "Hecho. Quien llegue tarde necesitará el código nuevo.",
    "Código cambiado. Seguridad razonable restaurada."
  ],
  groupIdentity: [
    "Siglas guardadas. El grupo ya tiene placa propia.",
    "Identidad actualizada. Tres símbolos bastan para hacerse notar.",
    "Cambio aplicado. El grupo ya firma como corresponde.",
    "Siglas listas. Breve, claro y oficialmente vuestro.",
    "Guardado. El grupo acaba de estrenar matrícula."
  ],
  pushEnabled: [
    "Avisos activados. Ahora la tabla puede encontrarte.",
    "Notificaciones listas. El silencio deja de estar garantizado.",
    "Avisos encendidos. No diremos que no te advertimos.",
    "Este dispositivo queda informado oficialmente.",
    "Listo. Las novedades ya saben dónde localizarte."
  ],
  pushDisabled: [
    "Avisos desactivados. Recuperas un poco de paz.",
    "Notificaciones fuera. El dispositivo guarda silencio.",
    "Avisos apagados. Lo que pase, pasará sin llamar.",
    "Hecho. Este dispositivo queda fuera del circuito.",
    "Silencio restaurado. La tabla tendrá que esperar."
  ]
} as const;

export const EMPTY_NOTIFICATION_COPY = [
  { title: "Nada nuevo", body: "Por una vez, nadie ha tocado nada." },
  { title: "Silencio administrativo", body: "Sospechosamente eficiente." },
  { title: "Sin novedades", body: "El caos se ha tomado la tarde libre." },
  { title: "Aquí no pasa nada", body: "Disfrútalo mientras dure." },
  { title: "Bandeja limpia", body: "Nadie ha dejado pruebas recientes." }
] as const;

export const TEST_NOTIFICATION_COPY = [
  { title: "Avisos en servicio", body: "La prueba funciona. La próxima ya puede traer consecuencias." },
  { title: "Te hemos encontrado", body: "Todo correcto. Este dispositivo ya está en el circuito." },
  { title: "Prueba recibida", body: "La tecnología cumple. No conviene acostumbrarse." },
  { title: "Esto era solo un ensayo", body: "El siguiente aviso podría venir con puntos de por medio." },
  { title: "Notificación operativa", body: "Ha sonado cuando debía. Un lujo poco habitual. 🔔" }
] as const;

export const SUCCESS_COPY_EN: {
  [K in keyof typeof SUCCESS_COPY]: readonly [string, string, string, string, string];
} = {
  rowAdded: [
    "Entry added. The table now has one more thing to explain.",
    "Added. The leaderboard just got nervous.",
    "On the record. Denial is now a little late.",
    "Entry saved. Entirely objective, obviously.",
    "Done. Another row to argue over with data."
  ],
  rowUpdated: [
    "Changes saved. The previous version is conveniently forgotten.",
    "Entry corrected. Nothing to see here.",
    "Updated. Reality fits again.",
    "Changes saved. Please ignore the earlier screenshot.",
    "Done. This entry now has a better alibi."
  ],
  rowDeleted: [
    "Entry deleted. Officially, it never happened.",
    "Row removed. The history declines to comment.",
    "Deleted. One less piece of evidence in circulation.",
    "Entry withdrawn. Let us proceed naturally.",
    "Done. That matter is no longer on the record."
  ],
  tableSettings: [
    "Settings saved. The table maintains its composure.",
    "Changes applied. The file is presentable again.",
    "Table updated. Nobody needs to know how long it took.",
    "Saved. The small print is under control.",
    "All up to date. The bureaucracy may leave."
  ],
  tableClosed: [
    "Table closed. The points no longer accept bribes.",
    "Case closed. The leaderboard has ruled.",
    "It is over. Appeals go straight to the archive.",
    "Final result. Time to pretend to be sporting.",
    "Table closed and scores settled. Let every version of events begin."
  ],
  profileUpdated: [
    "Profile updated. The official identity is approved.",
    "Changes saved. Still you, just better documented.",
    "Profile up to date. Administration breathes again.",
    "Done. Your public version is presentable.",
    "Saved. The personal file is in order."
  ],
  appearanceSaved: [
    "Appearance saved. It looks intentional now.",
    "Theme applied. Good taste is now on record.",
    "Colours saved. The interface has stopped improvising.",
    "Done. The app is wearing what you told it to.",
    "Appearance updated. Small change, immediate authority."
  ],
  inviteRenewed: [
    "Code rotated. The old one opens no doors.",
    "New code. The old one may retire quietly.",
    "Access renewed. The border is under control again.",
    "Done. Late arrivals will need the new code.",
    "Code changed. Reasonable security restored."
  ],
  groupIdentity: [
    "Mark saved. The group has its own badge now.",
    "Identity updated. Three symbols are enough to make an entrance.",
    "Change applied. The group now signs properly.",
    "Mark ready. Brief, clear and officially yours.",
    "Saved. The group has new number plates."
  ],
  pushEnabled: [
    "Notifications enabled. The table can find you now.",
    "Notifications ready. Silence is no longer guaranteed.",
    "Alerts on. Do not say nobody warned you.",
    "This device has been officially informed.",
    "Done. Updates now know where to find you."
  ],
  pushDisabled: [
    "Notifications disabled. A little peace is restored.",
    "Notifications off. The device falls silent.",
    "Alerts off. Whatever happens will not knock.",
    "Done. This device is out of the loop.",
    "Silence restored. The table will have to wait."
  ]
};

export const EMPTY_NOTIFICATION_COPY_EN = [
  { title: "Nothing new", body: "For once, nobody has touched anything." },
  { title: "Administrative silence", body: "Suspiciously efficient." },
  { title: "No updates", body: "Chaos has taken the afternoon off." },
  { title: "Nothing happening here", body: "Enjoy it while it lasts." },
  { title: "Clean inbox", body: "Nobody has left fresh evidence." }
] as const;

export const TEST_NOTIFICATION_COPY_EN = [
  { title: "Notifications online", body: "The test works. The next one may have consequences." },
  { title: "We found you", body: "All good. This device is now in the loop." },
  { title: "Test received", body: "Technology delivered. Best not get used to it." },
  { title: "This was only a drill", body: "The next alert may involve points." },
  { title: "Notifications operational", body: "It rang when it should. A rare luxury. 🔔" }
] as const;
