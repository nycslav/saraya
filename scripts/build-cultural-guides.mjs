import fs from 'node:fs';
import path from 'node:path';

const candidatePath = process.argv[2];
if (!candidatePath) {
  throw new Error('Usage: node scripts/build-cultural-guides.mjs <candidate-culture.json>');
}

const root = process.cwd();
const festivalPath = path.join(root, 'database', 'seeds', 'festivals.json');
const outputPath = path.join(root, 'database', 'seeds', 'festival-cultural-guides.json');
const festivals = JSON.parse(fs.readFileSync(festivalPath, 'utf8'));
const candidates = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));

const duplicateValues = (values) => [
  ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
];
const festivalIds = festivals.map((festival) => festival.id);
const candidateIds = candidates.map((candidate) => candidate.festivalId);
const festivalSet = new Set(festivalIds);
const candidateSet = new Set(candidateIds);
const mapping = {
  festivalCount: festivalIds.length,
  culturalGuideCount: candidateIds.length,
  festivalDuplicates: duplicateValues(festivalIds),
  culturalGuideDuplicates: duplicateValues(candidateIds),
  festivalsMissingCulture: festivalIds.filter((id) => !candidateSet.has(id)),
  orphanCulturalGuides: candidateIds.filter((id) => !festivalSet.has(id)),
};

if (
  mapping.festivalCount !== 151 ||
  mapping.culturalGuideCount !== 151 ||
  mapping.festivalDuplicates.length > 0 ||
  mapping.culturalGuideDuplicates.length > 0 ||
  mapping.festivalsMissingCulture.length > 0 ||
  mapping.orphanCulturalGuides.length > 0
) {
  throw new Error(`Festival/culture mapping is invalid:\n${JSON.stringify(mapping, null, 2)}`);
}

const reviewedAt = '2026-09-22';
const section = (text, verificationStatus, sourceIds = []) => ({
  text,
  verificationStatus,
  sourceIds,
});
const source = (id, publisher, title, url, sourceType, supports) => ({
  id,
  publisher,
  title,
  url,
  sourceType,
  accessedAt: reviewedAt,
  supports,
});

const defaultCategories = (festival) => ({
  history: section(
    `We have not yet found a reliable source that supports a festival-specific history for ${festival.name}. Until one is reviewed, use the verified festival overview and schedule above for planning.`,
    'insufficient-evidence',
  ),
  customs: section(
    `We have not yet verified festival-specific customs for ${festival.name}. Follow posted organizer guidance, be considerate around worship and community activities, and do not assume that a general Filipino practice is required here.`,
    'insufficient-evidence',
  ),
  payment: section(
    'Traveler guidance: carry small-denomination cash for temporary stalls and local transport, confirm prices before paying, and check whether a service charge is already included. Additional tipping is discretionary.',
    'general-guidance',
  ),
  pasalubong: section(
    `We have not yet verified a festival-specific pasalubong recommendation for ${festival.name}. Look for products identified by the local tourism office or established community sellers instead of treating any item as a required purchase.`,
    'insufficient-evidence',
  ),
  dining: section(
    'Traveler guidance: follow the venue’s dining setup, wash or sanitize your hands before eating, and ask your host or vendor when you are unsure about a shared meal.',
    'general-guidance',
  ),
  'photography-social': section(
    'Traveler guidance: ask before taking close portraits, avoid blocking processions or performances, and follow posted or organizer instructions at religious and cultural sites.',
    'general-guidance',
  ),
});

