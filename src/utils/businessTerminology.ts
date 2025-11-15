export type BusinessType = 
  | 'barbearia' 
  | 'salao' 
  | 'tatuagem' 
  | 'spa' 
  | 'estetica' 
  | 'consultorio' 
  | 'personal' 
  | 'oficina' 
  | 'outro';

interface BusinessTerminology {
  professional: string;
  professionals: string;
  service: string;
  services: string;
  appointment: string;
  appointments: string;
  client: string;
  clients: string;
  business: string;
  schedule: string;
  publicPageTitle: string;
  publicPageDescription: string;
  dashboardTitle: string;
  selectProfessional: string;
  selectService: string;
  noProfessionalsFound: string;
  noServicesFound: string;
  noAppointmentsFound: string;
}

const terminologyMap: Record<BusinessType, BusinessTerminology> = {
  barbearia: {
    professional: 'Barbeiro',
    professionals: 'Barbeiros',
    service: 'Serviço',
    services: 'Serviços',
    appointment: 'Agendamento',
    appointments: 'Agendamentos',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Barbearia',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu horário',
    publicPageDescription: 'Escolha o barbeiro, serviço e horário ideal',
    dashboardTitle: 'Painel da Barbearia',
    selectProfessional: 'Selecione o barbeiro',
    selectService: 'Selecione o serviço',
    noProfessionalsFound: 'Nenhum barbeiro encontrado',
    noServicesFound: 'Nenhum serviço disponível',
    noAppointmentsFound: 'Nenhum agendamento encontrado'
  },
  salao: {
    professional: 'Profissional',
    professionals: 'Profissionais',
    service: 'Serviço',
    services: 'Serviços',
    appointment: 'Agendamento',
    appointments: 'Agendamentos',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Salão',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu horário no salão',
    publicPageDescription: 'Escolha o profissional, serviço e horário ideal',
    dashboardTitle: 'Painel do Salão',
    selectProfessional: 'Selecione o profissional',
    selectService: 'Selecione o serviço',
    noProfessionalsFound: 'Nenhum profissional encontrado',
    noServicesFound: 'Nenhum serviço disponível',
    noAppointmentsFound: 'Nenhum agendamento encontrado'
  },
  tatuagem: {
    professional: 'Tatuador',
    professionals: 'Tatuadores',
    service: 'Serviço',
    services: 'Serviços',
    appointment: 'Sessão',
    appointments: 'Sessões',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Estúdio',
    schedule: 'Agenda',
    publicPageTitle: 'Agende sua sessão',
    publicPageDescription: 'Escolha o tatuador, serviço e horário ideal',
    dashboardTitle: 'Painel do Estúdio',
    selectProfessional: 'Selecione o tatuador',
    selectService: 'Selecione o serviço',
    noProfessionalsFound: 'Nenhum tatuador encontrado',
    noServicesFound: 'Nenhum serviço disponível',
    noAppointmentsFound: 'Nenhuma sessão encontrada'
  },
  spa: {
    professional: 'Terapeuta',
    professionals: 'Terapeutas',
    service: 'Tratamento',
    services: 'Tratamentos',
    appointment: 'Sessão',
    appointments: 'Sessões',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Spa',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu tratamento',
    publicPageDescription: 'Escolha o terapeuta, tratamento e horário ideal',
    dashboardTitle: 'Painel do Spa',
    selectProfessional: 'Selecione o terapeuta',
    selectService: 'Selecione o tratamento',
    noProfessionalsFound: 'Nenhum terapeuta encontrado',
    noServicesFound: 'Nenhum tratamento disponível',
    noAppointmentsFound: 'Nenhuma sessão encontrada'
  },
  estetica: {
    professional: 'Esteticista',
    professionals: 'Esteticistas',
    service: 'Procedimento',
    services: 'Procedimentos',
    appointment: 'Consulta',
    appointments: 'Consultas',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Clínica',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu procedimento',
    publicPageDescription: 'Escolha o esteticista, procedimento e horário ideal',
    dashboardTitle: 'Painel da Clínica',
    selectProfessional: 'Selecione o esteticista',
    selectService: 'Selecione o procedimento',
    noProfessionalsFound: 'Nenhum esteticista encontrado',
    noServicesFound: 'Nenhum procedimento disponível',
    noAppointmentsFound: 'Nenhuma consulta encontrada'
  },
  consultorio: {
    professional: 'Profissional',
    professionals: 'Profissionais',
    service: 'Consulta',
    services: 'Consultas',
    appointment: 'Atendimento',
    appointments: 'Atendimentos',
    client: 'Paciente',
    clients: 'Pacientes',
    business: 'Consultório',
    schedule: 'Agenda',
    publicPageTitle: 'Agende sua consulta',
    publicPageDescription: 'Escolha o profissional, tipo de consulta e horário ideal',
    dashboardTitle: 'Painel do Consultório',
    selectProfessional: 'Selecione o profissional',
    selectService: 'Selecione o tipo de consulta',
    noProfessionalsFound: 'Nenhum profissional encontrado',
    noServicesFound: 'Nenhum tipo de consulta disponível',
    noAppointmentsFound: 'Nenhum atendimento encontrado'
  },
  personal: {
    professional: 'Personal',
    professionals: 'Personals',
    service: 'Treino',
    services: 'Treinos',
    appointment: 'Sessão',
    appointments: 'Sessões',
    client: 'Aluno',
    clients: 'Alunos',
    business: 'Academia',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu treino',
    publicPageDescription: 'Escolha o personal, tipo de treino e horário ideal',
    dashboardTitle: 'Painel de Treinos',
    selectProfessional: 'Selecione o personal',
    selectService: 'Selecione o treino',
    noProfessionalsFound: 'Nenhum personal encontrado',
    noServicesFound: 'Nenhum treino disponível',
    noAppointmentsFound: 'Nenhuma sessão encontrada'
  },
  oficina: {
    professional: 'Especialista',
    professionals: 'Especialistas',
    service: 'Serviço',
    services: 'Serviços',
    appointment: 'Atendimento',
    appointments: 'Atendimentos',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Oficina',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu serviço',
    publicPageDescription: 'Escolha o especialista, serviço e horário ideal',
    dashboardTitle: 'Painel da Oficina',
    selectProfessional: 'Selecione o especialista',
    selectService: 'Selecione o serviço',
    noProfessionalsFound: 'Nenhum especialista encontrado',
    noServicesFound: 'Nenhum serviço disponível',
    noAppointmentsFound: 'Nenhum atendimento encontrado'
  },
  outro: {
    professional: 'Profissional',
    professionals: 'Profissionais',
    service: 'Serviço',
    services: 'Serviços',
    appointment: 'Agendamento',
    appointments: 'Agendamentos',
    client: 'Cliente',
    clients: 'Clientes',
    business: 'Negócio',
    schedule: 'Agenda',
    publicPageTitle: 'Agende seu horário',
    publicPageDescription: 'Escolha o profissional, serviço e horário ideal',
    dashboardTitle: 'Painel do Negócio',
    selectProfessional: 'Selecione o profissional',
    selectService: 'Selecione o serviço',
    noProfessionalsFound: 'Nenhum profissional encontrado',
    noServicesFound: 'Nenhum serviço disponível',
    noAppointmentsFound: 'Nenhum agendamento encontrado'
  }
};

export const getBusinessTerminology = (businessType: string = 'barbearia'): BusinessTerminology => {
  return terminologyMap[businessType as BusinessType] || terminologyMap.barbearia;
};
