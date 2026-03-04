export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-green-400">Política de Privacidade</h1>
          <p className="text-slate-400">FITGOAL BRASIL - NEFI UNLIMITED</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <p className="text-sm text-slate-300 mb-2">Avenida Paulista, 1636, Complemento: CONJ 04 PAVMT015, Bela Vista</p>
          <p className="text-sm text-slate-300 mb-2">São Paulo, SP, CEP: 01310-200</p>
          <p className="text-sm text-slate-300 mb-2">CNPJ: 48.442.391/0001-20</p>
          <p className="text-sm text-slate-300 mb-1">Email: fitgoalcontato@gmail.com | Telefone: (11) 95376-5996</p>
          <p className="text-sm text-slate-300">Website: https://fitgoal.com.br</p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Seu Direito de Privacidade é Respeitado</h2>
            <p className="mb-4">
              Nossos produtos utilizam tecnologias para processar seus dados para aprimorar sua experiência de usuário, otimizar anúncios e analisar tráfego. Essas tecnologias são ativadas quando você interage com nossos serviços, visita nosso website, usa nossos apps, ou habilita certos recursos como chats.
            </p>
            <p>
              Respeitamos seu direito de privacidade e fornecemos a você a opção de não permitir processamento de dados que não seja obrigatório para fornecer-lhe os serviços que você solicitou.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Categorias de Controle de Privacidade</h2>
            <p className="mb-4">Você pode controlar as seguintes categorias de processamento de dados:</p>
            <div className="space-y-3 ml-4">
              <div className="bg-slate-900 border border-slate-800 rounded p-4">
                <p className="font-semibold text-white mb-1">1. Necessário para Funcionamento</p>
                <p className="text-sm">Essencial para operação do app (não pode ser desabilitado)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-4">
                <p className="font-semibold text-white mb-1">2. Rastreamento Analítico</p>
                <p className="text-sm">Permitir rastreamento de como você usa o app (opcional)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-4">
                <p className="font-semibold text-white mb-1">3. Publicidade Direcionada</p>
                <p className="text-sm">Permitir publicidade personalizada (você ainda verá anúncios se desabilitar)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-4">
                <p className="font-semibold text-white mb-1">4. Dados Sensíveis</p>
                <p className="text-sm">Permitir processamento de dados de saúde/fitness (opcional)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-4">
                <p className="font-semibold text-white mb-1">5. Compartilhamento com Terceiros</p>
                <p className="text-sm">Permitir compartilhamento com parceiros de publicidade (opcional)</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Como Exercer Suas Preferências</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
              <p className="font-semibold text-white mb-3">No App FitGoal:</p>
              <ol className="space-y-2 ml-6 list-decimal">
                <li>Abra o app FitGoal</li>
                <li>Vá para "Configurações" ou "Perfil"</li>
                <li>Procure por "Privacidade" ou "Preferências de Dados"</li>
                <li>Selecione as categorias que deseja controlar</li>
                <li>Salve suas preferências</li>
              </ol>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="font-semibold text-white mb-3">No Website:</p>
              <ol className="space-y-2 ml-6 list-decimal">
                <li>Visite <a href="https://fitgoal.com.br/preferencias-privacidade" className="text-green-400 hover:text-green-300">https://fitgoal.com.br/preferencias-privacidade</a></li>
                <li>Faça login com sua conta</li>
                <li>Ajuste suas preferências</li>
                <li>Salve suas alterações</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Cookies e Tecnologias de Rastreamento</h2>
            <p className="mb-4">Usamos as seguintes tecnologias para coletar dados:</p>
            <div className="space-y-3 ml-4">
              <div>
                <p className="font-semibold text-white">Cookies:</p>
                <ul className="space-y-1 ml-6 list-disc text-sm">
                  <li>Cookies essenciais (obrigatórios): Permitem usar o app/website</li>
                  <li>Cookies analíticos: Nos ajudam a entender como você usa o serviço</li>
                  <li>Cookies de publicidade: Permitem publicidade direcionada</li>
                </ul>
                <p className="text-sm mt-2">Você pode desabilitar cookies nas configurações do seu navegador, mas isso pode afetar funcionalidade.</p>
              </div>
              <div>
                <p className="font-semibold text-white">SDKs de Terceiros:</p>
                <p className="text-sm">Usamos SDKs (Google Analytics, Firebase) para coletar dados de uso e comportamento.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Pixels de Rastreamento:</p>
                <p className="text-sm">Usamos pixels em emails e anúncios para rastrear engajamento.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Seus Direitos (LGPD)</h2>
            <p className="mb-4">Você tem os seguintes direitos conforme LGPD (Lei 14.129/2021):</p>
            <div className="space-y-3 ml-4">
              <div className="bg-slate-900 border border-slate-800 rounded p-3">
                <p className="font-semibold text-white mb-1">Direito de Acesso</p>
                <p className="text-sm">Solicitar quais dados temos sobre você e como usamos</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-3">
                <p className="font-semibold text-white mb-1">Direito de Retificação</p>
                <p className="text-sm">Corrigir dados imprecisos</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-3">
                <p className="font-semibold text-white mb-1">Direito de Exclusão</p>
                <p className="text-sm">Solicitar que deletemos seus dados (com exceções legais)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-3">
                <p className="font-semibold text-white mb-1">Direito de Portabilidade</p>
                <p className="text-sm">Receber seus dados em formato portável (CSV, JSON)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-3">
                <p className="font-semibold text-white mb-1">Direito de Oposição</p>
                <p className="text-sm">Opor-se ao processamento de seus dados para fins específicos</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded p-3">
                <p className="font-semibold text-white mb-1">Direito de Revogar Consentimento</p>
                <p className="text-sm">Retirar seu consentimento a qualquer momento</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Crianças e Menores de Idade</h2>
            <p className="mb-4">
              Não coletamos intencionalmente dados de menores de 18 anos. Se você for menor de 18 anos, você PODE usar o FitGoal apenas com consentimento de seus pais ou responsável legal.
            </p>
            <p>
              Se souber que alguém menor de 18 anos forneceu seus dados pessoais, por favor nos notifique em fitgoalcontato@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Conformidade com Leis de Privacidade</h2>
            <p className="mb-4">Nós cumprimos:</p>
            <ul className="space-y-2 ml-6 list-disc">
              <li>LGPD (Lei Geral de Proteção de Dados) - Brasil</li>
              <li>CDC (Código de Defesa do Consumidor) - Brasil</li>
              <li>Lei 12.965 (Marco Civil da Internet) - Brasil</li>
              <li>GDPR (Regulamento Geral de Proteção de Dados) - Europa</li>
              <li>CCPA (California Consumer Privacy Act) - Califórnia, EUA</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contato</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <p className="text-slate-300 mb-3">Para exercer seus direitos ou fazer perguntas sobre privacidade:</p>
              <p className="text-slate-300 mb-1">📧 Email: fitgoalcontato@gmail.com</p>
              <p className="text-slate-300 mb-1">📞 Telefone: (11) 95376-5996</p>
              <p className="text-slate-300 mb-1">🌐 Website: https://fitgoal.com.br/privacidade</p>
              <p className="text-slate-300">⏰ Horário: Segunda a sexta, 9h-18h (Horário de Brasília)</p>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-lg p-6 mt-12 pt-6 border-t-2 border-slate-700">
            <p className="text-sm text-slate-500 mb-2">Última atualização: Março de 2026</p>
            <p className="text-sm text-amber-600">⚠️ Aviso: Este é um documento provisório. Deve ser revisado por um advogado especialista em LGPD antes da publicação em produção.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
