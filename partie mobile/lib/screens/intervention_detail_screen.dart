import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class InterventionDetailScreen extends StatefulWidget {
  const InterventionDetailScreen({super.key});

  @override
  State<InterventionDetailScreen> createState() =>
      _InterventionDetailScreenState();
}

class _InterventionDetailScreenState
    extends State<InterventionDetailScreen> {
  late Map<String, dynamic> intervention;
  Map<String, dynamic>? detail;
  bool loading = false;
  bool loadingDetail = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _loadDetail());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    intervention = Map<String, dynamic>.from(
        ModalRoute.of(context)!.settings.arguments
        as Map<String, dynamic>);
  }

  Future<void> _loadDetail() async {
    final noteId = intervention['_id']?.toString();
    if (noteId == null) return;

    final data =
    await ApiService.getInterventionDetail(noteId);

    if (!mounted) return;

    setState(() {
      detail = data;
      loadingDetail = false;
    });
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => loading = true);

    final noteId = intervention['_id']?.toString() ?? '';

    final result =
    await ApiService.updateInterventionStatus(
      noteId,
      newStatus,
    );

    if (!mounted) return;

    setState(() => loading = false);

    if (result == true) {
      setState(() {
        intervention['status'] = newStatus;
        if (detail != null) {
          detail!['status'] = newStatus;
        }
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.toString())),
      );
    }
  }

  String get currentStatus =>
      (detail?['status'] ?? intervention['status'])
          ?.toString() ??
          'EN_ATTENTE';

  @override
  Widget build(BuildContext context) {
    final roomName =
        intervention['room']?['name']?.toString() ??
            'Salle';
    final priority =
        intervention['priority']?.toString() ??
            'Moyenne';
    final adminNote =
        intervention['note']?.toString() ?? '';
    final adminName = intervention['admin']
    ?['displayName']
        ?.toString() ??
        'Admin';

    final verif = detail?['verificationDetails'];
    final items = verif?['items'] as List? ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6FA),
      appBar: AppBar(
        systemOverlayStyle:
        SystemUiOverlayStyle.dark,
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          roomName,
          style: const TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold),
        ),
        iconTheme:
        const IconThemeData(color: Colors.black),
      ),
      body: loadingDetail
          ? const Center(
          child: CircularProgressIndicator())
          : SingleChildScrollView(
        padding:
        const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment:
          CrossAxisAlignment.start,
          children: [
            _buildMainCard(
                priority, adminNote, adminName),
            const SizedBox(height: 16),

            _buildStatusCard(),
            const SizedBox(height: 16),

            if (items.isNotEmpty) ...[
              _buildVerificationPhotosCard(
                  items),
              const SizedBox(height: 16),
            ],

            // ❌ SUPPRIMÉ (feedback card)

            if (currentStatus != 'TERMINEE')
              _buildActionButtons(),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildMainCard(
      String priority,
      String note,
      String adminName) {
    Color priorityColor;

    switch (priority) {
      case 'Critique':
        priorityColor = Colors.red;
        break;
      case 'Haute':
        priorityColor = Colors.orange;
        break;
      case 'Moyenne':
        priorityColor = Colors.blue;
        break;
      default:
        priorityColor = Colors.green;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
        BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment:
        CrossAxisAlignment.start,
        children: [
          Text("Priorité : $priority"),
          const SizedBox(height: 10),
          Text(note),
          const SizedBox(height: 10),
          Text("Admin : $adminName"),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
        BorderRadius.circular(14),
      ),
      child: Text("Statut : $currentStatus"),
    );
  }

  Widget _buildVerificationPhotosCard(
      List items) {
    return Column(
      children: items.map((item) {
        return ListTile(
          title: Text(item['label'] ?? ''),
        );
      }).toList(),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        ElevatedButton(
          onPressed: () =>
              _updateStatus('EN_COURS'),
          child:
          const Text("Démarrer"),
        ),
        ElevatedButton(
          onPressed: () =>
              _updateStatus('TERMINEE'),
          child:
          const Text("Terminer"),
        ),
      ],
    );
  }
}