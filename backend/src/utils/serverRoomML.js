import natural from 'natural';

class ServerRoomClassifier {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.train();
  }

  train() {
    console.log("Training local ML classifier with server room dataset...");

    // ==========================================
    // DATASET: NORMAL / OK (Label: 'normal')
    // ==========================================
    const normalCases = [
      "tout est ok", "RAS", "rien a signaler", "fonctionne correctement",
      "température normale", "température à 20 degrés", "clim ok", "ventilation active",
      "aucun problème détecté", "serveurs en ligne", "baie propre", "cablage rangé",
      "humidité à 45%", "hygrométrie parfaite", "pas de fuite", "salle propre",
      "onduleur chargé", "batteries à 100%", "tension stable", "courant continu",
      "accès sécurisé", "porte bien fermée", "alarme muette", "voyants au vert",
      "pas de bruit suspect", "silence habituel", "inspection de routine terminée",
      "aucun défaut constaté", "système nominal", "paramètres dans la norme",
      "test réseau réussi", "ping ok", "latence faible", "bande passante optimale",
      "sauvegarde terminée avec succès", "backup ok", "disques sains",
      "RAID normal", "aucun disque défaillant", "mise à jour effectuée",
      "patch appliqué", "redémarrage planifié effectué", "maintenance de routine",
      "poussière nettoyée", "filtres changés récemment", "clim révisée",
      "tout baigne", "ras sur l'ensemble de la salle", "température optimale",
      "serveur web up", "base de données accessible", "switch fonctionnel",
      "routeur ok", "fibre connectée", "lien actif", "redondance ok"
    ];

    // ==========================================
    // DATASET: ISSUE / ANORMAL (Label: 'issue')
    // ==========================================
    const issueCases = [
      // Temperature / AC
      "température élevée", "surchauffe", "trop chaud", "chaleur étouffante",
      "clim en panne", "climatisation défectueuse", "erreur groupe froid",
      "ventilation arrêtée", "ventilateur HS", "fan error", "température anormale",
      "alerte température", "baie surchauffe", "serveur brulant", "pièce chaude",
      "clim coule", "fuite d'eau clim", "refroidissement insuffisant",
      
      // Humidity / Water
      "humidité élevée", "trop humide", "condensation sur les murs",
      "fuite détectée", "eau au sol", "flaque d'eau", "infiltration",
      "hygrométrie critique", "risque de court-circuit eau", "environnement trop sec",
      "risque électrostatique",

      // Power / Electrical
      "panne de courant", "coupure électrique", "onduleur en alarme",
      "UPS bip", "batterie faible onduleur", "batterie à remplacer",
      "surtension détectée", "baisse de tension", "court-circuit",
      "disjoncteur sauté", "problème alimentation", "câble d'alimentation abimé",
      "prise défectueuse", "odeur de brulé", "fumée", "étincelle",

      // Hardware / Network
      "serveur hors ligne", "serveur crashé", "panne machine", "disque dur cassé",
      "disque en erreur", "RAID dégradé", "voyant rouge baie", "alarme baie",
      "bruit anormal", "bruit métallique", "sifflement strident", "cliquetis",
      "switch hs", "perte de connexion", "plus de réseau", "lien tombé",
      "port défectueux", "câble arraché", "fibre pliée", "équipement injoignable",
      
      // Security / Environment
      "porte ouverte", "accès forcé", "intrusion suspectée", "serrure bloquée",
      "badgeuse en panne", "alarme incendie", "détecteur de fumée déclenché",
      "présence de poussière importante", "salle très sale", "déchets dans la salle",
      "extincteur périmé", "désordre important", "non conforme"
    ];

    normalCases.forEach(text => this.classifier.addDocument(text, 'normal'));
    issueCases.forEach(text => this.classifier.addDocument(text, 'issue'));

    this.classifier.train();
    console.log("Local ML training complete.");
  }

  isIssue(text) {
    if (!text || text.trim() === '') return false;
    const classification = this.classifier.classify(text);
    return classification === 'issue';
  }

  getRiskScore(texts) {
    if (!texts || texts.length === 0) return 0;
    
    let issueCount = 0;
    texts.forEach(text => {
      if (this.isIssue(text)) {
        issueCount++;
      }
    });

    return {
      issues: issueCount,
      total: texts.length,
      riskPercentage: Math.round((issueCount / texts.length) * 100)
    };
  }
}

// Export singleton instance
export const mlClassifier = new ServerRoomClassifier();
