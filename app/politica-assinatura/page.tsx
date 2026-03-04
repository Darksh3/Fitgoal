export default function PoliticaAssinaturanPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-green-400">Política de Assinatura</h1>
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

        {/* Important Notice */}
        <div className="bg-amber-900 border border-amber-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-amber-200 mb-3">⚠️ Importante</h2>
          <p className="text-amber-100 mb-2">Para evitar ser cobrado, você DEVE cancelar sua assinatura no mínimo <strong>24 horas antes</strong> do término do período de teste ou período de assinatura atual.</p>
          <p className="text-amber-100"><strong>DELETAR O APP NÃO CANCELA SUAS ASSINATURAS</strong></p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Termos de Assinatura</h2>
            <p className="mb-4">
              Este documento descreve os termos relativos a assinaturas automáticas que você pode adquirir através de nosso aplicativo FitGoal. Por favor, leia cuidadosamente, especialmente a Seção 7 "Taxas de Assinatura e Pagamento" antes de iniciar um teste ou completar uma compra para nosso serviço de assinatura com renovação automática.
            </p>
            <p className="mb-4">
              Ao adquirir uma assinatura com renovação automática, você concorda com sua natureza de renovação automática e com seus termos definidos perto do ponto de compra e reconhece que para evitar cobranças você precisará cancelá-la afirmativamente.
            </p>
            <p>
              Nossas práticas de privacidade estão descritas em detalhes em nossa <a href="/politica-privacidade" className="text-green-400 hover:text-green-300">Política de Privacidade</a>. Por favor, se familiarize com seu conteúdo para entender como suas informações pessoais são coletadas, usadas e compartilhadas.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Teste Gratuito ou Pago</h2>
            <p className="mb-3">
              Podemos oferecer uma assinatura de teste gratuita ou paga (por pequeno pagamento) para o serviço. A menos que você cancele antes do fim do teste, você será automaticamente cobrado do preço indicado na tela de pagamento ou na tela de pop-up de pagamento da Apple/Google para um período de assinatura escolhido.
            </p>
            <p className="mb-3">
              Por favor, note que se um teste for oferecido, isso será explicitamente declarado na tela de preço antes do checkout. Se não for o caso, você adquirirá nossa assinatura sem teste.
            </p>
            <p>
              Também podemos oferecer de tempos em tempos ofertas com desconto que se renovam ao preço completo não descontado e outras ofertas que possam ser interessantes para você.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Assinatura</h2>
            <p className="mb-4">
              A assinatura se renova automaticamente ao fim de cada período (cada semana, mês, 6 meses, ano, ou de outra forma, dependendo da opção selecionada por você no momento da compra) até que você cancele.
            </p>
            <p className="text-slate-200 font-semibold mb-2">Você receberá uma notificação antes de cada renovação informando:</p>
            <ul className="space-y-1 ml-6 list-disc mb-4">
              <li>Data da renovação</li>
              <li>Valor que será cobrado</li>
              <li>Como cancelar</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Método de Pagamento</h2>
            <p className="mb-4">
              O pagamento será cobrado do método de pagamento que você forneceu no momento da compra, após você confirmar a compra (através de identificação de toque único, reconhecimento facial, inserção de seus detalhes de método de pagamento na web, ou aceitando de outra forma os termos de assinatura fornecidos na tela de pagamento ou na tela de pop-up fornecida por Apple/Google ou em nossa página da web) ou após o fim do período de teste.
            </p>
            <p>
              Você nos autoriza a cobrar as taxas de assinatura aplicáveis do método de pagamento que você usa. Se seu método de pagamento não puder ser cobrado, entraremos em contato para obter um novo método de pagamento.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Cancelamento</h2>
            <p className="mb-4 font-semibold text-amber-200">
              Sua assinatura se renova automaticamente ao fim de cada período até que você cancele.
            </p>
            <p className="mb-6 font-semibold text-amber-200">
              ⚠️ IMPORTANTE: Deletar o app NÃO cancela sua assinatura.
            </p>

            {/* Apple */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Se Você Adquiriu Assinatura na App Store (Apple)</h3>
              <p className="mb-3">
                Você pode cancelar um teste gratuito ou uma assinatura a qualquer momento ao desligar a renovação automática através das configurações de sua conta Apple ID.
              </p>
              <p className="mb-4 font-semibold text-amber-200">
                Para evitar ser cobrado, você DEVE cancelar a assinatura nas configurações de sua conta Apple ID no mínimo 24 horas antes do fim do teste gratuito ou do período de assinatura atual.
              </p>
              <p className="mb-3 font-semibold">Como Cancelar:</p>
              <ol className="space-y-2 ml-6 list-decimal mb-3">
                <li>Abra o app FitGoal</li>
                <li>Toque em "Conta" ou "Configurações"</li>
                <li>Procure por "Gerenciar Assinatura" ou "Subscription"</li>
                <li>Siga o link para Apple ID</li>
                <li>Selecione "Editar"</li>
                <li>Escolha "Cancelar Assinatura"</li>
              </ol>
              <p className="text-sm">Para mais ajuda, visite: <a href="https://support.apple.com/pt-br/HT202039" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">https://support.apple.com/pt-br/HT202039</a></p>
            </div>

            {/* Google Play */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Se Você Adquiriu Assinatura no Google Play</h3>
              <p className="mb-3">
                Você pode cancelar um teste gratuito ou uma assinatura a qualquer momento ao desligar a renovação automática através das configurações de sua conta Google Play.
              </p>
              <p className="mb-4 font-semibold text-amber-200">
                Para evitar ser cobrado, você DEVE cancelar a assinatura nas configurações de sua conta no mínimo 24 horas antes do fim do teste ou do período de assinatura atual.
              </p>
              <p className="mb-3 font-semibold">Como Cancelar:</p>
              <ol className="space-y-2 ml-6 list-decimal mb-3">
                <li>Abra o Google Play Store</li>
                <li>Toque no ícone de perfil</li>
                <li>Procure por "Assinaturas"</li>
                <li>Selecione "FitGoal"</li>
                <li>Toque em "Cancelar assinatura"</li>
              </ol>
              <p className="text-sm">Para mais ajuda, visite: <a href="https://support.google.com/play/answer/7018481?hl=pt-BR" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">https://support.google.com/play/answer/7018481?hl=pt-BR</a></p>
            </div>

            {/* Website */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Se Você Adquiriu Assinatura em Nosso Website</h3>
              <p className="mb-4 font-semibold text-amber-200">
                Para evitar ser cobrado, você DEVE cancelar sua assinatura antes do fim do período atual.
              </p>
              <p className="mb-3">
                Você pode cancelar sua assinatura adquirida em nosso website acessando seu perfil em <a href="https://fitgoal.com.br" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">https://fitgoal.com.br</a>
              </p>
              <p className="mb-3 font-semibold">Como Cancelar:</p>
              <ol className="space-y-2 ml-6 list-decimal">
                <li>Abra o app FitGoal</li>
                <li>Toque na aba "Mais"</li>
                <li>Selecione "Ver Meu Perfil" ou "Meu Perfil"</li>
                <li>Procure "Gerenciar Assinatura"</li>
                <li>Você será redirecionado para nosso website</li>
                <li>Siga as instruções para desligar sua assinatura</li>
              </ol>
            </div>

            <div className="bg-green-900 border border-green-700 rounded-lg p-4">
              <p className="text-green-100">
                <strong>Informação Importante:</strong> Cancelar sua assinatura significa que a renovação automática será desabilitada, mas você ainda terá acesso a todos os recursos de sua assinatura pelo tempo restante de seu período atual.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Reembolsos</h2>
            <p className="mb-6">
              Consulte nossa <a href="/politica-reembolso" className="text-green-400 hover:text-green-300">Política de Reembolso</a> para informações completas sobre reembolsos. Após seu período de assinatura expirar, não seremos capazes de reembolsá-lo conforme o serviço será considerado consumido completamente, a menos que de outra forma fornecido por lei aplicável.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Mudanças de Preço</h2>
            <p className="mb-4">
              Até o máximo permitido por leis brasileiras aplicáveis, podemos mudar taxas de assinatura a qualquer momento.
            </p>
            <p className="mb-4">
              Nós forneceremos a você notificação razoável de qualquer tal mudança de preço (no mínimo 14 dias antes) ao:
            </p>
            <ul className="space-y-2 ml-6 list-disc mb-4">
              <li>Postar os novos preços no ou através do app</li>
              <li>Enviar uma notificação de email</li>
              <li>Exibir em outras formas proeminentes</li>
            </ul>
            <p>
              Se você não desejar pagar as novas taxas, você pode cancelar a assinatura aplicável antes da mudança entrar em efeito.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Questões sobre Termos de Assinatura</h2>
            <p className="mb-4">Se tiver qualquer questão em relação aos termos de assinatura, por favor nos contate:</p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <p className="text-slate-300 mb-2">📧 Email: fitgoalcontato@gmail.com</p>
              <p className="text-slate-300 mb-2">📞 Telefone: (11) 95376-5996</p>
              <p className="text-slate-300 mb-2">📍 Endereço: Avenida Paulista, 1636, Complemento: CONJ 04 PAVMT015, São Paulo, SP, CEP: 01310-200</p>
              <p className="text-slate-300">💬 Chat: Disponível no app FitGoal</p>
            </div>
          </section>

          {/* Footer */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-6 mt-12 pt-6 border-t-2 border-slate-700">
            <p className="text-sm text-slate-400 mb-4">
              Qualquer tradução dessa versão em inglês é fornecida para sua conveniência apenas. No caso de qualquer diferença de significado, versão ou interpretação entre a versão em idioma inglês desses Termos de Assinatura disponível em https://fitgoal.com.br/politica-assinatura e qualquer tradução, a versão em idioma inglês prevalecerá.
            </p>
            <p className="text-sm text-slate-500 mb-2">
              <strong>Última atualização:</strong> Março de 2026
            </p>
            <p className="text-sm text-amber-600">
              <strong>⚠️ Aviso:</strong> Este é um documento provisório. Deve ser revisado por um advogado especialista em direito do consumidor (CDC) e proteção de dados (LGPD) antes da publicação em produção.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
