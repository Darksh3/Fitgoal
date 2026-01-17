import { type NextRequest, NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, isNewUser, planType } = await request.json()

    console.log("[v0] Enviando email de boas-vindas para:", email)

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Email, name e password são obrigatórios" }, { status: 400 })
    }

    const planNames: Record<string, string> = {
      mensal: "Plano Mensal",
      trimestral: "Plano Trimestral",
      semestral: "Plano Semestral",
    }

    const planName = planNames[planType] || "Seu Plano"

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 40px 20px;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #007AFF;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              color: #000;
              font-size: 28px;
            }
            .content {
              margin: 30px 0;
            }
            .greeting {
              font-size: 18px;
              color: #000;
              margin-bottom: 20px;
            }
            .credentials-box {
              background-color: #f9f9f9;
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 12px 0;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .credential-item:last-child {
              border-bottom: none;
            }
            .credential-label {
              font-weight: 600;
              color: #666;
            }
            .credential-value {
              font-family: 'Courier New', monospace;
              color: #007AFF;
              font-weight: 500;
            }
            .plan-info {
              background-color: #f0f8ff;
              border-left: 4px solid #007AFF;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .plan-info strong {
              color: #007AFF;
            }
            .cta-button {
              display: inline-block;
              background-color: #007AFF;
              color: white;
              padding: 12px 30px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #999;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 12px;
              border-radius: 4px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bem-vindo ao Fitgoal Fitness!</h1>
            </div>

            <div class="content">
              <p class="greeting">Olá <strong>${name}</strong>,</p>
              
              <p>Seu pagamento foi confirmado com sucesso! Agora você tem acesso completo a todos os recursos do Fitgoal Fitness.</p>

              <div class="plan-info">
                <strong>✓ Seu Plano:</strong> ${planName}
                <br>
                Acesso completo a dietas personalizadas, programas de treino e acompanhamento do progresso.
              </div>

              <h3>Suas Credenciais de Acesso</h3>
              <div class="credentials-box">
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Senha Temporária:</span>
                  <span class="credential-value">${password}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Importante:</strong> Esta é uma senha temporária. Ao fazer login pela primeira vez, você será solicitado a criar uma nova senha pessoal. Recomendamos usar uma senha forte.
              </div>

              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_URL}/login" class="cta-button">Acessar minha Conta</a>
              </p>

              <h3>Próximos Passos:</h3>
              <ol>
                <li>Clique no botão acima ou acesse ${process.env.NEXT_PUBLIC_URL}/login</li>
                <li>Faça login com suas credenciais</li>
                <li>Crie uma nova senha pessoal</li>
                <li>Acesse sua dieta e programa de treino personalizados</li>
              </ol>

              <p>Se você não criou esta conta ou tem alguma dúvida, entre em contato conosco pelo email de suporte.</p>
            </div>

            <div class="footer">
              <p>© 2026 Fitgoal Fitness. Todos os direitos reservados.</p>
              <p>Este é um email automático. Por favor, não responda diretamente a este email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
Bem-vindo ao Fitgoal Fitness!

Olá ${name},

Seu pagamento foi confirmado com sucesso! Seu plano: ${planName}

Credenciais de Acesso:
Email: ${email}
Senha Temporária: ${password}

IMPORTANTE: Esta é uma senha temporária. Ao fazer login pela primeira vez, você será solicitado a criar uma nova senha pessoal.

Acesse sua conta em: ${process.env.NEXT_PUBLIC_URL}/login

Próximos Passos:
1. Faça login com suas credenciais
2. Crie uma nova senha pessoal
3. Acesse sua dieta e programa de treino personalizados

Se você não criou esta conta ou tem alguma dúvida, entre em contato conosco.

© 2026 Fitgoal Fitness
    `

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@fitgoal.com.br",
      subject: `Bem-vindo ao Fitgoal Fitness - ${isNewUser ? "Sua conta foi criada!" : "Seu plano foi renovado!"}`,
      text: textContent,
      html: htmlContent,
    }

    await sgMail.send(msg)

    console.log("[v0] Email enviado com sucesso para:", email)

    return NextResponse.json({ success: true, message: "Email enviado com sucesso" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro ao enviar email:", error)
    return NextResponse.json({ error: "Erro ao enviar email de boas-vindas" }, { status: 500 })
  }
}
