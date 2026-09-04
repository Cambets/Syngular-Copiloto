import jornadaSynplesData from './jornadaSynplesKB.json';

export const JORNADA_SYNPLES_KB = jornadaSynplesData;

export function getJornadaSynplesPromptContext(): string {
  return `
=========================================================================
BASE DE CONHECIMENTO OPERACIONAL DETALHADA: JORNADA SYNPLES, SYN PASS & GUIA DO AGR (SYNC)
=========================================================================

1. JORNADA SYNPLES & SYN PASS:
• O que é: Uso do Syn Pass (PF em nuvem gratuito) para emitir online o certificado PJ A1 (mesmo titular CPF).
• Syn Pass:
  - Certificado ICP-Brasil PF em nuvem. Validade atual de 3 anos (passará a 5 anos na cadeia V12).
  - Custo gratuito para a AR (apenas custo de consulta de API na validação).
  - Emissão no App Syn (se desinstalar o app ou limpar dados, perde o Syn Pass e o PJ A1 emitido). Não há recuperação de PUK.
  - Pode exportar em .pfx da aba 'Certificados' no App Syn quantas vezes quiser.
• Regras de Negócio:
  - Exclusivo para PJ A1 Emissão Online.
  - CPF do Syn Pass e CPF do responsável do PJ A1 devem ser RIGOROSAMENTE IDÊNTICOS.
  - O Syn Pass deve ser emitido no celular (App Syn). O PJ A1 pode ser emitido no App Syn ou no computador (Módulo Público) autenticando com o Syn Pass do celular.
  - Não há custo adicional para a Jornada Synples (apenas o custo normal do PJ A1).

2. ETAPAS OPERACIONAIS:
A) Criação do Pedido no GFSIS:
  - Marcar 'Emissão Synples' no pedido de PF e escolher a validação (presencial ou videoconferência).
  - Selecionar produto PJ A1 Emissão Online. O GFSIS gera 2 protocolos vinculados automaticamente (Syn Pass + PJ A1).
  - A primeira emissão é SEMPRE a do Syn Pass (PF).
  - Status GFSIS:
    * 'Aguardando Autenticação': Dispensa envio de dossiê/documentação da PJ para a Central de Verificação (emite direto no app Syn após aprovar Syn Pass).
    * 'Recebida': Exige montagem e aprovação de dossiê completo da PJ na Central de Verificação antes de emitir o PJ A1.
  - Se a opção não aparecer no GFSIS, acionar o suporte do GFSIS para ativação.

B) Experiência do Cliente & Agendamento:
  - Cliente recebe 2 links por e-mail ou WhatsApp: 1) Anexar documento com foto (frente e verso); 2) Agendamento da videoconferência no calendário online.

C) Videoconferência (Roteiro Oficial Versão 1.8):
  - Requisitos: Certificado anterior com biometria no PSBIO (emitidos a partir de 2019) ou CNH emitida após 2017. Se não localizar face no PSBIO ou Datavalid, a videoconferência é impedida.
  - Segurança: Conferir se documento em vídeo é idêntico ao anexado. Foto capturada pelo AGR ao vivo na gravação (proibido foto pré-gravada ou divergência de horário).
  - Proibido terceiros responderem pelo titular. Tradutores/intérpretes devem se identificar formalmente no início (Nome, CPF e motivo).
  - Roteiro v1.8:
    1) Boas-vindas e confirmação de modelo do certificado.
    2) Confirmação da empresa PJ (se houver).
    3) Confirmação de Celular e E-mail (validar titularidade do e-mail no link de entrada).
    4) Apresentação do documento físico: frente por 3 segundos imóvel e verso por 3 segundos.
    5) 3 perguntas obrigatórias de identificação + 1 pergunta aleatória gerada pelo sistema (proibido substituir).
    6) Encerramento e conferência final.
  - Se documento apresentado for diferente do anexado: pausar videoconferência, excluir documento antigo no Sync para liberar reenvio e orientar o cliente a enviar a foto correta.

D) Emissão no App Syn:
  - Syn Pass: App Syn -> Emitir -> Iniciar -> Inserir Protocolo e CPF -> Código de emissão -> Criar PIN -> Criar PUK (enviado por e-mail 'Compartimento criado no Syn') -> Assinar termo com PIN -> Emitido com sucesso.
  - PJ A1: Clicar em 'Continuar emissão Certificado PJ' -> Selecionar Syn Pass -> Assinar com PIN do Syn Pass -> Criar senha do PJ A1 -> PJ A1 emitido online.

3. GUIA DO AGR NO SYNC (ar.syngularid.com.br):
• Requisitos: Navegador Chrome + Extensão 'SyngularID' da Chrome Web Store ativada.
• Proibições: Nunca delegar acesso ao Sync nem entregar senhas/documentos confidenciais a terceiros. Punições: advertência, suspensão ou descredenciamento definitivo.
• Documentos PF Aceitos:
  - Físicos: RG, CNH válida, DNI, CIN, CTPS, Passaporte brasileiro, Identidade Funcional (OAB, CREA, CRA com consulta ativa), Estrangeiros (RNE, CRNM, Protocolo RNM/Refúgio).
  - Digitais: CNH Digital do app oficial, RG Digital oficial do estado, Funcional Digital, CIN Digital, e-Título (com foto, print completo e código validado no site tse.jus.br).
  - RESTRIÇÃO DECRETO FEDERAL 10.266/2020: Documentos emitidos pela Administração Pública Federal e entidades vinculadas à União (como ministérios) NÃO podem ser aceitos como documento de identificação. Órgãos estaduais e municipais são aceitos.
• Situação Cadastral CPF:
  - Regular, Pendente de Regularização e Suspenso: PODEM emitir.
  - Cancelado, Nulo e Titular Falecido: NÃO PODEM emitir.
  - Divergência de nome por casamento/divórcio: Apresentar Certidão de Casamento ou Averbação de Divórcio.
• Situações Especiais PF:
  - Incapazes: Obrigatoriamente PRESENCIAL. Parcialmente incapaz (16 a 18 anos) exige biometria de menor e responsáveis + consulta SAF.
  - PEPs (Pessoas Expostas Politicamente): Dossiê de PF obrigatório sempre.

4. ATOS CONSTITUTIVOS & REGRAS PJ:
• Documentos Válidos: REDESIM (validade 7 dias com link de fonte), Certidão Simplificada da Junta (validade 30 dias se omissa), Contrato Social consolidado (ou alteração anterior se não consolidada), Estatuto e Ata de Eleição (vigência padrão de 2 anos se a ata for omissa).
• Situação Cadastral CNPJ:
  - Ativa, Suspensa e Inapta: PODEM emitir.
  - Baixada e Nula: NÃO PODEM emitir.
• Tabela de Substituição de Caracteres no Sync:
  - 'Ç' -> 'C' | '@' -> 'A' | '&' -> 'E' | '$' -> 'S'
  - Símbolos ': . / * - _ ? !' -> Substituir por Espaço em branco.
• Representação Legal PJ:
  - Assinatura isolada vs conjunta (conforme contrato social/REDESIM).
  - Procuração Pública: Específica para certificado ICP-Brasil com validade máxima de 90 dias.
  - Recuperação Judicial: Notificação formal por e-mail ao Administrador Judicial anexada ao dossiê.
  - Falência: CNPJ Ativo + Decreto de Falência + Nomeação do Administrador Judicial (se >1 ano, Certidão Objeto e Pé).
  - Liquidação: CNPJ Ativo + Responsável nomeado no distrato social registrado na Junta.

5. MATRIZ DE APROVAÇÃO DATAVALID & PSBIO:
• Presencial:
  - Datavalid >93%: PSBIO Cadastro ou Verificação = APROVAÇÃO DIRETA (sem dossiê).
  - Datavalid 85% a 92,99%: PSBIO Cadastro = Dossiê e CV | PSBIO Verificação = APROVAÇÃO DIRETA.
  - Datavalid <84,99%: Não é possível seguir.
  - Datavalid Sem Cadastro: PSBIO Cadastro = Dossiê e CV | PSBIO Verificação = APROVAÇÃO DIRETA.
• Videoconferência:
  - Datavalid >93%: APROVAÇÃO DIRETA.
  - Datavalid 85% a 92,99%: Dossiê e CV.
  - Datavalid <84,99%: Não é possível seguir.
  - Datavalid Sem Cadastro: PSBIO Cadastro = Não segue | PSBIO Verificação = APROVAÇÃO DIRETA.
• Dossiê Consolidado: Quando exigido, o AGR deve unificar CNH, REDESIM, consultas e termos em 1 único arquivo PDF (usando iLovePDF ou PDF24).

6. SAF (SISTEMA ANTIFRAUDE):
• Consulta obrigatória antes de emitir.
• Filtro 'Sexo' é obrigatório + no mínimo 2 características físicas (cabelo, pele, cicatrizes, tatuagens, idade aparente, olhos).
• Se retornar mais de 500 registros, refinar os filtros.
• Responsabilidade direta do AGR perante auditoria em caso de negligência.

7. INDICADORES VISUAIS NO SYNC:
• Coleta Biométrica: Cinza (não coletada), Amarelo (em processamento), Verde (validada no PSBIO), Vermelho (falha/incompatível -> Auditoria).
• Verificação Biométrica: Verde (validado no PSBIO/Datavalid -> aprovação automática sem dossiê), Vermelho (não cadastrado no Datavalid).
• Verificação PJ: Verde (vínculo CPF/CNPJ confirmado via barramento -> ato constitutivo dispensado).
• Videoconferência: Verde (gravação concluída com sucesso).
`;
}
