const ATTRS = [
  { key: 'FOR', name: 'Força', desc: 'poder físico bruto, dano corpo-a-corpo' },
  { key: 'AGI', name: 'Agilidade', desc: 'velocidade, reflexos, Defesa (10 + Agilidade × 2)' },
  { key: 'VIG', name: 'Vigor', desc: 'resistência física, contribui para PV e carga' },
  { key: 'INT', name: 'Intelecto', desc: 'raciocínio, perceção amaldiçoada, contribui para PA' },
  { key: 'PRE', name: 'Presença', desc: 'força de vontade, carisma, contribui para Coesão' },
];

const PERICIAS = [
  ['Acrobacia', 'AGI'], ['Adestramento', 'PRE'], ['Artes', 'PRE'], ['Atletismo', 'FOR'],
  ['Atualidades', 'INT'], ['Conhecimento Oculto', 'INT'], ['Crime', 'AGI'], ['Diplomacia', 'PRE'],
  ['Enganação', 'PRE'], ['Exorcismo', 'INT'], ['Fervor', 'PRE'], ['Fortitude', 'VIG'],
  ['Furtividade', 'AGI'], ['Intimidação', 'PRE'], ['Intuição', 'PRE'], ['Investigação', 'INT'],
  ['Luta', 'FOR'], ['Medicina', 'INT'], ['Percepção de Amaldiçoamento', 'INT'], ['Pilotagem', 'AGI'],
  ['Pontaria', 'AGI'], ['Profissão', 'INT'], ['Reflexos', 'AGI'], ['Religião', 'PRE'],
  ['Sobrevivência', 'INT'], ['Tática', 'INT'], ['Tecnologia', 'INT'], ['Vontade', 'PRE'],
].map(([name, attr]) => ({ name, attr }));


const LIMITE_PA_G4 = 4;

const GRAUS = ['Grau 4', 'Grau 3', 'Semi-Grau 2', 'Grau 2', 'Semi-Grau 1', 'Grau 1', 'Grau Especial'];
const LIMITE_PA = [4, 7, 10, 13, 16, 19, 22];
const ARMA_NIVEL_MAX = [1, 2, 2, 3, 3, 4, 5];            
const CORPO_ARMA = ['+1d4', '+1d6', '+1d6', '+1d8', '+1d8', '+1d10', '+1d12'];
const REGEN_MALDICAO = ['1d4', '1d6', '1d8', '2d6', '2d8', '3d8', '4d8'];
const GRAU_FULL = [false, true, false, true, false, true, true]; 
const ESTILO_DESBLOQUEIO = [1, 3, 5, 6];                  
const ATTR_PROG_MAX = 6;                                  

const TECNICAS_AMALDICOADAS = [
  { nome: 'Reforço de Energia Amaldiçoada (Embuir)', grau: 0, custo: '1 PA · manter: 2 PA/rodada', texto: 'O próximo ataque corpo-a-corpo (ou arma/objeto embuído) conta como energia amaldiçoada. Manter consome a Ação de Movimento.' },
  { nome: 'Saída Máxima', grau: 0, custo: 'todo o PA · 1x/cena', texto: 'All-in numa variante conhecida; ignora o Limite de PA. Multiplicador = PA investido ÷ custo normal (teto x4).' },
  { nome: 'Técnica de Barreira (genérica)', grau: 1, custo: '3 PA', texto: 'Barreira pequena que bloqueia passagem física ou visão, até 2 rodadas.' },
  { nome: 'Black Flash', grau: 1, custo: 'sem custo extra', texto: 'Ataque corpo-a-corpo com Reforço: 1d20 à parte, 20 confirma (18-19 com treino em Luta). Dano x2,5 e entra em Zona.' },
  { nome: 'Domínio Simples', grau: 3, custo: 'simples', texto: 'Reação, 1x/cena: nega o acerto garantido de um Domain Expansion inimigo.' },
  { nome: 'Técnica Reversa (RCT)', grau: 3, custo: '6 PA', texto: 'Teste de Presença; cura 2d8 + Presença. Só em si mesmo. Automática a partir do Semi-Grau 1.' },
  { nome: 'Domain Expansion Incompleta', grau: 4, custo: 'domain', texto: 'Inimigos na área têm desvantagem em ataques e resistências contra as tuas técnicas, 3 rodadas. 1x/sessão.' },
  { nome: 'Vermelho', grau: 5, custo: '10 PA', texto: 'Ofensivo: 6d8, ignora Resistência a Dano de curses.' },
  { nome: 'Domain Expansion Completa', grau: 5, custo: 'domain', texto: 'Todas as tuas variantes ganham acerto garantido contra alvos na área, 3 rodadas. 1x/sessão.' },
];

