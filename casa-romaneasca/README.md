# Casa Românească: site demo

Site static (`public/`) + două funcții Vercel:

- `api/order.js`: comenzi online (livrare / ridicare). Prețurile sunt recalculate pe server din `public/menu.json`.
- `api/book.js`: rezervări de masă.
- `api/cazare.js`: cereri de ofertă pentru cazare (Rovimob SRL).

## Meniul
Tot meniul (109 produse, prețuri, gramaje, „temporar indisponibil”, etichete) este în `public/menu.json`,
preluat de pe pagina actuală de comenzi. Pentru a modifica un preț sau a marca un produs indisponibil (`"off": true`),
editați doar acest fișier.

## Notificări pe e-mail
Comenzile și rezervările apar mereu în logurile funcțiilor din Vercel (`COMANDĂ NOUĂ` / `REZERVARE NOUĂ` / `CERERE CAZARE`).
Pentru a le primi pe e-mail, setați în Vercel:

| Variabilă | Exemplu |
| --- | --- |
| `RESEND_API_KEY` | cheia de pe resend.com |
| `NOTIFY_EMAIL_TO` | `contact@casa-romaneasca.eu` |
| `NOTIFY_EMAIL_FROM` | opțional, necesită domeniu verificat în Resend |

## Program
Programul (momentan 10:00–22:00, zilnic, **de confirmat cu restaurantul**) este în `HOURS`,
în `public/script.js` și `api/_shared.js`.

## Poze
Pozele terasei și ale camerelor sunt decupate din capturi de ecran ale casa-romaneasca.eu, deci au rezoluție mică.
Înlocuiți fișierele din `public/img/` (`terasa.jpg`, `camera-1.jpg`, `camera-2.jpg`, `baie.jpg`, `cladire.jpg`) cu originalele.