const overrides = {
  'ati-atihan': {
    sources: [
      source(
        'ati-kalibo-cultural',
        'Municipality of Kalibo',
        'Vibrant Kalibo',
        'https://kaliboaklan.gov.ph/vibrant-kalibo/',
        'lgu',
        ['history', 'customs', 'pasalubong'],
      ),
    ],
    categories: {
      history: section(
        'Kalibo’s official visitor page describes Ati-Atihan as a January gathering that brings Kalibonhons and Aklanons together while honoring the Santo Niño.',
        'verified',
        ['ati-kalibo-cultural'],
      ),
      customs: section(
        'Officially documented features include costumed groups dancing through Kalibo’s main streets to drums and the chant “Viva kay Señor Santo Niño.”',
        'verified',
        ['ati-kalibo-cultural'],
      ),
      pasalubong: section(
        'Kalibo’s official visitor information highlights piña cloth and crafts made from piña, abaca, raffia, bariw, and nito. It also lists local delicacies such as ampaw and barquillos.',
        'verified',
        ['ati-kalibo-cultural'],
      ),
    },
  },
  sinulog: {
    sources: [
      source(
        'sinulog-cebu-cultural',
        'Cebu City Government',
        'About Cebu City Government',
        'https://www.cebucity.gov.ph/ccgwp/about.php',
        'lgu',
        ['history'],
      ),
      source(
        'sinulog-cebu-parade',
        'Cebu City Government',
        'Sinulog 2020 Grand Parade Winners',
        'https://www.cebucity.gov.ph/sinulog-2020-winners/',
        'lgu',
        ['customs'],
      ),
    ],
    categories: {
      history: section(
        'Cebu City’s official cultural overview identifies Sinulog as one of the celebrations that exemplify the city’s heritage. The reviewed source does not establish the detailed pre-colonial origin story found in the candidate text.',
        'partially-verified',
        ['sinulog-cebu-cultural'],
      ),
      customs: section(
        'Cebu City’s published Sinulog results document ritual-showdown, street-dancing, float, costume, and musicality categories. These are programmed competition formats rather than rules for every participant.',
        'verified',
        ['sinulog-cebu-parade'],
      ),
    },
  },
  dinagyang: {
    sources: [
      source(
        'dinagyang-dot-cultural',
        'Department of Tourism Philippines',
        'Iloilo City destination guide',
        'https://philippines.travel/destinations/iloilo',
        'dot',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism destination guide presents Dinagyang as an annual Iloilo celebration honoring the Santo Niño.',
        'verified',
        ['dinagyang-dot-cultural'],
      ),
      customs: section(
        'The reviewed tourism guide highlights organized street dancing, tribal performances, and colorful costumes as visible festival features.',
        'verified',
        ['dinagyang-dot-cultural'],
      ),
    },
  },
  panagbenga: {
    sources: [
      source(
        'panagbenga-bcg-cultural',
        'Baguio City Guide',
        'Panagbenga 2021 limited events approved by city mayor',
        'https://baguiocityguide.com/panagbenga-2021-limited-events-approved-by-city-mayor/',
        'secondary',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'A Baguio publication reports that Panagbenga was conceptualized in 1995 as a community-led, government-supported flower festival. Because this review found only a secondary accessible source, the account remains partially verified.',
        'partially-verified',
        ['panagbenga-bcg-cultural'],
      ),
      customs: section(
        'The reviewed Baguio source describes Panagbenga as an annual flower festival with programmed community events; exact activities can change and should be checked against the organizer’s current schedule.',
        'partially-verified',
        ['panagbenga-bcg-cultural'],
      ),
    },
  },
  moriones: {
    sources: [
      source(
        'moriones-dot-cultural',
        'Department of Tourism Philippines',
        'Marinduque destination guide',
        'https://www.tourism.gov.ph/destination/mimaropa/marinduque/',
        'dot',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism describes Moriones as a Holy Week tradition centered on the Passion narrative and the story of Longinus.',
        'verified',
        ['moriones-dot-cultural'],
      ),
      customs: section(
        'In Boac, Mogpog, and Gasan, participants wear masks and costumes representing Roman soldiers, parade through town, and stage scenes that culminate in the Longinus reenactment.',
        'verified',
        ['moriones-dot-cultural'],
      ),
    },
  },
  pahiyas: {
    sources: [
      source(
        'pahiyas-dot-cultural',
        'Department of Tourism Philippines',
        'Quezon Province destination guide',
        'https://philippines.travel/destinations/quezon/index',
        'dot',
        ['history', 'customs', 'pasalubong'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism guide identifies Pahiyas as Lucban’s May festival honoring San Isidro Labrador.',
        'verified',
        ['pahiyas-dot-cultural'],
      ),
      customs: section(
        'The documented public display centers on houses decorated with colorful kiping and agricultural produce.',
        'verified',
        ['pahiyas-dot-cultural'],
      ),
      pasalubong: section(
        'The same tourism guide associates Quezon with Lucban longganisa, pancit habhab, broas, and lambanog. Treat these as local products to learn about, not mandatory festival purchases.',
        'verified',
        ['pahiyas-dot-cultural'],
      ),
    },
  },
  'pintados-kasadyaan': {
    sources: [
      source(
        'pintados-pia-cultural',
        'Philippine Information Agency',
        'Pintados Festival endures to tell story of painted ancestors',
        'https://pia.gov.ph/features/pintados-festival-endures-to-tell-story-of-painted-ancestors/',
        'official-government',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Philippine Information Agency explains that “pintados” referred to the tattooed people encountered by Spanish colonizers in the Visayas. The festival frames body-paint imagery as a way to retell ancestral stories and regional history.',
        'verified',
        ['pintados-pia-cultural'],
      ),
      customs: section(
        'Schools, barangays, and cultural groups prepare contingents for a programmed street parade and ritual presentation using body paint, costume, drums, and symbolic movement.',
        'verified',
        ['pintados-pia-cultural'],
      ),
    },
  },
  kadayawan: {
    sources: [
      source(
        'kadayawan-dot-cultural',
        'Department of Tourism Philippines',
        'Davao City destination guide',
        'https://www.tourism.gov.ph/destination/davao-region/davao-city/',
        'dot',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism describes Kadayawan as Davao City’s August thanksgiving for nature, harvest, cultural wealth, and peaceful life, and says the celebration honors Davao’s 11 tribes.',
        'verified',
        ['kadayawan-dot-cultural'],
      ),
      customs: section(
        'The reviewed guide identifies activities and rituals connected with the annual celebration. It also describes the Kadayawan Cultural Village as a venue for Indigenous crafts, arts, food, music, and ritual presentations.',
        'verified',
        ['kadayawan-dot-cultural'],
      ),
    },
  },
  masskara: {
    sources: [
      source(
        'masskara-bacolod-cultural',
        'Bacolod City Government',
        'City Ordinance No. 1020: MassKara Festival and MassKara Dance as cultural property',
        'https://bacolodcity.gov.ph/wp-content/uploads/2023/08/CO-1020.pdf',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Bacolod City records that MassKara began in 1980. Its name means “many faces,” and the October celebration has become closely associated with the city’s public cultural identity.',
        'verified',
        ['masskara-bacolod-cultural'],
      ),
      customs: section(
        'Visitors can expect programmed street dancing by performers wearing masks with smiling faces. Watch from designated areas, keep parade routes clear, and check the current official program because event locations and times can change.',
        'verified',
        ['masskara-bacolod-cultural'],
      ),
    },
  },
  higantes: {
    sources: [
      source(
        'higantes-angono-cultural',
        'Municipality of Angono',
        'Historical Background and Development',
        'https://angono.gov.ph/wp-content/uploads/2023/07/Chapter1.HISTORICAL-BACKGROUND-AND-DEVELOPMENT.2016-2026.pdf',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Angono’s municipal profile connects the Higantes Festival with the November 23 feast of San Clemente, the patron saint of fishermen.',
        'verified',
        ['higantes-angono-cultural'],
      ),
      customs: section(
        'The documented celebration includes giant papier-mâché figures, a town procession, and a fluvial procession on Laguna de Bay. Treat the religious portions as worship, follow crowd controls, and ask before closely photographing devotees.',
        'verified',
        ['higantes-angono-cultural'],
      ),
    },
  },
  kaamulan: {
    sources: [
      source(
        'kaamulan-bukidnon-cultural',
        'Provincial Government of Bukidnon',
        'Kaamulan Festival',
        'https://bukidnon.gov.ph/kaamulan-festival/',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Bukidnon explains that “Kaamulan” comes from the Binukid word “amul,” meaning “to gather.” The festival brings together the traditions of the province’s seven Indigenous groups and is tied to Bukidnon’s provincial anniversary.',
        'verified',
        ['kaamulan-bukidnon-cultural'],
      ),
      customs: section(
        'The official account lists community gatherings, chants, dances, Indigenous sports, and named rituals alongside civic and street-dance events. Some activities carry ceremonial meaning, so observe quietly, follow host instructions, and do not enter or imitate a ritual without invitation.',
        'verified',
        ['kaamulan-bukidnon-cultural'],
      ),
    },
  },
  lanzones: {
    sources: [
      source(
        'lanzones-camiguin-cultural',
        'Provincial Government of Camiguin',
        'Provincial Tourism Office',
        'https://camiguin.gov.ph/provincial-administrators-office/',
        'lgu',
        ['history'],
      ),
      source(
        'lanzones-pia-cultural',
        'Philippine Information Agency',
        'Camiguin marks 46th Lanzones Festival, highlights shared prosperity',
        'https://pia.gov.ph/news/camiguin-marks-46th-lanzones-festival-highlights-shared-prosperity/',
        'official-government',
        ['customs', 'pasalubong'],
      ),
    ],
    categories: {
      history: section(
        'Camiguin’s provincial tourism office describes Lanzones Festival as an annual October thanksgiving for the island’s blessings and its harvest of sweet lanzones.',
        'verified',
        ['lanzones-camiguin-cultural'],
      ),
      customs: section(
        'Recent official coverage documents an opening Pabuenas dance, community performances, an agro-industrial tourism fair, and a public lanzones-sharing activity. Use the current schedule rather than assuming every activity returns each year.',
        'verified',
        ['lanzones-pia-cultural'],
      ),
      pasalubong: section(
        'The official festival trade fair presents products from Camiguin’s municipalities. For a locally grounded souvenir, browse that fair or tourism-office-listed sellers and ask vendors where an item was made; fruit availability is seasonal.',
        'verified',
        ['lanzones-pia-cultural'],
      ),
    },
  },
  'kadaugan-sa-mactan': {
    sources: [
      source(
        'kadaugan-cebu-cultural',
        'Provincial Government of Cebu',
        'Cebu Province History and Heritage',
        'https://www.cebu.gov.ph/about/',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Cebu Province presents Kadaugan sa Mactan as a commemoration of Lapu-Lapu’s 1521 victory over Magellan and a celebration of courage and independence.',
        'verified',
        ['kadaugan-cebu-cultural'],
      ),
      customs: section(
        'The official provincial overview identifies a historical reenactment as the celebration’s central format. Treat it as a staged interpretation, follow event barriers, and consult the current organizer schedule for access and timing.',
        'verified',
        ['kadaugan-cebu-cultural'],
      ),
    },
  },
  sandugo: {
    sources: [
      source(
        'sandugo-bohol-cultural',
        'Provincial Government of Bohol Tourism Office',
        'Sandugo Festival 2022',
        'https://tourism.bohol.gov.ph/2022/06/24/sandugo-festival-2022/',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Bohol’s tourism office says Sandugo commemorates the 1565 blood compact associated with Datu Sikatuna and Miguel López de Legazpi. The modern provincial celebration grew under Governor Constancio Chatto Torralba and is now held in July.',
        'verified',
        ['sandugo-bohol-cultural'],
      ),
      customs: section(
        'Officially documented events include a historical reenactment, street parade and dance competition, trade and food fairs, cultural shows, church services, and sports. These are scheduled public activities, so confirm the current program before traveling.',
        'verified',
        ['sandugo-bohol-cultural'],
      ),
    },
  },
  'zamboanga-hermosa': {
    sources: [
      source(
        'hermosa-dot-cultural',
        'Department of Tourism Philippines',
        'Zamboanga Hermosa Festival',
        'https://www.tourism.gov.ph/explore/zamboanga-hermosa-festival/',
        'dot',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism describes Zamboanga Hermosa, or Fiesta Pilar, as an annual October celebration honoring Our Lady of the Pillar, Zamboanga City’s patroness.',
        'verified',
        ['hermosa-dot-cultural'],
      ),
      customs: section(
        'The month-long program can include a nine-day novena, trade fairs, dance and song competitions, and a regatta of colorful vintas. During the novena and feast-day observances, make room for devotees and distinguish worship from entertainment events.',
        'verified',
        ['hermosa-dot-cultural'],
      ),
    },
  },
  'paraw-regatta': {
    sources: [
      source(
        'paraw-pia-cultural',
        'Philippine Information Agency',
        '52nd Paraw Regatta celebrates Ilonggo maritime heritage',
        'https://pia.gov.ph/news/52nd-paraw-regatta-celebrates-ilonggo-maritime-heritage/',
        'official-government',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Philippine Information Agency reports that Paraw Regatta began in 1973 to honor the historic role of the paraw, a double-outrigger sailboat, and Ilonggo seafaring traditions.',
        'verified',
        ['paraw-pia-cultural'],
      ),
      customs: section(
        'Documented events include the main sailing race, painted-sail displays, body painting, dance and music performances, and food activities. Watch races only from permitted shore areas and follow weather and marine-safety announcements.',
        'verified',
        ['paraw-pia-cultural'],
      ),
    },
  },
  'international-bamboo-organ': {
    sources: [
      source(
        'bamboo-organ-tpb-cultural',
        'Tourism Promotions Board Philippines',
        'Calendar of Philippine Festivals and Monthly Observances',
        'https://www.tpb.gov.ph/?_sft_event_type=calendar-of-philippine-festivals-and-monthly-observances-theme&sfid=80726',
        'tpb',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Tourism Promotions Board identifies the festival’s focus as the unique bamboo organ in Las Piñas made by Fray Diego Cera.',
        'verified',
        ['bamboo-organ-tpb-cultural'],
      ),
      customs: section(
        'The official calendar describes a multi-day series of cultural events centered on the bamboo organ. Because performances take place around a historic church instrument, arrive early, silence devices, and follow venue rules for photography and recording.',
        'verified',
        ['bamboo-organ-tpb-cultural'],
      ),
    },
  },
  'pulilan-carabao': {
    sources: [
      source(
        'pulilan-carabao-bulacan-cultural',
        'Provincial Government of Bulacan',
        'Festivals: Pulilan Carabao Festival',
        'https://bulacan.gov.ph/tourism/festivals/',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Bulacan’s provincial tourism page describes the festival as a May thanksgiving for a bountiful harvest in honor of San Isidro Labrador, the patron saint of farmers.',
        'verified',
        ['pulilan-carabao-bulacan-cultural'],
      ),
      customs: section(
        'The documented procession includes decorated carabaos and symbolic floats; the animals kneel in front of the church. Keep a respectful distance, do not touch or startle the animals, and follow handlers’ and marshals’ directions.',
        'verified',
        ['pulilan-carabao-bulacan-cultural'],
      ),
    },
  },
  'pista-y-dayat': {
    sources: [
      source(
        'pistay-dayat-dot-cultural',
        'Department of Tourism Philippines',
        'Pista’y Dayat',
        'https://www.tourism.gov.ph/explore/pista-y-dayat/',
        'dot',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism describes Pista’y Dayat in Lingayen as a “festival of the sea” and a thanksgiving for Pangasinan’s marine harvest.',
        'verified',
        ['pistay-dayat-dot-cultural'],
      ),
      customs: section(
        'The official overview lists musical competitions, trade and tourism fairs, pageants, and sports activities. Check the provincial program for the current year and follow shoreline safety notices during seaside events.',
        'verified',
        ['pistay-dayat-dot-cultural'],
      ),
    },
  },
  ibalong: {
    sources: [
      source(
        'ibalong-national-museum-cultural',
        'National Museum of the Philippines',
        'Ibalong Festival sa Bikol',
        'https://www.nationalmuseum.gov.ph/2022/08/17/ibalong-festival-sa-bikol/',
        'official-cultural-institution',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The National Museum explains that Ibalong Festival draws from the Bikol epic of the same name and commemorates regional history and culture through the stories of Baltog, Handyong, and Bantong.',
        'verified',
        ['ibalong-national-museum-cultural'],
      ),
      customs: section(
        'The epic is brought to life through colorful costumes and street-parade performances, with a Mutya ng Ibalong competition also documented. Read performances as artistic retellings of the epic rather than literal historical reenactments.',
        'verified',
        ['ibalong-national-museum-cultural'],
      ),
    },
  },
  'parada-ng-lechon': {
    sources: [
      source(
        'parada-lechon-dot-cultural',
        'Department of Tourism Philippines',
        'Parada ng Lechon',
        'https://www.tourism.gov.ph/explore/parada-ng-lechon/',
        'dot',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Department of Tourism traces Balayan’s Parada ng Lechon to a working-class thanksgiving custom honoring Saint John the Baptist.',
        'verified',
        ['parada-lechon-dot-cultural'],
      ),
      customs: section(
        'The documented centerpiece is a town parade of decorated roast pigs. It is both a food-centered public spectacle and a patronal thanksgiving, so follow the route rules and avoid obstructing religious participants for photos.',
        'verified',
        ['parada-lechon-dot-cultural'],
      ),
    },
  },
  magayon: {
    sources: [
      source(
        'magayon-tpb-cultural',
        'Tourism Promotions Board Philippines',
        'Magayon Festival',
        'https://tpb.gov.ph/events/magayon-festival/',
        'tpb',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Tourism Promotions Board explains that “magayon” means “beautiful” in Bikol and presents the festival as a celebration of Mayon, Albayano life, and thanksgiving for the land’s harvest.',
        'verified',
        ['magayon-tpb-cultural'],
      ),
      customs: section(
        'The official overview lists agricultural displays, trade fairs, cooking shows, cultural events, street parades, arts exhibits, and sports. Its page retains an old cancellation note, so use Saraya’s schedule status and current provincial announcements for actual dates.',
        'verified',
        ['magayon-tpb-cultural'],
      ),
    },
  },
  naliyagan: {
    sources: [
      source(
        'naliyagan-tpb-cultural',
        'Tourism Promotions Board Philippines',
        'Naliyagan Festival',
        'https://tpb.gov.ph/events/naliyagan-festival/',
        'tpb',
        ['history', 'customs', 'pasalubong'],
      ),
    ],
    categories: {
      history: section(
        'The Tourism Promotions Board records that Naliyagan began in 1993, coincides with Agusan del Sur’s foundation anniversary, and takes its name from a term meaning “the chosen one.”',
        'verified',
        ['naliyagan-tpb-cultural'],
      ),
      customs: section(
        'The documented program showcases Agusanon and Indigenous culture through music, dance, rituals, games, and community events. When a ritual is presented by an Indigenous community, follow the community’s directions and do not copy sacred actions or attire without invitation.',
        'verified',
        ['naliyagan-tpb-cultural'],
      ),
      pasalubong: section(
        'The official overview identifies a trade fair for provincial cottage industries. Browse the fair for locally presented goods, ask the maker about the product and its origin, and avoid treating sacred-looking designs as generic souvenirs.',
        'verified',
        ['naliyagan-tpb-cultural'],
      ),
    },
  },
  tinagba: {
    sources: [
      source(
        'tinagba-iriga-cultural',
        'City Government of Iriga',
        'Tinagba Festival',
        'https://iriga.gov.ph/tinagba-festival/',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'Iriga City describes Tinagba as a reenactment of an older first-harvest ritual in which people offered the best produce of the land.',
        'verified',
        ['tinagba-iriga-cultural'],
      ),
      customs: section(
        'The official city page documents a parade of brightly decorated bull carts accompanied by costumed participants. Keep clear of animals and moving carts, and follow handlers’ and event marshals’ instructions.',
        'verified',
        ['tinagba-iriga-cultural'],
      ),
    },
  },
  penafrancia: {
    sources: [
      source(
        'penafrancia-pia-cultural',
        'Philippine Information Agency',
        'Peñafrancia festivity: Bicolanos’ faithful odyssey with Mama Mary',
        'https://pia.gov.ph/features/penafrancia-festivity-bicolanos-faithful-odyssey-with-mama-mary/',
        'official-government',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'The Philippine Information Agency documents the festival’s long Marian devotion and records historical incidents connected with the image and the fluvial procession. Miracle accounts in that source are religious testimony and are not presented here as independently established history.',
        'partially-verified',
        ['penafrancia-pia-cultural'],
      ),
      customs: section(
        'Documented observances include the Traslacion, a novena, and a fluvial procession carrying the images of the Divino Rostro and Nuestra Señora de Peñafrancia.',
        'verified',
        ['penafrancia-pia-cultural'],
      ),
    },
  },
  'giant-lantern': {
    sources: [
      source(
        'giant-lantern-csfp-cultural',
        'City Government of San Fernando, Pampanga',
        'Giant Lantern Festival 2024 terms of reference',
        'https://cityofsanfernando.gov.ph/wp-content/uploads/2024/09/2024-08-01473.pdf',
        'lgu',
        ['history', 'customs'],
      ),
    ],
    categories: {
      history: section(
        'A City Government document records 116 years of giant-lantern making in 2024 and describes the craft as deeply rooted in Fernandino culture.',
        'verified',
        ['giant-lantern-csfp-cultural'],
      ),
      customs: section(
        'The city describes a multi-sector festival built around lantern exhibitions, competitions, and activities involving schools, community groups, public agencies, tourism workers, and businesses.',
        'verified',
        ['giant-lantern-csfp-cultural'],
      ),
    },
  },
};

const guides = festivals.map((festival) => {
  const override = overrides[festival.id] ?? { categories: {}, sources: [] };
  const defaults = defaultCategories(festival);
  return {
    festivalId: festival.id,
    lastReviewedAt: reviewedAt,
    categories: Object.fromEntries(
      Object.entries(defaults).map(([category, fallback]) => [
        category,
        override.categories[category] ?? fallback,
      ]),
    ),
    sources: override.sources,
  };
});

fs.writeFileSync(outputPath, `${JSON.stringify(guides, null, 2)}\n`, 'utf8');

const candidateText = JSON.stringify(candidates);
const statuses = guides
  .flatMap((guide) => Object.values(guide.categories))
  .reduce((counts, category) => {
    counts[category.verificationStatus] = (counts[category.verificationStatus] ?? 0) + 1;
    return counts;
  }, {});
const uniqueSources = new Map(
  guides.flatMap((guide) => guide.sources).map((item) => [item.url, item]),
);

console.log(
  JSON.stringify(
    {
      ...mapping,
      idSetsMatch: festivalIds.every((id) => candidateSet.has(id)),
      categoriesReviewed: guides.length * Object.keys(defaultCategories(festivals[0])).length,
      statuses,
      sourceBackedCategories: guides
        .flatMap((guide) => Object.values(guide.categories))
        .filter((category) => category.sourceIds.length > 0).length,
      uniqueSources: uniqueSources.size,
      sourceTypes: [...uniqueSources.values()].reduce((counts, item) => {
        counts[item.sourceType] = (counts[item.sourceType] ?? 0) + 1;
        return counts;
      }, {}),
      candidateParagraphsReplaced: candidates.length * 6,
      removedCitationMarkers: (candidateText.match(/\[cite:\s*\d+\]/gi) ?? []).length,
      remainingCitationMarkers: (JSON.stringify(guides).match(/\[cite:\s*\d+\]/gi) ?? []).length,
    },
    null,
    2,
  ),
);