const NATUREZAS = [
  {
    id: 'feiticeiro',
    nome: 'Feiticeiro',
    resumo: 'Nasce com energia amaldiçoada e uma Técnica Inata desde o berço, treinado formalmente na Escola. Vinculado à hierarquia institucional: missões atribuídas, política de clãs, obrigações que não pode recusar.',
    ajuste: { PV: 0, PA: 1, Coesao: 1 },
    bonusType: 'escolha-duas-mais1',
    bonusTexto: '+1 em dois Atributos à escolha',
    tracos: [
      ['Aptidão Natural', 'Começa com a Técnica Inata já parcialmente refinada: desbloqueia 1 variante extra, normalmente só disponível a partir do Grau 3.'],
    ],
  },
  {
    id: 'usuario',
    nome: 'Usuário de Técnica Amaldiçoada',
    resumo: 'Humano cuja capacidade amaldiçoada desperta mais tarde na vida, ligada a uma obsessão, trauma ou paixão pessoal específica. Sem rede de apoio institucional.',
    ajuste: { PV: 1, PA: -2, Coesao: 1 },
    bonusType: 'escolha-uma-mais2',
    bonusTexto: '+2 num único Atributo à escolha',
    tracos: [
      ['Despertar Tardio', 'A Técnica Inata liga-se a uma Perícia específica escolhida na criação. Sucesso excecional nessa Perícia (margem 10+ ou 20 natural) recupera PA ou reduz o custo da próxima ativação da técnica na cena. PA base reduzido.'],
    ],
    pedePericiaLigada: true,
  },
  {
    id: 'maldicao',
    nome: 'Maldição',
    resumo: 'Nasce diretamente de emoção humana negativa concentrada. Fisicamente resistente mas instável; reage mal a purificação/energia positiva.',
    ajuste: { PV: 3, PA: 1, Coesao: 0 },
    bonusType: 'escolha-entre',
    bonusOpcoes: ['VIG', 'PRE'],
    bonusValor: 2,
    bonusTexto: '+2 em Vigor ou Presença à escolha',
    tracos: [
      ['Corpo Amaldiçoado', 'Regenera PV automaticamente no início de cada cena (Grau 4: 1d4 · Grau 3: 1d6 · Semi-Grau 2: 1d8 · Grau 2: 2d6 · Semi-Grau 1: 2d8 · Grau 1: 3d8 · Grau Especial: 4d8). Esta regeneração substitui por completo o Descanso Curto para PV. Sofre dano dobrado de Técnica Reversa/energia positiva e não pode ser curado por métodos convencionais.'],
    ],
  },
  {
    id: 'feto',
    nome: 'Feto Amaldiçoado',
    resumo: 'Híbrido criado por manipulação amaldiçoada de um feto humano. Fisicamente superior à média humana, mas depende de uma fonte específica de energia amaldiçoada para sobreviver.',
    ajuste: { PV: 1, PA: 3, Coesao: -1 },
    bonusType: 'escolha-entre',
    bonusOpcoes: ['FOR', 'VIG'],
    bonusValor: 2,
    bonusTexto: '+2 em Força ou Vigor à escolha',
    tracos: [
      ['Sustento Amaldiçoado', 'Defines a fonte de sustento na criação (ligada à técnica de quem o manipulou). Não recupera PA por Descanso normal, só consumindo essa fonte, o que restaura 25% do PA máximo (equivalente a um Descanso Curto). Sem a fonte durante muito tempo, sofre penalização progressiva. Em combate, pode gastar uma ação para se alimentar e curar PV rapidamente.'],
    ],
    pedeFonteSustento: true,
  },
  {
    id: 'receptaculo',
    nome: 'Recetáculo',
    resumo: 'Humano comum até vincular-se, na criação, a um Objeto Amaldiçoado, tornando-se hospedeiro de uma entidade dormente.',
    ajuste: { PV: 0, PA: 0, Coesao: -3 },
    bonusType: 'receptaculo',
    bonusTexto: '+1 livre à escolha, mais +1 no Atributo associado ao Objeto Amaldiçoado escolhido',
    tracos: [
      ['Hospedeiro', 'Ganha 1 traço menor da entidade desde o Grau 4, sem custo de PA. O despertar completo exige subida de Grau + evento narrativo. Risco de perda de controlo em Coesão baixa.'],
      ['Assimilação (Grau 1)', 'Escolhe 1 técnica da entidade para aprender permanentemente, mesmo que ela seja depois removida ou morta.'],
    ],
    pedeObjeto: true,
  },
  {
    id: 'reencarnado',
    nome: 'Reencarnado',
    resumo: 'Feiticeiro trazido de uma era muito antiga. Poder imenso mas bruto; completamente desatualizado no mundo moderno.',
    ajuste: { PV: 2, PA: 2, Coesao: -2 },
    bonusType: 'escolha-entre',
    bonusOpcoes: ['FOR', 'VIG'],
    bonusValor: 2,
    bonusTexto: '+2 em Força ou Vigor à escolha',
    tracos: [
      ['Poder da Era Dourada', 'Variantes de Dano sobem o dado um passo; variantes de Controlo/Utilidade/Buff sobem a Duração ou a Área um nível (à tua escolha, fixo depois de decidido). Em troca, todas as ativações custam +1 PA extra.'],
      ['Fora do Tempo', '-5 fixo em testes de Intelecto ou Presença ligados ao mundo contemporâneo, salvo investimento narrativo específico.'],
    ],
    pedeEraDourada: true,
  },
  {
    id: 'alienigena',
    nome: 'Alienígena (Simuriano)',
    resumo: 'Espécie extraterrestre com energia amaldiçoada própria, quase indistinguível de humano exceto por um terceiro olho normalmente escondido.',
    ajuste: { PV: -2, PA: 3, Coesao: 2 },
    bonusType: 'escolha-entre',
    bonusOpcoes: ['INT', 'PRE'],
    bonusValor: 2,
    bonusTexto: '+2 em Intelecto ou Presença à escolha',
    tracos: [
      ['Terceiro Olho', 'Ao revelar o olho, testa Presença vs. Vontade de um alvo; sucesso incapacita/atordoa por 1 rodada. Chama muita atenção a quem tenha Percepção de Amaldiçoamento treinada.'],
      ['Fisiologia Estranha', 'Resistência a Dano contra um tipo definido na criação, e vulnerabilidade equivalente a outro tipo, definida com o mestre.'],
      ['Custo social', 'Sem enquadramento na hierarquia da Escola/clãs, tratado com desconfiança por defeito.'],
    ],
    pedeFisiologia: true,
  },
];


