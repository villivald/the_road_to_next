# Public policies — EN/FI operator draft

Reviewed 30 October 2026. **Review draft, not published customer terms.** The service is personally operated in Finland; support contact: support@wishlist.fi.
Repository drafts use role-based wording. The reviewed website notice should
identify the operator as required before publication.
The existing app pages remain the current development-preview notices.

Publication requires a decision on retention and backups, confirmation of provider
contracts/regions/international transfer safeguards, and appropriate legal review.
No legal approval or provider agreement is asserted by this draft. Paid-service
terms require Step 7's actual live billing arrangements. Review the
[operations evidence](operations-readiness-2026-10-29.md) before publishing.

## Retention review: actual behavior and proposed decisions

| Data                                        | Current implementation                                                                                                                              | Proposed operator decision, not yet enforced                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Account/profile/session access              | Account deletion removes user/profile and cascades sessions/tokens/memberships/favorites; avatar becomes eligible for cleanup                       | Preserve this behavior; verify erasure request handling and external support records                                     |
| Expired auth records                        | Checked on access; expired rate limits, sessions, verification/reset records removed by daily maintenance                                           | Keep current expiry/cleanup; do not promise deletion exactly at expiry                                                   |
| Wishes/shared lists                         | Deleting a list cascades content; deleting an account can transfer lists to another admin, retain wishes without author, or archive ownerless lists | Decide whether ownerless archives should be purged after 30 days; implement and verify separately before promising it    |
| Guest links/invitations/reservation history | Expiry/revocation enforced on access; no general scheduled purge of all historical records                                                          | Review a 90-day post-expiry/history retention proposal and required audit/deduplication needs                            |
| Account email records                       | Sent/canceled bodies cleared; delivery metadata/recipient remain until account deletion; failed bodies may remain for diagnosis                     | Review 30-day diagnostic retention, keeping minimum deduplication state where necessary                                  |
| Detached image bytes                        | Cleanup after due time, with retry/backoff; attached archived images can remain                                                                     | Adopt archive decision and verify original/variant deletion; do not promise an exact erasure time during outages         |
| Detached billing records/events             | Account is unlinked; identifiers and recovery state remain for cancellations/reconciliation; no automatic general purge                             | Determine a justified retention period with legal/provider input; preserve unresolved cancellation and refund records    |
| Runtime logs / support mailbox              | Provider/operator retention; exact current settings unverified                                                                                      | Minimize customer data, record actual retention and access, agree a support-case retention period                        |
| Backups                                     | Manual encrypted hosted DB/media export passed an isolated offline restore; daily cadence and off-device custody not yet established                | Proposed daily encrypted DB/media backup, seven daily versions; verify expiry, separate key custody and erasure handling |

Do not add a blanket deletion job from these proposed numbers: retained/shared
content, payment recovery, deduplication and provider records require different
rules. Retention must describe the implemented behavior at publication time.

## Privacy notice — English draft

**Who is responsible.** Wishlist is operated personally by its service owner in
Finland. For privacy questions, access/correction requests or deletion requests,
contact **support@wishlist.fi**.

**What we use.** Account identifiers, email, password hash, language, profile and
session/security records support your account. Lists, wishes, image uploads,
memberships, invitations, favorites and reservations support the sharing features
you choose. Transactional email records support delivery and duplicate prevention.
Security checks and rate limits protect the service. Optional numerical
performance measurements help diagnose page speed without visitor identifiers.
Payment testing currently uses Paddle sandbox; Wishlist does not store card details.

**Sharing and visibility.** Published public lists and eligible wishes can be
viewed without an account and found in Browse. A public-list owner's display
name/username, avatar and profile description may appear in People; email addresses
are not displayed there. Private lists require membership or a valid read-only
guest link. Hidden lists are limited to admins. Reservation visibility is limited
to the organizer, accepted group participants and list admins; the group roster
is shared with consenting participants. A guest link is a private access link:
anyone holding a valid link can use its read access until expiry or revocation.

**Service providers and security.** The service uses Vercel for hosting/private
image storage, Neon for PostgreSQL, Resend for transactional email, Inngest for
background work and Cloudflare Turnstile for account-form abuse checks. Cloudflare
processes browser/device signals for that security check. Provider locations,
contractual roles and any international-transfer safeguards must be confirmed
in the reviewed final notice. Service providers may process the data needed for
their functions; a private-list setting does not mean providers never process it.

**Cookies and preferences.** Cookies keep you signed in and preserve read-only
guest access. Browser storage remembers the theme. Optional app performance
measurements do not use visitor identifiers. This paragraph does not describe all
provider-side processing; review Turnstile and hosting disclosures before launch.

