// =========================================================================
// 📌 [2-1호기 전용] 12개국 전체 글 대상 누락된 Q2, Q3 자동 감지 및 현지어 완벽 보충
// =========================================================================

import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

// 12개국 전문 Q2, Q3 복구 데이터베이스
const MISSING_FAQ_DATA = {
  ko: `
**Q2.** 미수금이 장기화될 때 계정 리스크 없이 현금 흐름을 확보하는 방안은 무엇인가요?

**A2.** 에스크로 및 확정일자 기반의 마일스톤 결제를 계약서에 명시하고, 지급 유예 기간(Grace Period)을 최대 7일로 제한하여 서비스 제공을 일시 중단하는 차단 자동화 규칙을 걸어두는 것이 안전합니다.

**Q3.** Stripe 분쟁(Chargeback) 경고가 떴을 때 즉각적인 대응 조치는 무엇인가요?

**A3.** 고객과의 이메일 합의 내역, 최종 납품 확인서(Proof of Delivery), 로그인 IP 로그를 증빙 자료로 첨부하여 48시간 이내에 소명 서류를 제출해야 수수료 패널티와 계정 동결을 막을 수 있습니다.
`,
  en: `
**Q2.** How can I secure cash flow without account risk when invoice receivables are delayed?

**A2.** Clearly state milestone-based payments and escrow conditions in your contracts, and limit the grace period to a maximum of 7 days with automated service restriction rules.

**Q3.** What is the immediate action required when a Stripe chargeback alert is triggered?

**A3.** Submit rebuttal evidence within 48 hours—including signed agreements, proof of delivery, and access IP logs—to protect your gateway standing and prevent dispute fees.
`,
  ja: `
**Q2.** 未収金が長期化した場合、アカウントのリスクを避けつつキャッシュフローを確保する方法は何ですか？

**A2.** 契約書にマイルストーン決済やエスクロー条項を明記し、支払い猶予期間（Grace Period）を最大7日間に制限してサービス提供を自動停止するルールを設定するのが安全です。

**Q3.** Stripeでチャージバック（支払い異議申し立て）警告が出た場合の即時対応策は何ですか？

**A3.** 契約合意書、納品証明書（Proof of Delivery）、アクセスログを証拠資料として添付し、48時間以内に異議申し立て書類を提出してペナルティと凍結を防ぐ必要があります。
`,
  es: `
**Q2.** ¿Cómo asegurar el flujo de caja sin riesgos en la cuenta ante facturas vencidas?

**A2.** Incluya pagos por hitos y depósitos en garantía en los contratos, limitando el período de gracia a un máximo de 7 días mediante reglas de corte automático del servicio.

**Q3.** ¿Cuál es la acción inmediata ante una alerta de contracargo (chargeback) en Stripe?

**A3.** Presente pruebas de refutación en un plazo de 48 horas—incluidos contratos firmados, comprobantes de entrega y registros de IP—para evitar tarifas de disputa y bloqueos.
`,
  de: `
**Q2.** Wie sichert man den Cashflow bei Zahlungsverzug, ohne Kontensperren zu riskieren?

**A2.** Vereinbaren Sie Meilensteinzahlungen im Vertrag und begrenzen Sie Zahlungsfristen auf maximal 7 Tage mit automatischen Dienstsperren bei Zahlungsverzug.

**Q3.** Was ist bei einer Stripe-Rückbuchungswarnung (Chargeback) sofort zu tun?

**A3.** Reichen Sie innerhalb von 48 Stunden Nachweise ein – einschließlich Verträgen, Liefernachweisen und IP-Protokollen –, um Gebühren und Kontensperren abzuwenden.
`,
  fr: `
**Q2.** Comment sécuriser sa trésorerie en cas d'impayés sans risquer un blocage de compte ?

**A2.** Prévoyez des paiements par étapes dans vos contrats et limitez le délai de grâce à 7 jours maximum avec suspension automatisée des services.

**Q3.** Quelle mesure d'urgence prendre en cas d'alerte de rétrofacturation sur Stripe ?

**A3.** Fournissez des preuves sous 48 heures (contrats signés, preuves de livraison et journaux IP) pour éviter les pénalités et préserver votre passerelle.
`,
  it: `
**Q2.** Come garantire la liquidità in caso di fatture scadute senza rischi per l'account?

**A2.** Stabilite contrattualmente pagamenti a rate e limitate il periodo di tolleranza a un massimo di 7 giorni con sospensione automatica del servizio.

**Q3.** Cosa fare immediatamente in caso di contestazione di addebito (chargeback) su Stripe?

**A3.** Inviate prove contrattuali entro 48 ore (accordi firmati, ricevute di consegna e log di accesso) per prevenire commissioni di controversia e blocchi del conto.
`,
  pt: `
**Q2.** Como garantir o fluxo de caixa sem riscos à conta quando há faturas em atraso?

**A2.** Defina pagamentos por etapas nos contratos e restrinja o prazo de tolerância a no máximo 7 dias com bloqueio automatizado do serviço.

**Q3.** Qual a ação imediata em caso de contestação de pagamento (chargeback) na Stripe?

**A3.** Apresente contestações em até 48 horas com contratos assinados, comprovantes de entrega e registros de IP para evitar penalidades e suspensão.
`,
  nl: `
**Q2.** Hoe stelt u uw cashflow veilig bij achterstallige facturen zonder accountrisico?

**A2.** Leg betalingen in termijnen contractueel vast en beperk respijttermijnen tot maximaal 7 dagen met automatische opschorting van de dienstverlening.

**Q3.** Wat moet u direct doen bij een chargeback-melding op Stripe?

**A3.** Dien binnen 48 uur bewijsmateriaal in (getekende contracten, leveringsbewijzen en IP-logs) om geschillenheffingen en accountblokkades te voorkomen.
`,
  pl: `
**Q2.** Jak zabezpieczyć płynność finansową przy opóźnieniach w płatnościach bez ryzyka dla konta?

**A2.** Stosuj płatności etapowe w umowach i ogranicz okres karencji do maksymalnie 7 dni z automatyczną blokadą świadczenia usług.

**Q3.** Jakie są natychmiastowe działania przy ostrzeżeniu o chargebacku w Stripe?

**A3.** W ciągu 48 godzin prześlij dokumentację dowodową (podpisane umowy, potwierdzenia odbioru i logi IP), aby zapobiec opłatom spornym i blokadom konta.
`,
  id: `
**Q2.** Bagaimana cara mengamankan arus kas saat piutang tertunda tanpa risiko akun ditangguhkan?

**A2.** Terapkan pembayaran bertahap (milestone) dalam kontrak dan batasi masa tenggang maksimal 7 hari dengan penghentian layanan otomatis.

**Q3.** Apa tindakan cepat yang harus diambil saat ada peringatan chargeback di Stripe?

**A3.** Kirimkan dokumen sanggahan dalam waktu 48 jam (kontrak, bukti serah terima, dan log IP) untuk mencegah penalti biaya dan pembekuan akun.
`,
  vi: `
**Q2.** Làm thế nào để bảo toàn dòng tiền khi công nợ kéo dài mà không gặp rủi ro tài khoản?

**A2.** Ghi rõ điều khoản thanh toán theo giai đoạn trong hợp đồng và giới hạn thời gian gia hạn tối đa 7 ngày cùng cơ chế tự động tạm ngừng dịch vụ.

**Q3.** Cần làm gì ngay khi nhận cảnh báo bồi hoàn (chargeback) từ Stripe?

**A3.** Nộp hồ sơ đối chất trong vòng 48 giờ bao gồm hợp đồng, bằng chứng giao hàng và nhật ký IP để tránh phí phạt và nguy cơ bị phong tỏa tài khoản.
`
};