const TRACOS_RAROS = [
  {
    id: 'celestial',
    nome: 'Restrição Celestial',
    disponivel: true,
    resumo: 'Nasce completamente incapaz de gerar ou usar energia amaldiçoada (a condição do Toji Fushiguro). Qualquer personagem humano.',
    texto: [
      ['O que tira', 'Sem PA normal, sem Técnica Inata, sem Reforço normal, sem RCT, sem Domain Expansion, sem Saída Máxima. Pode empunhar Armas Amaldiçoadas normalmente e é imune a Percepção de Amaldiçoamento.'],
      ['O que dá', 'Vantagem permanente (+1 dado) em todos os testes físicos e Perícias ligadas a Força, Agilidade e Vigor, mesmo sem gastar pontos. Acumula com outras fontes (teto de 5d20).'],
      ['Reserva de Vigor', 'Reservatório físico à parte do PA, só para pagar habilidades do Estilo Restrito. Tamanho igual ao Limite de PA por turno do Grau atual. Recupera por completo em qualquer Descanso.'],
      ['Sinergia', 'Com o Estilo Restrito, a vantagem física sobe de +1 para +2 dados nas habilidades desse Estilo.'],
    ],
  },
  {
    id: 'seisolhos',
    nome: 'Seis Olhos',
    disponivel: true,
    resumo: 'Traço hereditário que reaparece de tempos a tempos numa linhagem (a condição do Satoru Gojo). Sempre adicional a uma Natureza normal, nunca a substitui.',
    texto: [
      ['Percepção Absoluta', 'Vê energia amaldiçoada ao detalhe, mesmo de olhos fechados ou vendados. Nunca é surpreendido por uma técnica que já tenha visto e tem sucesso automático em Percepção de Amaldiçoamento contra ativações de técnica.'],
      ['Eficiência Quase Absoluta', 'Todas as variantes de Técnica Inata e Reforço custam metade do PA (arredondado para cima). Não se aplica a RCT, Domain Expansion ou Saída Máxima.'],
      ['Teto Quebrado', 'O Limite de PA por turno não se aplica a este personagem.'],
      ['O que tira', 'Fora de combate ou de concentração ativa, desvantagem em testes sociais (Diplomacia, Enganação), salvo gastar uma Ação Livre para "desligar" a percepção por uma cena (e perder a Percepção Absoluta nesse período).'],
      ['Alvo prioritário', 'Organizações que conheçam o traço tratam-no como ameaça ou recurso estratégico de topo.'],
    ],
  },
  {
    id: 'infernal',
    nome: 'Restrição Infernal',
    disponivel: false,
    resumo: 'Ainda por escrever no documento de regras.',
    texto: [],
  },
  {
    id: 'faiscas',
    nome: 'Escolhidos pelas Faíscas Negras',
    disponivel: false,
    resumo: 'Ainda por escrever no documento de regras.',
    texto: [],
  },
];

const ARQUETIPOS = [
  {
    id: 'reforcador',
    nome: 'Reforçador',
    cor: 'var(--accent)',
    resumo: 'Combatente puro, foco em Reforço de Energia Amaldiçoada aplicado ao corpo. Alta resistência, dano corpo-a-corpo consistente, sempre na linha da frente.',
    pv: { base: 24, attr: 'VIG' },
    pa: { base: 6, attr: 'INT' },
    coesao: { base: 10, attr: 'PRE' },
    // ganho a cada Grau seguinte (G3, S2, G2, S1, G1, GE): PV +inc + VIG · PA +paInc + INT · Coesão +coInc + PRE
    pvInc: [8, 8, 10, 10, 12, 14], paInc: 3, coInc: 4,
    periciasFixas: ['Luta', 'Fortitude'],
    periciasEscolha: 3,
    periciasExtraAttr: 'VIG',
    habilidade: 'Corpo como Arma, bónus de dano corpo-a-corpo por Grau (Grau 4: +1d4 · Grau 3: +1d6 · Semi-Grau 2: +1d6 · Grau 2: +1d8 · Semi-Grau 1: +1d8 · Grau 1: +1d10 · Grau Especial: +1d12).',
  },
  {
    id: 'estrategista',
    nome: 'Estrategista',
    cor: 'var(--purple)',
    resumo: 'Perceção, tática e suporte; controlo do campo de batalha. O valor real está em ler a situação antes de agir.',
    pv: { base: 18, attr: 'VIG' },
    pa: { base: 10, attr: 'INT' },
    coesao: { base: 14, attr: 'PRE' },
    pvInc: [6, 6, 8, 8, 10, 12], paInc: 5, coInc: 6,
    periciasFixas: ['Percepção de Amaldiçoamento', 'Investigação'],
    periciasEscolha: 4,
    periciasExtraAttr: 'INT',
    habilidade: 'Leitura do Spark, teste de Percepção de Amaldiçoamento vs. DT = 10 + custo em PA da variante que o inimigo está a ativar, para identificar a técnica antes de acontecer.',
  },
  {
    id: 'tecnico',
    nome: 'Técnico',
    cor: 'var(--gold)',
    resumo: 'Gira em torno de uma Técnica Inata forte e original. Curva de poder lenta no início, teto mais alto a longo prazo.',
    pv: { base: 16, attr: 'VIG' },
    pa: { base: 12, attr: 'INT' },
    coesao: { base: 12, attr: 'PRE' },
    pvInc: [6, 6, 8, 8, 10, 12], paInc: 6, coInc: 5,
    periciasFixas: ['Percepção de Amaldiçoamento', 'Exorcismo'],
    periciasEscolha: 3,
    periciasExtraAttr: 'PRE',
    habilidade: 'Refinamento, a cada subida de Grau, ganha 1 ponto de Refinamento extra, só para melhorias da própria Técnica Inata.',
  },
];


