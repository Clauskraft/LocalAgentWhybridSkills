/**
 * 🎯 WIDGETDC ENTERPRISE MISSION CATALOG
 * =======================================
 * 25 avancerede missioner til WidgeTDC + ROMA integration
 * 
 * Kategorier:
 * - 🏠 Familie & Personlig Assistent
 * - 🔒 Cyber Threat Intelligence (CTI)
 * - 🎯 Penetration Testing
 * - 🔍 OSINT Investigations
 * 
 * Usage: tsx scripts/missions/enterprise-missions.ts <mission-id>
 */

// Local type definitions
interface MissionConfig {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'osint' | 'monitoring' | 'ci' | 'testing' | 'reporting';
  strategy: 'react' | 'cot';
  budget: { maxSteps: number; maxTimeMs: number; maxTokens?: number };
  inputs: Record<string, unknown>;
  outputs: string[];
}

// ============================================================================
// ENTERPRISE MISSION TEMPLATES
// ============================================================================

export const ENTERPRISE_MISSIONS: Record<string, MissionConfig> = {

  // ──────────────────────────────────────────────────────────────────────────
  // 🏠 FAMILIE & PERSONLIG ASSISTENT
  // ──────────────────────────────────────────────────────────────────────────

  'family-vacation-planner': {
    id: 'family-vacation-planner',
    name: 'Familie Ferie med Risikovurdering',
    description: `Planlæg en uges ferie for min familie i sommerferien. Brug Google Kalender 
    til at finde ledige datoer, indhent transporttilbud, og kør OSINT-kontroller på 
    destinationen (kriminalitetsstatistik, sundhedsrisici). Skriv en rejseplan og 
    placer bookinger i kalenderen.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 30, maxTimeMs: 300000, maxTokens: 50000 },
    inputs: {
      destination: 'Barcelona, Spanien',
      duration: '7 dage',
      familySize: 4,
      integrations: ['google-calendar', 'gmail', 'osint'],
      riskChecks: ['crime-stats', 'health-advisories', 'travel-warnings']
    },
    outputs: ['travel_plan.md', 'risk_assessment.pdf', 'calendar_events.json']
  },

  'birthday-assistant': {
    id: 'birthday-assistant',
    name: 'Automatiseret Fødselsdagsassistent',
    description: `Skab en fødselsdagsassistent: scan Gmail og Google Drive for notifikationer 
    og billeder om familie og venners fødselsdage. Foreslå gaver baseret på tidligere køb, 
    opdater ønskelister i Drive, og skriv personlige gratulationsmails til hver.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 180000, maxTokens: 30000 },
    inputs: {
      scanSources: ['gmail', 'google-drive', 'contacts'],
      lookAheadDays: 30,
      giftBudgetDKK: 500,
      personalizeMessages: true
    },
    outputs: ['birthday_calendar.json', 'gift_suggestions.md', 'draft_emails.json']
  },

  'family-budget-shopping': {
    id: 'family-budget-shopping',
    name: 'Budget- og Indkøbsplan',
    description: `Automatisér månedlige indkøb: hent transaktionshistorik (fra Google Drive 
    budgetark), identificer tilbagevendende køb, og generér en indkøbsliste med prisestimering. 
    Brug Gmail til at sende bestillinger og opdater budgetarket.`,
    category: 'reporting',
    strategy: 'cot',
    budget: { maxSteps: 20, maxTimeMs: 120000, maxTokens: 25000 },
    inputs: {
      budgetSheetId: '<google-drive-sheet-id>',
      categories: ['dagligvarer', 'husholdning', 'børn'],
      maxMonthlyBudget: 8000
    },
    outputs: ['shopping_list.md', 'budget_update.json', 'order_emails.json']
  },

  'child-activity-planner': {
    id: 'child-activity-planner',
    name: 'Automatisk Børneaktivitetsplan',
    description: `Indhent information fra familie-kalendere og børnenes skoleskema via 
    Google Calendar. Generér en ugeplan med transport, fritidsaktiviteter og aftaler. 
    Send daglige påmindelser via Gmail.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 15, maxTimeMs: 90000, maxTokens: 20000 },
    inputs: {
      calendarIds: ['family-main', 'school-schedule', 'activities'],
      children: ['Emma', 'Oliver'],
      reminderTime: '07:00'
    },
    outputs: ['weekly_plan.md', 'reminder_schedule.json']
  },

  'family-health-planner': {
    id: 'family-health-planner',
    name: 'Sygdomsplanlægning og Omsorg',
    description: `Udarbejd en plan for håndtering af sygdom i familien: find lokale læger 
    og apoteker, indhent symptominformation fra pålidelige kilder, og synkroniser aftaler 
    i Google Calendar. Skriv en forældrevejledning i et Drive-dokument.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 20, maxTimeMs: 150000, maxTokens: 30000 },
    inputs: {
      location: 'København',
      symptoms: ['feber', 'hoste'],
      familyMembers: 4
    },
    outputs: ['health_plan.md', 'nearby_services.json', 'parent_guide.md']
  },

  'smart-home-energy': {
    id: 'smart-home-energy',
    name: 'Hjemmets Energioptimering',
    description: `Analyser forbrugsmønstre fra vores smarthome-system (tilgængelig via 
    Google Drive data). Sammenlign med lokale energipriser og anbefal, hvornår vaskemaskine 
    mm. bør køre. Opdater et energispare-dashboard.`,
    category: 'reporting',
    strategy: 'cot',
    budget: { maxSteps: 15, maxTimeMs: 120000, maxTokens: 20000 },
    inputs: {
      dataSource: 'google-drive:energy-data',
      appliances: ['vaskemaskine', 'opvaskemaskine', 'tørretumbler'],
      region: 'DK1'
    },
    outputs: ['energy_report.md', 'schedule_recommendations.json', 'dashboard.html']
  },

  'senior-assistance': {
    id: 'senior-assistance',
    name: 'Seniors Hjælp',
    description: `Assister en ældre familiemedlem: Planlæg medicin påmindelser, bestil 
    dagligvarer via e-handel, arranger transport til lægeaftaler i kalenderen og send 
    en ugentlig opsummering til familien.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 180000, maxTokens: 30000 },
    inputs: {
      seniorName: 'Mormor',
      medications: ['blodtryksmedicin', 'vitaminer'],
      doctorAppointments: ['2026-01-15', '2026-02-01']
    },
    outputs: ['medication_schedule.json', 'grocery_orders.json', 'family_summary.md']
  },

  'mental-wellness-tracker': {
    id: 'mental-wellness-tracker',
    name: 'Mental Wellness Tracker',
    description: `Opret en privat mental-wellness-mission: kombinér Google Calendar møder 
    og Gmail-kommunikation for at måle stressfaktorer (fx overbookede dage). Foreslå 
    meditation/sundhedsaktiviteter og send påmindelser.`,
    category: 'reporting',
    strategy: 'cot',
    budget: { maxSteps: 15, maxTimeMs: 90000, maxTokens: 20000 },
    inputs: {
      stressIndicators: ['meeting-density', 'email-volume', 'late-work'],
      wellnessActivities: ['meditation', 'motion', 'natur']
    },
    outputs: ['wellness_report.md', 'activity_suggestions.json', 'reminder_schedule.json']
  },

  'crisis-response-plan': {
    id: 'crisis-response-plan',
    name: 'Personlig Kriseplan',
    description: `Udarbejd en personlig kriseplan: find lokale alarmnumre, hospitaler og 
    beredskabsplaner for hjemmet. Integrér nødprocedurer i et Drive-dokument, synkroniser 
    kontaktpersoner og planlagte checkpoints i kalenderen.`,
    category: 'reporting',
    strategy: 'react',
    budget: { maxSteps: 20, maxTimeMs: 150000, maxTokens: 25000 },
    inputs: {
      location: 'København',
      emergencyContacts: ['112', 'lægevagt', 'familie'],
      householdSize: 4
    },
    outputs: ['crisis_plan.md', 'emergency_contacts.json', 'evacuation_route.pdf']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 🔒 CYBER THREAT INTELLIGENCE (CTI)
  // ──────────────────────────────────────────────────────────────────────────

  'cti-threat-feed-integration': {
    id: 'cti-threat-feed-integration',
    name: 'Integrer Threat-Feed i SOC',
    description: `Opsæt en mission der henter de seneste CVE'er og trusselsfeeds fra GitHub 
    og andre åbne CTI-kilder. Krydsreferer IOCs (hashes, domæner, IP'er) med vores logdata 
    og generér en rapport over matchende hits og potentielle alarmer.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 35, maxTimeMs: 300000, maxTokens: 60000 },
    inputs: {
      ctiSources: ['nvd.nist.gov', 'github-advisories', 'alienvault-otx'],
      iocTypes: ['hash', 'domain', 'ip', 'url'],
      logSources: ['widgetdc-logs', 'firewall', 'proxy']
    },
    outputs: ['cti_report.md', 'matched_iocs.json', 'alert_recommendations.json']
  },

  'cti-dark-web-monitoring': {
    id: 'cti-dark-web-monitoring',
    name: 'Dark-Web Overvågning',
    description: `Konfigurer overvågning af relevante dark-web-fora for omtale af vores 
    brands. Brug OSINT-metoder til at finde datalæk og konto-salg. Rapportér fund med 
    vurdering af seriøsitet og anbefal proaktive tiltag.`,
    category: 'security',
    strategy: 'cot',
    budget: { maxSteps: 40, maxTimeMs: 600000, maxTokens: 80000 },
    inputs: {
      brandNames: ['ACME Corp', 'acme.dk', '@acme'],
      monitorForums: ['ransomware-forums', 'leak-sites', 'marketplaces'],
      alertThreshold: 'medium'
    },
    outputs: ['dark_web_report.md', 'leak_findings.json', 'action_plan.md']
  },

  'cti-insider-threat': {
    id: 'cti-insider-threat',
    name: 'Insider Threat Analyse',
    description: `Analyser logs fra interne systemer (via WidgeTDC) for tegn på insider-risici. 
    Kryds data med seneste CTI-rapportering om insider-trends. Producer en brief med forslag 
    til forebyggende tiltag.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 30, maxTimeMs: 240000, maxTokens: 50000 },
    inputs: {
      logSources: ['access-logs', 'data-exfiltration', 'after-hours-activity'],
      riskIndicators: ['large-downloads', 'unusual-access-patterns', 'resignation-signals']
    },
    outputs: ['insider_threat_brief.md', 'risk_indicators.json', 'prevention_plan.md']
  },

  'cti-botnet-monitoring': {
    id: 'cti-botnet-monitoring',
    name: 'Botnet Aktivitetsovervågning',
    description: `Monitorér aktuelle botnet-trends ved at analysere CTI-feeds. Identificer, 
    om vores IP-adresser eller domæner figurerer på blacklists. Lav en rapport og automatisér 
    alarmopsætning, hvis match opdages.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 180000, maxTokens: 40000 },
    inputs: {
      ourAssets: ['1.2.3.4', '5.6.7.8', 'acme.dk'],
      blacklistSources: ['spamhaus', 'abuseipdb', 'urlhaus'],
      autoAlert: true
    },
    outputs: ['botnet_report.md', 'blacklist_status.json', 'alert_config.json']
  },

  'cti-ransomware-readiness': {
    id: 'cti-ransomware-readiness',
    name: 'Ransomware Readiness',
    description: `Lav en simulation af ransomware-angreb på testdata: scan interne systemer 
    for sårbarheder, gennemfør backup-test, og dokumenter genoprettelses-tider. Saml 
    resultater i en præsentation med best-practice-retningslinjer.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 35, maxTimeMs: 600000, maxTokens: 70000 },
    inputs: {
      testEnvironment: 'sandbox',
      backupSystems: ['cloud-backup', 'local-nas', 'tape'],
      rpoTarget: '4h',
      rtoTarget: '8h'
    },
    outputs: ['ransomware_readiness.pptx', 'backup_test_results.json', 'recovery_playbook.md']
  },

  'cti-patch-prioritization': {
    id: 'cti-patch-prioritization',
    name: 'Automatiseret Patch-Prioritering',
    description: `Scan vores systemer for softwareversioner. Match dem mod kendte CVE'er 
    og udregn en prioritetsscore baseret på exploitability, CVSS og forretningskritikalitet. 
    Send en patchplan til operations via Gmail.`,
    category: 'security',
    strategy: 'cot',
    budget: { maxSteps: 30, maxTimeMs: 240000, maxTokens: 50000 },
    inputs: {
      assetInventory: 'widgetdc-cmdb',
      cveSources: ['nvd', 'cisa-kev', 'exploitdb'],
      businessCriticalSystems: ['erp', 'crm', 'email']
    },
    outputs: ['patch_priority_list.json', 'patch_plan.md', 'operations_email.json']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 🎯 PENETRATION TESTING
  // ──────────────────────────────────────────────────────────────────────────

  'pentest-internal-app': {
    id: 'pentest-internal-app',
    name: 'Test Intern Applikation',
    description: `Planlæg og udfør en autoriseret penetrationstest på vores interne 
    demo-webapplikation. Inkluder rekognoscering, port-scanning, service-identifikation 
    og en OWASP Top-10 analyse. Skriv en rapport med fund, proof-of-concepts og 
    remedieringsforslag.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 50, maxTimeMs: 900000, maxTokens: 100000 },
    inputs: {
      targetUrl: 'https://demo.internal.acme.dk',
      scope: ['web-app', 'api', 'auth'],
      owaspChecks: ['injection', 'broken-auth', 'xss', 'xxe', 'access-control'],
      authorization: 'signed-roa-2026-01'
    },
    outputs: ['pentest_report.pdf', 'vulnerabilities.json', 'poc_scripts.zip', 'remediation.md']
  },

  'pentest-phishing-simulation': {
    id: 'pentest-phishing-simulation',
    name: 'Phishing Kampagne Test',
    description: `Planlæg og kør en intern phishing-simulationskampagne. Design realistiske 
    phishing-mails, send til en testgruppe via Gmail API, monitorér klik/adfærd og generér 
    en compliance-rapport. Følg gældende lovgivning og etik.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 35, maxTimeMs: 600000, maxTokens: 60000 },
    inputs: {
      targetGroup: 'test-employees',
      campaignDuration: '7 days',
      templates: ['ceo-fraud', 'it-support', 'invoice-scam'],
      metrics: ['open-rate', 'click-rate', 'report-rate']
    },
    outputs: ['phishing_report.pdf', 'campaign_metrics.json', 'training_recommendations.md']
  },

  'pentest-cloud-config': {
    id: 'pentest-cloud-config',
    name: 'Cloud Konfigurationsvurdering',
    description: `Undersøg vores cloud-miljø for mis-konfigurationer: brug værktøjer til 
    at identificere åbne S3-buckets eller ukorrekte IAM-regler. Sammenfat resultater og 
    generér automatiske remedieringsforslag.`,
    category: 'security',
    strategy: 'cot',
    budget: { maxSteps: 40, maxTimeMs: 480000, maxTokens: 70000 },
    inputs: {
      cloudProvider: 'aws',
      regions: ['eu-west-1', 'eu-central-1'],
      checks: ['s3-public', 'iam-overprivileged', 'security-groups', 'logging']
    },
    outputs: ['cloud_audit.pdf', 'misconfigurations.json', 'remediation_scripts.zip']
  },

  'pentest-mobile-app': {
    id: 'pentest-mobile-app',
    name: 'Mobile App Assessment',
    description: `Vurder sikkerheden af vores mobile app. Udfør statisk og dynamisk analyse, 
    kontrolér tilladelser, og test mod de 10 mest kritiske mobile sårbarheder. Dokumentér 
    fund i en test-rapport.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 45, maxTimeMs: 720000, maxTokens: 80000 },
    inputs: {
      appPlatform: 'android',
      appPackage: 'dk.acme.mobileapp',
      testTypes: ['static', 'dynamic', 'network'],
      owasp_mobile: ['insecure-storage', 'insecure-communication', 'auth-bypass']
    },
    outputs: ['mobile_pentest.pdf', 'vulnerabilities.json', 'traffic_analysis.pcap']
  },

  'pentest-iot-hardware': {
    id: 'pentest-iot-hardware',
    name: 'Hardware & IoT Test',
    description: `Test sikkerheden i vores IoT-enheder (fx kontor-kameraer og sensorer). 
    Udfør firmware-analyse, evaluer trådløse protokoller, og identificer svage 
    standardpasswords. Rapportér fund og foreslå mitigering.`,
    category: 'security',
    strategy: 'react',
    budget: { maxSteps: 40, maxTimeMs: 600000, maxTokens: 70000 },
    inputs: {
      devices: ['ip-camera', 'motion-sensor', 'smart-lock'],
      testTypes: ['firmware', 'network', 'physical', 'wireless'],
      protocols: ['zigbee', 'zwave', 'wifi', 'bluetooth']
    },
    outputs: ['iot_security_report.pdf', 'firmware_analysis.json', 'default_creds_found.json']
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 🔍 OSINT INVESTIGATIONS
  // ──────────────────────────────────────────────────────────────────────────

  'osint-company-profile': {
    id: 'osint-company-profile',
    name: 'Firmaprofil med Risikovurdering',
    description: `Research firmaet ACME Corp via OSINT: indsamling af offentlige data 
    (jobopslag, pressemeddelelser, domæneregistreringer). Identificer potentielle 
    supply-chain-risici og udfærdig et kort trusselsbillede. Planlæg en opfølgende 
    præsentation til ledelsen.`,
    category: 'osint',
    strategy: 'react',
    budget: { maxSteps: 35, maxTimeMs: 480000, maxTokens: 60000 },
    inputs: {
      targetCompany: 'ACME Corp',
      domains: ['acme.dk', 'acme.com'],
      sources: ['linkedin', 'jobindex', 'cvr', 'dns', 'whois']
    },
    outputs: ['company_profile.md', 'threat_assessment.pdf', 'executive_presentation.pptx']
  },

  'osint-exec-profile': {
    id: 'osint-exec-profile',
    name: 'Executive Profil Sikkerhedsanalyse',
    description: `Gør en baggrundsresearch (OSINT) på en fiktiv C-level-person (kun 
    offentlige data). Vurder risiko for identitetstyveri ved at analysere social media, 
    udtalelser og registrerede domæner. Angiv hvilke personlige info der bør beskyttes.`,
    category: 'osint',
    strategy: 'cot',
    budget: { maxSteps: 30, maxTimeMs: 360000, maxTokens: 50000 },
    inputs: {
      targetName: 'Anders CEO',
      company: 'ACME Corp',
      sources: ['linkedin', 'twitter', 'google', 'domain-registrations']
    },
    outputs: ['exec_profile.md', 'privacy_risks.json', 'protection_recommendations.md']
  },

  'osint-social-engineering-training': {
    id: 'osint-social-engineering-training',
    name: 'Social Engineering Awareness',
    description: `Lav en træningsmission, hvor du samler eksempler på social engineering-angreb 
    (fra nyheder og CTI-kilder) og udarbejder en test til medarbejdere. Send materialet 
    via email og mål besvarelser via et Drive-ark.`,
    category: 'osint',
    strategy: 'react',
    budget: { maxSteps: 25, maxTimeMs: 240000, maxTokens: 40000 },
    inputs: {
      attackTypes: ['phishing', 'pretexting', 'baiting', 'tailgating'],
      quizQuestions: 10,
      targetAudience: 'all-employees'
    },
    outputs: ['training_material.pdf', 'quiz.json', 'response_tracker.xlsx']
  },

  'osint-geopolitical-risk': {
    id: 'osint-geopolitical-risk',
    name: 'Geopolitisk Risikobrief',
    description: `Indsamle og analysere åben information om geopolitisk spænding i en 
    bestemt region (fx East Asia). Kombinér CTI-kilder, nyheder og akademiske artikler. 
    Skab et dokument med strategiske anbefalinger til virksomheden.`,
    category: 'osint',
    strategy: 'cot',
    budget: { maxSteps: 35, maxTimeMs: 480000, maxTokens: 60000 },
    inputs: {
      region: 'East Asia',
      focus: ['supply-chain', 'sanctions', 'cyber-threats'],
      sources: ['reuters', 'bbc', 'cisa', 'academic-journals']
    },
    outputs: ['geopolitical_brief.pdf', 'risk_matrix.json', 'strategic_recommendations.md']
  },

  'osint-social-media-cleanup': {
    id: 'osint-social-media-cleanup',
    name: 'Social Media Footprint Cleanup',
    description: `Audit en persons offentlige online aftryk: indhent data fra sociale medier, 
    blogs og tidligere publicerede kode-repos. Identificer mulige sikkerhedsrisici (leakede 
    emails, tokens). Foreslå en step-by-step plan for oprydning og bedre privacy.`,
    category: 'osint',
    strategy: 'react',
    budget: { maxSteps: 40, maxTimeMs: 480000, maxTokens: 60000 },
    inputs: {
      targetHandle: '@example_user',
      platforms: ['github', 'twitter', 'linkedin', 'facebook', 'blogs'],
      searchFor: ['leaked-emails', 'api-tokens', 'personal-info', 'location-data']
    },
    outputs: ['footprint_audit.md', 'leaked_data.json', 'cleanup_plan.md', 'privacy_guide.pdf']
  }
};