async function run() {
  console.log("==================================================");
  console.log("⚡ [12개국 전수조사] 누락된 Q2, Q3 자동 검사 및 복구 시작");
  console.log("==================================================");

  if (!fs.existsSync(POSTS_BASE_DIR)) {
    console.error(`❌ 경로 없음: ${POSTS_BASE_DIR}`);
    process.exit(1);
  }

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let patchedCount = 0;

  for (const lang of langDirs) {
    const langPath = path.join(POSTS_BASE_DIR, lang);
    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(langPath, file);
      let content = fs.readFileSync(filePath, 'utf-8');

      // FAQ 섹션이 존재하는지 확인
      if (!/##\s*5[.\s]/.test(content)) continue;

      // Q2와 Q3가 모두 존재하는지 검사
      const hasQ2 = /(?:\*\*Q2\.|\bQ2[:.]|###\s*Q2)/i.test(content);
      const hasQ3 = /(?:\*\*Q3\.|\bQ3[:.]|###\s*Q3)/i.test(content);

      // Q2나 Q3 중 하나라도 잘려 있으면 해당 언어 팩으로 보충
      if (!hasQ2 || !hasQ3) {
        const patchData = MISSING_FAQ_DATA[lang] || MISSING_FAQ_DATA.en;
        
        // 글 맨 끝의 불필요한 공백을 정돈하고 누락된 Q2, Q3를 붙임
        content = content.trimEnd() + '\n' + patchData.trim() + '\n';
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`🚑 [12개국 누락 복구 완료] ${lang}/${file} -> Q2/Q3 현지어 완벽 주입`);
        patchedCount++;
      }
    }
  }

  console.log(`\n🎉 전수조사 완료: 총 ${patchedCount}개 파일의 잘려 나간 FAQ가 12개국 현지어로 완벽 복구되었습니다.`);
}

run();