const ESTILOS = {
  reforcador: [
    {
      nome: 'Restrito',
      resumo: 'Reforço de Energia Amaldiçoada aplicado ao corpo puro, sem armas.',
      graus: [
        { grau: 'Grau 3', nome: 'Golpe Reforçado', custo: '3 PA', texto: 'ataques desarmados ignoram Resistência a Dano igual ao modificador de Força.' },
        { grau: 'Grau 2', nome: 'Passo Amaldiçoado', custo: '4 PA', texto: 'deslocação instantânea curta sem provocar ataques de oportunidade, bónus de iniciativa em emboscadas.' },
        { grau: 'Grau 1', nome: 'Perfeição do Reforço', custo: 'Passiva', texto: 'Corpo como Arma sobe um dado; ataques desarmados contam como armas amaldiçoadas de grau elevado.' },
        { grau: 'Grau Especial', nome: 'Restrição Rompida', custo: '9 PA · 1x/sessão', texto: '3 rodadas ignorando Resistência a Dano, vantagem em ataques corpo-a-corpo, sem Limite de PA por turno nas habilidades deste Estilo.' },
      ],
    },
    {
      nome: 'Combatente Maldito',
      resumo: 'Luta com armas amaldiçoadas como extensão do corpo.',
      graus: [
        { grau: 'Grau 3', nome: 'Vínculo com a Arma', custo: 'Passiva', texto: 'escolhe arma de assinatura; soma Presença ao dano, além de Força.' },
        { grau: 'Grau 2', nome: 'Golpe à Distância', custo: '5 PA', texto: 'transmite impacto através de um ponto de contacto prévio.' },
        { grau: 'Grau 1', nome: 'Arma Lendária', custo: 'Passiva', texto: 'a arma de assinatura ganha uma propriedade permanente extra.' },
        { grau: 'Grau Especial', nome: 'Um Corpo Uma Lâmina', custo: '10 PA · 1x/sessão', texto: '3 rodadas, arma ignora Resistência a Dano, causa condição negativa a cada acerto, recupera PA a cada acerto.' },
      ],
    },
    {
      nome: 'Estilo Marcial',
      resumo: 'Artes marciais amaldiçoadas, técnica e disciplina em vez de força bruta.',
      graus: [
        { grau: 'Grau 3', nome: 'Forma Perfeita', custo: '3 PA', texto: 'substitui o ataque por teste de Luta; sucesso excecional causa dano adicional.' },
        { grau: 'Grau 2', nome: 'Contra-Golpe', custo: '5 PA (reação)', texto: 'ao defender-se com sucesso, reação para atacar de volta.' },
        { grau: 'Grau 1', nome: 'Ponto de Pressão', custo: '5 PA', texto: 'ataques desarmados podem causar condição negativa em vez de dano.' },
        { grau: 'Grau Especial', nome: 'Punho Sem Falha', custo: '9 PA · 1x/sessão', texto: '3 rodadas, acerto garantido em ataques desarmados; qualquer 20 natural gera Black Flash garantido, mesmo sem Reforço ativo.' },
      ],
    },
    {
      nome: 'Vanguarda',
      resumo: 'Tanque, proteção de aliados.',
      graus: [
        { grau: 'Grau 3', nome: 'Escudo Amaldiçoado', custo: '3 PA (reação)', texto: 'reação para reduzir dano recebido (próprio ou de aliado adjacente) em valor igual ao modificador de Vigor.' },
        { grau: 'Grau 2', nome: 'Provocar', custo: '4 PA', texto: 'força um inimigo a atacá-lo (teste de Presença vs. Vontade).' },
        { grau: 'Grau 1', nome: 'Linha Inquebrável', custo: 'Passiva', texto: 'entre aliado e inimigo, ambos ganham Resistência a Dano igual ao modificador de Vigor; pode redirecionar ataques para si.' },
        { grau: 'Grau Especial', nome: 'Muralha Viva', custo: '10 PA · 1x/sessão', texto: '3 rodadas, imune a condições negativas, Resistência a Dano igual ao dobro do modificador de Vigor, transfere metade do dano de aliados adjacentes para si.' },
      ],
    },
  ],
  estrategista: [
    {
      nome: 'Analista',
      resumo: 'Perceção e antecipação tática.',
      graus: [
        { grau: 'Grau 3', nome: 'Olho Treinado', custo: '3 PA', texto: 'ao observar um inimigo, bónus igual ao modificador de Intelecto no próximo teste contra ele.' },
        { grau: 'Grau 2', nome: 'Previsão de Padrão', custo: '5 PA · 1x/cena', texto: 'prevê a próxima ação de um inimigo observado.' },
        { grau: 'Grau 1', nome: 'Coordenação Total', custo: '5 PA', texto: 'dá a vários aliados (número = modificador de Intelecto) uma ação bónus imediata.' },
        { grau: 'Grau Especial', nome: 'Visão Absoluta', custo: '9 PA · 1x/sessão', texto: '3 rodadas, aliados que sigam instruções ganham vantagem, vê a totalidade do campo de batalha.' },
      ],
    },
    {
      nome: 'Barreirista',
      resumo: 'Controlo de espaço através de barreiras.',
      graus: [
        { grau: 'Grau 3', nome: 'Barreira Simples', custo: '3 PA', texto: 'bloqueia passagem/visão numa área pequena.' },
        { grau: 'Grau 2', nome: 'Zona de Contenção', custo: '6 PA', texto: 'barreira maior, impede saída salvo teste de Reflexos/Fortitude.' },
        { grau: 'Grau 1', nome: 'Selo Amaldiçoado', custo: '5 PA', texto: 'tenta selar a energia amaldiçoada de um alvo contido.' },
        { grau: 'Grau Especial', nome: 'Prisão de Mil Camadas', custo: '10 PA · 1x/sessão', texto: 'barreira multicamadas, penaliza Reflexos/Fortitude dos presos, impede Domain Expansion.' },
      ],
    },
    {
      nome: 'Invocador de Suporte',
      resumo: 'Shikigami de utilidade e suporte.',
      invoca: true,
      graus: [
        { grau: 'Grau 3', nome: 'Shikigami de Reconhecimento', custo: '3 PA invocar · 1 PA/cena manter', texto: 'entidade pequena com visão/audição partilhada.' },
        { grau: 'Grau 2', nome: 'Shikigami de Apoio', custo: '5 PA invocar · 2 PA/cena manter', texto: 'entidade que dá bónus a um aliado próximo.' },
        { grau: 'Grau 1', nome: 'Múltipla Invocação', custo: 'Passiva', texto: 'permite 2 invocações de suporte em simultâneo.' },
        { grau: 'Grau Especial', nome: 'Legião de Apoio', custo: '9 PA · 1x/sessão', texto: '3 rodadas, bónus simultâneo a todo o grupo.' },
      ],
    },
    {
      nome: 'Curandeiro de Campo',
      resumo: 'RCT aplicada a aliados.',
      graus: [
        { grau: 'Grau 3', nome: 'Mãos que Curam', custo: '6 PA (custo normal de RCT)', texto: 'usa RCT num aliado por contacto físico.' },
        { grau: 'Grau 2', nome: 'Estabilização de Emergência', custo: '6 PA · 1x/cena', texto: 'reação, cura instantânea de aliado a 0 PV.' },
        { grau: 'Grau 1', nome: 'Cura à Distância', custo: 'Passiva (modifica RCT)', texto: 'RCT sem contacto físico, curto alcance.' },
        { grau: 'Grau Especial', nome: 'Renascimento Amaldiçoado', custo: '10 PA · 1x/sessão', texto: 'cura completa e remove 1 condição de todos os aliados em curto alcance.' },
      ],
    },
  ],
  tecnico: [
    {
      nome: 'Manipulação',
      resumo: 'Controlo direto de um elemento/matéria.',
      graus: [
        { grau: 'Grau 3', nome: 'Controlo Básico', custo: '3 PA', texto: 'manipula pequena quantidade do elemento.' },
        { grau: 'Grau 2', nome: 'Formas Complexas', custo: '6 PA', texto: 'estruturas mais elaboradas.' },
        { grau: 'Grau 1', nome: 'Domínio da Matéria', custo: '5 PA', texto: 'mais quantidade manipulável, afeta matéria já existente no ambiente.' },
        { grau: 'Grau Especial', nome: 'Vontade Absoluta', custo: '8 PA · 1x/sessão', texto: '3 rodadas, custo de PA a metade, múltiplos alvos sem penalização.' },
      ],
    },
    {
      nome: 'Invocação',
      resumo: 'Shikigami de combate como núcleo da técnica.',
      invoca: true,
      graus: [
        { grau: 'Grau 3', nome: 'Primeiro Shikigami', custo: '4 PA invocar · 1 PA/cena manter', texto: 'entidade de combate independente.' },
        { grau: 'Grau 2', nome: 'Coordenação de Combate', custo: 'Passiva', texto: 'age na mesma rodada que o shikigami sem penalização; bónus de dano igual à Presença.' },
        { grau: 'Grau 1', nome: 'Segundo Shikigami', custo: '4 PA invocar · 1 PA/cena manter', texto: 'desbloqueia uma segunda entidade.' },
        { grau: 'Grau Especial', nome: 'Fusão de Sombras', custo: '9 PA · 1x/sessão', texto: 'funde duas invocações numa entidade combinada, dura até ser destruída.' },
      ],
    },
    {
      nome: 'Amplificação',
      resumo: 'Multiplica o output da própria energia amaldiçoada.',
      graus: [
        { grau: 'Grau 3', nome: 'Sobrecarga', custo: 'Custo normal + PA extra investido', texto: 'PA extra ao ativar qualquer técnica para aumentar dano/efeito.' },
        { grau: 'Grau 2', nome: 'Ressonância', custo: 'Passiva', texto: 'segundo acerto consecutivo no mesmo alvo causa dano extra igual ao modificador de Intelecto.' },
        { grau: 'Grau 1', nome: 'Amplificação de Técnica', custo: 'Dobro do custo normal · 1x/cena', texto: 'dobra o efeito/dano/alcance de uma ativação.' },
        { grau: 'Grau Especial', nome: 'Ápice Amaldiçoado', custo: '30 PA · 1x/sessão', texto: 'escolhe a técnica mais forte, ativa-a a 200% do potencial.' },
      ],
    },
    {
      nome: 'Absorção',
      resumo: 'Converte energia amaldiçoada recebida em recurso próprio.',
      graus: [
        { grau: 'Grau 3', nome: 'Absorver Impacto', custo: 'Grátis (reação)', texto: 'converte parte do dano de técnica amaldiçoada sofrida em PA.' },
        { grau: 'Grau 2', nome: 'Contra-Fluxo', custo: '4 PA (reação) · 1x/cena', texto: 'tenta anular parcialmente uma técnica contra si e recuperar PA.' },
        { grau: 'Grau 1', nome: 'Estômago Amaldiçoado', custo: '4 PA · 1x/cena', texto: 'converte uma fonte de energia tocada deliberadamente em PA.' },
        { grau: 'Grau Especial', nome: 'Vórtice Pessoal', custo: '9 PA · 1x/sessão', texto: '3 rodadas, todo o dano de técnicas amaldiçoadas recebido converte-se em PA a 100%.' },
      ],
    },
  ],
};


