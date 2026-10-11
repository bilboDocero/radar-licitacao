export interface FaqCategory {
  label: string;
  content: string;
}
export const faq: FaqCategory[] = [
  {
    label: 'Como funciona o Radar?',
    content:
      'Você cadastra sua empresa e cria perfis comerciais com palavras-chave e área de atuação. O Radar cruza os perfis com o catálogo coletado e explica as correspondências. A participação na licitação é feita no portal oficial.',
  },
  {
    label: 'Quais fontes de licitações são consultadas?',
    content:
      'O escopo inicial é a API oficial do PNCP, para pregão eletrônico e dispensa. A janela começa na primeira execução da coleta. Novos portais dependem de homologação; o catálogo não representa todas as licitações brasileiras.',
  },
  {
    label: 'Como funciona a cobertura geográfica?',
    content:
      'Você escolhe municípios, estados ou abrangência nacional, dentro dos limites do plano. A localização do órgão é uma referência quando o local de execução não está disponível. Confirme o local no edital.',
  },
  {
    label: 'O que são perfis comerciais?',
    content:
      'São conjuntos de interesses do fornecedor. O matching inicial usa palavras-chave, categorias quando disponíveis, região, situação e prazo. Não há inteligência artificial tomando decisões de participação.',
  },
  {
    label: 'Como recebo alertas e atualizações?',
    content:
      'As notificações ficam na plataforma. Quando uma oportunidade compatível é identificada ou atualizada, o Radar registra um aviso. Resumos por e-mail e outros canais ainda não estão habilitados. Não há promessa de tempo real.',
  },
  {
    label: 'Como funcionam assinaturas e pagamentos?',
    content:
      'A instalação oferece 14 dias de avaliação no plano Nacional. Os limites são configurados por plano. Cobranças, contratação e renovação pagas dependem da integração com um provedor de pagamento, ainda não configurado.',
  },
  {
    label: 'Posso sugerir novos portais?',
    content:
      'Sim. Na área Fontes monitoradas, informe o endereço oficial e explique sua relevância. As sugestões passam por revisão técnica e de segurança antes de qualquer coleta.',
  },
  {
    label: 'Como meus dados são protegidos?',
    content:
      'O acesso exige autenticação. A API verifica sua associação à empresa em cada recurso privado. Um vínculo comercial com um parceiro não permite que ele veja seus perfis ou favoritos.',
  },
  {
    label: 'Como cancelar ou obter suporte?',
    content:
      'Não há cobrança automática nesta instalação. O canal público de atendimento e o cancelamento comercial serão configurados antes da operação paga. Consulte a página Contato para o estado atual.',
  },
];
export const publicContent: Record<
  string,
  { title: string; description: string; paragraphs: string[] }
> = {
  funcionalidades: {
    title: 'Informação pública, organizada para o seu negócio.',
    description: 'Do perfil comercial ao acompanhamento de oportunidades.',
    paragraphs: [
      'Crie perfis com palavras-chave e cobertura geográfica. Pesquise o catálogo compartilhado, consulte a origem oficial e salve licitações para sua empresa.',
      'O matching determinístico explica a correspondência e considera o prazo de proposta. Os alertas dentro da plataforma reúnem novas oportunidades e alterações identificadas na coleta.',
      'Parceiros podem convidar empresas e acompanhar seu vínculo comercial. A administração acompanha fontes, execuções de coleta e registros de auditoria. Análise de PDFs, OCR, IA, white label e cobrança não estão disponíveis nesta versão.',
    ],
  },
  contato: {
    title: 'Vamos conversar.',
    description: 'Um canal de atendimento claro, antes da operação comercial.',
    paragraphs: [
      'O canal público de atendimento ainda não está configurado nesta instalação de desenvolvimento. Não há formulário que armazene ou envie mensagens de contato.',
      'Se você participa da avaliação local, entre em contato diretamente com o responsável pela instalação. Para dúvidas de uso, a página de perguntas frequentes reúne as orientações disponíveis.',
    ],
  },
  'termos-de-uso': {
    title: 'Termos de uso',
    description:
      'Minuta informativa da instalação de desenvolvimento. Versão comercial pendente de revisão.',
    paragraphs: [
      'O Radar organiza informações de compras públicas e facilita sua pesquisa. O conteúdo oficial, seus prazos e condições devem ser confirmados no portal de origem. A ferramenta não garante resultados em licitações.',
      'Esta instalação é destinada à avaliação do MVP, sem cobrança ou contratação comercial. A área de cobertura contratável, quando habilitada, será distinta da cobertura efetiva das fontes.',
      'A identificação da empresa operadora, condições contratuais, canais de suporte e regras de contratação serão publicados antes da disponibilização comercial. Esta página não representa termos comerciais finalizados.',
    ],
  },
  privacidade: {
    title: 'Privacidade e seus dados',
    description: 'Transparência sobre esta instalação de desenvolvimento.',
    paragraphs: [
      'O sistema armazena sua identidade de acesso, vínculo com empresas, perfis comerciais, favoritos, notificações e registros de auditoria. O serviço de identidade gerencia credenciais e recuperação de acesso.',
      'Dados de licitações são compartilhados no catálogo público da plataforma. Perfis e favoritos são privados à organização. Vínculos com parceiros são comerciais e não autorizam acesso a esses dados.',
      'Os dados permanecem nos serviços configurados pelo responsável pela instalação. A identificação do controlador, canal de direitos, base legal e política de retenção precisam ser definidos e revisados antes da operação comercial.',
    ],
  },
};
