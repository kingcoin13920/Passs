// app/api/emails/send-gift-card/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { buyerEmail, buyerName, recipientName, giftCode } = await request.json();
    
    console.log('🎁 Envoi email carte cadeau à:', buyerEmail);

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY manquant' },
        { status: 500 }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre carte cadeau Passworld</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎁 Votre carte cadeau Passworld
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 22px;">
                Bonjour ${buyerName} ! 👋
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Merci d'avoir offert une <strong>carte cadeau Passworld</strong> à <strong>${recipientName}</strong> ! 🎉
              </p>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Voici le code cadeau à transmettre au destinataire. Avec ce code, il/elle pourra découvrir sa destination surprise ! 🌍
              </p>
              
              <!-- Code Box -->
              <div style="background: linear-gradient(135deg, #ffeef8 0%, #ffe5f1 100%); border-left: 4px solid #f5576c; padding: 20px; margin: 0 0 30px 0; border-radius: 8px;">
                <p style="color: #2d3748; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">
                  Code cadeau à transmettre :
                </p>
                <p style="color: #f5576c; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                  ${giftCode}
                </p>
              </div>
              
              <!-- Instructions -->
              <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">
                  Comment utiliser ce code ? 🤔
                </h3>
                <ol style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Transmettez ce code à <strong>${recipientName}</strong></li>
                  <li>Le destinataire devra aller sur <strong>passs-two.vercel.app</strong></li>
                  <li>Cliquer sur "J'ai un code"</li>
                  <li>Entrer le code ci-dessus</li>
                  <li>Remplir le questionnaire pour découvrir sa destination !</li>
                </ol>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://passs-two.vercel.app?action=code&c=${giftCode}" 
                       style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(245, 87, 108, 0.4);">
                      🎁 Utiliser le code cadeau
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                💡 <strong>Astuce :</strong> Ce code est valable sans limite de temps. Vous pouvez l'offrir quand vous le souhaitez !
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #a0aec0; font-size: 14px; margin: 0 0 10px 0;">
                Passworld - Voyages Surprise
              </p>
              <p style="color: #cbd5e0; font-size: 12px; margin: 0;">
                Si vous avez des questions, répondez simplement à cet email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      const result = await resend.emails.send({
        from: 'Passworld <contact@hihaaa.fr>',
        to: [buyerEmail],
        subject: '🎁 Votre carte cadeau Passworld',
        html: emailHtml,
      });

      console.log(`✅ Email carte cadeau envoyé à ${buyerEmail}:`, result);
      return NextResponse.json({ 
        success: true, 
        email: buyerEmail, 
        messageId: result.data?.id 
      });
    } catch (error) {
      console.error(`❌ Erreur envoi email carte cadeau:`, error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