**Retention and deletion.** You can edit your profile and manage your lists,
wishes and images in the app. Account deletion removes your profile/sign-in
access, but some shared lists transfer to another admin and wishes can remain
without your name. Ownerless lists may be archived. Detached payment identifiers
and recovery records can remain to complete subscription handling. Archived
content/history, provider logs, support correspondence and backup retention need
the decisions above before this draft is published. Hiding a list ends active
reservations; it does not erase the list or all retained records.

**Your requests.** Contact support to ask about your data or request correction,
access, deletion or other applicable data-protection rights. We may need to verify
identity before disclosing data. You can raise a concern with the Finnish Office
of the Data Protection Ombudsman. The final notice must explain the applicable
processing purposes/legal bases, recipients, retention, rights and transfer
safeguards after review; it must not imply that every request has the same outcome.

## Tietosuojailmoitus — suomenkielinen luonnos

**Rekisterinpitäjä.** Wishlist-palvelua ylläpitää palvelun omistaja yksityishenkilönä
Suomessa. Tietosuojaa, tietojen tarkastamista, korjaamista tai poistamista koskevissa
asioissa voit ottaa yhteyttä: **support@wishlist.fi**.

**Käsiteltävät tiedot.** Tilin tunnisteita, sähköpostiosoitetta, salasanan
tiivistettä, kielivalintaa, profiilia sekä istunto- ja turvallisuustietoja käytetään
tilin toimintaan. Listat, toiveet, kuvat, jäsenyydet, kutsut, suosikit ja varaukset
mahdollistavat valitsemasi jakamistoiminnot. Palveluviestien tiedot tukevat
toimitusta ja estävät päällekkäisiä lähetyksiä. Turvatarkistukset ja käyttörajat
suojaavat palvelua. Valinnaiset numeeriset suorituskykymittaukset auttavat
tutkimaan sivujen nopeutta ilman kävijätunnisteita. Maksujen testaus käyttää
tällä hetkellä Paddlen testiympäristöä. Wishlist ei tallenna maksukorttitietoja.

**Jakaminen ja näkyvyys.** Julkaistut julkiset listat ja niillä näkyvät toiveet
voivat löytyä Selaa-sivulta, ja niitä voi katsella ilman tiliä. Julkisen listan
omistajan nimi tai käyttäjänimi, profiilikuva ja esittely voivat näkyä
henkilöhaussa; sähköpostiosoitetta ei näytetä siellä. Yksityinen lista edellyttää
jäsenyyttä tai voimassa olevaa vain katseluun tarkoitettua vieraslinkkiä.
Piilotetun listan voivat avata vain ylläpitäjät. Varaukset näkyvät järjestäjälle,
mukaan hyväksytyille osallistujille ja listan ylläpitäjille. Ryhmän osallistujat
jakavat nimensä suostumuksen perusteella. Vieraslinkki on yksityinen pääsylinkki:
sen haltija voi käyttää katseluoikeutta linkin vanhenemiseen tai peruuttamiseen asti.

**Palveluntarjoajat ja turvallisuus.** Palvelu käyttää Verceliä sovelluksen ja
yksityisten kuvien tallennukseen, Neonia PostgreSQL-tietokantaan, Resendiä
palveluviesteihin, Inngestiä taustatöihin ja Cloudflare Turnstilea tililomakkeiden
väärinkäytön torjuntaan. Cloudflare käsittelee selaimen ja laitteen signaaleja
turvatarkistuksessa. Palveluntarjoajien sijainnit, sopimusroolit ja mahdollisten
kansainvälisten siirtojen suojatoimet on vahvistettava lopulliseen ilmoitukseen.
Yksityisen listan asetus ei tarkoita, etteivät palveluntarjoajat käsittelisi sen
toimintaan tarvittavia tietoja.

**Evästeet ja asetukset.** Evästeet ylläpitävät kirjautumista ja vieraslinkin
katseluoikeutta. Selain tallentaa teemavalinnan. Sovelluksen valinnaisissa
suorituskykymittauksissa ei käytetä kävijätunnisteita. Palveluntarjoajien muu
käsittely, Turnstile ja hosting-palvelun käytännöt on tarkistettava ennen julkaisua.

**Säilytys ja poistaminen.** Voit muokata profiiliasi sekä hallita listoja,
toiveita ja kuvia sovelluksessa. Tilin poistaminen poistaa profiilin ja
kirjautumisoikeuden, mutta yhteisiä listoja voi siirtyä toiselle ylläpitäjälle ja
toiveita säilyä ilman tekijän nimeä. Omistajattomia listoja voidaan arkistoida.
Tilistä irrotettuja maksutunnisteita ja palautumistietoja voi säilyä tilausten
käsittelyä varten. Arkistoidun sisällön, historian, lokien, tukiviestien ja
varmuuskopioiden säilytysajat on päätettävä ennen tämän luonnoksen julkaisemista.
Listan piilottaminen päättää aktiiviset varaukset; se ei poista listaa tai kaikkia
siihen liittyviä tietoja.

