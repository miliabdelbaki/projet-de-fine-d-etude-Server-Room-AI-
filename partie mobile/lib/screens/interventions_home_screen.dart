import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class InterventionsHomeScreen extends StatefulWidget {
  const InterventionsHomeScreen({super.key});

  @override
  State<InterventionsHomeScreen> createState() => _InterventionsHomeScreenState();
}

class _InterventionsHomeScreenState extends State<InterventionsHomeScreen> {
  List interventions = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadInterventions();
  }

  Future<void> loadInterventions() async {
    setState(() => loading = true);
    final data = await ApiService.getMyInterventions();
    if (!mounted) return;
    setState(() {
      interventions = data;
      loading = false;
    });
  }

  Future<void> _logout() async {
    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  Color _priorityColor(String? priority) {
    switch (priority) {
      case 'Critique': return Colors.red.shade700;
      case 'Haute':    return Colors.orange.shade600;
      case 'Moyenne':  return Colors.blue.shade600;
      case 'Faible':   return Colors.green.shade600;
      default:         return Colors.grey.shade600;
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'EN_ATTENTE': return Colors.orange.shade600;
      case 'EN_COURS':   return Colors.blue.shade600;
      case 'TERMINEE':   return Colors.green.shade600;
      default:           return Colors.grey.shade600;
    }
  }

  IconData _statusIcon(String? status) {
    switch (status) {
      case 'EN_ATTENTE': return Icons.hourglass_empty_outlined;
      case 'EN_COURS':   return Icons.build_outlined;
      case 'TERMINEE':   return Icons.check_circle_outline;
      default:           return Icons.help_outline;
    }
  }

  Widget _buildStatCard(String label, int value, String unit, Color accent) {
    return Container(
      width: 180,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: accent.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            value.toString(),
            style: TextStyle(
              color: Colors.black,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            unit,
            style: TextStyle(
              color: Colors.grey.shade500,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pending = interventions.where((i) => i['status'] == 'EN_ATTENTE').length;
    final inProgress = interventions.where((i) => i['status'] == 'EN_COURS').length;
    final completed = interventions.where((i) => i['status'] == 'TERMINEE').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6FA),
      appBar: AppBar(
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Espace Technicien",
              style: TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              "${interventions.length} interventions",
              style: TextStyle(
                color: Colors.black54,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.black),
            tooltip: "Déconnexion",
            onPressed: _logout,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
        onRefresh: loadInterventions,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildStatCard('Total', interventions.length, 'Interventions', const Color(0xFF00B4D8)),
                  const SizedBox(width: 12),
                  _buildStatCard('En attente', pending, 'Interventions', const Color(0xFFFF6F00)),
                  const SizedBox(width: 12),
                  _buildStatCard('En cours', inProgress, 'Interventions', const Color(0xFF1976D2)),
                  const SizedBox(width: 12),
                  _buildStatCard('Terminées', completed, 'Interventions', const Color(0xFF00E676)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (interventions.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 80),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.engineering,
                          size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text(
                        "Aucune intervention assignée",
                        style: TextStyle(
                            fontSize: 16, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "L'administrateur vous assignera des tâches",
                        style: TextStyle(
                            fontSize: 13, color: Colors.grey.shade400),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...interventions.map((item) {
                final priority = item['priority']?.toString();
                final status = item['status']?.toString();
                final roomName = item['room']?['name']?.toString() ?? 'Salle inconnue';
                final note = item['note']?.toString() ?? '';
                final priorityColor = _priorityColor(priority);
                final statusColor = _statusColor(status);

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    elevation: 2,
                    shadowColor: Colors.black.withOpacity(0.06),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () {
                        Navigator.pushNamed(
                          context,
                          '/intervention-detail',
                          arguments: item,
                        ).then((_) => loadInterventions());
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // En-tête : salle + priorité
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: priorityColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        Icons.warning_amber_outlined,
                                        color: priorityColor,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      roomName,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: priorityColor.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    priority ?? '',
                                    style: TextStyle(
                                      color: priorityColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            if (note.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                note,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 13,
                                  height: 1.4,
                                ),
                              ),
                            ],

                            const SizedBox(height: 12),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      _statusIcon(status),
                                      size: 16,
                                      color: statusColor,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      status ?? '',
                                      style: TextStyle(
                                        color: statusColor,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                const Icon(
                                  Icons.arrow_forward_ios,
                                  size: 14,
                                  color: Colors.grey,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }
}