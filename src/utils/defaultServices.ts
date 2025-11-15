// Serviços padrão por tipo de comércio
export const getDefaultServices = (tipoComercio: string) => {
  const servicesMap: Record<string, Array<{ nome: string; descricao: string; duracao: number; preco: number }>> = {
    barbearia: [
      { nome: "Corte de Cabelo", descricao: "Corte masculino tradicional", duracao: 30, preco: 40 },
      { nome: "Barba", descricao: "Aparar e modelar a barba", duracao: 20, preco: 25 },
      { nome: "Corte + Barba", descricao: "Combo completo", duracao: 45, preco: 60 },
      { nome: "Sobrancelha", descricao: "Design de sobrancelha", duracao: 15, preco: 15 }
    ],
    salao: [
      { nome: "Corte Feminino", descricao: "Corte e finalização", duracao: 60, preco: 80 },
      { nome: "Escova", descricao: "Escova modeladora", duracao: 45, preco: 50 },
      { nome: "Hidratação", descricao: "Tratamento capilar", duracao: 60, preco: 70 },
      { nome: "Manicure", descricao: "Cuidados com as unhas", duracao: 45, preco: 35 },
      { nome: "Pedicure", descricao: "Cuidados com os pés", duracao: 45, preco: 40 }
    ],
    tatuagem: [
      { nome: "Tatuagem Pequena", descricao: "Até 5cm", duracao: 60, preco: 200 },
      { nome: "Tatuagem Média", descricao: "Entre 5cm e 15cm", duracao: 120, preco: 400 },
      { nome: "Tatuagem Grande", descricao: "Acima de 15cm", duracao: 240, preco: 800 },
      { nome: "Retoque", descricao: "Retoques e correções", duracao: 60, preco: 150 }
    ],
    spa: [
      { nome: "Massagem Relaxante", descricao: "Massagem corporal completa", duracao: 60, preco: 150 },
      { nome: "Drenagem Linfática", descricao: "Drenagem corporal", duracao: 60, preco: 120 },
      { nome: "Reflexologia", descricao: "Massagem nos pés", duracao: 45, preco: 80 },
      { nome: "Day Spa", descricao: "Pacote completo de relaxamento", duracao: 180, preco: 350 }
    ],
    estetica: [
      { nome: "Limpeza de Pele", descricao: "Limpeza facial profunda", duracao: 60, preco: 120 },
      { nome: "Depilação a Laser", descricao: "Sessão de depilação", duracao: 30, preco: 200 },
      { nome: "Peeling", descricao: "Renovação celular", duracao: 45, preco: 180 },
      { nome: "Harmonização Facial", descricao: "Procedimento estético", duracao: 90, preco: 800 }
    ],
    consultorio: [
      { nome: "Consulta Inicial", descricao: "Primeira consulta e avaliação", duracao: 60, preco: 200 },
      { nome: "Consulta de Retorno", descricao: "Acompanhamento", duracao: 45, preco: 150 },
      { nome: "Sessão de Terapia", descricao: "Sessão individual", duracao: 50, preco: 180 },
      { nome: "Avaliação Completa", descricao: "Avaliação detalhada", duracao: 90, preco: 300 }
    ],
    personal: [
      { nome: "Avaliação Física", descricao: "Avaliação inicial completa", duracao: 60, preco: 100 },
      { nome: "Treino Individual", descricao: "Sessão de treino personalizado", duracao: 60, preco: 120 },
      { nome: "Treino em Dupla", descricao: "Sessão para duas pessoas", duracao: 60, preco: 180 },
      { nome: "Pacote Mensal", descricao: "8 sessões no mês", duracao: 60, preco: 800 }
    ],
    oficina: [
      { nome: "Revisão Básica", descricao: "Revisão preventiva", duracao: 120, preco: 200 },
      { nome: "Troca de Óleo", descricao: "Troca de óleo e filtro", duracao: 30, preco: 120 },
      { nome: "Alinhamento", descricao: "Alinhamento e balanceamento", duracao: 60, preco: 150 },
      { nome: "Diagnóstico", descricao: "Diagnóstico computadorizado", duracao: 45, preco: 100 }
    ],
    outro: [
      { nome: "Serviço Padrão", descricao: "Serviço básico", duracao: 60, preco: 100 },
      { nome: "Serviço Premium", descricao: "Serviço completo", duracao: 90, preco: 200 }
    ]
  };

  return servicesMap[tipoComercio] || servicesMap.outro;
};

// Textos customizados por tipo de comércio
export const getCustomTexts = (tipoComercio: string) => {
  const textsMap: Record<string, { titulo: string; subtitulo: string; ctaButton: string }> = {
    barbearia: {
      titulo: "Agende seu corte",
      subtitulo: "Escolha o profissional e horário ideal para você",
      ctaButton: "Agendar Horário"
    },
    salao: {
      titulo: "Agende seu atendimento",
      subtitulo: "Beleza e cuidados especiais para você",
      ctaButton: "Fazer Agendamento"
    },
    tatuagem: {
      titulo: "Agende sua sessão",
      subtitulo: "Transforme sua arte em realidade",
      ctaButton: "Agendar Sessão"
    },
    spa: {
      titulo: "Reserve seu momento",
      subtitulo: "Relaxamento e bem-estar te esperam",
      ctaButton: "Reservar Horário"
    },
    estetica: {
      titulo: "Agende seu procedimento",
      subtitulo: "Cuidados estéticos com profissionais qualificados",
      ctaButton: "Agendar Consulta"
    },
    consultorio: {
      titulo: "Agende sua consulta",
      subtitulo: "Atendimento profissional e personalizado",
      ctaButton: "Marcar Consulta"
    },
    personal: {
      titulo: "Agende seu treino",
      subtitulo: "Resultados através de treinos personalizados",
      ctaButton: "Agendar Treino"
    },
    oficina: {
      titulo: "Agende seu serviço",
      subtitulo: "Qualidade e confiança para seu veículo",
      ctaButton: "Agendar Serviço"
    },
    outro: {
      titulo: "Agende seu atendimento",
      subtitulo: "Escolha o melhor horário para você",
      ctaButton: "Fazer Agendamento"
    }
  };

  return textsMap[tipoComercio] || textsMap.outro;
};
