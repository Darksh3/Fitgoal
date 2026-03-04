export default function PoliticaReembolsoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-green-400">Política de Reembolso</h1>
          <p className="text-slate-400">FITGOAL BRASIL - NEFI UNLIMITED</p>
        </div>

        {/* Company Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <p className="text-sm text-slate-300 mb-2">Avenida Paulista, 1636, Complemento: CONJ 04 PAVMT015, Bela Vista</p>
          <p className="text-sm text-slate-300 mb-2">São Paulo, SP, CEP: 01310-200</p>
          <p className="text-sm text-slate-300 mb-2">CNPJ: 48.442.391/0001-20</p>
          <p className="text-sm text-slate-300 mb-1">Email: fitgoalcontato@gmail.com</p>
          <p className="text-sm text-slate-300">Telefone: (11) 95376-5996</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* Section I */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">I. Regras de Garantia de Reembolso</h2>
            <p className="mb-4">
              Além dos direitos de reembolso disponíveis conforme leis aplicáveis, se você adquiriu nosso app diretamente em nossos websites e a opção de reembolso foi apresentada a você durante o checkout, você é elegível para receber um reembolso se não obtiver resultados visíveis com nosso programa, desde que todas as seguintes condições sejam atendidas:
            </p>
            <ul className="space-y-3 ml-6 list-disc">
              <li>Você nos contata dentro de 30 dias após sua compra inicial e antes do fim de seu período de assinatura; e</li>
              <li>Você seguiu nosso programa:
                <ul className="space-y-2 ml-6 list-disc mt-2">
                  <li>pelo menos durante 7 dias consecutivos dentro dos primeiros 30 dias após a compra (para períodos de assinatura mensal e mais longos);</li>
                  <li>pelo menos durante 5 dias consecutivos dentro dos primeiros 28 dias após a compra (para períodos de assinatura de 4 semanas); ou</li>
                  <li>pelo menos durante 3 dias consecutivos dentro dos primeiros 7 dias após a compra (para períodos de assinatura semanal e quinzenal); e</li>
                </ul>
              </li>
              <li>Você consegue demonstrar que seguiu o programa conforme os requisitos declarados abaixo na Seção "Como Demonstrar que Você Seguiu o Programa".</li>
            </ul>
            <p className="mt-4">Analisaremos sua solicitação e notificaremos você (por email ou de outra forma) se sua solicitação é aprovada.</p>
          </section>

          {/* Section II */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Como Demonstrar que Você Seguiu o Programa</h2>
            <p className="mb-4">
              Você pode demonstrar que seguiu o programa preenchendo as seguintes condições simples:
            </p>
            <p className="mb-2">Você fornece screenshots do app FitGoal provando que completou:</p>
            <ul className="space-y-2 ml-6 list-disc">
              <li>Pelo menos 7 sessões de workout/meditação ou outras atividades (para períodos de assinatura mensal e mais longos)</li>
              <li>Pelo menos 5 sessões de workout/meditação ou outras atividades (para períodos de assinatura de 4 semanas); ou</li>
              <li>Pelo menos 3 sessões de workout/meditação ou outras atividades (para períodos de assinatura semanal e quinzenal)</li>
            </ul>
            <p className="mt-4">Os screenshots devem ser claros e mostrar a data de conclusão das atividades.</p>
          </section>

          {/* Section III */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Declaração Importante</h2>
            <p>
              Por favor, note que apenas o cumprimento dos requisitos acima permite que você receba um reembolso conforme a Garantia de Reembolso. Para clareza, essa Garantia de Reembolso não se aplica a qualquer outra instância.
            </p>
          </section>

          {/* Section IV */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">II. Regras Gerais de Reembolso</h2>
            <p className="mb-4">
              Valorizamos qualquer feedback e fazemos tudo para deixar nossos clientes satisfeitos com nossos produtos e serviços. Porém, se você não estiver completamente satisfeito com nossos serviços, você pode obter um reembolso conforme os termos fornecidos aqui.
            </p>
            <p className="mb-4">
              Geralmente, se você não atender às condições de nossa Garantia de Reembolso descrita acima, as taxas que você pagou não são reembolsáveis e/ou não são trocáveis, a menos que de outra forma declarado aqui ou conforme exigido por lei aplicável. Além disso, certas solicitações de reembolso podem ser consideradas por nossa empresa caso-a-caso e concedidas a nosso critério exclusivo.
            </p>
            <p className="mb-4">
              Um reembolso geralmente pode ser reclamado apenas durante o período de assinatura. Se o período de assinatura tiver expirado antes de você fazer uma solicitação de reembolso, não poderemos fornecer um reembolso.
            </p>
          </section>

          {/* Section V */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Direitos do Consumidor Brasileiro e Internacional</h2>
            
            <h3 className="text-lg font-semibold text-white mb-3 mt-6">Para Residentes do Brasil:</h3>
            <p>
              Conforme a Lei 8.078/90 (Código de Defesa do Consumidor), você tem direito a cancelar sua compra dentro de 7 dias contados a partir do recebimento do produto ou contratação do serviço. Se desejar exercer este direito, entre em contato conosco em fitgoalcontato@gmail.com ou ligue (11) 95376-5996.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">Para Residentes da União Europeia e Suíça:</h3>
            <p className="mb-3">
              Se você é um consumidor baseado no EEA ou Suíça, você tem o direito legal automático de se retirar de contratos para compras de Serviços. Porém, quando você faz uma compra de um único item de conteúdo digital (como uma gravação de vídeo ou arquivo PDF), você expressamente concorda que tal conteúdo é disponibilizado para você imediatamente e você, portanto, perde seu direito de retirada e não será elegível para reembolso.
            </p>
            <p className="mb-3">
              Ao se inscrever para nosso Serviço que não é um único item de conteúdo digital e é fornecido de forma contínua (como assinaturas para o App), você expressamente solicita e consente em fornecimento imediato de tal Serviço. Portanto, se você exercer seu direito de retirada, deduziremos de seu reembolso um valor que seja proporcional ao Serviço fornecido antes de você nos comunicar sua retirada do contrato.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3 mt-4">Exercício do Direito de Retirada:</h3>
            <p className="mb-3">
              O período de retirada expirará 14 dias após o dia em que você entra em contrato. Para exercer seu direito de retirada, você deve nos informar de sua decisão de se retirar de um contrato por uma declaração inequívoca (exemplo: uma carta enviada por correio ou e-mail).
            </p>
            <p>
              Você pode usar o formulário de retirada modelo fornecido nesta seção, mas não é obrigatório. Para atender ao prazo de retirada, você precisa enviar sua comunicação para nós dizendo que deseja se retirar do contrato antes do período de retirada ter expirado.
            </p>
          </section>

          {/* Section VI */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Reembolsos pelo App Store e Google Play</h2>
            <p className="mb-3">
              Se você adquiriu uma assinatura ou ativou teste via App Store (Apple) ou Google Play (Google), você deve solicitar reembolso diretamente pela plataforma respectiva:
            </p>
            <ul className="space-y-2 ml-6 list-disc mb-3">
              <li>App Store (Apple): Siga o procedimento no https://support.apple.com/pt-br/</li>
              <li>Google Play (Google): Siga o procedimento no https://support.google.com/play/</li>
            </ul>
            <p>
              Também nos compromete a apoiar seu pedido de reembolso junto a essas plataformas se necessário. Entre em contato conosco em fitgoalcontato@gmail.com para assistência.
            </p>
          </section>

          {/* Section VII */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Reembolsos por Compra Direta no Website</h2>
            <p className="mb-4">
              Para compras realizadas diretamente em nosso website (https://fitgoal.com.br), fornecemos reembolsos a nosso critério exclusivo e sujeito a leis aplicáveis. Reembolso será fornecido se encontrarmos a solicitação aceitável e conforme descrito nesta política.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3">Como Solicitar Reembolso:</h3>
            <ol className="space-y-2 ml-6 list-decimal">
              <li>Envie um email para fitgoalcontato@gmail.com com o assunto "Solicitação de Reembolso"</li>
              <li>Inclua:
                <ul className="space-y-2 ml-6 list-disc mt-2">
                  <li>Seu nome completo</li>
                  <li>Email da conta</li>
                  <li>Data da compra</li>
                  <li>Valor pago</li>
                  <li>Motivo do reembolso</li>
                  <li>Screenshots da atividade (se aplicável)</li>
                </ul>
              </li>
              <li>Nós responderemos dentro de 5 dias úteis</li>
              <li>Se aprovado, o reembolso será processado em 5-10 dias úteis</li>
            </ol>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">Prazo para Reembolso:</h3>
            <p>
              Por favor, note que após seu período de assinatura expirar, não seremos capazes de reembolsá-lo conforme o serviço será considerado consumido completamente, a menos que de outra forma fornecido por lei aplicável.
            </p>
          </section>

          {/* Section VIII */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Informações Importantes</h2>
            <ul className="space-y-2 ml-6 list-disc">
              <li>Os reembolsos são processados ao método de pagamento original</li>
              <li>Não há reembolso parcial - reembolso é do valor total</li>
              <li>Cartão de crédito: 5-10 dias para aparecer</li>
              <li>Boleto: 10-15 dias para reembolso em conta</li>
              <li>Pix: 1-2 dias úteis</li>
            </ul>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mt-6">
              <p className="font-semibold text-white mb-2">Para perguntas sobre reembolso, entre em contato:</p>
              <p className="text-sm text-slate-300 mb-1">Email: fitgoalcontato@gmail.com</p>
              <p className="text-sm text-slate-300">Telefone: (11) 95376-5996</p>
            </div>
          </section>

          {/* Footer */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-6 mt-12 pt-6 border-t-2 border-slate-700">
            <p className="text-sm text-slate-400 mb-2">
              Qualquer tradução da versão em inglês é fornecida para sua conveniência apenas. No caso de qualquer diferença de significado, versão ou interpretação entre a versão em idioma inglês dessa Política de Reembolso disponível em https://fitgoal.com.br/politica-reembolso e qualquer tradução, a versão em idioma inglês prevalecerá.
            </p>
            <p className="text-sm text-slate-500">
              <strong>Última atualização:</strong> Março de 2026
            </p>
            <p className="text-sm text-amber-600 mt-2">
              <strong>⚠️ Aviso:</strong> Este é um documento provisório. Deve ser revisado por um advogado especialista em direito do consumidor (CDC) antes da publicação em produção.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