const ARMAS = {
  nivelCriacao: 1, 
  categorias: [
    { id: 'leve', nome: 'Leve', desc: 'rápida, corpo-a-corpo, baixo dano' },
    { id: 'pesada', nome: 'Pesada (duas mãos)', desc: 'lenta, corpo-a-corpo, alto dano' },
    { id: 'distancia', nome: 'Distância', desc: 'alcance, sem ser arremesso' },
    { id: 'arremesso', nome: 'Arremesso', desc: 'versátil, recuperável ou consumível (conjunto de 3-5 unidades)' },
  ],
  padraoPorCategoria: { leve: 'adaga', pesada: 'martelo', distancia: 'arco', arremesso: 'kunai' },

  lista: [
    { id: 'adaga', nome: 'Adaga Amaldiçoada', cat: 'leve', nivel: 1, dano: '1d6', critico: 'x2', alcance: 'Toque', tipo: 'C', espacos: 1, prop: 'Sem propriedade' },
    { id: 'punhal', nome: 'Punhal Sussurrante', cat: 'leve', nivel: 2, dano: '1d8', critico: 'x2', alcance: 'Toque', tipo: 'C', espacos: 1, prop: '+1 Furtividade escondida' },
    { id: 'garra', nome: 'Garra Retrátil', cat: 'leve', nivel: 3, dano: '2d6', critico: 'x2', alcance: 'Curto', tipo: 'C', espacos: 1, prop: 'Ataques consecutivos +1d4' },
    { id: 'faca', nome: 'Faca de Caça Amaldiçoada', cat: 'leve', nivel: 4, dano: '3d6', critico: 'x2', alcance: 'Curto', tipo: 'C', espacos: 1, prop: 'Ataque extra a metade do dano' },
    { id: 'lamina', nome: 'Lâmina Gêmea', cat: 'leve', nivel: 5, dano: '4d6', critico: 'x2', alcance: 'Curto', tipo: 'C', espacos: 1, prop: 'Recupera 1 PA por acerto' },

    { id: 'martelo', nome: 'Martelo de Guerra Amaldiçoado', cat: 'pesada', nivel: 1, dano: '1d10', critico: 'x2', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Desvantagem em Agilidade enquanto empunhada' },
    { id: 'machado', nome: 'Machado Duplo', cat: 'pesada', nivel: 2, dano: '2d8', critico: 'x2', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Ignora 1 de Resistência' },
    { id: 'maca', nome: 'Maça Cravejada', cat: 'pesada', nivel: 3, dano: '3d8', critico: 'x2 (19-20)', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Críticos causam condição leve extra' },
    { id: 'laminag', nome: 'Lâmina Grande', cat: 'pesada', nivel: 4, dano: '4d8', critico: 'x2', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Ignora metade da Resistência' },
    { id: 'foice', nome: 'Foice Amaldiçoada', cat: 'pesada', nivel: 5, dano: '5d10', critico: 'x2', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Ignora toda Resistência convencional' },

    { id: 'arco', nome: 'Arco Amaldiçoado', cat: 'distancia', nivel: 1, dano: '1d6', critico: 'x2', alcance: 'Médio', tipo: 'P', espacos: 2, prop: 'Sem propriedade' },
    { id: 'besta', nome: 'Besta de Repetição', cat: 'distancia', nivel: 2, dano: '1d8', critico: 'x2', alcance: 'Longo', tipo: 'P', espacos: 2, prop: 'Sem propriedade' },
    { id: 'rifle', nome: 'Rifle Amaldiçoado', cat: 'distancia', nivel: 3, dano: '2d6', critico: 'x2', alcance: 'Longo', tipo: 'P', espacos: 2, prop: 'Ignora cobertura parcial' },
    { id: 'lancacorr', nome: 'Lança-Correntes', cat: 'distancia', nivel: 4, dano: '3d6', critico: 'x2', alcance: 'Muito longo', tipo: 'P', espacos: 2, prop: 'Sem penalização por distância extrema' },
    { id: 'bastao', nome: 'Bastão Perfurante', cat: 'distancia', nivel: 5, dano: '4d6', critico: 'x2', alcance: 'Extremo', tipo: 'P', espacos: 2, prop: 'Perfura 2 alvos na linha' },

    { id: 'kunai', nome: 'Kunai Amaldiçoado', cat: 'arremesso', nivel: 1, dano: '1d4', critico: 'x2', alcance: 'Curto', tipo: 'P', espacos: 1, prop: 'Recuperável após o combate' },
    { id: 'corrente', nome: 'Corrente com Peso', cat: 'arremesso', nivel: 2, dano: '1d6', critico: 'x2', alcance: 'Médio', tipo: 'P', espacos: 1, prop: 'Reforçável com PA por +1d4' },
    { id: 'disco', nome: 'Disco Cortante', cat: 'arremesso', nivel: 3, dano: '2d4', critico: 'x2', alcance: 'Longo', tipo: 'P', espacos: 1, prop: 'Retorna à mão, sem ação extra' },
    { id: 'prego', nome: 'Prego Amaldiçoado', cat: 'arremesso', nivel: 4, dano: '3d4', critico: 'x2', alcance: 'Longo', tipo: 'P', espacos: 1, prop: 'Divide-se em 2 por 2 PA' },
    { id: 'faca3', nome: 'Faca de Arremesso Tripla', cat: 'arremesso', nivel: 5, dano: '4d4', critico: 'x2', alcance: 'Extremo', tipo: 'P', espacos: 1, prop: 'Detona remotamente' },
  ],
  lendarias: [
    { nome: 'Split Soul Katana', cat: 'Leve', dano: '4d6', alcance: 'Toque', tipo: 'C', espacos: 1, prop: 'Ignora Resistência a Dano contra alvos com alma; quem é atingido não pode usar RCT no resto da cena.', requisito: 'Grau Especial e Fervor +4' },
    { nome: 'Lança Invertida do Céu', cat: 'Leve', dano: '3d6', alcance: 'Toque', tipo: 'C', espacos: 1, prop: 'Anula a próxima ativação de Técnica Inata do alvo na cena; pode negar um ataque de Técnica Inata contra si, 1x/cena.', requisito: 'Vontade +4, sem Técnica Inata ativa ao empunhar pela primeira vez na cena' },
    { nome: 'Dragon-Bone', cat: 'Pesada', dano: '4d8', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Acumula Carregamentos (máx. 3), +1d8 de dano por Carregamento.', requisito: 'Vigor +4 e treino em Luta' },
    { nome: 'Playful Cloud', cat: 'Pesada (duas mãos)', dano: '5d10', alcance: 'Toque', tipo: 'I', espacos: 2, prop: 'Soma o modificador de Força três vezes ao dano.', requisito: 'Força +5' },
    { nome: 'Corrente das Mil Milhas', cat: 'Arremesso/Utilidade', dano: '1d4', alcance: 'Longo', tipo: 'P', espacos: 1, prop: 'Estende o alcance de outra arma anexada em +2 níveis; recupera-se automaticamente.', requisito: 'Intelecto +4 e treino em Tática' },
    { nome: 'Corda Negra', cat: 'Distância/Utilidade', dano: '-', alcance: 'Toque', tipo: '-', espacos: 1, prop: 'Anula Técnica Inata do alvo ao contacto por 1 rodada; 3 usos, degrada-se e desintegra-se ao 3º.', requisito: 'Presença +4 e Coesão mínima de metade do máximo' },
  ],
};

const ARMADURAS = [
  { id: 'nenhuma', nome: 'Sem armadura', espacos: 0, rd: 0, pen: '', desc: 'Sem proteção física adicional.' },
  { id: 'leve', nome: 'Leve', espacos: 1, rd: 2, pen: 'Nenhuma', desc: 'Uniforme reforçado, colete.' },
  { id: 'media', nome: 'Média', espacos: 2, rd: 4, pen: '-1 dado em Furtividade', desc: 'Couro amaldiçoado, placas parciais.' },
  { id: 'pesada', nome: 'Pesada', espacos: 3, rd: 7, pen: '-1 dado em Agilidade e Furtividade', desc: 'Armadura completa. Requer missão ou aprovação de um superior.', aprovacao: true },
];



const TECNICA = {
  orcamentoGrau4: 6,
  orcamentoGrau3: 10, 
  orcamentoGrau2: 14,
  orcamentoGrau1: 18,
  orcamentoMaxima: 26,
  efeitos: [
    { id: 'dano', nome: 'Dano', desc: '1 PA por 1d6 de dano', custoPor: 1, qtdLabel: 'Dados de dano (d6)' },
    { id: 'controlo', nome: 'Controlo', desc: 'derrubar, atordoar, imobilizar… - 2 PA por condição leve', custoPor: 2, qtdLabel: 'Condições leves' },
    { id: 'util', nome: 'Utilidade', desc: 'rastreio, transporte, disfarce… - 1 PA, ajustável (o mestre arbitra)', custoPor: 1, ajustavel: true, qtdLabel: 'Custo em PA (o mestre arbitra)' },
    { id: 'buff', nome: 'Buff', desc: '1 PA por +1 num atributo, ou +1d4 de bónus', custoPor: 1, qtdLabel: 'Bónus (+1 atributo ou +1d4, cada)' },
  ],
  alcances: [
    { id: 'toque', nome: 'Toque', custo: 0, dist: 'contacto direto' },
    { id: 'curto', nome: 'Curto', custo: 1, dist: 'até 6 m' },
    { id: 'medio', nome: 'Médio', custo: 2, dist: 'até 15 m' },
    { id: 'longo', nome: 'Longo', custo: 3, dist: 'até 30 m / linha de visão' },
  ],
  duracoes: [
    { id: 'instantaneo', nome: 'Instantâneo', custo: 0 },
    { id: 'rodada', nome: '1 rodada', custo: 2 },
    { id: 'cena', nome: 'Cena inteira', custo: 4 },
  ],
  areas: [
    { id: 'unico', nome: 'Alvo único', custo: 0 },
    { id: 'pequena', nome: 'Pequena', custo: 2, dist: 'poucos alvos / pequeno raio' },
    { id: 'grande', nome: 'Grande', custo: 4, dist: 'área ampla' },
  ],
  restricoes: [
    { id: 'leve', nome: 'Leve', desconto: 1 },
    { id: 'moderada', nome: 'Moderada', desconto: 2 },
    { id: 'forte', nome: 'Forte', desconto: 3 },
  ],
  catalogo: [
    { cat: 'Situacional', itens: [
      ['Só funciona com luz direta / só à noite', 'leve'],
      ['Só funciona em contacto com uma superfície específica (água, metal, terra)', 'moderada'],
      ['Deixa de funcionar em espaços fechados ou ao ar livre', 'moderada'],
      ['Só funciona dentro de uma distância curta de um local com ligação forte ao personagem', 'forte'],
    ] },
    { cat: 'Física', itens: [
      ['Exige um gesto ou postura específica das mãos, sem poder segurar nada nelas', 'leve'],
      ['Deixa uma marca física visível e temporária no utilizador', 'leve'],
      ['Consome uma pequena quantidade de PV em vez de só PA', 'moderada'],
      ['Causa dano ao próprio utilizador se usada acima de um certo número de vezes na cena', 'forte'],
    ] },
    { cat: 'Verbal / Ritual', itens: [
      ['Precisa de dizer o nome da técnica em voz alta', 'leve'],
      ['Exige um pequeno ritual de alguns segundos antes de ativar', 'moderada'],
      ['Só funciona se o utilizador tiver feito um Juramento Vinculante relacionado', 'forte'],
    ] },
    { cat: 'Alvo', itens: [
      ['Não funciona contra aliados, mesmo que o utilizador queira', 'leve'],
      ['Só funciona contra alvos com energia amaldiçoada detetável, não afeta humanos comuns', 'moderada'],
      ['Só funciona contra um único alvo por cena, escolhido no início dela', 'forte'],
    ] },
    { cat: 'Sequencial', itens: [
      ['Não pode ser usada duas vezes seguidas no mesmo alvo', 'leve'],
      ['Só pode ser ativada imediatamente a seguir a outra ação específica (ex: um ataque corpo-a-corpo)', 'moderada'],
      ['Só pode ser usada 1x por cena, independentemente do PA disponível', 'forte'],
    ] },
    { cat: 'Social / Emocional', itens: [
      ['Fica mais forte quanto mais ferido o utilizador estiver, mas mais fraca se ele estiver ileso', 'leve'],
      ['Só funciona em pleno controlo emocional, falha se a Coesão estiver abaixo de metade', 'moderada'],
      ['Só pode ser ativada se o utilizador expuser uma fraqueza pessoal ao alvo antes', 'forte'],
    ] },
  ],
};

const INVOCACAO_TIPOS = ['Shikigami', 'Curse absorvida', 'Marionete'];
const CURSE_TRACOS = [
  ['Voo', 'Ignora terreno difícil e pode atacar de cima.'],
  ['Regeneração', 'Recupera 10% do PV máximo no início de cada rodada, salvo dano de energia positiva/RCT.'],
  ['Multidão', 'São 3 curses fracas com este perfil, cada uma com 1/3 do PV.'],
  ['Camuflagem', 'Só detetável por Percepção de Amaldiçoamento bem-sucedida.'],
  ['Veneno Amaldiçoado', 'Ataques bem-sucedidos aplicam dano contínuo (1d6/rodada, 3 rodadas).'],
  ['Enxame', 'Ataca automaticamente todos os alvos numa área pequena a cada rodada.'],
  ['Absorção', 'Ao reduzir um alvo a 0 PV, cura-se por completo.'],
];