**Tietosuojaoikeudet.** Voit ottaa yhteyttä tukeen ja kysyä tiedoistasi tai pyytää
niiden tarkastamista, korjaamista tai poistamista sekä käyttää muita soveltuvia
tietosuojaoikeuksia. Henkilöllisyys voidaan joutua varmistamaan ennen tietojen
luovuttamista. Voit saattaa asian tietosuojavaltuutetun käsiteltäväksi.
Lopullisessa ilmoituksessa on kuvattava tarkistetut käyttötarkoitukset,
oikeusperusteet, vastaanottajat, säilytysajat, oikeudet ja siirtojen suojatoimet.

## Beta terms — English draft

Wishlist is an invited beta operated by its owner in Finland. Contact
support@wishlist.fi for help. Features and availability can change; keep your own
copy of information you need. No continuous-availability or response-time
guarantee is offered in this draft; applicable mandatory rights remain unaffected.

Upload only content you are allowed to use. Avoid sensitive personal information,
keep passwords/private links secure, respect other people and do not interfere
with the service or bypass access controls. Publishing preserves the chosen
audience; review public/private access before sharing.

A wish or reservation does not purchase an item, guarantee its price/availability
or create a payment between users. External stores apply their own terms. Group
reservations coordinate a gift; Wishlist does not collect group payments.

This beta uses Paddle sandbox. Sandbox purchases charge no money. Promo access
can enable Premium features according to its stated duration. Real subscriptions,
withdrawal/refund information and paid-service terms must be reviewed and
published with the separate live-billing release. No live purchase is offered
by this draft. Account deletion follows the reviewed impact summary, including
possible shared-list transfer and archival.

## Betakäytön ehdot — suomenkielinen luonnos

Wishlist on kutsupohjainen betapalvelu, jota ylläpitää palvelun omistaja Suomessa.
Tukeen saa yhteyden osoitteessa support@wishlist.fi. Toiminnot ja saatavuus voivat
muuttua. Säilytä oma kopio tarvitsemistasi tiedoista. Tämä luonnos ei lupaa
keskeytyksetöntä saatavuutta tai määrättyä vastausaikaa. Soveltuvia pakottavia
oikeuksia ei rajoiteta.

Lataa vain sisältöä, jonka käyttöön sinulla on oikeus. Vältä arkaluonteisia
henkilötietoja, suojaa salasanat ja yksityiset linkit, kunnioita muita äläkä
häiritse palvelua tai kierrä pääsynhallintaa. Julkaiseminen säilyttää valitun
kohderyhmän. Tarkista julkinen tai yksityinen näkyvyys ennen jakamista.

Toive tai varaus ei osta tuotetta, takaa sen hintaa tai saatavuutta eikä luo
maksutapahtumaa käyttäjien välille. Ulkopuolisissa kaupoissa sovelletaan niiden
omia ehtoja. Ryhmävaraus auttaa lahjan järjestämisessä; Wishlist ei kerää ryhmämaksuja.

Beta käyttää Paddlen testiympäristöä. Testiostoksista ei veloiteta rahaa.
Kampanja voi antaa Premium-oikeuden ilmoitetuksi ajaksi. Oikeat tilaukset,
peruuttamis- ja hyvitystiedot sekä maksullisen palvelun ehdot tarkistetaan ja
julkaistaan erillisen maksullisen julkaisun yhteydessä. Tämä luonnos ei tarjoa
oikeaa ostosta. Tilin poistamisen vaikutukset, kuten yhteisen listan siirtyminen
toiselle ylläpitäjälle tai arkistointi, näytetään poistamisen yhteenvedossa.

## Accessibility publication decision

Retain the current EN/FI accessibility contact and known testing limits. Record
the implemented keyboard/focus, contrast, responsive, reduced-motion and screen
reader findings rather than claiming full compliance from automated Axe results.
Physical-phone, VoiceOver/NVDA and remaining email-client checks are still open.
Determine the applicable statutory accessibility obligations with legal review;
do not publish a conformance level or formal audit claim that has not been verified.

The final privacy review should use authoritative requirements, including the
[EU GDPR text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) and
[Finnish Data Protection Ombudsman guidance on informing data subjects](https://tietosuoja.fi/en/inform-data-subjects-about-processing).
