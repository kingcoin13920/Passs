// app/api/emails/send-participant-codes/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { participants, tripId } = await request.json();
    
    console.log('📧 Envoi des emails pour', participants.length, 'participants');

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY manquant' },
        { status: 500 }
      );
    }

    // Envoyer un email à chaque participant
    const emailPromises = participants.map(async (participant: any) => {
      const { prenom, nom, email, code } = participant;
      
      console.log(`📨 Envoi email à ${prenom} ${nom} (${email}) - Code: ${code}`);

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre voyage surprise vous attend !</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                ✈️ Votre voyage surprise vous attend !
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 22px;">
                Bonjour ${prenom} ! 👋
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Vous avez été invité(e) à participer à un <strong>voyage surprise</strong> ! 🌍
              </p>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Pour que nous puissions trouver la destination parfaite pour vous, merci de compléter le questionnaire ci-dessous avec votre code d'accès.
              </p>
              
              <!-- Code Box -->
              <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 0 0 30px 0; border-radius: 8px;">
                <p style="color: #2d3748; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">
                  Votre code d'accès :
                </p>
                <p style="color: #667eea; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                  ${code}
                </p>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://passs-two.vercel.app?action=code&c=${code}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                      🚀 Accéder à mon questionnaire
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                💡 <strong>Astuce :</strong> Complétez le questionnaire en toute honnêteté pour que votre destination soit vraiment adaptée à vos envies !
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
          to: [email],
          subject: '🌍 Votre voyage surprise vous attend !',
          html: emailHtml,
        });

        console.log(`✅ Email envoyé à ${email}:`, result);
        return { success: true, email, messageId: result.id };
      } catch (error) {
        console.error(`❌ Erreur envoi email à ${email}:`, error);
        return { success: false, email, error: error.message };
      }
    });

    // Attendre que tous les emails soient envoyés
    const results = await Promise.all(emailPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`📊 Résultats: ${successCount} envoyés, ${failureCount} échoués`);

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      results,
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
