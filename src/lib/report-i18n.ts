import type { Analysis, Verdict } from "@/lib/analysis";

export type SupportedLanguage = "en" | "kn" | "hi" | "te";

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
];

export interface ReportDictionary {
  title: string;
  subtitle: string;
  caseMetadata: string;
  analysisId: string;
  fileName: string;
  fileDetails: string;
  sampleRate: string;
  model: string;
  generatedDate: string;
  verdictTitle: string;
  confidence: string;
  verdicts: Record<Verdict, { label: string; summary: string }>;
  agentTraceTitle: string;
  agents: Record<
    string,
    {
      name: string;
      role: string;
      fakeFinding: string;
      realFinding: string;
      suspiciousFinding?: string;
    }
  >;
  shapTitle: string;
  limeTitle: string;
  segmentScoresTitle: string;
  featureLabels: Record<string, string>;
  disclaimerTitle: string;
  disclaimerText: string;
  pageFooter: string;
}

export const REPORT_TRANSLATIONS: Record<SupportedLanguage, ReportDictionary> = {
  en: {
    title: "Forensic Audio Authenticity Report",
    subtitle: "Agentic AI for Deepfake Audio Detection with Explainable AI (XAI)",
    caseMetadata: "Case Metadata",
    analysisId: "Analysis ID",
    fileName: "File Name",
    fileDetails: "File Details",
    sampleRate: "Sample Rate",
    model: "Forensic Model",
    generatedDate: "Generated At",
    verdictTitle: "Forensic Verdict",
    confidence: "Confidence",
    verdicts: {
      authentic: {
        label: "AUTHENTIC HUMAN VOICE",
        summary:
          "The multi-agent panel found no reliable synthesis markers. Micro-prosody, breath events and channel characteristics are consistent with a genuine human recording.",
      },
      deepfake: {
        label: "SYNTHETIC / DEEPFAKE",
        summary:
          "The multi-agent panel converged on a synthetic-origin verdict. Vocoder-style phase artifacts and unnaturally smooth formant transitions dominate the evidence, while environmental coherence checks failed.",
      },
      suspicious: {
        label: "SUSPICIOUS — REVIEW",
        summary:
          "Evidence is mixed. Some segments carry weak synthesis markers while prosody and breath patterns look human. Recommend manual review of the flagged segments.",
      },
    },
    agentTraceTitle: "Agent Reasoning Trace",
    agents: {
      "Acoustic Agent": {
        name: "Acoustic Agent",
        role: "Spectral & prosody forensics",
        fakeFinding: "Formant transitions show machine-smooth interpolation between phonemes.",
        realFinding: "Prosodic contour and jitter fall inside natural speaker variance.",
      },
      "Artifact Agent": {
        name: "Artifact Agent",
        role: "Vocoder fingerprinting",
        fakeFinding: "Periodic phase artifacts detected near 7.8 kHz, consistent with neural vocoders.",
        realFinding: "No vocoder comb pattern found in the high-frequency residual.",
      },
      "Context Agent": {
        name: "Context Agent",
        role: "Channel & environment coherence",
        fakeFinding: "Room reverb tail is inconsistent with the claimed recording environment.",
        realFinding: "Background noise floor is continuous and physically plausible.",
      },
      "Adjudicator Agent": {
        name: "Adjudicator Agent",
        role: "Evidence fusion & final call",
        fakeFinding: "Weighted fusion of sub-agent evidence supports a synthetic-origin verdict.",
        realFinding: "Weighted fusion of sub-agent evidence supports a human-origin verdict.",
      },
    },
    shapTitle: "SHAP Feature Attributions (Global Impact)",
    limeTitle: "LIME Local Segment Explanations",
    segmentScoresTitle: "Segment Scores Timeline",
    featureLabels: {
      "Vocoder phase artifacts": "Vocoder phase artifacts",
      "Formant transition smoothness": "Formant transition smoothness",
      "Micro-prosody jitter": "Micro-prosody jitter",
      "Breath & pause realism": "Breath & pause realism",
      "Spectral flatness (HF)": "Spectral flatness (HF)",
      "Room impulse coherence": "Room impulse coherence",
      "Shimmer / amplitude noise": "Shimmer / amplitude noise",
    },
    disclaimerTitle: "Forensic Admissibility & Notice",
    disclaimerText:
      "This report is produced by an automated multi-agent forensic pipeline operating on an acoustic deepfake detection ensemble. It is intended to support, not replace, expert human review and should not be treated as a sole basis for legal or disciplinary action.",
    pageFooter: "Forensic Evidence Dossier · Automated Multi-Agent Pipeline",
  },

  kn: {
    title: "ಫೋರೆನ್ಸಿಕ್ ಆಡಿಯೋ ಅಧಿಕೃತತೆಯ ವರದಿ",
    subtitle: "ವಿವರಣಾತ್ಮಕ AI (XAI) ಯೊಂದಿಗೆ ಡೀಪ್‌ಫೇಕ್ ಆಡಿಯೋ ಪತ್ತೆಗಾಗಿ ಏಜೆಂಟಿಕ್ AI",
    caseMetadata: "ಪ್ರಕರಣದ ಮೆಟಾಡೇಟಾ (ವಿವರಗಳು)",
    analysisId: "ವಿಶ್ಲೇಷಣೆ ಐಡಿ (ID)",
    fileName: "ಆಡಿಯೋ ಫೈಲ್",
    fileDetails: "ಫೈಲ್ ವಿವರಗಳು",
    sampleRate: "ಮಾದರಿ ದರ (Sample Rate)",
    model: "ಫೋರೆನ್ಸಿಕ್ ಮಾದರಿ",
    generatedDate: "ವರದಿ ದಿನಾಂಕ",
    verdictTitle: "ಫೋರೆನ್ಸಿಕ್ ಅಂತಿಮ ತೀರ್ಪು",
    confidence: "ವಿಶ್ವಾಸಾರ್ಹತೆ",
    verdicts: {
      authentic: {
        label: "ಅಧಿಕೃತ ಮಾನವ ಧ್ವನಿ (REAL)",
        summary:
          "ಬಹು-ಏಜೆಂಟ್ ಸಮಿತಿಯು ಯಾವುದೇ ಕೃತಕ ಸಿಂಥೆಟಿಕ್ ಗುರುತುಗಳನ್ನು ಕಂಡುಕೊಂಡಿಲ್ಲ. ಮೈಕ್ರೋ-ಪ್ರೊಸೋಡಿ, ನೈಸರ್ಗಿಕ ಉಸಿರಾಟ ಮತ್ತು ಚಾನಲ್ ಗುಣಲಕ್ಷಣಗಳು ಅಸಲಿ ಮಾನವ ಧ್ವನಿಮುದ್ರಣಕ್ಕೆ ಸಂಪೂರ್ಣ ಹೊಂದಿಕೆಯಾಗುತ್ತವೆ.",
      },
      deepfake: {
        label: "ಸಿಂಥೆಟಿಕ್ / ಡೀಪ್‌ಫೇಕ್ (FAKE)",
        summary:
          "ಬಹು-ಏಜೆಂಟ್ ಸಮಿತಿಯು ಸಿಂಥೆಟಿಕ್ / ಕೃತಕ ಧ್ವನಿ ಎಂಬ ತೀರ್ಪನ್ನು ನೀಡಿದೆ. ವೋಕೋಡರ್-ಹಂತದ ಕಲಾಕೃತಿಗಳು ಮತ್ತು ಅಸ್ವಾಭಾವಿಕ ಸುಗಮ ಫಾರ್ಮ್ಯಾಂಟ್ ಪರಿವರ್ತನೆಗಳು ಧ್ವನಿಯಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಕಂಡುಬಂದಿವೆ.",
      },
      suspicious: {
        label: "ಅನುಮಾನಾಸ್ಪದ — ಪರಿಶೀಲಿಸಿ (REVIEW)",
        summary:
          "ಸಾಕ್ಷ್ಯಗಳು ಮಿಶ್ರ ಫಲಿತಾಂಶಗಳನ್ನು ಹೊಂದಿವೆ. ಕೆಲವು ಆಡಿಯೋ ಭಾಗಗಳಲ್ಲಿ ಸಂಶ್ಲೇಷಣೆಯ ಗುರುತುಗಳಿದ್ದು, ಉಳಿದವು ನೈಸರ್ಗಿಕವಾಗಿವೆ. ಹಸ್ತಚಾಲಿತ ಪರಿಶೀಲನೆಯನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.",
      },
    },
    agentTraceTitle: "ಏಜೆಂಟ್ ತಾರ್ಕಿಕ ವಿಶ್ಲೇಷಣೆಯ ಹಾದಿ",
    agents: {
      "Acoustic Agent": {
        name: "ಅಕೌಸ್ಟಿಕ್ ಏಜೆಂಟ್ (Acoustic)",
        role: "ಸ್ಪೆಕ್ಟ್ರಲ್ ಮತ್ತು ಪ್ರೊಸೋಡಿ ವಿಧಿವಿಜ್ಞಾನ",
        fakeFinding: "ಧ್ವನಿ ಪರಿವರ್ತನೆಗಳು ಯಂತ್ರ-ರಚಿತ ಅಸ್ವಾಭಾವಿಕ ಇಂಟರ್‌ಪೋಲೇಶನ್ ತೋರಿಸುತ್ತವೆ.",
        realFinding: "ಪ್ರೊಸೋಡಿಕ್ ಬಾಹ್ಯರೇಖೆ ಮತ್ತು ಜಿಟ್ಟರ್ ನೈಸರ್ಗಿಕ ಸ್ಪೀಕರ್ ವ್ಯತ್ಯಾಸದ ವ್ಯಾಪ್ತಿಯಲ್ಲಿದೆ.",
      },
      "Artifact Agent": {
        name: "ಆರ್ಟಿಫ್ಯಾಕ್ಟ್ ಏಜೆಂಟ್ (Artifact)",
        role: "ವೋಕೋಡರ್ ಫಿಂಗರ್‌ಪ್ರಿಂಟಿಂಗ್ ವಿಶ್ಲೇಷಣೆ",
        fakeFinding: "ನ್ಯೂರಲ್ ವೋಕೋಡರ್‌ಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಆವರ್ತನ ಕಲಾಕೃತಿಗಳು ಪತ್ತೆಯಾಗಿವೆ.",
        realFinding: "ಹೆಚ್ಚಿನ ಆವರ್ತನದ ಧ್ವನಿಯಲ್ಲಿ ಯಾವುದೇ ವೋಕೋಡರ್ ಕೃತಕ ಮಾದರಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
      },
      "Context Agent": {
        name: "ಸಂದರ್ಭ ಏಜೆಂಟ್ (Context)",
        role: "ಚಾನಲ್ ಮತ್ತು ಪರಿಸರ ಧ್ವನಿ ಸುಸಂಬದ್ಧತೆ",
        fakeFinding: "ರೆಕಾರ್ಡಿಂಗ್ ಪರಿಸರ ಮತ್ತು ಪ್ರತಿಧ್ವನಿ ನೈಸರ್ಗಿಕವಾಗಿಲ್ಲ.",
        realFinding: "ಹಿನ್ನೆಲೆ ಶಬ್ದದ ಮಟ್ಟ ನಿರಂತರವಾಗಿದ್ದು ನೈಸರ್ಗಿಕ ನೈಜತೆಗೆ ಬದ್ಧವಾಗಿದೆ.",
      },
      "Adjudicator Agent": {
        name: "ತೀರ್ಪುಗಾರ ಏಜೆಂಟ್ (Adjudicator)",
        role: "ಸಾಕ್ಷ್ಯಗಳ ಸಮ್ಮಿಲನ ಮತ್ತು ಅಂತಿಮ ತೀರ್ಪು",
        fakeFinding: "ಎಲ್ಲಾ ಏಜೆಂಟ್‌ಗಳ ಸಂಯೋಜಿತ ಸಾಕ್ಷ್ಯವು ಇದು ಕೃತಕ ಸಿಂಥೆಟಿಕ್ ಧ್ವನಿ ಎಂದು ದೃಢಪಡಿಸುತ್ತದೆ.",
        realFinding: "ಎಲ್ಲಾ ಏಜೆಂಟ್‌ಗಳ ಸಂಯೋಜಿತ ಸಾಕ್ಷ್ಯವು ಇದು ನೈಜ ಮಾನವ ಧ್ವನಿ ಎಂದು ದೃಢಪಡಿಸುತ್ತದೆ.",
      },
    },
    shapTitle: "SHAP ವೈಶಿಷ್ಟ್ಯಗಳ ಕೊಡುಗೆ (ವೈಜ್ಞಾನಿಕ ಪುರಾವೆ)",
    limeTitle: "LIME ಸ್ಥಳೀಯ ವಿಭಾಗೀಯ ವಿವರಣೆ",
    segmentScoresTitle: "ವಿಭಾಗವಾರು ಸ್ಕೋರ್ ಟೈಮ್‌ಲೈನ್",
    featureLabels: {
      "Vocoder phase artifacts": "ವೋಕೋಡರ್ ಹಂತದ ಕಲಾಕೃತಿಗಳು",
      "Formant transition smoothness": "ಫಾರ್ಮ್ಯಾಂಟ್ ಪರಿವರ್ತನೆ ಸುಗಮತೆ",
      "Micro-prosody jitter": "ಮೈಕ್ರೋ-ಪ್ರೊಸೋಡಿ ಜಿಟ್ಟರ್",
      "Breath & pause realism": "ಉಸಿರಾಟ ಮತ್ತು ವಿರಾಮದ ವಾಸ್ತವಿಕತೆ",
      "Spectral flatness (HF)": "ಸ್ಪೆಕ್ಟ್ರಲ್ ಫ್ಲಾಟ್‌ನೆಸ್ (HF)",
      "Room impulse coherence": "ಕೋಣೆಯ ಪ್ರಚೋದನೆಯ ಸುಸಂಬದ್ಧತೆ",
      "Shimmer / amplitude noise": "ಶಿಮ್ಮರ್ / ವೈಶಾಲ್ಯ ಶಬ್ದ",
    },
    disclaimerTitle: "ಕಾನೂನು ಹಕ್ಕುತ್ಯಾಗ ಮತ್ತು ಸೂಚನೆ",
    disclaimerText:
      "ಈ ವರದಿಯು ಅಕೌಸ್ಟಿಕ್ ಡೀಪ್‌ಫೇಕ್ ಪತ್ತೆ ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುವ ಸ್ವಯಂಚಾಲಿತ ವಿಧಿವಿಜ್ಞಾನ ಪೈಪ್‌ಲೈನ್ ಮೂಲಕ ತಯಾರಿಸಲ್ಪಟ್ಟಿದೆ. ಇದು ತಜ್ಞರ ಪರಿಶೀಲನೆಗೆ ಪೂರಕವಾಗಿ ಮಾತ್ರ ಬಳಸಲ್ಪಡಬೇಕು, ಮತ್ತು ಕಾನೂನು ಕ್ರಮಕ್ಕೆ ಏಕೈಕ ಆಧಾರವಾಗಿ ಪರಿಗಣಿಸಬಾರದು.",
    pageFooter: "ಫೋರೆನ್ಸಿಕ್ ಪುರಾವೆಗಳ ದಾಖಲೆ · ಸ್ವಯಂಚಾಲಿತ AI ಪೈಪ್‌ಲೈನ್",
  },

  hi: {
    title: "फोरेंसिक ऑडियो प्रामाणिकता रिपोर्ट",
    subtitle: "व्याख्यात्मक AI (XAI) के साथ डीपफेक ऑडियो पहचान हेतु एजेंटिक AI",
    caseMetadata: "केस मेटाडेटा (विवरण)",
    analysisId: "विश्लेषण आईडी (ID)",
    fileName: "ऑडियो फ़ाइल",
    fileDetails: "फ़ाइल विवरण",
    sampleRate: "नमूना दर (Sample Rate)",
    model: "फोरेंसिक मॉडल",
    generatedDate: "उत्पन्न तिथि",
    verdictTitle: "फोरेंसिक अंतिम निर्णय",
    confidence: "विश्वसनीयता (कॉन्फिडेंस)",
    verdicts: {
      authentic: {
        label: "प्रामाणिक मानव आवाज़ (REAL)",
        summary:
          "मल्टी-एजेंट पैनल को कोई भी सिंथेटिक या कृत्रिम मार्कर नहीं मिले। सूक्ष्म-प्रोसॉडी, प्राकृतिक श्वसन और चैनल विशेषताएं वास्तविक मानव रिकॉर्डिंग के पूर्णतः अनुरूप हैं।",
      },
      deepfake: {
        label: "सिंथेटिक / डीपफेक (FAKE)",
        summary:
          "मल्टी-एजेंट पैनल ने सिंथेटिक-उत्पत्ति का निर्णय दिया है। वोकोडर-शैली के फेज़ आर्टिफैक्ट्स और अप्राकृतिक चिकने फॉर्मैंट संक्रमण साक्ष्यों में स्पष्ट रूप से पाए गए हैं।",
      },
      suspicious: {
        label: "संदिग्ध — समीक्षा आवश्यक (REVIEW)",
        summary:
          "साक्ष्य मिश्रित हैं। कुछ ऑडियो खंडों में कमजोर संश्लेषण मार्कर पाए गए हैं जबकि अन्य खंड स्वाभाविक हैं। मैन्युअल विशेषज्ञ समीक्षा की सिफारिश की जाती है।",
      },
    },
    agentTraceTitle: "एजेंट तर्क विश्लेषण साक्ष्य",
    agents: {
      "Acoustic Agent": {
        name: "ध्वनिक एजेंट (Acoustic)",
        role: "स्पेक्ट्रल एवं प्रोसॉडी फोरेंसिक",
        fakeFinding: "ध्वनि संक्रमण में कृत्रिम मशीन-सुलभ इंटरपोलेशन दिखाई देता है।",
        realFinding: "प्रोसॉडिक कंटूर और जिटर प्राकृतिक मानवीय भिन्नता के भीतर हैं।",
      },
      "Artifact Agent": {
        name: "आर्टिफैक्ट एजेंट (Artifact)",
        role: "वोकोडर फिंगरप्रिंटिंग जांच",
        fakeFinding: "न्यूरल वोकोडर के अनुरूप 7.8 kHz के पास आवधिक फेज़ आर्टिफैक्ट्स मिले।",
        realFinding: "उच्च-आवृत्ति वाले अवशिष्ट में कोई वोकोडर पैटर्न नहीं मिला।",
      },
      "Context Agent": {
        name: "संदर्भ एजेंट (Context)",
        role: "चैनल एवं पर्यावरण सुसंगतता",
        fakeFinding: "ध्वनि रिकॉर्डिंग का कमरा और गूंज दावा किए गए वातावरण से असंगत है।",
        realFinding: "पृष्ठभूमि का शोर स्तर निरंतर और भौतिक रूप से स्वाभाविक है।",
      },
      "Adjudicator Agent": {
        name: "निर्णायक एजेंट (Adjudicator)",
        role: "साक्ष्य संलयन एवं अंतिम निर्णय",
        fakeFinding: "सभी उप-एजेंटों के संयुक्त साक्ष्य सिंथेटिक/डीपफेक ध्वनि की पुष्टि करते हैं।",
        realFinding: "सभी उप-एजेंटों के संयुक्त साक्ष्य वास्तविक मानव ध्वनि की पुष्टि करते हैं।",
      },
    },
    shapTitle: "SHAP फीचर विशेषता योगदान (वैश्विक प्रभाव)",
    limeTitle: "LIME स्थानीय खंड स्पष्टीकरण",
    segmentScoresTitle: "समयरेखा खंड स्कोर",
    featureLabels: {
      "Vocoder phase artifacts": "वोकोडर फेज़ आर्टिफैक्ट्स",
      "Formant transition smoothness": "फॉर्मैंट ट्रांज़िशन चिकनाई",
      "Micro-prosody jitter": "माइक्रो-प्रोसॉडी जिटर",
      "Breath & pause realism": "सांस और विराम यथार्थवाद",
      "Spectral flatness (HF)": "स्पेक्ट्रल फ्लैटनेस (HF)",
      "Room impulse coherence": "कमरे के आवेग की सुसंगतता",
      "Shimmer / amplitude noise": "शिमर / आयाम शोर",
    },
    disclaimerTitle: "कानूनी अस्वीकरण एवं सूचना",
    disclaimerText:
      "यह रिपोर्ट एक ध्वनिक डीपफेक पहचान प्रणाली पर आधारित स्वचालित फोरेंसिक पाइपलाइन द्वारा तैयार की गई है। यह विशेषज्ञ मानवीय समीक्षा का समर्थन करने के लिए है, इसे बदलने के लिए नहीं, और इसे कानूनी कार्रवाई का एकमात्र आधार नहीं माना जाना चाहिए।",
    pageFooter: "फोरेंसिक साक्ष्य दस्तावेज़ · स्वचालित मल्टी-एजेंट पाइपलाइन",
  },

  te: {
    title: "ఫోరెన్సిక్ ఆడియో ప్రామాణికత నివేదిక",
    subtitle: "వివరణాత్మక AI (XAI) తో డీప్‌ఫేక్ ఆడియో గుర్తింపు కోసం ఏజెంటిక్ AI",
    caseMetadata: "కేస్ మెటాడేటా (వివరాలు)",
    analysisId: "విశ్లేషణ ID",
    fileName: "ఆడియో ఫైల్",
    fileDetails: "ఫైల్ వివరాలు",
    sampleRate: "శాంపిల్ రేట్ (Sample Rate)",
    model: "ఫోరెన్సిక్ మోడల్",
    generatedDate: "నివేదిక తేదీ",
    verdictTitle: "ఫోరెన్సిక్ తుది తీర్పు",
    confidence: "విశ్వసనీయత (కాన్ఫిడెన్స్)",
    verdicts: {
      authentic: {
        label: "ప్రామాణిక మానవ స్వరం (REAL)",
        summary:
          "మల్టీ-ఏజెంట్ ప్యానెల్ ఎటువంటి సింథటిక్ గుర్తులను కనుగొనలేదు. మైక్రో-ప్రోసోడీ, సహజమైన శ్వాస ఈవెంట్లు మరియు ఛానల్ లక్షణాలు నిజమైన మానవ రికార్డింగ్‌కు అనుగుణంగా ఉన్నాయి.",
      },
      deepfake: {
        label: "సింథటిక్ / డీప్‌ఫేక్ (FAKE)",
        summary:
          "మల్టీ-ఏజెంట్ ప్యానెల్ ఇది సింథటిక్ / డీప్‌ఫేక్ స్వరం అని నిర్ధారించింది. వోకోడర్-శైలి ఫేజ్ ఆర్టిఫాక్ట్‌లు మరియు అసహజమైన మృదువైన ఫార్మాంట్ మార్పులు సాక్ష్యాలలో స్పష్టంగా కనిపించాయి.",
      },
      suspicious: {
        label: "అనుమానాస్పదం — సమీక్షించండి (REVIEW)",
        summary:
          "సాక్ష్యాలు మిశ్రమంగా ఉన్నాయి. కొన్ని ఆడియో భాగాలలో సింథసిస్ గుర్తులు ఉండగా, మరికొన్ని సహజంగా ఉన్నాయి. మానవ నిపుణుల సమీక్ష సిఫార్సు చేయబడింది.",
      },
    },
    agentTraceTitle: "ఏజెంట్ తార్కిక విశ్లేషణ",
    agents: {
      "Acoustic Agent": {
        name: "అకౌస్టిక్ ఏజెంట్ (Acoustic)",
        role: "స్పెక్ట్రల్ & ప్రోసోడీ ఫోరెన్సిక్స్",
        fakeFinding: "ధ్వని మార్పులలో యంత్ర-ఆధారిత అసహజమైన ఇంటర్‌పోలేషన్ కనిపించింది.",
        realFinding: "ప్రోసోడిక్ ఆకృతి మరియు జిట్టర్ సహజ స్పీకర్ వైవిధ్యం పరిధిలోనే ఉన్నాయి.",
      },
      "Artifact Agent": {
        name: "ఆర్టిఫాక్ట్ ఏజెంట్ (Artifact)",
        role: "వోకోడర్ వేలిముద్రల విశ్లేషణ",
        fakeFinding: "న్యూరల్ వోకోడర్‌లకు అనుగుణంగా ఆవర్తన ఫేజ్ ఆర్టిఫాక్ట్‌లు గుర్తించబడ్డాయి.",
        realFinding: "హై-ఫ్రీక్వెన్సీ అవశేషాలలో ఎటువంటి వోకోడర్ ప్యాటర్న్ కనుగొనబడలేదు.",
      },
      "Context Agent": {
        name: "కాంటెక్స్ట్ ఏజెంట్ (Context)",
        role: "ఛానల్ & పర్యావరణ సమన్వయం",
        fakeFinding: "రికార్డింగ్ గది ప్రతిధ్వని పేర్కొన్న వాతావరణానికి సరిపోలడం లేదు.",
        realFinding: "నేపథ్య శబ్దం స్థిరంగా మరియు సహజంగా ఉంది.",
      },
      "Adjudicator Agent": {
        name: "తీర్పు ఏజెంట్ (Adjudicator)",
        role: "సాక్ష్యాల సమ్మేళనం & తుది తీర్పు",
        fakeFinding: "అన్ని ఏజెంట్ల సమిష్టి సాక్ష్యం ఇది సింథటిక్ డీప్‌ఫేక్ స్వరం అని నిర్ధారిస్తుంది.",
        realFinding: "అన్ని ఏజెంట్ల సమిష్టి సాక్ష్యం ఇది నిజమైన మానవ స్వరం అని నిర్ధారిస్తుంది.",
      },
    },
    shapTitle: "SHAP ఫీచర్ లక్షణాల ప్రభావం",
    limeTitle: "LIME స్థానిక విభాగ వివరణ",
    segmentScoresTitle: "విభాగాల స్కోర్ టైమ్‌లైన్",
    featureLabels: {
      "Vocoder phase artifacts": "వోకోడర్ ఫేజ్ ఆర్టిఫాక్ట్‌లు",
      "Formant transition smoothness": "ఫార్మాంట్ మార్పుల మృదుత్వం",
      "Micro-prosody jitter": "మైక్రో-ప్రోసోడీ జిట్టర్",
      "Breath & pause realism": "శ్వాస & విరామం సహజత్వం",
      "Spectral flatness (HF)": "స్పెక్ట్రల్ ఫ్లాట్‌నెస్ (HF)",
      "Room impulse coherence": "గది ప్రేరణ సమన్వయం",
      "Shimmer / amplitude noise": "షిమ్మర్ / వ్యాప్తి శబ్దం",
    },
    disclaimerTitle: "చట్టపరమైన నిరాకరణ మరియు గమనిక",
    disclaimerText:
      "ఈ నివేదిక ఆటోమేటెడ్ మల్టీ-ఏజెంట్ ఫోరెన్సిక్ పైప్‌లైన్ ద్వారా రూపొందించబడింది. ఇది నిపుణులైన మానవ సమీక్షకు మద్దతు ఇవ్వడానికి మాత్రమే ఉద్దేశించబడింది, ప్రత్యామ్నాయం కాదు, మరియు చట్టపరమైన చర్యలకు ఏకైక ప్రాతిపదికగా పరిగణించరాదు.",
    pageFooter: "ఫోరెన్సిక్ సాక్ష్యాల నివేదిక · ఆటోమేటెడ్ AI పైప్‌లైన్",
  },
};

export function getDictionary(lang: SupportedLanguage = "en"): ReportDictionary {
  return REPORT_TRANSLATIONS[lang] || REPORT_TRANSLATIONS.en;
}
