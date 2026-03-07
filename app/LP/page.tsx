'use client'

import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePixel } from '@/components/pixel-tracker'

export default function LandingPage() {
  const router = useRouter()
  const { trackViewContent, trackInitiateCheckout } = usePixel()

  const handleCTAClick = () => {
    // Rastrear viewContent na oferta
    trackViewContent({
      content_name: 'Landing Page - Oferta FitGoal',
      content_category: 'landing_page',
    })
    
    // Rastrear iniciateCheckout quando clica no CTA
    trackInitiateCheckout({
      value: 79.90,
      currency: 'BRL',
      content_name: 'Plano Mensal',
    })
    
    router.push('/quiz')
  }
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header/Navigation */}
      <nav className="border-b border-slate-800 sticky top-0 z-50 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">
            <span className="text-lime-400">Fit</span>Goal
          </div>
          <div className="hidden md:flex gap-8">
            <a href="#metodo" className="text-gray-300 hover:text-white transition">Método</a>
            <a href="#resultado" className="text-gray-300 hover:text-white transition">Resultado</a>
            <a href="#valores" className="text-gray-300 hover:text-white transition">Valores</a>
            <a href="#faq" className="text-gray-300 hover:text-white transition">FAQ</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-6 px-4 py-2 rounded-full bg-slate-800 border border-slate-700">
              <span className="text-sm text-lime-400">🔥 FitGoal: Treino, dieta e personalizados 🔥</span>
            </div>
            <h2 className="text-xl text-gray-400 mb-6">Sistema Corpo Responsivo™ — Análise Visual Inteligente</h2>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Por que seu corpo travou — e como reprogramá-lo para perder 8–15kg em 90 dias
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Primeiro método de transformação física com análise visual por IA que se adapta ao seu corpo — mesmo após anos de dietas falhadas.
            </p>
            <Button 
              onClick={handleCTAClick}
              className="bg-lime-500 hover:bg-lime-600 text-black font-bold text-lg px-8 py-6 rounded-lg"
            >
              QUERO TRANSFORMAR MEU CORPO AGORA
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="text-center">
              <div className="text-4xl font-black text-lime-400 mb-2">+18.948</div>
              <div className="text-gray-400">Pessoas Transformadas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-lime-400 mb-2">+87%</div>
              <div className="text-gray-400">Superaram a Resistência Corporal</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-lime-400 mb-2">8-15kg</div>
              <div className="text-gray-400">Perdidos em 90 Dias</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-lime-400 mb-2">4.9/5</div>
              <div className="text-gray-400">Avaliação dos Clientes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problema" className="bg-slate-950 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black mb-12 text-center">VOCÊ SE IDENTIFICA?</h2>
          <p className="text-xl text-gray-300 mb-8 text-center">Se você marcou sim para alguma dessas, continue lendo...</p>
          
          <div className="space-y-4 mb-12">
            {[
              'Já tentou várias dietas (low carb, jejum, Weight Watchers) e recuperou todo peso.',
              'Trabalha mais de 8h por dia e não tem tempo para academia.',
              'Se sente preso no ciclo "já tentei de tudo e nada funciona comigo".',
              'Acha que personal e nutricionista ajudam mas são caros — e difícil de manter na rotina',
              'Paga mensalidades de academia mas nunca consegue ir.',
              'Tentou aplicativos gratuitos que dão treinos genéricos sem resultado.'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-red-500 text-xl font-bold flex-shrink-0">✗</span>
                <span className="text-gray-300 text-lg">{item}</span>
              </div>
            ))}
          </div>

          <h3 className="text-2xl font-bold text-white mb-4">E o que acontece?</h3>
          <p className="text-gray-300 text-lg">
            Você desiste em 2-3 semanas. Volta aos velhos hábitos. E se sente ainda pior do que antes.
          </p>
        </div>
      </section>

      {/* Problem is not you */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black mb-8">O problema NÃO é você.</h2>
          <div className="space-y-4 mb-12 text-lg text-gray-300">
            <p>Você não é preguiçoso. Você não tem "problema de metabolismo". Você não nasceu sem força de vontade.</p>
          </div>

          <h3 className="text-3xl font-bold text-lime-400 mb-8">O problema é o método.</h3>
          <p className="text-gray-300 mb-8 text-lg">A indústria do fitness quer te vender:</p>

          <div className="space-y-3 mb-8">
            {[
              'Treinos impossíveis de sustentar',
              'Dietas que ninguém aguenta por mais de 1 mês',
              'Fórmulas genéricas que ignoram sua vida real'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-red-500 text-xl font-bold flex-shrink-0">✗</span>
                <span className="text-gray-300 text-lg">{item}</span>
              </div>
            ))}
          </div>

          <h3 className="text-2xl font-bold text-white">E depois culpam VOCÊ quando não funciona.</h3>
        </div>
      </section>

      {/* Solution Section */}
      <section id="metodo" className="bg-slate-950 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-lime-400 mb-4 font-bold">Solução Comprovada</h2>
          <h1 className="text-4xl font-black mb-6">Sistema Corpo Responsivo™</h1>
          <h2 className="text-3xl font-bold text-white mb-8">MÉTODO VALIDADO</h2>
          <p className="text-lg text-gray-300 mb-12">
            O primeiro método de transformação física com análise visual inteligente por IA — que identifica por que seu corpo não responde e ajusta a estratégia automaticamente.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { title: 'Treinos Inteligentes', desc: '15-90 minutos que se adaptam à sua rotina.' },
              { title: 'Alimentação 100% Personalizada', desc: 'Sem dietas restritivas — Dietas 100% pensadas em VOCÊ' },
              { title: 'Mentalidade Vencedora', desc: 'Fotos semanais analisadas para ajustar sua estratégia com precisão' }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                <h3 className="text-xl font-bold text-lime-400 mb-3">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>

          <Button className="bg-lime-500 hover:bg-lime-600 text-black font-bold text-lg px-8 py-6 rounded-lg w-full md:w-auto">
            QUERO COMEÇAR MINHA TRANSFORMAÇÃO AGORA
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <section id="resultado" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-12 text-center">TRANSFORMAÇÕES REAIS</h1>
          <p className="text-lg text-gray-400 text-center mb-12">
            Profissionais ocupados que superaram a "Resistência Corporal Moderna" usando nossas DIetas e Treinos 100% Personalizados e análise visual por IA.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { name: 'Carlos', age: '45 anos', title: 'Perdi 22kg e recuperei minha saúde', desc: 'Pré-diabetes e pressão normalizada.' },
              { name: 'Marina', age: '37 anos', title: 'Finalmente entendi por que meu corpo não respondia. Perdi 11kg!', desc: '11kg em 3 meses treinando em casa' },
              { name: 'Roberto', age: '52 anos', title: 'Perdi 12kg em 3 meses sem abrir mão da minha rotina profissional', desc: '12kg eliminados, saúde impecável' },
              { name: 'Thiago', age: '39 anos', title: 'O sistema se adapta a mim, não preciso mais me adaptar a dietas impossíveis', desc: 'De sedentário a atleta competidor.' }
            ].map((test, i) => (
              <div key={i} className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-lime-400 font-bold mb-2">"{test.title}"</p>
                <p className="text-gray-400 text-sm">{test.name}, {test.age} - {test.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section id="valores" className="bg-slate-950 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-12 text-center">O QUE VOCÊ VAI RECEBER</h1>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-lime-400 mb-6">SISTEMA COMPLETO:</h2>
            <div className="space-y-3">
              {[
                'Treinos Responsivos que se adaptam ao seu tempo (15-90 min)',
                'Nutrição de Precisão, Dietas com Macros precisos e fácil de seguir',
                'Análise Visual por IA com feedback mensal',
                'App exclusivo com suas Dietas e Treinos 100% Personalizados',
                'Suporte prioritário via chat especializado',
                'Acompanhamento de evolução com o nosso time'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-lg text-gray-300">
                  <CheckCircle2 className="w-6 h-6 text-lime-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-lime-500/20 to-lime-400/10 p-8 rounded-lg border border-lime-500/30 mb-8">
            <h3 className="text-sm uppercase tracking-widest text-lime-400 font-bold mb-4">BÔNUS para os 50 PRIMEIROS</h3>
            <div className="space-y-2">
              {['Guia Lanches Fitness Estratégicos', 'Guia Lanches Fitness Estratégicos', 'Guia Lanches Fitness Estratégicos'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-lime-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-400 line-through text-lg mb-2">De R$ 597,00</p>
            <p className="text-gray-400 mb-2">Por apenas</p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-5xl font-black text-lime-400">R$</span>
              <span className="text-6xl font-black text-lime-400">297</span>
              <span className="text-2xl text-gray-400">,00</span>
            </div>
          </div>

          <Button className="bg-lime-500 hover:bg-lime-600 text-black font-bold text-lg px-8 py-6 rounded-lg w-full">
            QUERO COMEÇAR MINHA TRANSFORMAÇÃO AGORA
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-12 text-center">30 Dias - Zero Risco</h1>
          <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-lg">
            <p className="text-lg text-gray-300 text-center">
              Teste o programa completo por 30 dias. Se não ver resultados, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-950 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-12 text-center">DÚVIDAS RECENTES</h1>

          <div className="space-y-6">
            {[
              {
                q: 'Não tenho tempo para treinar...',
                a: 'Seus treinos SÃO 100% PERSONALIZADOS para VOCÊ. Vamos adapta-lo a sua rotina - será menos tempo que você gasta no Instagram ou vendo Netflix. Se você tem tempo para comer, você tem tempo para treinar.'
              },
              {
                q: 'Sou iniciante total, nunca treinei na vida...',
                a: 'Perfeito! 60% dos nossos alunos começaram do zero. O método se adapta completamente ao seu nível. Começamos devagar, com exercícios básicos e progressão respeitosa. Você não vai se machucar nem se sentir perdido.'
              },
              {
                q: 'JÁ TENTEI APLICATIVOS ANTES E NÃO FUNCIONARAM',
                a: 'A diferença é que criamos plano de DIETA E TREINOS 100% PERSONALIZADO EM VOCÊ e na nossa ANÁLISE VISUAL por IA. O sistema identifica seu progresso real através de fotos semanais e ajusta a estratégia continuamente. Nada de "achismo" — apenas decisões baseadas em dados do seu corpo.'
              },
              {
                q: 'Não tenho dinheiro para gastar com personal e nutricionista',
                a: 'O nosso sistema faz um trabalho de personal trainer + nutricionista, economizando mais de R$2.400 em 3 meses. E custa menos de R$ 2 por dia para ter acesso a um método completo de transformação.'
              },
              {
                q: 'E SE NÃO FUNCIONAR COMIGO?',
                a: 'Você tem garantia tripla: 30 dias para ver resultados visíveis, 15 dias para testar se encaixa na sua rotina, e 60 dias de suporte. Se não funcionar, devolvemos 100% do seu investimento sem questionamentos.'
              }
            ].map((faq, i) => (
              <div key={i} className="border-b border-slate-700 pb-6">
                <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
                <p className="text-gray-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-8">Você pode:</h2>
          <div className="space-y-3 mb-12 text-lg text-gray-300">
            <p>1. Fechar esta página e continuar frustrado com seu corpo</p>
            <p>2. Clicar agora e começar sua transformação hoje</p>
          </div>
          <p className="text-xl text-lime-400 font-bold mb-8">Daqui a 90 dias você agradece por ter começado hoje.</p>
          <Button className="bg-lime-500 hover:bg-lime-600 text-black font-bold text-lg px-8 py-6 rounded-lg">
            GARANTIR MINHA VAGA AGORA
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p className="mb-2">© 2026 FitGoal. Todos os direitos reservados</p>
          <div className="flex justify-center gap-4">
            <a href="#" className="hover:text-white transition">Privacidade</a>
            <span>|</span>
            <a href="#" className="hover:text-white transition">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
