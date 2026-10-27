import fs from 'fs';
import path from 'path';

// 포스트 기본 경로
const POSTS_BASE_DIR = path.resolve('src/data/post');

// 12개국 표준 5대 소제목
const I18N_TITLES = {
  ko: {
    s1: "## 1. 직장인 식은땀 나는 돌발 상황",
    s2: "## 2. 오류와 병목의 진짜 핵심 원인 분석",
    s3: "## 3. 1분 만에 끝내는 단계별 실무 해결법",
    s4: "## 4. 현직 엔지니어의 핵심 주의사항 및 실무 팁",
    s5: "## 5. 자주 묻는 질문 (FAQ)"
  },
  en: {
    s1: "## 1. Workplace Emergency Situation",
    s2: "## 2. Root Cause Breakdown",
    s3: "## 3. Step-by-Step Practical Resolution",
    s4: "## 4. Professional Engineer Precautions & Tips",
    s5: "## 5. Frequently Asked Questions (FAQ)"
  },
  de: {
    s1: "## 1. Kritische Fehlersituation am Arbeitsplatz",
    s2: "## 2. Detaillierte Ursachenanalyse",
    s3: "## 3. Schritt-für-Schritt-Lösungsanleitung",
    s4: "## 4. Praxistipps und Warnungen vom System-Admin",
    s5: "## 5. Häufig gestellte Fragen (FAQ)"
  },
  ja: {
    s1: "## 1. 職場で冷や汗をかいた緊急トラブル",
    s2: "## 2. エラーとボトルネックの根本原因",
    s3: "## 3. 1分で完了する実践的な解決手順",
    s4: "## 4. 現役エンジニアが教える注意点とコツ",
    s5: "## 5. よくある質問 (FAQ)"
  },
  fr: {
    s1: "## 1. Situation d'urgence critique au bureau",
    s2: "## 2. Analyse des causes principales de l'erreur",
    s3: "## 3. Guide de résolution étape par étape",
    s4: "## 4. Conseils et précautions d'un expert système",
    s5: "## 5. Foire Aux Questions (FAQ)"
  },
  es: {
    s1: "## 1. Emergencia crítica en el trabajo",
    s2: "## 2. Análisis detallado de la causa raíz",
    s3: "## 3. Solución práctica paso a paso",
    s4: "## 4. Advertencias y consejos de un técnico",
    s5: "## 5. Preguntas Frecuentes (FAQ)"
  },
  it: {
    s1: "## 1. Emergenza improvvisa sul posto di lavoro",
    s2: "## 2. Analisi approfondita della causa principale",
    s3: "## 3. Soluzione pratica passo dopo passo",
    s4: "## 4. Avvertenze e suggerimenti dell'esperto",
    s5: "## 5. Domande Frequenti (FAQ)"
  },
  pt: {
    s1: "## 1. Situação de emergência no trabalho",
    s2: "## 2. Análise da causa raiz do problema",
    s3: "## 3. Guia prático de resolução passo a passo",
    s4: "## 4. Recomendações e alertas de especialistas",
    s5: "## 5. Perguntas Frecuentes (FAQ)"
  },
  nl: {
    s1: "## 1. Noodsituatie op de werkvloer",
    s2: "## 2. Grondige analyse van de hoofdoorzaak",
    s3: "## 3. Stapsgewijze praktische oplossing",
    s4: "## 4. Belangrijke waarschuwingen van IT-specialisten",
    s5: "## 5. Veelgestelde Vragen (FAQ)"
  },
  pl: {
    s1: "## 1. Nagła awaria w miejscu pracy",
    s2: "## 2. Szczegółowa analiza przyczyn źródłowych",
    s3: "## 3. Praktyczne rozwiązanie krok po kroku",
    s4: "## 4. Wskazówki i ostrzeżenia eksperta IT",
    s5: "## 5. Najczęściej zadawane pytania (FAQ)"
  },
  id: {
    s1: "## 1. Situasi Darurat Kritis di Tempat Kerja",
    s2: "## 2. Analisis Mendalam Akar Masalah",
    s3: "## 3. Panduan Langkah demi Langkah Penyelesaian Masalah",
    s4: "## 4. Tips & Peringatan Penting Teknisi IT",
    s5: "## 5. Pertanyaan yang Sering Diajukan (FAQ)"
  },
  vi: {
    s1: "## 1. Tình huống sự cố khẩn cấp tại văn phòng",
    s2: "## 2. Phân tích nguyên nhân gốc rễ chi tiết",
    s3: "## 3. Các bước khắc phục sự cố thực tế",
    s4: "## 4. Lời khuyên và lưu ý quan trọng từ kỹ sư IT",
    s5: "## 5. Các câu hỏi thường gặp (FAQ)"
  }
};

