export interface GooglePlaceType {
  value: string;   // keyword enviado ao Google (en)
  label: string;   // exibição em português
  category: string;
}

export const GOOGLE_PLACE_TYPES: GooglePlaceType[] = [
  // Saúde
  { value: "doctor", label: "Médico / Clínica Médica", category: "Saúde" },
  { value: "dentist", label: "Dentista / Clínica Odontológica", category: "Saúde" },
  { value: "hospital", label: "Hospital", category: "Saúde" },
  { value: "pharmacy", label: "Farmácia", category: "Saúde" },
  { value: "physiotherapist", label: "Fisioterapia", category: "Saúde" },
  { value: "veterinary_care", label: "Veterinária / Pet Shop", category: "Saúde" },
  { value: "psychologist", label: "Psicólogo / Clínica de Psicologia", category: "Saúde" },
  { value: "spa", label: "Spa / Clínica Estética", category: "Saúde" },
  { value: "gym", label: "Academia / Gym", category: "Saúde" },
  { value: "beauty_salon", label: "Salão de Beleza", category: "Saúde" },

  // Alimentação
  { value: "restaurant", label: "Restaurante", category: "Alimentação" },
  { value: "cafe", label: "Café / Cafeteria", category: "Alimentação" },
  { value: "bakery", label: "Padaria", category: "Alimentação" },
  { value: "bar", label: "Bar", category: "Alimentação" },
  { value: "meal_delivery", label: "Delivery / Dark Kitchen", category: "Alimentação" },
  { value: "food", label: "Alimentação em geral", category: "Alimentação" },

  // Educação
  { value: "school", label: "Escola", category: "Educação" },
  { value: "university", label: "Universidade / Faculdade", category: "Educação" },
  { value: "language_school", label: "Escola de Idiomas", category: "Educação" },
  { value: "driving_school", label: "Auto Escola", category: "Educação" },

  // Jurídico & Finanças
  { value: "lawyer", label: "Advogado / Escritório de Advocacia", category: "Jurídico & Finanças" },
  { value: "accounting", label: "Contador / Escritório Contábil", category: "Jurídico & Finanças" },
  { value: "insurance_agency", label: "Seguradora / Corretora de Seguros", category: "Jurídico & Finanças" },
  { value: "bank", label: "Banco / Financeira", category: "Jurídico & Finanças" },
  { value: "real_estate_agency", label: "Imobiliária", category: "Jurídico & Finanças" },

  // Tecnologia & Serviços
  { value: "electronics_store", label: "Loja de Eletrônicos / Informática", category: "Tecnologia" },
  { value: "software_company", label: "Empresa de Software / TI", category: "Tecnologia" },
  { value: "marketing_agency", label: "Agência de Marketing / Publicidade", category: "Tecnologia" },

  // Construção & Reforma
  { value: "general_contractor", label: "Construtora / Empreiteira", category: "Construção" },
  { value: "electrician", label: "Elétrica / Eletricista", category: "Construção" },
  { value: "plumber", label: "Hidráulica / Encanador", category: "Construção" },
  { value: "painter", label: "Pintura / Pintor", category: "Construção" },
  { value: "roofing_contractor", label: "Telhado / Cobertura", category: "Construção" },
  { value: "home_goods_store", label: "Loja de Materiais de Construção", category: "Construção" },
  { value: "furniture_store", label: "Loja de Móveis", category: "Construção" },
  { value: "interior_design", label: "Design de Interiores / Arquitetura", category: "Construção" },

  // Comércio
  { value: "clothing_store", label: "Loja de Roupas / Moda", category: "Comércio" },
  { value: "shoe_store", label: "Calçados / Sapataria", category: "Comércio" },
  { value: "jewelry_store", label: "Joalheria / Bijouteria", category: "Comércio" },
  { value: "supermarket", label: "Supermercado / Mercado", category: "Comércio" },
  { value: "florist", label: "Floricultura", category: "Comércio" },
  { value: "book_store", label: "Livraria / Papelaria", category: "Comércio" },
  { value: "car_dealer", label: "Concessionária / Revendedora de Veículos", category: "Comércio" },
  { value: "car_repair", label: "Oficina Mecânica / Autopeças", category: "Comércio" },

  // Logística & Industrial
  { value: "moving_company", label: "Mudança / Transportadora", category: "Logística" },
  { value: "storage", label: "Self Storage / Guarda-Móveis", category: "Logística" },
  { value: "gas_station", label: "Posto de Combustível", category: "Logística" },

  // Hotelaria & Turismo
  { value: "lodging", label: "Hotel / Pousada", category: "Hotelaria & Turismo" },
  { value: "travel_agency", label: "Agência de Viagens / Turismo", category: "Hotelaria & Turismo" },
  { value: "tourist_attraction", label: "Atração Turística / Parque", category: "Hotelaria & Turismo" },

  // Serviços Pessoais
  { value: "laundry", label: "Lavanderia", category: "Serviços Pessoais" },
  { value: "locksmith", label: "Chaveiro", category: "Serviços Pessoais" },
  { value: "funeral_home", label: "Funerária / Cemitério", category: "Serviços Pessoais" },
  { value: "church", label: "Igreja / Templo Religioso", category: "Serviços Pessoais" },

  // Eventos & Entretenimento
  { value: "event_venue", label: "Espaço para Eventos / Buffet", category: "Eventos" },
  { value: "night_club", label: "Casa Noturna / Balada", category: "Eventos" },
  { value: "movie_theater", label: "Cinema", category: "Eventos" },
  { value: "amusement_park", label: "Parque de Diversões", category: "Eventos" },
  { value: "photography_studio", label: "Estúdio Fotográfico", category: "Eventos" },

  // Indústria & Atacado
  { value: "wholesaler", label: "Atacadista / Distribuidor", category: "Indústria" },
  { value: "manufacturer", label: "Fábrica / Indústria", category: "Indústria" },
  { value: "warehouse", label: "Armazém / Depósito", category: "Indústria" },
];
