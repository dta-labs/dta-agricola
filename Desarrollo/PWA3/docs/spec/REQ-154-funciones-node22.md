# REQ-154 - Cloud Functions en Node.js 22

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - desplegar: usuario |
| Alcance | `functions/package.json` (`engines.node`) |
| Compilacion | `26.11.22.030` |

`firebase deploy --only functions` fallaba: "Runtime Node.js 20 was decommissioned on 2026-10-30". El motor pasa a
**Node.js 22** (soportado hasta el 31/10/2027; obsoleto desde el 30/04/2027). Se eligio 22 y no 24 porque
`firebase-functions` 4.9 y `firebase-admin` 12.7 lo soportan sin actualizar dependencias.
Antes de abril de 2027 conviene pasar a Node.js 24 (actualizando `firebase-functions`).