function repairMarkdownPost(rawText, langCode) {
  let text = rawText;
  const titles = I18N_TITLES[langCode] || I18N_TITLES.ko;

  // 1. 프론트매터 분리
  const fmMatch = text.match(/^---[\s\S]*?---\n*/);
  if (!fmMatch) return rawText;

  let frontmatter = fmMatch[0];
  let body = text.slice(frontmatter.length);

  // title 볼드 기호 제거
  frontmatter = frontmatter.replace(/(title:\s*["'])([^"']*)(["'])/gi, (m, p1, p2, p3) => {
    return `${p1}${p2.replace(/\*\*/g, '').trim()}${p3}`;
  });

  // 비한국어 글 프론트매터 잔여 한글 제거
  if (langCode !== 'ko') {
    frontmatter = frontmatter.replace(/(title:\s*")([^"]*)(")/g, (m, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
    frontmatter = frontmatter.replace(/(description:\s*")([^"]*)(")/g, (m, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
  }

  // 2. 상단 빈 줄 압축
  body = body.replace(/^\n+/, '');

  // 3. 쪼개진 단어 복원
  body = body.replace(/derech\s*\n\s*a:/gi, 'derecha:')
             .replace(/a la carrer\s*\n\s*a:/gi, 'a la carrera:')
             .replace(/cada un\s*\n\s*a:/gi, 'cada una:')
             .replace(/\*Not\s*\n\s*a:\*/gi, '*Nota:*')
             .replace(/del especialist\s*\n\s*a:/gi, 'del especialista:')
             .replace(/con la energi\s*\n\s*a:/gi, 'con la energía:')
             .replace(/preventiv\s*\n\s*a:/gi, 'preventiva:')
             .replace(/recuperación profund\s*\n\s*a:/gi, 'recuperación profunda:')
             .replace(/gráficos al dí\s*\n\s*a:/gi, 'gráficos al día:')
             .replace(/Delt\s*\n\s*a:/gi, 'Delta:')
             .replace(/STOP 0x0000000\s*\n\s*a:?/gi, 'STOP 0x0000000a:');

  // 4. 이미지 링크 내부 공백 오타 수정
  body = body.replace(/\?\s+auto=format/g, '?auto=format');

  // 5. 붙어버린 띄어쓰기 교정
  const wordFixes = [
    [/Ctrl \+ Shift \+ Escsimultaneously/g, 'Ctrl + Shift + Esc simultaneously'],
    [/Task Manager\(Ctrl/g, 'Task Manager (Ctrl'],
    [/Processestab/g, 'Processes tab'],
    [/findWindows Explorer/g, 'find Windows Explorer'],
    [/Windows Explorerin/g, 'Windows Explorer in'],
    [/selectRestart/g, 'select Restart'],
    [/the CLSIDkey/g, 'the CLSID key'],
    [/the\(Default\)value/g, 'the (Default) value'],
    [/clickOK/g, 'click OK'],
    [/theLogged drop-down/g, 'the Logged drop-down'],
    [/boxes forCriticalandError/g, 'boxes for Critical and Error'],
    [/Terminal \(Admin\)orCommand Prompt/g, 'Terminal (Admin) or Command Prompt'],
    [/TerminalorPowerShell/g, 'Terminal or PowerShell'],
    [/TerminalorInvite/g, 'Terminal or Invite'],
    [/hitCheck for updates/g, 'hit Check for updates'],
    [/Windows 탐색기앱/g, 'Windows 탐색기 앱'],
    [/명령 프롬프트앱/g, '명령 프롬프트 앱'],
    [/작업 관리자실행/g, '작업 관리자 실행'],
    [/눌러작업 관리자를/g, '눌러 작업 관리자를'],
    [/안 열린다면Ctrl/g, '안 열린다면 Ctrl'],
    [/열린다면Ctrl/g, '열린다면 Ctrl'],
    [/해제하고변경/g, '해제하고 변경'],
    [/입력 후관리자/g, '입력 후 관리자'],
    [/도구인MemTest86/g, '도구인 MemTest86'],
    [/파일인WinDbg/g, '파일인 WinDbg'],
    [/면봉에무수소/g, '면봉에 무수소'],
    [/꿀팁:흔히/g, '꿀팁: 흔히'],
    [/Windows \+ Xund/g, 'Windows + X und'],
    [/dasTerminal/g, 'das Terminal'],
    [/ProzessWindows-Explorer/g, 'Prozess Windows-Explorer'],
    [/wählen SieNeu starten/g, 'wählen Sie Neu starten'],
    [/zu Systemund/g, 'zu System und'],
    [/klicke aufSpeicher/g, 'klicke auf Speicher'],
    [/klicke rights aufSpeicher/g, 'klicke rechts auf Speicher'],
    [/lösche sie mitEntf/g, 'lösche sie mit Entf'],
    [/Datenträgerverwaltungoder/g, 'Datenträgerverwaltung oder'],
    [/besser nochDatenträgerbereinigung/g, 'besser noch Datenträgerbereinigung'],
    [/Installation\(en\),Windows/g, 'Installation(en), Windows'],
    [/BereinigungundTemporäre/g, 'Bereinigung und Temporäre'],
    [/Terminaloder/g, 'Terminal oder'],
    [/dieEingabeaufforderung/g, 'die Eingabeaufforderung'],
    [/Abgesicherten Modus\(falls/g, 'Abgesicherten Modus (falls'],
    [/direkt dieVerwaltungstools/g, 'direkt die Verwaltungstools'],
    [/Eigenschaftenund/g, 'Eigenschaften und'],
    [/ReiterTreiber/g, 'Reiter Treiber'],
    [/Einstellungenund/g, 'Einstellungen und'],
    [/dieSystemsteuerung/g, 'die Systemsteuerung'],
    [/denTask-Manager/g, 'den Task-Manager'],
    [/Eingabeaufforderungund/g, 'Eingabeaufforderung und'],
    [/elPanel de controly/g, 'el Panel de control y'],
    [/enConfiguración/g, 'en Configuración'],
    [/elAdministrador de dispositivos/g, 'el Administrador de dispositivos'],
    [/Registros de Windowsy/g, 'Registros de Windows y'],
    [/luego seleccionaSistema/g, 'luego selecciona Sistema'],
    [/Ve a Sistemay/g, 'Ve a Sistema y'],
    [/haz clic enAlmacenamiento/g, 'haz clic en Almacenamiento'],
    [/pestaña Procesoshasta/g, 'pestaña Procesos hasta'],
    [/encontrarExplorador/g, 'encontrar Explorador'],
    [/Configuración de inicioy/g, 'Configuración de inicio y'],
    [/pestaña Controladory/g, 'pestaña Controlador y'],
    [/haz clic enRevertir/g, 'haz clic en Revertir'],
    [/Terminal\(o Símbolo/g, 'Terminal (o Símbolo'],
    [/Adaptadores de red\(y/g, 'Adaptadores de red (y'],
    [/posteriormenteControladoras/g, 'posteriormente Controladoras'],
    [/inicio aDeshabilitadoy/g, 'inicio a Deshabilitado y'],
    [/haz clic enDetener/g, 'haz clic en Detener'],
    [/Échappour lancer/g, 'Échap pour lancer'],
    [/Escpour ouvrir/g, 'Esc pour ouvrir'],
    [/ouvrir leGestionnaire/g, 'ouvrir le Gestionnaire'],
    [/l'ongletPilote/g, 'l\'onglet Pilote'],
    [/Administrateur\)ouInvite/g, 'Administrateur) ou Invite'],
    [/choisissezArrêter/g, 'choisissez Arrêter'],
    [/Paramètreset lePanneau/g, 'Paramètres et le Panneau'],
    [/redémarré leGestionnaire/g, 'redémarré le Gestionnaire'],
    [/Invite de commandeset/g, 'Invite de commandes et'],
    [/sélectionnezExécuter/g, 'sélectionnez Exécuter'],
    [/Activationpour/g, 'Activation pour'],
    [/Windows->Système/g, 'Windows -> Système'],
    [/l'applicationParamètres/g, 'l\'application Paramètres']
  ];

  for (const [pattern, replacement] of wordFixes) {
    body = body.replace(pattern, replacement);
  }

  // 6. 소제목 표준화
  body = body.replace(/^#{1,3}\s*1\.?\s*(\[Opening Story.*?\]|Opening Story.*?|\[Ouverture.*?\])/gmi, titles.s1);
  body = body.replace(/^#{1,3}\s*2\.?\s*(\[Root Cause.*?\]|Root Cause Breakdown.*?|Root Cause.*?)/gmi, titles.s2);
  body = body.replace(/^#{1,3}\s*3\.?\s*(\[Step-by-Step.*?\]|Step-by-Step Resolution.*?|Step-by-Step.*?)/gmi, titles.s3);
  body = body.replace(/^#{1,3}\s*4\.?\s*(\[Expert.*?\]|Expert Advice.*?|Expert.*?)/gmi, titles.s4);
  body = body.replace(/^#{1,3}\s*5\.?\s*(\[Frequently Asked Questions.*?\]|Frequently Asked Questions.*?|FAQ)/gmi, titles.s5);

  body = body.replace(/^1\.\s*\[Opening Story.*?\]/gmi, titles.s1);
  body = body.replace(/^2\.\s*\[Root Cause.*?\]/gmi, titles.s2);
  body = body.replace(/^3\.\s*\[Step-by-Step.*?\]/gmi, titles.s3);
  body = body.replace(/^4\.\s*\[Expert.*?\]/gmi, titles.s4);
  body = body.replace(/^5\.\s*(Frequently Asked Questions|\[Frequently Asked Questions\])/gmi, titles.s5);

  // 헤딩 누락 문장 승격
  body = body.replace(/^(왜\s+(갑자기|내|하필|맨날|윈도우|이\s+에러).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(원인 분석:.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(1\.\s+시스템 종료 불량의 근본 원인.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(1\.\s+윈도우 10 부팅 지연.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(1\.\s+하드웨어 아키텍처 및.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(###?\s*Step 1\.\s*왜 맨날.*?)/gm, `${titles.s2}\n\n$1`);

  body = body.replace(/^(Warum\s+(Windows|läuft|der|die|das).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Die drei Hauptursachen.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(3 Typische Fehlerursachen.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Root Cause Analysis:.*?)/gm, `${titles.s2}\n\n$1`);

  body = body.replace(/^(Why\s+(Your|the|Is).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(The Trap: Why.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Understanding the Blueprint:.*?)/gm, `${titles.s2}\n\n$1`);

  body = body.replace(/^(なぜ(Cドライブ|Windows|タスクバー|このエラー|起きる|「システム」|あの透かし|フリーズ).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Cドライブを圧迫する3大ボトルネック.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(1\.\s*なぜフリーズするのか？.*?)/gm, `${titles.s2}\n\n$1`);

  body = body.replace(/^(Pourquoi\s+(votre|ce|ce fichu|ce changement).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Anatomie du goulot.*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Anatomie d'un freeze.*?)/gm, `${titles.s2}\n\n$1`);

  body = body.replace(/^(Por qué\s+(aparece|se llena|tu Windows).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(¿Por qué\s+(se llena|se congela|ocurre esto|se queda|el proceso).*?)/gm, `${titles.s2}\n\n$1`);
  body = body.replace(/^(Diagnostico de Causas Raiz.*?)/gm, `${titles.s2}\n\n$1`);

  // 3번 섹션 승격
  body = body.replace(/^(\d단계\s*:\s*.*실전.*)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(단계별 해결 (방법|가이드|프로세스).*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(실무자가 검증한.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(2\.\s*1분 만에 끝내는.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(2\.\s*빠른 시작 끄기.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(실전 해결 가이드.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(현직 엔지니어가 추천하는.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(CMD 명령어를 활용한.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(맨땅에 헤딩은 그만.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(###?\s*Step 2\.\s*삽질은 그만.*?)/gm, `${titles.s3}\n\n$1`);

  body = body.replace(/^(Die Lösung:\s*Schritt-für-Schritt.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Schritt-für-Schritt-Anleitung.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(In 60 Sekunden zum schnellen Start.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Schritt-für-Schritt-Lösung.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Der Befreiungsschlag:.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(2\.\s*Schritt-für-Schritt-Entstörung.*?)/gm, `${titles.s3}\n\n$1`);

  body = body.replace(/^(Step-by-Step:\s*The 1-Minute.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Step-by-Step Resolution:.*?)/gm, `${titles.s3}\n\n$1`);

  body = body.replace(/^(【実践】.*?3ステップ.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(安全に実行できるCドライブ.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(1分で完了！スタートアップ.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(実践！.*?解決ガイド.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(超高速1分解決！.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(コマンドプロンプト（CMD）を使った.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(2\.\s*犯人はコイツだ！.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(一発解決！従来の右クリック.*?)/gm, `${titles.s3}\n\n$1`);

  body = body.replace(/^(Guide étape par étape\s*:.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Résolution express\s*:.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Guide de résolution étape par étape.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Résolution pas à pas\s*:.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Résolution étape par étape\s*:.*?)/gm, `${titles.s3}\n\n$1`);

  body = body.replace(/^(Pasos rápidos para limpiar.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Paso a Paso:\s*Como cazar.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Guía paso a paso:\s*Cómo.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Guía paso a paso:\s*Liberación.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Solución paso a paso:.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Plan de acción paso a paso.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Pasos para la solución:.*?)/gm, `${titles.s3}\n\n$1`);
  body = body.replace(/^(Guía paso a paso para solucionar.*?)/gm, `${titles.s3}\n\n$1`);

  // 4번 섹션 승격
  body = body.replace(/^(엔지니어의 실무 조언.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(전문가 조언 및 향후.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(설정 전후 비교 및.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(현업 엔지니어의 실무 주의.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(전문가 예방 팁 및.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(실무 전문가가 전하는.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(데이터 안전과 하드웨어.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(전문가가 전하는 실무 예방.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(현직 엔지니어가 전하는 실전.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(현직 엔지니어가 전하는 실무.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(3\.\s*엔지니어 실무 점검.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(4\.\s*엔지니어 경고 및.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Expert Warning.*?)/gm, `${titles.s4}\n\n$1`);

  body = body.replace(/^(Experten-Warnung.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Kritische Experten-Warnung.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Maßnahmen zur Sofortbehebung.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Admin-Warnung:.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(3\.\s*Experten-Warnung.*?)/gm, `${titles.s4}\n\n$1`);

  body = body.replace(/^(Expert Advice.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Expert Warning and Hardware Safeguards.*?)/gm, `${titles.s4}\n\n$1`);

  body = body.replace(/^(プロが教える！日常のメンテナンス.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(再発防止のための設定基準表.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(作業時の注意点とセキュリティ.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(現場のプロからの注意点.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(再発を防ぐためのエンジニア的.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(プロが教えるトラブルシューティング.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(4\.\s*プロが教える現場の教訓.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(프로페셔널からの実用的な.*?)/gm, `${titles.s4}\n\n$1`);

  body = body.replace(/^(Conseils d'expert.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Précautions de l'expert.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Précautions d'expert.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Conseils de sécurité.*?)/gm, `${titles.s4}\n\n$1`);

  body = body.replace(/^(Consejos del técnico.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Precauciones y Consejos de Hardware.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Advertencias del experto.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Precauciones críticas para evitar.*?)/gm, `${titles.s4}\n\n$1`);
  body = body.replace(/^(Recomendaciones de estabilidad.*?)/gm, `${titles.s4}\n\n$1`);

  // Section 5 (FAQ) 표준화
  body = body.replace(/^#{0,3}\s*(\d\.\s*)?(자주 묻는 질문|Häufig gestellte Fragen|Frequently Asked Questions|よくある(ご)?質問|Questions Fréquemment Posées|Foire [Aa]ux Questions|Preguntas [Ff]recuentes|Fragen und Antworten|Expert FA).*?$/gmi, titles.s5);

  // =========================================================================
  // 🛡️ [핵심 안전 보정 1] 모든 헤딩(#) 줄 내부의 ** 강제 박멸
  // =========================================================================
  body = body.replace(/^(#{1,6}\s+[^\n]+)$/gm, (match) => {
    return match.replace(/\*\*/g, '');
  });

  // =========================================================================
  // 🛡️ [핵심 안전 보정 2] 본문 볼드(**) 기호 안쪽 공백 압축
  // =========================================================================
  body = body.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**');
  body = body.replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**');
  body = body.replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');

  // 첫 문단 1번 소제목 주입
  if (!body.startsWith('## 1.')) {
    body = `${titles.s1}\n\n` + body;
  }

  // ## 1. 소제목 바로 다음 줄에 붙은 중복 '1. 문장' 핀셋 제거
  body = body.replace(/^(## 1\.[^\n]+)\n+(\s*1\.\s+[^\n]+)\n+/m, '$1\n\n');

  // =========================================================================
  // 🛡️ [Q&A 전면 재정비] 깨진 별표 박멸, 번호 규격화, 볼드 및 줄바꿈 단일화
  // =========================================================================
  // 1) Q와 A 주변에 덕지덕지 붙은 별표(**)를 먼저 완전히 발라내어 순수 텍스트로 환원
  body = body.replace(/\*{1,4}\s*([QA][0-9]*)\s*[:.]\s*\*{1,4}/gi, '$1.');
  body = body.replace(/([QA][0-9]*)\s*[:.]/gi, (match, p1) => `${p1.toUpperCase()}.`);

  // 2) 줄바꿈 강제: Q와 A 앞머리는 무조건 빈 줄 2개로 분리
  body = body.replace(/([^\n])\s*\n*\s*(Q[0-9]*\.)/gi, '$1\n\n$2');
  body = body.replace(/([^\n])\s*\n*\s*(A[0-9]*\.)/gi, '$1\n\n$2');

  // 3) 외신/다국어 변칙 물음표 질문 대응
  body = body.replace(/^(\d+\.\s+)(¿.*?\?)\s*(.*)/gm, '**Q.** $2\n\n**A.** $3');
  body = body.replace(/^(\d+\.\s+)(.*?\?)\s*(Oui|Non|Si|No|Absolument|Para nada|E'|C'est|Ce)/gm, '**Q.** $2\n\n**A.** $3');

  // 4) 완벽한 마크다운 볼드로 단 1회만 정확하게 감싸기 (**Q1.** 본문)
  body = body.replace(/^(Q[0-9]*\.)\s*(.*)$/gm, '**$1** $2');
  body = body.replace(/^(A[0-9]*\.)\s*(.*)$/gm, '**$1** $2');

  // 5) 혹시 남은 변칙 FAQ 볼드 기호 잔여물 제거 및 물음표 띄어쓰기
  body = body.replace(/\*\*\s*\*\*/g, '');
  body = body.replace(/\?([A-Za-z\u00C0-\u024F\u1EA0-\u1EF9가-힣])/g, '? $1');

  // 과도한 빈 줄 압축
  body = body.replace(/\n{3,}/g, '\n\n');

  return frontmatter + body.trim() + '\n';
}

function run() {
  console.log("==================================================");
  console.log("🚀 [GitHub Actions] 12개국 포스트 정밀 일괄 복구 가동");
  console.log("==================================================");

  if (!fs.existsSync(POSTS_BASE_DIR)) {
    console.error(`❌ 경로가 존재하지 않습니다: ${POSTS_BASE_DIR}`);
    process.exit(1);
  }

  const langDirs = fs.readdirSync(POSTS_BASE_DIR, { withFileTypes: true })
                     .filter(dirent => dirent.isDirectory())
                     .map(dirent => dirent.name);

  let totalScanned = 0;
  let totalFixed = 0;

  for (const lang of langDirs) {
    const langPath = path.join(POSTS_BASE_DIR, lang);
    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.md'));

    console.log(`\n📂 [${lang.toUpperCase()}] 총 ${files.length}개 파일 검사 중...`);

    for (const file of files) {
      totalScanned++;
      const filePath = path.join(langPath, file);
      const original = fs.readFileSync(filePath, 'utf-8');
      const fixed = repairMarkdownPost(original, lang);

      if (original !== fixed) {
        fs.writeFileSync(filePath, fixed, 'utf-8');
        console.log(`  ✨ [정밀 복구 완료] ${file}`);
        totalFixed++;
      } else {
        console.log(`  ✔️ [이상 없음] ${file}`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 전수 복구 작업 완료!`);
  console.log(`- 스캔 파일: ${totalScanned}개`);
  console.log(`- 교정 파일: ${totalFixed}개`);
  console.log("==================================================");
}

run();