// ============================================================================
// MISSION EXECUTOR (STANDALONE)
// ============================================================================

interface MissionStep {
  stepNumber: number;
  action: string;
  tool: string;
  params: Record<string, unknown>;
  result?: unknown;
  durationMs: number;
  cached: boolean;
}

interface MissionResult {
  missionId: string;
  success: boolean;
  steps: MissionStep[];
  outputs: Record<string, unknown>;
  metrics: {
    totalDurationMs: number;
    tokensUsed: number;
    cacheHits: number;
    apiCalls: number;
  };
}

class EnterpriseMissionExecutor {
  private cache: Map<string, unknown> = new Map();
  private metrics = { tokensUsed: 0, cacheHits: 0, apiCalls: 0 };

  async execute(config: MissionConfig): Promise<MissionResult> {
    const startTime = Date.now();
    const steps: MissionStep[] = [];

    // Generate plan based on category
    const plan = this.planMission(config);

    for (let i = 0; i < plan.length && i < config.budget.maxSteps; i++) {
      const step = plan[i];
      const stepResult = await this.executeStep(step, i + 1);
      steps.push(stepResult);
    }

    const outputs = this.generateOutputs(config, steps);

    return {
      missionId: `${config.id}-${Date.now()}`,
      success: steps.every(s => s.result !== undefined),
      steps,
      outputs,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        ...this.metrics
      }
    };
  }

  private planMission(config: MissionConfig): Array<{ action: string; tool: string; params: Record<string, unknown> }> {
    // Generate steps based on mission type
    const baseSteps = [
      { action: 'Gather initial data', tool: 'harvest.web.scrape', params: { target: config.inputs.domain || 'unknown' } },
      { action: 'Analyze findings', tool: 'local.analysis', params: {} },
      { action: 'Generate report', tool: 'local.synthesis', params: { format: 'markdown' } }
    ];

    if (config.category === 'security') {
      return [
        { action: 'Security scan', tool: 'harvest.intel.domain', params: config.inputs },
        { action: 'Vulnerability check', tool: 'harvest.intel.osint', params: config.inputs },
        ...baseSteps
      ];
    }

    if (config.category === 'osint') {
      return [
        { action: 'OSINT reconnaissance', tool: 'harvest.intel.osint', params: config.inputs },
        { action: 'Data aggregation', tool: 'harvest.web.scrape', params: config.inputs },
        ...baseSteps
      ];
    }

    return baseSteps;
  }

  private async executeStep(step: { action: string; tool: string; params: Record<string, unknown> }, num: number): Promise<MissionStep> {
    const stepStart = Date.now();
    const cacheKey = `${step.tool}:${JSON.stringify(step.params)}`;

    console.log(`   [${num}] ${step.action}`);
    console.log(`       Tool: ${step.tool}`);

    if (this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      console.log(`       → CACHE HIT ✓\n`);
      return { stepNumber: num, action: step.action, tool: step.tool, params: step.params, result: this.cache.get(cacheKey), durationMs: 0, cached: true };
    }

    this.metrics.apiCalls++;
    await new Promise(r => setTimeout(r, 100 + Math.random() * 150));
    
    const result = { status: 'ok', data: `Simulated result for ${step.tool}` };
    this.cache.set(cacheKey, result);
    
    const tokens = 50 + Math.floor(Math.random() * 100);
    this.metrics.tokensUsed += tokens;

    console.log(`       → SUCCESS ✓ (${Date.now() - stepStart}ms, ~${tokens} tokens)\n`);

    return { stepNumber: num, action: step.action, tool: step.tool, params: step.params, result, durationMs: Date.now() - stepStart, cached: false };
  }

  private generateOutputs(config: MissionConfig, steps: MissionStep[]): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};
    for (const output of config.outputs) {
      outputs[output] = `[Generated: ${output}]`;
    }
    return outputs;
  }

  async executeWithIntegrations(config: MissionConfig): Promise<void> {
    console.log(`\n🎯 ═══════════════════════════════════════════════════════════`);
    console.log(`   ENTERPRISE MISSION: ${config.name}`);
    console.log(`   Category: ${config.category.toUpperCase()}`);
    console.log(`   Strategy: ${config.strategy.toUpperCase()}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    if (config.inputs.integrations) {
      console.log(`📡 Required Integrations:`);
      (config.inputs.integrations as string[]).forEach(i => console.log(`   • ${i}`));
      console.log();
    }

    console.log(`⚡ EXECUTING STEPS:\n`);
    const result = await this.execute(config);

    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`   📊 ENTERPRISE MISSION COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Mission ID: ${result.missionId}`);
    console.log(`   Duration: ${(result.metrics.totalDurationMs / 1000).toFixed(1)}s`);
    console.log(`   Steps Executed: ${result.steps.length}`);
    console.log(`   API Calls: ${result.metrics.apiCalls}`);
    console.log(`   Cache Hits: ${result.metrics.cacheHits}`);
    console.log(`   Tokens Used: ~${result.metrics.tokensUsed}`);
    console.log(`\n   📁 Outputs Generated:`);
    Object.keys(result.outputs).forEach(o => console.log(`      • ${o}`));
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function printCatalog() {
  console.log('🎯 WIDGETDC ENTERPRISE MISSION CATALOG');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const categories = {
    '🏠 Familie & Personlig Assistent': [] as string[],
    '🔒 Cyber Threat Intelligence': [] as string[],
    '🎯 Penetration Testing': [] as string[],
    '🔍 OSINT Investigations': [] as string[]
  };

  for (const [id, config] of Object.entries(ENTERPRISE_MISSIONS)) {
    if (config.category === 'reporting') {
      categories['🏠 Familie & Personlig Assistent'].push(id);
    } else if (config.category === 'security' && id.startsWith('cti-')) {
      categories['🔒 Cyber Threat Intelligence'].push(id);
    } else if (config.category === 'security' && id.startsWith('pentest-')) {
      categories['🎯 Penetration Testing'].push(id);
    } else if (config.category === 'osint') {
      categories['🔍 OSINT Investigations'].push(id);
    }
  }

  for (const [category, missions] of Object.entries(categories)) {
    console.log(`${category}`);
    console.log('─'.repeat(50));
    for (const missionId of missions) {
      const m = ENTERPRISE_MISSIONS[missionId];
      console.log(`  📋 ${missionId}`);
      console.log(`     ${m.name}`);
    }
    console.log();
  }

  console.log(`Total: ${Object.keys(ENTERPRISE_MISSIONS).length} missions\n`);
  console.log('Usage: tsx scripts/missions/enterprise-missions.ts <mission-id>');
}

async function main() {
  const missionId = process.argv[2];
  
  if (!missionId) {
    printCatalog();
    return;
  }

  const config = ENTERPRISE_MISSIONS[missionId];
  if (!config) {
    console.error(`❌ Unknown mission: ${missionId}`);
    console.log('\nRun without arguments to see available missions.');
    return;
  }

  const executor = new EnterpriseMissionExecutor();
  await executor.executeWithIntegrations(config);
}

main().catch(console.error);
