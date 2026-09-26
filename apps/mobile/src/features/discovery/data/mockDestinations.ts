import type {
  DestinationCategory,
  DestinationDetail,
  IslandGroup,
} from '@saraya/contracts';

type DestinationSeed = {
  id: string;
  name: string;
  province: string;
  region: string;
  islandGroup: IslandGroup;
  category: DestinationCategory;
  rating: number;
  summary: string;
  thumbnailImageUrl?: string;
  heroTone: DestinationDetail['heroTone'];
  tags: string[];
  coordinates: [number, number];
  highlights: string[];
  phrase: string;
};

const seeds: DestinationSeed[] = [
  {
    id: 'batanes', name: 'Batanes', province: 'Batanes', region: 'Cagayan Valley', islandGroup: 'Luzon', category: 'Nature', rating: 4.9,
    thumbnailImageUrl: 'https://wcormjwfrsyqxhoswpza.supabase.co/storage/v1/object/public/destination-images/batanes.webp',
    summary: 'Wind-shaped hills, stone houses, and quiet coastal roads.', heroTone: 'forest', tags: ['Coastlines', 'Culture', 'Slow travel'], coordinates: [20.4485, 121.9708], highlights: ['Rolling hills', 'Ivatan stone houses', 'Coastal viewpoints'], phrase: 'Dios mamajes — thank you.',
  },
  {
    id: 'banaue', name: 'Banaue', province: 'Ifugao', region: 'Cordillera', islandGroup: 'Luzon', category: 'Heritage', rating: 4.8,
    summary: 'Mountain communities framed by generations-old rice terraces.', heroTone: 'forest', tags: ['Heritage', 'Hiking', 'Community'], coordinates: [16.921, 121.0558], highlights: ['Rice terraces', 'Village walks', 'Mountain viewpoints'], phrase: 'Mabbalat — thank you.',
  },
  {
    id: 'vigan', name: 'Vigan', province: 'Ilocos Sur', region: 'Ilocos Region', islandGroup: 'Luzon', category: 'Heritage', rating: 4.7,
    summary: 'Cobblestone streets, ancestral houses, and Ilocano flavors.', heroTone: 'gold', tags: ['Architecture', 'Food', 'History'], coordinates: [17.5747, 120.3869], highlights: ['Calle Crisologo', 'Heritage museums', 'Local food walk'], phrase: 'Agyamanak — thank you.',
  },
  {
    id: 'mayon', name: 'Albay', province: 'Albay', region: 'Bicol Region', islandGroup: 'Luzon', category: 'Mountain', rating: 4.8,
    summary: 'Volcanic landscapes, Bicolano cuisine, and countryside adventures.', heroTone: 'sunset', tags: ['Volcano', 'Food', 'Adventure'], coordinates: [13.2548, 123.6861], highlights: ['Mayon viewpoints', 'Bicolano dishes', 'Countryside trails'], phrase: 'Dios mabalos — thank you.',
  },
  {
    id: 'el-nido', name: 'El Nido', province: 'Palawan', region: 'Mimaropa', islandGroup: 'Luzon', category: 'Beach', rating: 4.9,
    summary: 'Limestone lagoons, island coves, and clear-water paddling.', heroTone: 'lagoon', tags: ['Beaches', 'Islands', 'Kayaking'], coordinates: [11.1956, 119.4075], highlights: ['Lagoon routes', 'Island picnics', 'Sunset viewpoints'], phrase: 'Salamat — thank you.',
  },
  {
    id: 'sagada', name: 'Sagada', province: 'Mountain Province', region: 'Cordillera', islandGroup: 'Luzon', category: 'Mountain', rating: 4.7,
    summary: 'Pine trails, caves, and cool highland mornings.', heroTone: 'violet', tags: ['Hiking', 'Culture', 'Nature'], coordinates: [17.0833, 120.9], highlights: ['Mountain trails', 'Cave routes', 'Community-led tours'], phrase: 'Iyaman — thank you.',
  },
  {
    id: 'south-cebu', name: 'South Cebu', province: 'Cebu', region: 'Central Visayas', islandGroup: 'Visayas', category: 'Nature', rating: 4.8,
    summary: 'Waterfalls, coastal towns, and a route rich in local flavor.', heroTone: 'sky', tags: ['Waterfalls', 'Food', 'Coastlines'], coordinates: [9.819, 123.38], highlights: ['Kawasan Falls', 'Badian food stops', 'Moalboal coast'], phrase: 'Daghang salamat — thank you very much.',
  },
  {
    id: 'bohol', name: 'Bohol', province: 'Bohol', region: 'Central Visayas', islandGroup: 'Visayas', category: 'Nature', rating: 4.8,
    summary: 'Chocolate-colored hills, river landscapes, and island beaches.', heroTone: 'gold', tags: ['Nature', 'Wildlife', 'Beaches'], coordinates: [9.85, 124.1435], highlights: ['Chocolate Hills', 'Loboc countryside', 'Panglao coast'], phrase: 'Daghang salamat — thank you very much.',
  },
  {
    id: 'boracay', name: 'Boracay', province: 'Aklan', region: 'Western Visayas', islandGroup: 'Visayas', category: 'Beach', rating: 4.7,
    summary: 'Powdery shores, water activities, and glowing sunsets.', heroTone: 'sunset', tags: ['Beaches', 'Sunsets', 'Water sports'], coordinates: [11.9674, 121.9248], highlights: ['White Beach', 'Sailing', 'Island viewpoints'], phrase: 'Salamat gid — thank you very much.',
  },
  {
    id: 'siquijor', name: 'Siquijor', province: 'Siquijor', region: 'Central Visayas', islandGroup: 'Visayas', category: 'Nature', rating: 4.8,
    summary: 'Waterfalls, heritage towns, and an easy-going island loop.', heroTone: 'lagoon', tags: ['Waterfalls', 'Island loop', 'Heritage'], coordinates: [9.1999, 123.5952], highlights: ['Cambugahay Falls', 'Coastal roads', 'Heritage churches'], phrase: 'Daghang salamat — thank you very much.',
  },
  {
    id: 'iloilo', name: 'Iloilo City', province: 'Iloilo', region: 'Western Visayas', islandGroup: 'Visayas', category: 'Food', rating: 4.7,
    summary: 'Heritage streets, riverfront walks, and beloved Ilonggo dishes.', heroTone: 'gold', tags: ['Food', 'Architecture', 'Culture'], coordinates: [10.7202, 122.5621], highlights: ['Heritage district', 'La Paz food stops', 'River esplanade'], phrase: 'Salamat gid — thank you very much.',
  },
  {
    id: 'samar', name: 'Samar', province: 'Samar', region: 'Eastern Visayas', islandGroup: 'Visayas', category: 'Nature', rating: 4.6,
    summary: 'Caves, rivers, rock formations, and uncrowded landscapes.', heroTone: 'forest', tags: ['Caves', 'Rivers', 'Adventure'], coordinates: [11.5795, 125.0126], highlights: ['Cave systems', 'River trips', 'Coastal rock formations'], phrase: 'Damo nga salamat — many thanks.',
  },
  {
    id: 'siargao', name: 'Siargao', province: 'Surigao del Norte', region: 'Caraga', islandGroup: 'Mindanao', category: 'Beach', rating: 4.9,
    summary: 'Surf breaks, mangrove roads, and island-hopping days.', heroTone: 'lagoon', tags: ['Surfing', 'Islands', 'Food'], coordinates: [9.8482, 126.0458], highlights: ['Surf coast', 'Island hopping', 'Mangrove viewpoints'], phrase: 'Salamat karajaw — thank you very much.',
  },
  {
    id: 'camiguin', name: 'Camiguin', province: 'Camiguin', region: 'Northern Mindanao', islandGroup: 'Mindanao', category: 'Nature', rating: 4.8,
    summary: 'Volcanoes, springs, waterfalls, and a compact island circuit.', heroTone: 'forest', tags: ['Volcanoes', 'Springs', 'Island loop'], coordinates: [9.1732, 124.7299], highlights: ['Hot and cold springs', 'Waterfall trails', 'Island viewpoints'], phrase: 'Daghang salamat — thank you very much.',
  },
  {
    id: 'davao', name: 'Davao City', province: 'Davao del Sur', region: 'Davao Region', islandGroup: 'Mindanao', category: 'Food', rating: 4.7,
    summary: 'Urban comforts, fruit markets, and gateways to highland nature.', heroTone: 'sunset', tags: ['Food', 'City', 'Nature'], coordinates: [7.1907, 125.4553], highlights: ['Local markets', 'Museum visits', 'Highland day trips'], phrase: 'Daghang salamat — thank you very much.',
  },
  {
    id: 'bukidnon', name: 'Bukidnon', province: 'Bukidnon', region: 'Northern Mindanao', islandGroup: 'Mindanao', category: 'Mountain', rating: 4.8,
    summary: 'Highland farms, mountain trails, and wide-open ridgelines.', heroTone: 'forest', tags: ['Mountains', 'Farms', 'Adventure'], coordinates: [8.0515, 124.923], highlights: ['Highland viewpoints', 'Farm visits', 'Mountain trails'], phrase: 'Daghang salamat — thank you very much.',
  },
  {
    id: 'lake-sebu', name: 'Lake Sebu', province: 'South Cotabato', region: 'Soccsksargen', islandGroup: 'Mindanao', category: 'Culture', rating: 4.8,
    summary: 'Lakeside scenery, T’boli artistry, and waterfall adventures.', heroTone: 'violet', tags: ['Culture', 'Waterfalls', 'Community'], coordinates: [6.221, 124.69], highlights: ['T’boli cultural experiences', 'Lake views', 'Waterfall routes'], phrase: 'Salamat — thank you.',
  },
  {
    id: 'zamboanga', name: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Zamboanga Peninsula', islandGroup: 'Mindanao', category: 'Culture', rating: 4.7,
    summary: 'Colorful heritage, coastal cuisine, and vivid island shores.', heroTone: 'violet', tags: ['Culture', 'Food', 'Beaches'], coordinates: [6.9214, 122.079], highlights: ['Heritage walks', 'Local cuisine', 'Island day trips'], phrase: 'Muchas gracias — thank you very much.',
  },
];

export const mockDestinations: DestinationDetail[] = seeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  province: seed.province,
  region: seed.region,
  islandGroup: seed.islandGroup,
  category: seed.category,
  rating: seed.rating,
  summary: seed.summary,
  thumbnailImageUrl: seed.thumbnailImageUrl,
  heroTone: seed.heroTone,
  tags: seed.tags,
  coordinates: { latitude: seed.coordinates[0], longitude: seed.coordinates[1] },
  description: `${seed.summary} Saraya combines considerate pacing, practical routing, and local context so travelers can explore with confidence.`,
  highlights: seed.highlights,
  bestFor: seed.tags,
  culturalGuide: {
    historicalContext: `Travel here is shaped by the people, landscapes, and living traditions of ${seed.region}. Choose community-led experiences and follow local guidance.`,
    etiquette: [
      'Ask before photographing people, homes, or ceremonies.',
      'Use accredited local guides where required.',
      'Carry out waste and respect protected areas.',
    ],
    localPhrase: seed.phrase,
  },
}));
