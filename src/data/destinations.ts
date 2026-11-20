export interface Destination {
  id: string;
  name: string;
  locality:
    | 'Suba'
    | 'Engativá'
    | 'Bosa'
    | 'San Cristóbal'
    | 'La Candelaria';
  category: string;
  latitude: number;
  longitude: number;
  description: string;
  sustainabilityNote: string;
}

export const DESTINATIONS: Destination[] = [
  {
    id: '1',
    name: 'Humedal de Córdoba / Cerro La Conejera',
    locality: 'Suba',
    category: 'Ecoturismo',
    latitude: 4.705,
    longitude: -74.073,
    description:
      'Espacios naturales clave para el avistamiento de aves y la educación ambiental en el noroccidente de Bogotá.',
    sustainabilityNote:
      'Requiere recorridos guiados, respeto por senderos y cero residuos para proteger la fauna local.',
  },
  {
    id: '2',
    name: 'Jardín Botánico de Bogotá',
    locality: 'Engativá',
    category: 'Naturaleza y Ciencia',
    latitude: 4.668,
    longitude: -74.101,
    description:
      'Colección de flora de distintos ecosistemas colombianos con senderos, invernaderos y recorridos formativos.',
    sustainabilityNote:
      'Promueve la conservación de especies nativas y la cultura ambiental urbana.',
  },
  {
    id: '3',
    name: 'Humedal Tibanica',
    locality: 'Bosa',
    category: 'Ecoturismo',
    latitude: 4.597,
    longitude: -74.198,
    description:
      'Espejo de agua y ecosistema de humedal con alto valor comunitario y ambiental en el sur de la ciudad.',
    sustainabilityNote:
      'Apoya procesos comunitarios de cuidado ambiental y valoración del territorio.',
  },
  {
    id: '4',
    name: 'Parque Entre Nubes',
    locality: 'San Cristóbal',
    category: 'Senderismo Sostenible',
    latitude: 4.539,
    longitude: -74.084,
    description:
      'Parque ecológico distrital de montaña con miradores hacia Bogotá y rutas de caminata.',
    sustainabilityNote:
      'Ideal para caminar sin dejar huella y fortalecer el turismo comunitario en los cerros del sur.',
  },
  {
    id: '5',
    name: 'Chorro de Quevedo y Calles Históricas',
    locality: 'La Candelaria',
    category: 'Patrimonio y Cultura',
    latitude: 4.5975,
    longitude: -74.0706,
    description:
      'Sector emblemático del centro histórico con plazas, callejones, arte urbano y tradición cultural.',
    sustainabilityNote:
      'Prefiere recorridos a pie, compra local responsable y respeto por el patrimonio arquitectónico.',
  },
  {
    id: '6',
    name: 'Humedal de Juan Amarillo (Tibabuyes)',
    locality: 'Suba',
    category: 'Ecoturismo',
    latitude: 4.733,
    longitude: -74.104,
    description:
      'Uno de los humedales más extensos de la sabana, ideal para observación de aves y caminatas ecológicas.',
    sustainabilityNote:
      'Mantente en senderos autorizados y evita ruidos fuertes que alteren las aves residentes y migratorias.',
  },
  {
    id: '7',
    name: 'Humedal Santa María del Lago',
    locality: 'Engativá',
    category: 'Ecoturismo',
    latitude: 4.692,
    longitude: -74.095,
    description:
      'Reserva ambiental urbana rodeada de arborización, perfecta para pausas tranquilas y educación ambiental.',
    sustainabilityNote:
      'No alimentes la fauna ni arrojes restos de comida o envolturas en las zonas verdes.',
  },
  {
    id: '8',
    name: 'Plaza Fundacional de Bosa',
    locality: 'Bosa',
    category: 'Cultura y Memoria',
    latitude: 4.6177,
    longitude: -74.1825,
    description:
      'Espacio tradicional donde converge la historia indígena muisca, la iglesia colonial y la vida barrial.',
    sustainabilityNote:
      'Valora las iniciativas culturales y gastronómicas del territorio con un trato respetuoso.',
  },
  {
    id: '9',
    name: 'Parque San Cristóbal y Miradores del Sur',
    locality: 'San Cristóbal',
    category: 'Paisaje y Comunidad',
    latitude: 4.568,
    longitude: -74.083,
    description:
      'Entorno urbano y de ladera con conexión comunitaria y vistas amplias hacia el suroriente bogotano.',
    sustainabilityNote:
      'Apoya comercios cercanos de escala local y lleva siempre tu propia botella reutilizable.',
  },
  {
    id: '10',
    name: 'Eje Ambiental y Entorno Cultural del Centro',
    locality: 'La Candelaria',
    category: 'Espacio Público Sostenible',
    latitude: 4.596,
    longitude: -74.074,
    description:
      'Corredor peatonal y cultural que conecta espacios históricos, museos y zonas de encuentro ciudadano.',
    sustainabilityNote:
      'Muévete caminando o en transporte público y cuida el mobiliario urbano y zonas ajardinadas.',
  },
];